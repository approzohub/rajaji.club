

// Interface for the new payout calculation input
interface PayoutBid {
  userId: string | number;
  card: string;
  amount: number;
}

// Interface for the new payout calculation output
interface PayoutResult {
  userId: string | number;
  card: string;
  amount: number;
  winner: boolean;
  payout: number;
}

export class CommissionService {
  
  // NEW: Simple deterministic payout - lowest pool wins, no commissions
  static calculatePayouts(bids: PayoutBid[]): PayoutResult[] {
    console.log('🔍 CommissionService.calculatePayouts called with', bids.length, 'bids');
    console.log('💡 Using SIMPLE PAYOUT: Winners get bid × 10, NO COMMISSIONS');
    
    // 1. Group all bids by card and calculate total pool for each card
    const cardPools = new Map<string, number>();
    
    for (const bid of bids) {
      const currentPool = cardPools.get(bid.card) || 0;
      cardPools.set(bid.card, currentPool + bid.amount);
    }
    
    console.log('📊 Card pools calculated:');
    Array.from(cardPools.entries()).sort((a, b) => a[1] - b[1]).forEach(([card, pool]) => {
      console.log(`  ${card}: ₹${pool}`);
    });
    
    // 2. Find the card(s) with the lowest pool total
    let lowestPoolAmount = Infinity;
    const lowestPoolCards = new Set<string>();
    
    for (const [card, poolAmount] of Array.from(cardPools.entries())) {
      if (poolAmount < lowestPoolAmount) {
        lowestPoolAmount = poolAmount;
        lowestPoolCards.clear();
        lowestPoolCards.add(card);
      } else if (poolAmount === lowestPoolAmount) {
        lowestPoolCards.add(card);
      }
    }
    
    console.log(`🎯 Lowest pool amount: ₹${lowestPoolAmount}`);
    console.log(`🎯 Lowest pool cards: [${Array.from(lowestPoolCards).join(', ')}]`);
    
    // 3. Tie-breaker: If multiple cards tie for lowest pool, randomly select ONE
    let winningCard: string;
    if (lowestPoolCards.size === 1) {
      // Single lowest card - no tie
      winningCard = Array.from(lowestPoolCards)[0];
      console.log(`✅ Single winner (no tie): ${winningCard}`);
    } else {
      // Multiple cards tie for lowest - randomly select one
      const tiedCards = Array.from(lowestPoolCards);
      const randomIndex = Math.floor(Math.random() * tiedCards.length);
      winningCard = tiedCards[randomIndex];
      console.log(`🎲 Tie-breaker winner selected: ${winningCard} (from ${tiedCards.join(', ')})`);
    }
    
    // 4. Calculate total game pool and potential payout
    const totalGamePool = bids.reduce((sum, bid) => sum + bid.amount, 0);
    const winningBids = bids.filter(bid => bid.card === winningCard);
    const potentialTotalPayout = winningBids.reduce((sum, bid) => sum + (bid.amount * 10), 0);
    
    console.log(`💰 Pool vs Payout Check:`);
    console.log(`  - Total Game Pool: ₹${totalGamePool}`);
    console.log(`  - Potential Total Payout: ₹${potentialTotalPayout} (${winningBids.length} winners × bid × 10)`);
    
    // 5. SAFETY CHECK: If payout would exceed pool, exclude cards with bids from random selection
    if (potentialTotalPayout > totalGamePool) {
      console.warn(`⚠️ Payout (₹${potentialTotalPayout}) would exceed pool (₹${totalGamePool}). Excluding cards with bids from random selection.`);
      
      // Get all active cards and exclude those with bids
      const cardsWithBids = new Set(bids.map(bid => bid.card));
      const allActiveCards = [
        'ace_of_hearts', 'ace_of_spades', 'ace_of_clubs', 'ace_of_diamonds',
        'king_of_hearts', 'king_of_spades', 'king_of_clubs', 'king_of_diamonds',
        'queen_of_hearts', 'queen_of_spades', 'queen_of_clubs', 'queen_of_diamonds',
        'jack_of_hearts', 'jack_of_spades', 'jack_of_clubs', 'jack_of_diamonds',
        '10_of_hearts', '10_of_spades', '10_of_clubs', '10_of_diamonds'
      ];
      const availableCards = allActiveCards.filter(card => !cardsWithBids.has(card));
      
      if (availableCards.length === 0) {
        console.error(`❌ No cards available for random selection (all cards have bids). This should not happen.`);
        // Fallback: return no winners
        return bids.map(bid => ({
          userId: bid.userId,
          card: bid.card,
          amount: bid.amount,
          winner: false,
          payout: 0
        }));
      }
      
      // Select random card from available cards (no bids)
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      winningCard = availableCards[randomIndex];
      console.log(`🎲 Random selection from cards without bids: ${winningCard} (from ${availableCards.join(', ')})`);
      
      // Return results with no winners (since winning card has no bids)
      const results: PayoutResult[] = [];
      for (const bid of bids) {
        results.push({
          userId: bid.userId,
          card: bid.card,
          amount: bid.amount,
          winner: false,
          payout: 0
        });
      }
      
      console.log(`📈 Final summary: 0 winners (random card ${winningCard} has no bids), Total payout: ₹0`);
      return results;
    }
    
    // 6. Calculate results for each bid - SIMPLE: Winners get bid × 10, NO COMMISSIONS
    const results: PayoutResult[] = [];
    
    console.log('💰 Calculating individual payouts (SIMPLE: bid × 10)...');
    for (const bid of bids) {
      const isWinner = bid.card === winningCard;
      // SIMPLE PAYOUT: Winner gets bid amount × 10, no commissions deducted
      const payout = isWinner ? bid.amount * 10 : 0;
      
      if (isWinner) {
        console.log(`  ✅ WINNER: User ${bid.userId}, Card: ${bid.card}, Bid: ₹${bid.amount}, Payout: ₹${payout} (${bid.amount} × 10)`);
      }
      
      results.push({
        userId: bid.userId,
        card: bid.card,
        amount: bid.amount,
        winner: isWinner,
        payout: payout
      });
    }
    
    const totalWinners = results.filter(r => r.winner).length;
    const totalPayout = results.filter(r => r.winner).reduce((sum, r) => sum + r.payout, 0);
    console.log(`📈 Final summary: ${totalWinners} winners, Total payout: ₹${totalPayout} (NO COMMISSIONS)`);
    
    return results;
  }
  

} 