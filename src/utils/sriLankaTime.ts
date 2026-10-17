/**
 * Sri Lanka Standard Time Utility (Asia/Colombo, UTC+5:30)
 * 
 * Ensures consistent, rock-solid time and date calculations across all browsers
 * and client devices worldwide, eliminating UTC offsets and local machine drift.
 */

export const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

export interface SriLankaTimeParts {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
  hour: number; // 0 - 23
  minute: number; // 0 - 59
  second: number; // 0 - 59
  weekday: string; // 'Sun', 'Mon', etc.
  weekdayLong: string; // 'Sunday', 'Monday', etc.
  monthLong: string; // 'October', etc.
  monthShort: string; // 'Oct', etc.
  isoDate: string; // 'YYYY-MM-DD'
  decimalHours: number; // e.g. 14.5 for 2:30 PM
  formattedDate: string; // 'Sunday, 18 October 2026'
  timeString: string; // '10:30 AM'
}

/**
 * Extracts complete date and time parts in Sri Lanka Standard Time (Asia/Colombo).
 */
export function getSriLankaTimeParts(d: Date = new Date()): SriLankaTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const weekdayLong = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TIMEZONE,
    weekday: 'long'
  }).format(d);

  const monthLong = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TIMEZONE,
    month: 'long'
  }).format(d);

  const monthShort = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TIMEZONE,
    month: 'short'
  }).format(d);

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);

  const timeString = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: map.weekday,
    weekdayLong,
    monthLong,
    monthShort,
    isoDate,
    decimalHours: hour + minute / 60,
    formattedDate,
    timeString
  };
}

/**
 * Returns today's ISO date string (YYYY-MM-DD) strictly in Sri Lanka Standard Time.
 */
export function getSriLankaTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Returns a human-friendly formatted date string for a YYYY-MM-DD in Sri Lanka time.
 * e.g. "Sat, 18 Oct" or "Saturday, 18 October 2026"
 */
export function formatSriLankaDateStr(
  isoDate: string,
  options?: { showYear?: boolean; longWeekday?: boolean }
): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return isoDate;
  
  // Use UTC midday to ensure no cross-day boundary shifting
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    weekday: options?.longWeekday ? 'long' : 'short',
    day: 'numeric',
    month: options?.longWeekday ? 'long' : 'short',
    year: options?.showYear ? 'numeric' : undefined
  }).format(dateObj);
}

/**
 * Adds or subtracts N days to a YYYY-MM-DD date in Sri Lanka Standard Time.
 */
export function addDaysToIso(isoDate: string, days: number): string {
  if (!isoDate) return getSriLankaTodayIso();
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);
}

/**
 * Checks if a specific time slot string (e.g. "10:30 AM") on a given date is in the past in Sri Lanka.
 * Includes a 10-minute grace buffer so clients can't book slots that are about to start or already passed.
 */
export function isSriLankaSlotInPast(dateStr: string, slot: string, bufferHours: number = 0.166): boolean {
  const parts = getSriLankaTimeParts();
  const todayStr = parts.isoDate;

  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  let slotHour = parseInt(match[1], 10);
  const slotMin = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && slotHour < 12) slotHour += 12;
  if (period === 'AM' && slotHour === 12) slotHour = 0;

  const slotDecimal = slotHour + slotMin / 60;
  return slotDecimal <= parts.decimalHours + bufferHours;
}
