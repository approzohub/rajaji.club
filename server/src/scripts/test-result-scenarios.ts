/* eslint-disable no-console */

/**
 * Automated integration test for result declaration scenarios.
 *
 * Steps performed on each run:
 * 1. Log in as admin (expects admin@playwin.com / admin1234).
 * 2. Fetch the full card catalog and build lookup helpers.
 * 3. Create two fresh test users with unique emails/phones and top-up their wallets.
 * 4. Scenario A – "Safe win" example (payout would exceed pool → fallback to no-winner).
 * 5. Scenario B – "Break-even" example (payout exactly equals pool → no admin loss/profit).
 * 6. Scenario C – "All cards bet" approximation (wide coverage of cards; observe fallback behaviour).
 *    Note: With the current 20-card deck, paying 10× the lowest pool can never exceed the
 *    total pool when every card has a bid. The script highlights this constraint and shows
 *    the closest achievable behaviour (fallback with most cards covered).
 * 7. For each scenario, poll until the scheduler declares a result, then log winners and
 *    admin exposure alongside the pre-result pool summary.
 *
 * Requirements:
 * - Backend server running locally (default http://localhost:4000).
 * - Short timer configuration (e.g., 1-minute bidding/break) so scenarios complete quickly.
 * - Admin credentials already set via update-admin-password.ts or equivalent.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 180000;

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

type UserCredentials = {
  id: string;
  email: string;
  password: string;
  token: string;
};

type CardInfo = {
  _id: string;
  name: string;
  card: string;
  suit: string;
  symbol: string;
  isActive: boolean;
  currentPrice: number;
};

type BidEntry = {
  cardName: string;
  cardType: string;
  cardSuit: string;
  quantity: number;
  totalAmount: number;
};

type GameSummary = {
  totalPool: number;
  byCard: Array<{
    cardName: string;
    display: string;
    quantity: number;
    amount: number;
  }>;
  lowestCard?: {
    cardName: string;
    display: string;
    amount: number;
  };
  potentialPayout?: number;
};

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function toDisplay(card: CardInfo): string {
  return `${card.card} ${card.symbol}`;
}

function toDisplayFromDbName(dbName: string): string {
  const [rankPart, , suitPart] = dbName.split('_');
  const rankMap: Record<string, string> = {
    ace: 'A',
    king: 'K',
    queen: 'Q',
    jack: 'J',
    '10': '10'
  };
  const suitMap: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  const rank = rankMap[rankPart] || rankPart?.charAt(0)?.toUpperCase() || rankPart;
  const suit = suitMap[suitPart] || suitPart;
  return `${rank} ${suit}`;
}

async function jsonRequest<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text();
    }
    throw new Error(`Request failed: ${path} → ${response.status} ${response.statusText} ${JSON.stringify(payload)}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return undefined as T;
}

async function login(identifier: string, password: string) {
  return jsonRequest<{ token: string; user: { _id: string } }>('/api/auth/login', {
    method: 'POST',
    body: { identifier, password }
  });
}

async function loginUser(identifier: string, password: string) {
  return jsonRequest<{ token: string; user: { _id: string } }>('/api/auth/user/login', {
    method: 'POST',
    body: { identifier, password }
  });
}

type CreateUserResponse = {
  message: string;
  userId: string;
  gameId: string;
};

async function createUser(adminToken: string, fullName: string, email: string, phone: string, password: string) {
  return jsonRequest<CreateUserResponse>('/api/users', {
    method: 'POST',
    token: adminToken,
    body: { fullName, email, phone, password, role: 'user' }
  });
}

async function rechargeWallet(adminToken: string, userId: string, amount: number) {
  const payload = {
    userId,
    amount,
    walletType: 'main' as const,
    note: 'test automation top-up'
  };

  console.log('Recharge request payload:', payload);

  await jsonRequest('/api/wallet/recharge', {
    method: 'POST',
    token: adminToken,
    body: payload
  });
}

async function createGame(adminToken: string) {
  const payload = await jsonRequest<{ _id: string }>('/api/games', {
    method: 'POST',
    token: adminToken,
    body: { timeWindow: new Date().toISOString() }
  });
  return payload._id;
}

async function getAllCards(adminToken: string) {
  return jsonRequest<CardInfo[]>('/api/games/cards', {
    token: adminToken
  });
}

function findCard(cards: CardInfo[], display: string): CardInfo | undefined {
  return cards.find(card => toDisplay(card) === display);
}

async function placeBid(userToken: string, gameId: string, cardId: string, quantity: number) {
  await jsonRequest('/api/bids', {
    method: 'POST',
    token: userToken,
    body: {
      gameId,
      bids: [{ cardId, quantity }]
    }
  });
}

async function placeBidForTargetAmount(
  user: UserCredentials,
  gameId: string,
  card: CardInfo,
  targetAmount: number
): Promise<{ quantity: number; amount: number }> {
  const quantity = Math.max(1, Math.round(targetAmount / card.currentPrice));
  await placeBid(user.token, gameId, card._id, quantity);
  const amount = card.currentPrice * quantity;
  return { quantity, amount };
}

async function getGame(adminToken: string, gameId: string) {
  return jsonRequest<{ game: { status: string; winningCard?: string; totalPool?: number } }>(`/api/games/${gameId}`, {
    token: adminToken
  });
}

async function getWinners(adminToken: string, gameId: string) {
  return jsonRequest<{
    gameId: string;
    winningCard: string;
    totalWinners: number;
    totalWinningAmount: number;
    winners: Array<{ userId: string; payoutAmount: number; cardName: string }>;
  }>(`/api/games/${gameId}/winners`, {
    token: adminToken
  });
}

async function getGameBids(adminToken: string, gameId: string) {
  return jsonRequest<BidEntry[]>(`/api/bids/game/${gameId}`, {
    token: adminToken
  });
}

async function summarizeGame(
  adminToken: string,
  gameId: string,
  cardDisplayByName: Map<string, string>
): Promise<GameSummary> {
  const bids = await getGameBids(adminToken, gameId);
  const byCardMap = new Map<string, { quantity: number; amount: number }>();
  let totalPool = 0;

  bids.forEach(bid => {
    const entry = byCardMap.get(bid.cardName) || { quantity: 0, amount: 0 };
    entry.quantity += bid.quantity;
    entry.amount += bid.totalAmount;
    byCardMap.set(bid.cardName, entry);
    totalPool += bid.totalAmount;
  });

  const byCard = Array.from(byCardMap.entries()).map(([cardName, info]) => ({
    cardName,
    display: cardDisplayByName.get(cardName) || toDisplayFromDbName(cardName),
    quantity: info.quantity,
    amount: info.amount
  }));

  byCard.sort((a, b) => a.amount - b.amount);

  const lowest = byCard[0];

  return {
    totalPool,
    byCard,
    lowestCard: lowest
      ? {
          cardName: lowest.cardName,
          display: lowest.display,
          amount: lowest.amount
        }
      : undefined,
    potentialPayout: lowest ? lowest.amount * 10 : undefined
  };
}

async function waitForResult(adminToken: string, gameId: string, label: string) {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const response = await getGame(adminToken, gameId);
    const status = response.game.status;
    console.log(`[${label}] status=${status}`);
    if (status === 'result_declared') {
      console.log(`[${label}] Result declared. Winning card: ${response.game.winningCard}`);
      return response.game;
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`[${label}] Timed out waiting for result`);
}

function logSummary(title: string, summary: GameSummary) {
  console.log(`--- ${title} ---`);
  console.log(`Total pool: ${formatCurrency(summary.totalPool)}`);
  if (summary.lowestCard && summary.potentialPayout !== undefined) {
    console.log(
      `Lowest pool card: ${summary.lowestCard.display} → ${formatCurrency(summary.lowestCard.amount)}`
    );
    console.log(`Potential payout (lowest × 10): ${formatCurrency(summary.potentialPayout)}`);
  }
  console.table(
    summary.byCard.map(entry => ({
      Card: entry.display,
      Quantity: entry.quantity,
      Amount: formatCurrency(entry.amount)
    }))
  );
}

async function runSafeWinScenario(
  admin: UserCredentials,
  users: UserCredentials[],
  cards: CardInfo[],
  cardDisplayByName: Map<string, string>
) {
  console.log('\n=== Scenario A: "Safe win" example (fallback expected) ===');
  console.log('Target setup: Card A ≈ ₹200, Card B ≈ ₹800 → total ≈ ₹1,000. 10× lowest > pool ⇒ fallback.');

  const gameId = await createGame(admin.token);
  console.log(`Game created: ${gameId}`);

  const cardA = findCard(cards, 'J ♥');
  const cardB = findCard(cards, 'K ♣');
  if (!cardA || !cardB) {
    throw new Error('Required cards for scenario A not found in catalog.');
  }

  const bidA = await placeBidForTargetAmount(users[0], gameId, cardA, 200);
  const bidB = await placeBidForTargetAmount(users[1], gameId, cardB, 800);

  console.log(
    `Placed bids: ${toDisplay(cardA)} -> ${formatCurrency(bidA.amount)}, ${toDisplay(cardB)} -> ${formatCurrency(
      bidB.amount
    )}`
  );

  const summary = await summarizeGame(admin.token, gameId, cardDisplayByName);
  logSummary('Pre-result pool summary (Scenario A)', summary);
  console.log(
    `Check: ${formatCurrency(summary.potentialPayout || 0)} potential vs ${formatCurrency(
      summary.totalPool
    )} pool → fallback should trigger.`
  );

  await waitForResult(admin.token, gameId, 'ScenarioA');
  const winners = await getWinners(admin.token, gameId);
  console.log('Result payload:', winners);
  console.log('Expectation: zero winners, admin keeps the entire pool.');
}

async function runBreakEvenScenario(
  admin: UserCredentials,
  users: UserCredentials[],
  cards: CardInfo[],
  cardDisplayByName: Map<string, string>
) {
  console.log('\n=== Scenario B: "Break-even" example (admin neither earns nor loses) ===');
  console.log('Target setup: Card A ≈ ₹500, Card B ≈ ₹400, Card C ≈ ₹100 → total ≈ ₹1,000. 10× lowest == pool.');

  const gameId = await createGame(admin.token);
  console.log(`Game created: ${gameId}`);

  const cardA = findCard(cards, 'A ♣');
  const cardB = findCard(cards, 'Q ♠');
  const cardC = findCard(cards, 'J ♦');
  if (!cardA || !cardB || !cardC) {
    throw new Error('Required cards for scenario B not found in catalog.');
  }

  const bidC = await placeBidForTargetAmount(users[0], gameId, cardC, 100);
  const bidA = await placeBidForTargetAmount(users[1], gameId, cardA, 500);
  const bidB = await placeBidForTargetAmount(users[0], gameId, cardB, 400);

  console.log(
    `Placed bids: ${toDisplay(cardA)} -> ${formatCurrency(
      bidA.amount
    )}, ${toDisplay(cardB)} -> ${formatCurrency(bidB.amount)}, ${toDisplay(cardC)} -> ${formatCurrency(bidC.amount)}`
  );

  const summary = await summarizeGame(admin.token, gameId, cardDisplayByName);
  logSummary('Pre-result pool summary (Scenario B)', summary);
  console.log(
    `Check: ${formatCurrency(summary.potentialPayout || 0)} potential vs ${formatCurrency(
      summary.totalPool
    )} pool → should be roughly equal (break-even).`
  );

  await waitForResult(admin.token, gameId, 'ScenarioB');
  const winners = await getWinners(admin.token, gameId);
  console.log('Result payload:', winners);
  const adminNet = (summary.totalPool - winners.totalWinningAmount).toFixed(2);
  console.log(`Admin net outcome: ${formatCurrency(parseFloat(adminNet))} (expect ≈ 0).`);
}

async function runAllCardsScenario(
  admin: UserCredentials,
  users: UserCredentials[],
  cards: CardInfo[],
  cardDisplayByName: Map<string, string>
) {
  console.log('\n=== Scenario C: "All cards bet" approximation ===');
  console.log(
    'Idea: give many cards small bids, highlight why true "all 20 cards with fallback" cannot occur, then demonstrate closest behaviour.'
  );

  const gameId = await createGame(admin.token);
  console.log(`Game created: ${gameId}`);

  const bidsPlaced: Array<{ display: string; amount: number }> = [];

  // Cover as many cards as possible with small amounts while keeping total low.
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    const user = users[i % users.length];
    const targetAmount = i === 0 ? card.currentPrice * 2 : card.currentPrice; // ensure first card slightly larger
    const bid = await placeBidForTargetAmount(user, gameId, card, targetAmount);
    bidsPlaced.push({ display: toDisplay(card), amount: bid.amount });
  }

  console.log('Placed minimal coverage bids across deck (actual amounts shown):');
  console.table(
    bidsPlaced.map(entry => ({
      Card: entry.display,
      Amount: formatCurrency(entry.amount)
    }))
  );

  const summary = await summarizeGame(admin.token, gameId, cardDisplayByName);
  logSummary('Pre-result pool summary (Scenario C)', summary);

  if ((summary.lowestCard?.amount || 0) * 10 > summary.totalPool) {
    console.log(
      'Condition met: lowest×10 exceeds pool → fallback will return no winners even though many cards have bids.'
    );
  } else {
    console.log(
      'Observation: lowest×10 does NOT exceed the pool. With a 20-card deck, once every card has a bid the inequality can no longer hold (need cards < 10 for theoretical case).'
    );
  }

  await waitForResult(admin.token, gameId, 'ScenarioC');
  const winners = await getWinners(admin.token, gameId);
  console.log('Result payload:', winners);
  if (winners.totalWinners === 0) {
    console.log('Outcome: zero winners → admin keeps the pool (matches fallback behaviour).');
  } else {
    console.log(
      'Outcome: winners were paid (no fallback). This is expected when total pool ≥ lowest×10 even though all/most cards have bids.'
    );
  }
}

async function main() {
  console.log('===================================================');
  console.log('Result Scenarios E2E Script');
  console.log('Base URL:', BASE_URL);
  console.log('Planned steps:');
  console.log('  1) Admin login');
  console.log('  2) Fetch card catalog');
  console.log('  3) Create + fund 2 fresh test users');
  console.log('  4) Scenario A – safe win fallback');
  console.log('  5) Scenario B – break-even payout');
  console.log('  6) Scenario C – all-cards coverage observation');
  console.log('===================================================');

  console.log('Logging in as admin...');
  const adminLogin = await login('admin@playwin.com', 'admin1234');
  const admin: UserCredentials = {
    id: adminLogin.user._id,
    email: 'admin@playwin.com',
    password: 'admin1234',
    token: adminLogin.token
  };

  console.log('Fetching full card catalog...');
  const cardsResponse = await getAllCards(admin.token);
  const activeCards = cardsResponse.filter(card => card.isActive);
  if (activeCards.length < 3) {
    throw new Error('Not enough active cards to run scenarios. Please ensure deck is initialized and active.');
  }
  console.log(`Active cards found: ${activeCards.length}`);

  const cardDisplayByName = new Map<string, string>();
  activeCards.forEach(card => {
    cardDisplayByName.set(card.name, toDisplay(card));
  });

  const timestamp = Date.now();
  const users: UserCredentials[] = [];

  for (let i = 1; i <= 2; i += 1) {
    const email = `testuser${i}_${timestamp}@example.com`;
    const phone = `9${(timestamp + i).toString().slice(-9)}`.padStart(10, '0');
    const password = 'test123';
    console.log(`Creating user ${email}`);
    const user = await createUser(admin.token, `Test User ${i}`, email, phone, password);
    await rechargeWallet(admin.token, user.userId, 10000);
    const loginResponse = await loginUser(email, password);
    users.push({
      id: loginResponse.user._id,
      email,
      password,
      token: loginResponse.token
    });
  }

  console.log('Users prepared. Starting scenarios...');
  await runSafeWinScenario(admin, users, activeCards, cardDisplayByName);
  await runBreakEvenScenario(admin, users, activeCards, cardDisplayByName);
  await runAllCardsScenario(admin, users, activeCards.slice(0, 10), cardDisplayByName);

  console.log('\nAll scenarios completed. Review console output for admin exposure and payouts.');
  console.log('Reminder: the backend server must be running with short timer settings (e.g., 1-minute bidding/break) before executing this script.');
  console.log('===================================================');
}

main().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});

