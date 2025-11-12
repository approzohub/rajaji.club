// Timezone utility for frontend
// Converts IST times to user's local timezone

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Convert IST time string to user's local time
 * @param istTimeString - Time string in IST (e.g., "9:30 AM")
 * @param date - Date to use for conversion (defaults to today)
 * @returns Time string in user's local timezone
 */
export function convertISTToLocalTime(istTimeString: string, date: Date = new Date()): string {
  try {
    // Parse the IST time string
    const timeMatch = istTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      return istTimeString; // Return original if parsing fails
    }

    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();

    // Convert to 24-hour format
    let hour24 = hour;
    if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (period === 'AM' && hour === 12) {
      hour24 = 0;
    }

    // Create a date object in IST timezone
    const istDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minute);
    
    // Convert IST time to user's local timezone using native Date methods
    const istString = istDate.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
    const localDate = new Date(istString);
    
    // Format the time in user's local timezone
    return localDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error converting IST time to local time:', error);
    return istTimeString; // Return original if conversion fails
  }
}

/**
 * Convert IST date string to user's local date
 * @param istDateString - Date string in IST format (e.g., "DD-MM-YYYY")
 * @returns Date string in user's local timezone
 */
export function convertISTDateToLocalDate(istDateString: string): string {
  try {
    // Parse the IST date string (DD-MM-YYYY format)
    const [day, month, year] = istDateString.split('-').map(Number);
    
    // Create a date object in IST timezone
    const istDate = new Date(year, month - 1, day);
    
    // Convert IST date to user's local timezone using native Date methods
    const istString = istDate.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
    const localDate = new Date(istString);
    
    // Format the date in user's local timezone
    return localDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-'); // Convert DD/MM/YYYY to DD-MM-YYYY format
  } catch (error) {
    console.error('Error converting IST date to local date:', error);
    return istDateString; // Return original if conversion fails
  }
}

/**
 * Convert IST datetime to user's local datetime
 * @param istDateTime - Date object or ISO string from IST
 * @returns Formatted datetime string in user's local timezone
 */
export function convertISTDateTimeToLocal(istDateTime: Date | string): string {
  try {
    const date = typeof istDateTime === 'string' ? new Date(istDateTime) : istDateTime;
    
    // Convert IST datetime to user's local timezone using native Date methods
    const istString = date.toLocaleString('en-US', { timeZone: IST_TIMEZONE });
    const localDate = new Date(istString);
    
    // Format the datetime in user's local timezone
    return localDate.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error converting IST datetime to local datetime:', error);
    return istDateTime.toString(); // Return original if conversion fails
  }
}

/**
 * Get user's current timezone
 * @returns User's timezone identifier
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Check if user is in IST timezone
 * @returns True if user is in IST timezone
 */
export function isUserInIST(): boolean {
  const userTimezone = getUserTimezone();
  return userTimezone === 'Asia/Kolkata' || userTimezone === 'Asia/Calcutta';
}

/**
 * Format time for display (converts IST to local if needed)
 * @param timeString - Time string from backend (assumed to be in IST)
 * @param date - Date to use for conversion
 * @returns Formatted time string in user's local timezone
 */
export function formatTimeForDisplay(timeString: string, date: Date = new Date()): string {
  // If user is already in IST timezone, return as is
  if (isUserInIST()) {
    return timeString;
  }
  
  // Otherwise, convert from IST to user's local time
  return convertISTToLocalTime(timeString, date);
}

/**
 * Format date for display (converts IST to local if needed)
 * @param dateString - Date string from backend (assumed to be in IST)
 * @returns Formatted date string in user's local timezone
 */
export function formatDateForDisplay(dateString: string): string {
  // If user is already in IST timezone, return as is
  if (isUserInIST()) {
    return dateString;
  }
  
  // Otherwise, convert from IST to user's local date
  return convertISTDateToLocalDate(dateString);
}

/**
 * Get current time in user's timezone
 * @returns Current time string in user's local timezone
 */
export function getCurrentLocalTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get current date in user's timezone
 * @returns Current date string in user's local timezone
 */
export function getCurrentLocalDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');
} 