/**
 * Utility functions for horoscope date normalization
 * Ensures consistent date ranges for weekly and monthly horoscopes
 */

/**
 * Get the Monday of the week for a given date
 * @param date - Any date
 * @returns Date object set to Monday 00:00:00 UTC of that week
 */
export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  
  const monday = new Date(d);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);
  
  return monday;
}

/**
 * Get the Sunday of the week for a given date
 * @param date - Any date
 * @returns Date object set to Sunday 23:59:59 UTC of that week
 */
export function getWeekEndDate(date: Date): Date {
  const monday = getWeekStartDate(date);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  
  return sunday;
}

/**
 * Get the first day of the month for a given date
 * @param date - Any date
 * @returns Date object set to 1st of month 00:00:00 UTC
 */
export function getMonthStartDate(date: Date): Date {
  const d = new Date(date);
  const firstDay = new Date(d.getUTCFullYear(), d.getUTCMonth(), 1);
  firstDay.setUTCHours(0, 0, 0, 0);
  
  return firstDay;
}

/**
 * Get the last day of the month for a given date
 * @param date - Any date
 * @returns Date object set to last day of month 23:59:59 UTC
 */
export function getMonthEndDate(date: Date): Date {
  const d = new Date(date);
  const lastDay = new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
  lastDay.setUTCHours(23, 59, 59, 999);
  
  return lastDay;
}

/**
 * Get the start of day for a given date
 * @param date - Any date
 * @returns Date object set to 00:00:00 UTC of that day
 */
export function getDayStartDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of day for a given date
 * @param date - Any date
 * @returns Date object set to 23:59:59 UTC of that day
 */
export function getDayEndDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Normalize date range based on horoscope type
 * @param date - Input date
 * @param type - 'daily', 'weekly' or 'monthly'
 * @returns Object with normalized start and end dates
 */
export function normalizeHoroscopeDateRange(date: Date, type: 'daily' | 'weekly' | 'monthly'): {
  startDate: Date;
  endDate: Date;
} {
  if (type === 'daily') {
    return {
      startDate: getDayStartDate(date),
      endDate: getDayEndDate(date)
    };
  } else if (type === 'weekly') {
    return {
      startDate: getWeekStartDate(date),
      endDate: getWeekEndDate(date)
    };
  } else {
    return {
      startDate: getMonthStartDate(date),
      endDate: getMonthEndDate(date)
    };
  }
}

/**
 * Check if two dates fall within the same horoscope period
 * @param date1 - First date
 * @param date2 - Second date
 * @param type - 'daily', 'weekly' or 'monthly'
 * @returns boolean
 */
export function isSameHoroscopePeriod(date1: Date, date2: Date, type: 'daily' | 'weekly' | 'monthly'): boolean {
  const range1 = normalizeHoroscopeDateRange(date1, type);
  const range2 = normalizeHoroscopeDateRange(date2, type);
  
  return range1.startDate.getTime() === range2.startDate.getTime() &&
         range1.endDate.getTime() === range2.endDate.getTime();
}