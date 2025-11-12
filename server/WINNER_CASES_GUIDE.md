# Winner Cases Guide - Deterministic + Tie-Breaker Logic

## Overview
This document outlines all possible winner scenarios in the new payout system that uses deterministic lowest pool logic with tie-breaker randomization.

## Core Rules
1. **Lowest Pool Wins**: The card with the lowest total pool amount wins
2. **Tie-Breaker**: If multiple cards tie for lowest pool, randomly select ONE card as winner
3. **Payout**: All users on the winning card get `amount × 10`
4. **Single Winner**: Only ONE card can win per game
5. **No Bids Scenario**: If no users place bids, a random winning card is declared for display purposes, but no payouts are distributed

---

## Case 1: Single Lowest Card (No Tie)

### Scenario
Only one card has the lowest pool amount.

### Example
```
Bids:
- User 1: K card, amount 10
- User 2: Q card, amount 10  
- User 3: K card, amount 10
- User 4: J card, amount 20

Pools:
- K = 20 (10 + 10)
- Q = 10
- J = 20

Result: Q wins (lowest pool)
```

### Winners
- **User 2**: Q card → Winner (payout: 100)
- **User 1**: K card → Loser (payout: 0)
- **User 3**: K card → Loser (payout: 0)
- **User 4**: J card → Loser (payout: 0)

---

## Case 2: Two-Way Tie for Lowest Pool

### Scenario
Two cards have the same lowest pool amount.

### Example
```
Bids:
- User 1: K card, amount 20
- User 2: Q card, amount 5
- User 3: Q card, amount 15
- User 4: J card, amount 30

Pools:
- K = 20
- Q = 20 (5 + 15)
- J = 30

Result: Random selection between K and Q (both tied at 20)
```

### Possible Outcomes

#### Outcome A: K Wins (Random Selection)
- **User 1**: K card → Winner (payout: 200)
- **User 2**: Q card → Loser (payout: 0)
- **User 3**: Q card → Loser (payout: 0)
- **User 4**: J card → Loser (payout: 0)

#### Outcome B: Q Wins (Random Selection)
- **User 1**: K card → Loser (payout: 0)
- **User 2**: Q card → Winner (payout: 50)
- **User 3**: Q card → Winner (payout: 150)
- **User 4**: J card → Loser (payout: 0)

---

## Case 3: Three-Way Tie for Lowest Pool

### Scenario
Three cards have the same lowest pool amount.

### Example
```
Bids:
- User 1: K card, amount 10
- User 2: Q card, amount 10
- User 3: K card, amount 10
- User 4: J card, amount 10
- User 5: J card, amount 10
- User 6: Q card, amount 10

Pools:
- K = 20 (10 + 10)
- Q = 20 (10 + 10)
- J = 20 (10 + 10)

Result: Random selection between K, Q, and J (all tied at 20)
```

### Possible Outcomes

#### Outcome A: K Wins (Random Selection)
- **User 1**: K card → Winner (payout: 100)
- **User 3**: K card → Winner (payout: 100)
- **User 2**: Q card → Loser (payout: 0)
- **User 6**: Q card → Loser (payout: 0)
- **User 4**: J card → Loser (payout: 0)
- **User 5**: J card → Loser (payout: 0)

#### Outcome B: Q Wins (Random Selection)
- **User 1**: K card → Loser (payout: 0)
- **User 3**: K card → Loser (payout: 0)
- **User 2**: Q card → Winner (payout: 100)
- **User 6**: Q card → Winner (payout: 100)
- **User 4**: J card → Loser (payout: 0)
- **User 5**: J card → Loser (payout: 0)

#### Outcome C: J Wins (Random Selection)
- **User 1**: K card → Loser (payout: 0)
- **User 3**: K card → Loser (payout: 0)
- **User 2**: Q card → Loser (payout: 0)
- **User 6**: Q card → Loser (payout: 0)
- **User 4**: J card → Winner (payout: 100)
- **User 5**: J card → Winner (payout: 100)

---

## Case 4: Four-Way Tie for Lowest Pool

### Scenario
Four cards have the same lowest pool amount.

### Example
```
Bids:
- User 1: A card, amount 10
- User 2: K card, amount 10
- User 3: Q card, amount 10
- User 4: J card, amount 10

Pools:
- A = 10
- K = 10
- Q = 10
- J = 10

Result: Random selection between A, K, Q, and J (all tied at 10)
```

### Possible Outcomes

#### Outcome A: A Wins (Random Selection)
- **User 1**: A card → Winner (payout: 100)
- **User 2**: K card → Loser (payout: 0)
- **User 3**: Q card → Loser (payout: 0)
- **User 4**: J card → Loser (payout: 0)

#### Outcome B: K Wins (Random Selection)
- **User 1**: A card → Loser (payout: 0)
- **User 2**: K card → Winner (payout: 100)
- **User 3**: Q card → Loser (payout: 0)
- **User 4**: J card → Loser (payout: 0)

#### Outcome C: Q Wins (Random Selection)
- **User 1**: A card → Loser (payout: 0)
- **User 2**: K card → Loser (payout: 0)
- **User 3**: Q card → Winner (payout: 100)
- **User 4**: J card → Loser (payout: 0)

#### Outcome D: J Wins (Random Selection)
- **User 1**: A card → Loser (payout: 0)
- **User 2**: K card → Loser (payout: 0)
- **User 3**: Q card → Loser (payout: 0)
- **User 4**: J card → Winner (payout: 100)

---

## Case 5: Single User on Winning Card

### Scenario
Only one user placed a bid on the winning card.

### Example
```
Bids:
- User 1: K card, amount 50
- User 2: Q card, amount 10
- User 3: J card, amount 30

Pools:
- K = 50
- Q = 10
- J = 30

Result: Q wins (lowest pool)
```

### Winners
- **User 1**: K card → Loser (payout: 0)
- **User 2**: Q card → Winner (payout: 100) - Only winner
- **User 3**: J card → Loser (payout: 0)

---

## Case 6: Multiple Users on Winning Card

### Scenario
Multiple users placed bids on the winning card.

### Example
```
Bids:
- User 1: K card, amount 20
- User 2: K card, amount 30
- User 3: Q card, amount 10
- User 4: J card, amount 40

Pools:
- K = 50 (20 + 30)
- Q = 10
- J = 40

Result: Q wins (lowest pool)
```

### Winners
- **User 1**: K card → Loser (payout: 0)
- **User 2**: K card → Loser (payout: 0)
- **User 3**: Q card → Winner (payout: 100) - Only winner
- **User 4**: J card → Loser (payout: 0)

---

## Case 7: All Cards Have Same Pool (Extreme Tie)

### Scenario
All cards have exactly the same pool amount.

### Example
```
Bids:
- User 1: A card, amount 10
- User 2: K card, amount 10
- User 3: Q card, amount 10
- User 4: J card, amount 10

Pools:
- A = 10
- K = 10
- Q = 10
- J = 10

Result: Random selection between all cards (all tied at 10)
```

### Possible Outcomes
- **A wins**: User 1 gets 100, others get 0
- **K wins**: User 2 gets 100, others get 0
- **Q wins**: User 3 gets 100, others get 0
- **J wins**: User 4 gets 100, others get 0

---

## Case 8: No Bids (Edge Case)

### Scenario
No users placed any bids in the game.

### Example
```
Bids: []

Pools: {}

Result: Random winning card declared, but no payouts distributed
```

### Winners
- **Winning Card**: Randomly selected from available cards
- **Payouts**: No payouts distributed (no users placed bids)
- **Note**: System declares a winner card for display purposes, but since no users bid, no one gets paid

---

## Case 9: Single Bid (Edge Case)

### Scenario
Only one user placed a bid.

### Example
```
Bids:
- User 1: K card, amount 10

Pools:
- K = 10

Result: K wins (only card)
```

### Winners
- **User 1**: K card → Winner (payout: 100) - Guaranteed winner

---

## Case 10: All Bids on Same Card

### Scenario
All users placed bids on the same card.

### Example
```
Bids:
- User 1: K card, amount 10
- User 2: K card, amount 20
- User 3: K card, amount 30

Pools:
- K = 60 (10 + 20 + 30)

Result: K wins (only card)
```

### Winners
- **User 1**: K card → Winner (payout: 100)
- **User 2**: K card → Winner (payout: 200)
- **User 3**: K card → Winner (payout: 300)

---

## Summary of Winner Patterns

| Case | Description | Winner Count | Payout Pattern |
|------|-------------|--------------|----------------|
| 1 | Single lowest card | 1+ users | All on winning card get paid |
| 2 | Two-way tie | 1+ users | Random selection, all on chosen card get paid |
| 3 | Three-way tie | 1+ users | Random selection, all on chosen card get paid |
| 4 | Four-way tie | 1+ users | Random selection, all on chosen card get paid |
| 5 | Single user on winning card | 1 user | Only that user gets paid |
| 6 | Multiple users on winning card | 1+ users | All on winning card get paid |
| 7 | All cards same pool | 1+ users | Random selection, all on chosen card get paid |
| 8 | No bids | 0 users | Random card declared, no payouts |
| 9 | Single bid | 1 user | Guaranteed winner |
| 10 | All on same card | 1+ users | All users get paid |

## Key Principles

1. **Deterministic**: Lowest pool always wins (no randomness in pool calculation)
2. **Fair Tie-Breaker**: Random selection only when multiple cards tie
3. **Single Winner Card**: Only one card can win per game
4. **Equal Opportunity**: All users on winning card get paid proportionally
5. **Transparent**: Clear rules that users can understand and predict

## Probability in Tie Scenarios

- **Two-way tie**: 50% chance for each card
- **Three-way tie**: 33.33% chance for each card
- **Four-way tie**: 25% chance for each card
- **N-way tie**: 1/N chance for each card

This ensures fair and unpredictable outcomes while maintaining the core principle that the lowest pool wins.
