// Set timezone environment variable at the very beginning
process.env.TZ = 'Asia/Kolkata';

import moment from 'moment-timezone';

// Set default timezone to IST
moment.tz.setDefault('Asia/Kolkata');

// Indian Standard Time zone
const IST_TIMEZONE = 'Asia/Kolkata';
const SLOT_INTERVAL_MINUTES = Math.max(1, parseInt(process.env.GAME_CREATION_INTERVAL || '10'));
const MINUTES_PER_DAY = 24 * 60;
const SLOTS_PER_DAY = Math.max(1, Math.ceil(MINUTES_PER_DAY / SLOT_INTERVAL_MINUTES));

function getSlotAlignedMinutes(minutes: number): number {
  return Math.floor(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
}

/**
 * Convert a date to IST timezone
 * @param date - Date to convert (defaults to current time)
 * @returns Date in IST timezone
 */
export function toIST(date: Date = new Date()): Date {
  return moment(date).tz(IST_TIMEZONE).toDate();
}

/**
 * Convert IST date to UTC
 * @param istDate - Date in IST timezone
 * @returns UTC date
 */
export function istToUTC(istDate: Date): Date {
  return moment(istDate).tz(IST_TIMEZONE).utc().toDate();
}

/**
 * Get current time in IST
 * @returns Current time in IST
 */
export function getCurrentISTTime(): Date {
  return moment().tz(IST_TIMEZONE).toDate();
}

/**
 * Format date in IST timezone
 * @param date - Date to format
 * @param formatString - Date format string
 * @returns Formatted date string in IST
 */
export function formatIST(date: Date, formatString: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return moment(date).tz(IST_TIMEZONE).format(formatString);
}

/**
 * Create a date in IST timezone from components
 * @param year - Year
 * @param month - Month (1-12)
 * @param day - Day (1-31)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param second - Second (0-59)
 * @returns Date in IST timezone
 */
export function createISTDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  return moment.tz([year, month - 1, day, hour, minute, second], IST_TIMEZONE).toDate();
}

/**
 * Get start of day in IST
 * @param date - Date to get start of day for
 * @returns Start of day in IST
 */
export function getStartOfDayIST(date: Date = new Date()): Date {
  return moment(date).tz(IST_TIMEZONE).startOf('day').toDate();
}

/**
 * Get end of day in IST
 * @param date - Date to get end of day for
 * @returns End of day in IST
 */
export function getEndOfDayIST(date: Date = new Date()): Date {
  return moment(date).tz(IST_TIMEZONE).endOf('day').toDate();
}

/**
 * Check if a date is today in IST
 * @param date - Date to check
 * @returns True if date is today in IST
 */
export function isTodayIST(date: Date): boolean {
  const today = getStartOfDayIST();
  const checkDate = getStartOfDayIST(date);
  return today.getTime() === checkDate.getTime();
}

/**
 * Add minutes to a date in IST
 * @param date - Base date
 * @param minutes - Minutes to add
 * @returns New date in IST
 */
export function addMinutesIST(date: Date, minutes: number): Date {
  return moment(date).tz(IST_TIMEZONE).add(minutes, 'minutes').toDate();
}

/**
 * Get time difference in minutes between two dates in IST
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in minutes
 */
export function getTimeDifferenceMinutesIST(date1: Date, date2: Date): number {
  const istDate1 = moment(date1).tz(IST_TIMEZONE);
  const istDate2 = moment(date2).tz(IST_TIMEZONE);
  return istDate2.diff(istDate1, 'minutes');
}

/**
 * Get the current time window in IST (30-minute intervals)
 * @returns ISO string of the current time window
 */
export function getCurrentTimeWindowIST(): string {
  const now = moment().tz(IST_TIMEZONE);
  const slotMinutes = getSlotAlignedMinutes(now.minutes());
  const timeWindow = now.clone().minutes(slotMinutes).seconds(0).milliseconds(0);
  return timeWindow.toISOString();
}

/**
 * Get the next time window in IST (30-minute intervals)
 * @returns ISO string of the next time window
 */
export function getNextTimeWindowIST(): string {
  const now = moment().tz(IST_TIMEZONE);
  const slotMinutes = getSlotAlignedMinutes(now.minutes());
  const timeWindow = now.clone().minutes(slotMinutes).seconds(0).milliseconds(0);
  timeWindow.add(SLOT_INTERVAL_MINUTES, 'minutes');
  return timeWindow.toISOString();
}

/**
 * Get the previous time window in IST (30-minute intervals)
 * @returns ISO string of the previous time window
 */
export function getPreviousTimeWindowIST(): string {
  const now = moment().tz(IST_TIMEZONE);
  const slotMinutes = getSlotAlignedMinutes(now.minutes());
  const timeWindow = now.clone().minutes(slotMinutes).seconds(0).milliseconds(0);
  timeWindow.subtract(SLOT_INTERVAL_MINUTES, 'minutes');
  return timeWindow.toISOString();
}

/**
 * Check if a time is at a 30-minute interval (HH:00 or HH:30)
 * @param date - Date to check
 * @returns True if time is at 30-minute interval
 */
export function isAtThirtyMinuteInterval(date: Date = new Date()): boolean {
  const istDate = moment(date).tz(IST_TIMEZONE);
  return istDate.minutes() % SLOT_INTERVAL_MINUTES === 0;
}

/**
 * Get the next 30-minute interval time
 * @param date - Base date
 * @returns Next 30-minute interval time
 */
export function getNextThirtyMinuteInterval(date: Date = new Date()): Date {
  const istDate = moment(date).tz(IST_TIMEZONE).seconds(0).milliseconds(0);
  const minutes = istDate.minutes();
  const remainder = minutes % SLOT_INTERVAL_MINUTES;
  const minutesToAdd = remainder === 0 ? SLOT_INTERVAL_MINUTES : (SLOT_INTERVAL_MINUTES - remainder);
  return istDate.clone().add(minutesToAdd, 'minutes').toDate();
}

/**
 * Get the current 30-minute slot start time
 * @param date - Base date (defaults to current time)
 * @returns Start time of current 30-minute slot
 */
export function getCurrentThirtyMinuteSlot(date: Date = new Date()): Date {
  const istDate = moment(date).tz(IST_TIMEZONE);
  const slotMinutes = getSlotAlignedMinutes(istDate.minutes());
  return istDate.clone().minutes(slotMinutes).seconds(0).milliseconds(0).toDate();
}

/**
 * Get a specific 30-minute slot time for any date
 * @param date - Base date
 * @param hour - Hour (0-23)
 * @param minute - Minute (0 or 30)
 * @returns Date with the specified slot time
 */
export function getSpecificThirtyMinuteSlot(date: Date, hour: number, minute: number): Date {
  const istDate = moment(date).tz(IST_TIMEZONE);
  return istDate.clone().hours(hour).minutes(minute).seconds(0).milliseconds(0).toDate();
}

/**
 * Get all 48 time slots for a specific date
 * @param date - Date to get slots for (defaults to today)
 * @returns Array of 48 Date objects representing the 30-minute slots
 */
export function getAllTimeSlotsForDate(date: Date = new Date()): Date[] {
  const slots: Date[] = [];
  const startOfDay = moment(date).tz(IST_TIMEZONE).startOf('day');
  
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const slot = startOfDay.clone().add(i * SLOT_INTERVAL_MINUTES, 'minutes');
    slots.push(slot.toDate());
  }
  
  return slots;
}

/**
 * Get time slot index (0-47) for a given time
 * @param date - Date to get slot index for
 * @returns Slot index (0-47)
 */
export function getTimeSlotIndex(date: Date = new Date()): number {
  const istDate = moment(date).tz(IST_TIMEZONE);
  const minutesSinceStart = (istDate.hours() * 60) + istDate.minutes();
  return Math.floor(minutesSinceStart / SLOT_INTERVAL_MINUTES);
}

/**
 * Get time slot by index (0-47)
 * @param date - Base date
 * @param slotIndex - Slot index (0-47)
 * @returns Date object for the specified slot
 */
export function getTimeSlotByIndex(date: Date, slotIndex: number): Date {
  const totalSlots = SLOTS_PER_DAY;
  if (slotIndex < 0 || slotIndex >= totalSlots) {
    throw new Error(`Slot index must be between 0 and ${totalSlots - 1}`);
  }
  
  const startOfDay = moment(date).tz(IST_TIMEZONE).startOf('day');
  return startOfDay.clone().add(slotIndex * SLOT_INTERVAL_MINUTES, 'minutes').toDate();
}

/**
 * Get the next 30-minute slot start time
 * @param date - Base date (defaults to current time)
 * @returns Start time of next 30-minute slot
 */
export function getNextThirtyMinuteSlot(date: Date = new Date()): Date {
  const istDate = moment(date).tz(IST_TIMEZONE).seconds(0).milliseconds(0);
  const minutes = istDate.minutes();
  const remainder = minutes % SLOT_INTERVAL_MINUTES;
  if (remainder === 0) {
    return istDate.clone().add(SLOT_INTERVAL_MINUTES, 'minutes').toDate();
  }
  return istDate.clone().add(SLOT_INTERVAL_MINUTES - remainder, 'minutes').toDate();
}

/**
 * Get the previous 30-minute slot start time
 * @param date - Base date (defaults to current time)
 * @returns Start time of previous 30-minute slot
 */
export function getPreviousThirtyMinuteSlot(date: Date = new Date()): Date {
  const istDate = moment(date).tz(IST_TIMEZONE).seconds(0).milliseconds(0);
  const minutes = istDate.minutes();
  const remainder = minutes % SLOT_INTERVAL_MINUTES;
  
  if (remainder === 0) {
    return istDate.clone().subtract(SLOT_INTERVAL_MINUTES, 'minutes').toDate();
  }
  return istDate.clone().subtract(remainder, 'minutes').toDate();
}

/**
 * Check if current time is within a specific 30-minute slot
 * @param slotStartTime - Start time of the slot to check
 * @param date - Current date (defaults to current time)
 * @returns True if current time is within the specified slot
 */
export function isWithinThirtyMinuteSlot(slotStartTime: Date, date: Date = new Date()): boolean {
  const istDate = moment(date).tz(IST_TIMEZONE);
  const slotStart = moment(slotStartTime).tz(IST_TIMEZONE);
  const slotEnd = slotStart.clone().add(SLOT_INTERVAL_MINUTES, 'minutes');
  
  return istDate.isBetween(slotStart, slotEnd, null, '[)');
} 