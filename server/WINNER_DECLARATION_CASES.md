# Winner Declaration Cases - Complete Implementation Guide

## Overview
This document covers all possible cases handled in the winner declaration logic, including the new deterministic + tie-breaker system and edge cases.

## Core Winner Declaration Functions

### 1. `declareDeterministicWinner(gameId)`
- **Purpose**: Main function that handles game end and winner declaration
- **Trigger**: Called when a game's time window ends
- **Logic**: Uses deterministic lowest pool wins with tie-breaker

### 2. `declareWinner(gameId, winningCard, isRandom, adminId, payoutResults)`
- **Purpose**: Processes the actual winner declaration and payout distribution
- **Trigger**: Called by `declareDeterministicWinner` or manual admin declaration
- **Logic**: Handles wallet updates, transaction logging, and result creation

---

## Case 1: No Bids Placed (No Users Participated)

### Scenario
No users placed any bids in the game.

### Code Path
```typescript
if (allBids.length === 0) {
  // Handle no-bids case
}
```

### What Happens
1. **Random Card Selection**: System selects random card from active cards
2. **Game Update**: Status → `result_declared`, Winner → random card
3. **Result Creation**: Record with random winning card, 0 winners
4. **No Payouts**: No financial transactions (no users to pay)
5. **Frontend Notification**: Users see winning card

### Example
```
Game: 10:00 AM slot
Bids: 0 users participated
Active Cards: [A♥, K♠, Q♣, J♦]
Random Selection: K♠ wins
Result: K♠ declared winner, 0 payouts distributed
```

---

## Case 2: Single Lowest Pool Card (No Tie)

### Scenario
One card has the lowest pool amount, no ties.

### Code Path
```typescript
// Calculate pools for all cards
// Find lowest pool
if (lowestPoolCards.size === 1) {
  winningCard = Array.from(lowestPoolCards)[0];
}
```

### What Happens
1. **Pool Calculation**: Sum all bids by card
2. **Lowest Identification**: Find card with minimum pool
3. **Winner Selection**: Single card wins (no randomization)
4. **Payout Distribution**: All users on winning card get `amount × 10`
5. **Result Creation**: Complete result record with winners

### Example
```
Bids: User1(K♠:10), User2(Q♣:10), User3(K♠:10), User4(J♦:20)
Pools: K♠=20, Q♣=10, J♦=20
Winner: Q♣ (lowest pool)
Payouts: User2 gets 100, others get 0
```

---

## Case 3: Two-Way Tie for Lowest Pool

### Scenario
Two cards have the same lowest pool amount.

### Code Path
```typescript
// Find cards with lowest pool
if (lowestPoolCards.size > 1) {
  // Random selection from tied cards
  const tiedCards = Array.from(lowestPoolCards);
  const randomIndex = Math.floor(Math.random() * tiedCards.length);
  winningCard = tiedCards[randomIndex];
}
```

### What Happens
1. **Tie Detection**: Multiple cards have same lowest pool
2. **Random Selection**: 50% chance for each tied card
3. **Winner Declaration**: One card randomly selected
4. **Payout Distribution**: All users on selected card get paid
5. **Result Creation**: Complete result record

### Example
```
Bids: User1(K♠:20), User2(Q♣:5), User3(Q♣:15), User4(J♦:30)
Pools: K♠=20, Q♣=20, J♦=30
Tie: K♠ and Q♣ (both 20)
Random Selection: Q♣ wins
Payouts: User2 gets 50, User3 gets 150, others get 0
```

---

## Case 4: Three-Way Tie for Lowest Pool

### Scenario
Three cards have the same lowest pool amount.

### Code Path
```typescript
// Same logic as two-way tie, but with 3 cards
const tiedCards = Array.from(lowestPoolCards); // 3 cards
const randomIndex = Math.floor(Math.random() * tiedCards.length);
winningCard = tiedCards[randomIndex];
```

### What Happens
1. **Tie Detection**: Three cards have same lowest pool
2. **Random Selection**: 33.33% chance for each tied card
3. **Winner Declaration**: One card randomly selected
4. **Payout Distribution**: All users on selected card get paid
5. **Result Creation**: Complete result record

### Example
```
Bids: User1(K♠:10), User2(Q♣:10), User3(K♠:10), User4(J♦:10), User5(J♦:10), User6(Q♣:10)
Pools: K♠=20, Q♣=20, J♦=20
Tie: K♠, Q♣, J♦ (all 20)
Random Selection: K♠ wins
Payouts: User1 gets 100, User3 gets 100, others get 0
```

---

## Case 5: N-Way Tie for Lowest Pool

### Scenario
N cards have the same lowest pool amount (4 or more cards).

### Code Path
```typescript
// Generic logic handles any number of tied cards
const tiedCards = Array.from(lowestPoolCards); // N cards
const randomIndex = Math.floor(Math.random() * tiedCards.length);
winningCard = tiedCards[randomIndex];
```

### What Happens
1. **Tie Detection**: N cards have same lowest pool
2. **Random Selection**: 1/N chance for each tied card
3. **Winner Declaration**: One card randomly selected
4. **Payout Distribution**: All users on selected card get paid
5. **Result Creation**: Complete result record

### Example
```
Bids: User1(A♥:10), User2(K♠:10), User3(Q♣:10), User4(J♦:10)
Pools: A♥=10, K♠=10, Q♣=10, J♦=10
Tie: All 4 cards (all 10)
Random Selection: Q♣ wins
Payouts: User3 gets 100, others get 0
```

---

## Case 6: Single User on Winning Card

### Scenario
Only one user placed a bid on the winning card.

### Code Path
```typescript
// Normal payout processing
for (const bid of winningBids) {
  const user = bid.user;
  const payoutAmount = userPayoutResult ? userPayoutResult.payout : payoutCalculation.payoutPerWinner;
  // Credit user's wallet
}
```

### What Happens
1. **Winner Identification**: Single user on winning card
2. **Payout Calculation**: User gets `amount × 10`
3. **Wallet Update**: User's main wallet credited
4. **Transaction Log**: Wallet transaction created
5. **Result Creation**: Single winner in result record

### Example
```
Bids: User1(K♠:50), User2(Q♣:10), User3(J♦:30)
Pools: K♠=50, Q♣=10, J♦=30
Winner: Q♣ (lowest pool)
Payouts: User2 gets 100 (only winner), others get 0
```

---

## Case 7: Multiple Users on Winning Card

### Scenario
Multiple users placed bids on the winning card.

### Code Path
```typescript
// Same logic as single user, but multiple iterations
for (const bid of winningBids) {
  // Process each winning user
  wallet.main += payoutAmount;
  await WalletTransaction.create({...});
}
```

### What Happens
1. **Winner Identification**: Multiple users on winning card
2. **Individual Payouts**: Each user gets their `amount × 10`
3. **Wallet Updates**: All winning users' wallets credited
4. **Transaction Logs**: Individual transactions for each winner
5. **Result Creation**: Multiple winners in result record

### Example
```
Bids: User1(K♠:20), User2(K♠:30), User3(Q♣:10), User4(J♦:40)
Pools: K♠=50, Q♣=10, J♦=40
Winner: Q♣ (lowest pool)
Payouts: User3 gets 100 (only winner), others get 0
```

---

## Case 8: All Users on Same Card

### Scenario
All users placed bids on the same card.

### Code Path
```typescript
// Normal processing - all users win
const winningBids = allBids.filter(bid => winningCards.has(bid.cardName));
// All bids are winning bids
```

### What Happens
1. **Single Card**: Only one card has bids
2. **All Winners**: All users are winners
3. **Individual Payouts**: Each user gets their `amount × 10`
4. **Wallet Updates**: All users' wallets credited
5. **Result Creation**: All users as winners

### Example
```
Bids: User1(K♠:10), User2(K♠:20), User3(K♠:30)
Pools: K♠=60 (only card)
Winner: K♠ (only card)
Payouts: User1 gets 100, User2 gets 200, User3 gets 300
```

---

## Case 9: Winning Card Has No Bids (Edge Case)

### Scenario
The winning card (determined by lowest pool) has no bids placed on it.

### Code Path
```typescript
if (winningBids.length === 0) {
  // Handle case where winning card has no bids
  // This shouldn't happen with new logic, but handle gracefully
}
```

### What Happens
1. **Edge Case Detection**: Winning card has no bids
2. **Game Update**: Status → `result_declared`, Winner → winning card
3. **No Payouts**: No financial transactions
4. **Result Creation**: Record with winning card but 0 winners
5. **Frontend Notification**: Users see winning card

### Example
```
Bids: User1(K♠:10), User2(Q♣:10) // Both cards have same pool
Pools: K♠=10, Q♣=10
Random Selection: J♦ wins (but no bids on J♦)
Result: J♦ declared winner, 0 payouts distributed
```

---

## Case 10: Manual Admin Declaration

### Scenario
Admin manually declares a winner (not using deterministic logic).

### Code Path
```typescript
// Called directly with adminId parameter
await declareWinner(gameId, winningCard, false, adminId);
```

### What Happens
1. **Admin Override**: Admin selects specific winning card
2. **Manual Processing**: Uses legacy payout calculation
3. **Payout Distribution**: Based on admin commission settings
4. **Result Creation**: Marked as manual declaration
5. **Audit Trail**: Admin ID recorded in result

### Example
```
Admin selects: Q♣ as winner
Bids: User1(K♠:10), User2(Q♣:10), User3(Q♣:20)
Result: Q♣ wins (admin override), User2 gets payout, User3 gets payout
```

---

## Case 11: Game Already Declared

### Scenario
Attempt to declare winner for a game that already has a result.

### Code Path
```typescript
if (game.status === 'result_declared') {
  console.log(`Game ${gameId} is already in result_declared status - skipping duplicate declaration`);
  return;
}
```

### What Happens
1. **Duplicate Detection**: Game already has result
2. **Early Return**: No processing performed
3. **Logging**: Warning message logged
4. **No Changes**: Database remains unchanged

### Example
```
Game: 10:00 AM slot
Status: result_declared
Action: Attempt to declare winner again
Result: Skipped, no changes made
```

---

## Case 12: Game Not in Waiting Status

### Scenario
Attempt to declare winner for a game not in `waiting_result` status.

### Code Path
```typescript
if (game.status !== 'waiting_result') {
  console.log(`Game ${gameId} not in waiting_result status (${game.status}) - skipping declaration`);
  return;
}
```

### What Happens
1. **Status Check**: Game not ready for result declaration
2. **Early Return**: No processing performed
3. **Logging**: Status mismatch logged
4. **No Changes**: Database remains unchanged

### Example
```
Game: 10:00 AM slot
Status: bidding_active
Action: Attempt to declare winner
Result: Skipped, game still in bidding phase
```

---

## Case 13: No Active Cards Available

### Scenario
No active cards found in database for random selection.

### Code Path
```typescript
if (activeCards.length === 0) {
  console.log('No active cards available - cannot declare winner');
  // Handle gracefully
}
```

### What Happens
1. **Card Check**: No active cards in database
2. **Game Update**: Status → `result_declared` (no winner)
3. **No Result Creation**: No result record created
4. **Logging**: Error logged
5. **Graceful Handling**: System doesn't crash

### Example
```
Database: No active cards
Game: 10:00 AM slot
Action: Declare winner
Result: Game marked as declared, no winner card, no result record
```

---

## Case 14: Database Connection Issues

### Scenario
Database connection fails during winner declaration.

### Code Path
```typescript
try {
  // All database operations
} catch (error) {
  console.error('Error in winner declaration:', error);
  // Handle error gracefully
}
```

### What Happens
1. **Error Detection**: Database operation fails
2. **Error Logging**: Detailed error logged
3. **Graceful Handling**: System doesn't crash
4. **No Partial Updates**: Database remains consistent
5. **Retry Logic**: Can be retried later

### Example
```
Database: Connection timeout
Game: 10:00 AM slot
Action: Declare winner
Result: Error logged, no changes made, can retry
```

---

## Summary of All Cases

| Case | Description | Winner Logic | Payouts | Status |
|------|-------------|--------------|---------|--------|
| 1 | No Bids | Random card selection | None | Declared |
| 2 | Single Lowest | Deterministic | All on winning card | Declared |
| 3 | Two-Way Tie | Random selection (50/50) | All on chosen card | Declared |
| 4 | Three-Way Tie | Random selection (33.33%) | All on chosen card | Declared |
| 5 | N-Way Tie | Random selection (1/N) | All on chosen card | Declared |
| 6 | Single Winner | Normal processing | Single user | Declared |
| 7 | Multiple Winners | Normal processing | Multiple users | Declared |
| 8 | All Same Card | Normal processing | All users | Declared |
| 9 | No Bids on Winner | Edge case handling | None | Declared |
| 10 | Admin Override | Manual declaration | Based on settings | Declared |
| 11 | Already Declared | Skip processing | None | No change |
| 12 | Wrong Status | Skip processing | None | No change |
| 13 | No Active Cards | Graceful handling | None | Declared |
| 14 | Database Error | Error handling | None | No change |

## Key Implementation Features

### ✅ **Robust Error Handling**
- All database operations wrapped in try-catch
- Graceful degradation for edge cases
- Comprehensive logging for debugging

### ✅ **Atomic Operations**
- Game status updates are atomic
- Prevents race conditions
- Ensures data consistency

### ✅ **Audit Trail**
- All winner declarations logged
- Admin actions tracked
- Result records with complete details

### ✅ **Frontend Integration**
- Real-time socket notifications
- Consistent result format
- User-friendly display

### ✅ **Financial Safety**
- No payouts when no users should be paid
- Proper transaction logging
- Wallet balance validation

This comprehensive system handles all possible scenarios in winner declaration while maintaining system stability and user experience! 🎯
