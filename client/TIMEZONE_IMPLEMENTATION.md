# Timezone Implementation Guide

## Overview

This implementation ensures that all game times are stored in Indian Standard Time (IST) on the backend and displayed in the user's local timezone on the frontend.

## Architecture

### Backend (Node.js/Express)
- **Storage**: All times are stored in IST timezone
- **Processing**: All game creation, result declaration, and time calculations use IST
- **API Response**: Times are formatted in IST but include timezone information

### Frontend (React/Next.js)
- **Display**: Times are converted from IST to user's local timezone
- **User Experience**: Users see times in their local timezone regardless of server location

## Implementation Details

### Backend Changes

#### 1. Timezone Utility (`backend-gitlab/src/utils/timezone.ts`)
```typescript
// Key functions:
- getCurrentISTTime(): Get current time in IST
- addMinutesIST(date, minutes): Add minutes to IST date
- getStartOfDayIST(date): Get start of day in IST
- getEndOfDayIST(date): Get end of day in IST
- createISTDate(year, month, day, hour, minute, second): Create date in IST
```

#### 2. Updated Controllers
- **Games Controller**: All time operations now use IST
- **Game Creation**: Games are created with IST timestamps
- **Result Declaration**: Results are timestamped in IST
- **Date Range Queries**: Date ranges are calculated in IST

#### 3. Updated Models
- **Game Model**: All time fields store IST times
- **Result Model**: Result declaration time stored in IST

### Frontend Changes

#### 1. Timezone Utility (`playinwin-gitlab/src/lib/timezone.ts`)
```typescript
// Key functions:
- formatTimeForDisplay(timeString): Convert IST time to local time
- formatDateForDisplay(dateString): Convert IST date to local date
- convertISTToLocalTime(istTimeString, date): Convert IST time to local time
- getUserTimezone(): Get user's current timezone
- isUserInIST(): Check if user is in IST timezone
```

#### 2. Updated Components
- **Results Page**: Times and dates converted to user's timezone
- **Result Panel**: Real-time result times converted to user's timezone
- **Game Timer**: Result times converted to user's timezone

#### 3. Socket Service
- **Real-time Updates**: Result declared events convert IST times to local time

## Usage Examples

### Backend - Creating a Game
```typescript
import { getCurrentISTTime, addMinutesIST } from '../utils/timezone';

const now = getCurrentISTTime();
const biddingEndTime = addMinutesIST(now, getBiddingDuration());
const gameEndTime = addMinutesIST(now, getTotalGameDuration());

const game = await Game.create({
  timeWindow,
  status: 'open',
  startTime: now,
  biddingEndTime,
  gameEndTime
});
```

### Frontend - Displaying Times
```typescript
import { formatTimeForDisplay, formatDateForDisplay } from '../../lib/timezone';

// Convert IST time to user's local time
const localTime = formatTimeForDisplay('9:30 AM');

// Convert IST date to user's local date
const localDate = formatDateForDisplay('15-12-2024');
```

## Timezone Conversion Logic

### IST to Local Time Conversion
1. Parse IST time string (e.g., "9:30 AM")
2. Convert to 24-hour format
3. Create date object in IST timezone
4. Convert IST time to user's local timezone using native Date methods
5. Format in user's local timezone

### Example Conversions
- **IST 9:30 AM** → **EST 11:00 PM** (previous day)
- **IST 2:15 PM** → **PST 12:45 AM** (same day)
- **IST 11:45 PM** → **GMT 6:15 PM** (same day)

## Benefits

1. **Consistent Storage**: All times stored in IST regardless of server location
2. **User-Friendly**: Users see times in their local timezone
3. **Scalable**: Works for users worldwide
4. **Accurate**: Proper timezone conversion using date-fns-tz
5. **Maintainable**: Centralized timezone logic

## Testing

### Timezone Test Component
A test component (`TimezoneTest`) is included to verify timezone conversions:
- Shows user's current timezone
- Tests various time conversions
- Displays original vs converted times

### Manual Testing
1. Change your system timezone
2. Refresh the results page
3. Verify times are displayed in your local timezone
4. Check that IST users see times without conversion

## Dependencies

### Backend
```json
{
  "date-fns-tz": "^3.2.0"
}
```

### Frontend
```json
{
  "date-fns-tz": "^3.2.0"
}
```

**Note**: The implementation uses native JavaScript Date methods for timezone conversion instead of date-fns-tz functions to avoid compatibility issues with newer versions.

## Configuration

### Environment Variables
No additional environment variables required. The implementation uses:
- `Asia/Kolkata` as the IST timezone identifier
- User's browser timezone for local time conversion

### Server Timezone
Ensure your server is configured to use UTC or any timezone. The implementation will always convert to IST for storage.

## Troubleshooting

### Common Issues

1. **Times not converting**: Check if user is in IST timezone
2. **Incorrect conversions**: Verify date-fns-tz installation
3. **Server timezone issues**: Ensure server uses UTC or consistent timezone

### Debug Information
The timezone test component provides debug information:
- User's timezone
- Whether user is in IST
- Sample conversions

## Future Enhancements

1. **User Preferences**: Allow users to manually set timezone
2. **Caching**: Cache timezone conversions for performance
3. **Analytics**: Track user timezones for optimization
4. **Notifications**: Send notifications in user's local time

## Migration Notes

### Existing Data
- Existing game and result data will continue to work
- Times will be interpreted as IST and converted appropriately
- No data migration required

### Deployment
1. Install date-fns-tz on both backend and frontend
2. Deploy backend changes first
3. Deploy frontend changes
4. Test timezone conversions

## Security Considerations

- Timezone conversion is client-side only
- No sensitive timezone information is exposed
- All server operations use IST consistently 