# 🧹 Cleanup Scripts Documentation

## Overview
This document describes all available cleanup scripts for the game system. All scripts use IST timezone for consistency.

## Available Scripts

### 1. `cleanup:today` - Clean Today's Data
**File:** `src/scripts/cleanup-today-results.ts`
**Command:** `npm run cleanup:today`

**Purpose:** Deletes ALL results and games for the current day (IST)
- Removes all results from today
- Removes all games created today
- Useful for resetting the system for a new day

**Use Case:** When you want to start fresh for the current day

---

### 2. `fix:missing-results` - Fix Missing Results
**File:** `src/scripts/fix-today-missing-results.ts`
**Command:** `npm run fix:missing-results`

**Purpose:** Creates missing results for past time slots
- Checks for missing results up to current time
- Creates random results for missing slots
- Only processes completed time slots

**Use Case:** When results are missing for past time slots

---

### 3. `reset:today` - Reset Today's Data
**Command:** `npm run reset:today`

**Purpose:** Combines cleanup:today + fix:missing-results
- First cleans all today's data
- Then creates fresh results for past slots

**Use Case:** Complete reset and recreation of today's data

---

### 4. `cleanup:duplicates` - Remove Duplicate Games
**File:** `src/scripts/cleanup-all-extra-games.ts`
**Command:** `npm run cleanup:duplicates`

**Purpose:** Removes duplicate games for the same timeWindow
- Processes games from last 2 hours
- Groups by 30-minute time slots
- Keeps oldest game, deletes duplicates
- Useful for fixing duplicate key errors

**Use Case:** When you have multiple games for the same time slot

---

### 5. `cleanup:multiple` - Close Multiple Active Games
**File:** `src/scripts/cleanup-multiple-games.ts`
**Command:** `npm run cleanup:multiple`

**Purpose:** Closes multiple open/waiting games
- Finds multiple games with status 'open'
- Keeps most recent, closes others
- Also handles multiple 'waiting_result' games
- Marks closed games as 'result_declared'

**Use Case:** When you have multiple active games running simultaneously

---

## Script Usage Examples

### Daily Reset
```bash
# Complete reset for today
npm run reset:today
```

### Fix Missing Results Only
```bash
# Only create missing results (don't delete existing)
npm run fix:missing-results
```

### Clean Duplicates
```bash
# Remove duplicate games from last 2 hours
npm run cleanup:duplicates
```

### Close Multiple Games
```bash
# Close multiple active games
npm run cleanup:multiple
```

## Timezone Information
All scripts use **Indian Standard Time (IST)** for:
- Date calculations
- Time window processing
- Database queries
- Logging timestamps

## Safety Notes
- All scripts include verification steps
- Scripts show what will be deleted before proceeding
- Backup your database before running cleanup scripts
- Scripts are designed to be safe and non-destructive

## Deleted Scripts
The following scripts were removed due to duplication:
- `cleanup-duplicate-games.ts` - Replaced by `cleanup-all-extra-games.ts`
- `check-duplicate-games.ts` - Hardcoded timeWindow, not reusable
- `fix-duplicate-games.ts` - Hardcoded timeWindow, not reusable
