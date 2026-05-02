/**
 * @dos/module-sdk date utilities
 * Date and time helpers for module development
 */

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_WEEK = 7 * MS_PER_DAY;

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
export const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

// ────────────────────────────────────────────────────────────────────────────
// Date Creation
// ────────────────────────────────────────────────────────────────────────────

export function now(): Date {
  return new Date();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function nowUnixMs(): number {
  return Date.now();
}

export function nowUnixSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function fromUnixMs(ms: number): Date {
  return new Date(ms);
}

export function fromUnixSec(sec: number): Date {
  return new Date(sec * 1000);
}

// ────────────────────────────────────────────────────────────────────────────
// Date Arithmetic
// ────────────────────────────────────────────────────────────────────────────

export function addMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

export function addSeconds(date: Date, seconds: number): Date {
  return addMilliseconds(date, seconds * MS_PER_SECOND);
}

export function addMinutes(date: Date, minutes: number): Date {
  return addMilliseconds(date, minutes * MS_PER_MINUTE);
}

export function addHours(date: Date, hours: number): Date {
  return addMilliseconds(date, hours * MS_PER_HOUR);
}

export function addDays(date: Date, days: number): Date {
  return addMilliseconds(date, days * MS_PER_DAY);
}

export function addWeeks(date: Date, weeks: number): Date {
  return addMilliseconds(date, weeks * MS_PER_WEEK);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export function subtractMilliseconds(date: Date, ms: number): Date {
  return addMilliseconds(date, -ms);
}

export function subtractSeconds(date: Date, seconds: number): Date {
  return addSeconds(date, -seconds);
}

export function subtractMinutes(date: Date, minutes: number): Date {
  return addMinutes(date, -minutes);
}

export function subtractHours(date: Date, hours: number): Date {
  return addHours(date, -hours);
}

export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

export function subtractWeeks(date: Date, weeks: number): Date {
  return addWeeks(date, -weeks);
}

// ────────────────────────────────────────────────────────────────────────────
// Date Comparison
// ────────────────────────────────────────────────────────────────────────────

export function isBefore(date: Date, other: Date): boolean {
  return date.getTime() < other.getTime();
}

export function isAfter(date: Date, other: Date): boolean {
  return date.getTime() > other.getTime();
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

export function isSameYear(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear();
}

export function isInPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function isInFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isYesterday(date: Date): boolean {
  return isSameDay(date, subtractDays(new Date(), 1));
}

export function isTomorrow(date: Date): boolean {
  return isSameDay(date, addDays(new Date(), 1));
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

// ────────────────────────────────────────────────────────────────────────────
// Date Difference
// ────────────────────────────────────────────────────────────────────────────

export function diffInMilliseconds(date1: Date, date2: Date): number {
  return date1.getTime() - date2.getTime();
}

export function diffInSeconds(date1: Date, date2: Date): number {
  return Math.floor(diffInMilliseconds(date1, date2) / MS_PER_SECOND);
}

export function diffInMinutes(date1: Date, date2: Date): number {
  return Math.floor(diffInMilliseconds(date1, date2) / MS_PER_MINUTE);
}

export function diffInHours(date1: Date, date2: Date): number {
  return Math.floor(diffInMilliseconds(date1, date2) / MS_PER_HOUR);
}

export function diffInDays(date1: Date, date2: Date): number {
  return Math.floor(diffInMilliseconds(date1, date2) / MS_PER_DAY);
}

export function diffInWeeks(date1: Date, date2: Date): number {
  return Math.floor(diffInMilliseconds(date1, date2) / MS_PER_WEEK);
}

export function diffInMonths(date1: Date, date2: Date): number {
  const yearDiff = date1.getFullYear() - date2.getFullYear();
  const monthDiff = date1.getMonth() - date2.getMonth();
  return yearDiff * 12 + monthDiff;
}

export function diffInYears(date1: Date, date2: Date): number {
  return date1.getFullYear() - date2.getFullYear();
}

// ────────────────────────────────────────────────────────────────────────────
// Date Boundaries
// ────────────────────────────────────────────────────────────────────────────

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  result.setDate(result.getDate() - diff);
  return startOfDay(result);
}

export function endOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  return endOfDay(addDays(startOfWeek(date, weekStartsOn), 6));
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  return startOfDay(result);
}

export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  return endOfDay(result);
}

export function startOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  const result = new Date(date);
  result.setMonth(quarter * 3, 1);
  return startOfDay(result);
}

export function endOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  const result = new Date(date);
  result.setMonth(quarter * 3 + 3, 0);
  return endOfDay(result);
}

export function startOfYear(date: Date): Date {
  const result = new Date(date);
  result.setMonth(0, 1);
  return startOfDay(result);
}

export function endOfYear(date: Date): Date {
  const result = new Date(date);
  result.setMonth(11, 31);
  return endOfDay(result);
}

// ────────────────────────────────────────────────────────────────────────────
// Date Formatting
// ────────────────────────────────────────────────────────────────────────────

export function formatISO(date: Date): string {
  return date.toISOString();
}

export function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatISOTime(date: Date): string {
  return date.toISOString().split('T')[1].split('.')[0];
}

export function formatDateSimple(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeSimple(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDateTimeSimple(date: Date): string {
  return `${formatDateSimple(date)} ${formatTimeSimple(date)}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Relative Time
// ────────────────────────────────────────────────────────────────────────────

export interface RelativeTimeResult {
  value: number;
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  text: string;
}

export function getRelativeTime(date: Date, now: Date = new Date()): RelativeTimeResult {
  const diffMs = now.getTime() - date.getTime();
  const absDiff = Math.abs(diffMs);
  const isPast = diffMs > 0;
  const prefix = isPast ? '' : 'in ';
  const suffix = isPast ? ' ago' : '';

  if (absDiff < MS_PER_MINUTE) {
    const value = Math.floor(absDiff / MS_PER_SECOND);
    return { value, unit: 'second', text: `${prefix}${value} second${value !== 1 ? 's' : ''}${suffix}` };
  }
  if (absDiff < MS_PER_HOUR) {
    const value = Math.floor(absDiff / MS_PER_MINUTE);
    return { value, unit: 'minute', text: `${prefix}${value} minute${value !== 1 ? 's' : ''}${suffix}` };
  }
  if (absDiff < MS_PER_DAY) {
    const value = Math.floor(absDiff / MS_PER_HOUR);
    return { value, unit: 'hour', text: `${prefix}${value} hour${value !== 1 ? 's' : ''}${suffix}` };
  }
  if (absDiff < MS_PER_WEEK) {
    const value = Math.floor(absDiff / MS_PER_DAY);
    return { value, unit: 'day', text: `${prefix}${value} day${value !== 1 ? 's' : ''}${suffix}` };
  }
  if (absDiff < MS_PER_DAY * 30) {
    const value = Math.floor(absDiff / MS_PER_WEEK);
    return { value, unit: 'week', text: `${prefix}${value} week${value !== 1 ? 's' : ''}${suffix}` };
  }
  if (absDiff < MS_PER_DAY * 365) {
    const value = Math.abs(diffInMonths(now, date));
    return { value, unit: 'month', text: `${prefix}${value} month${value !== 1 ? 's' : ''}${suffix}` };
  }

  const value = Math.abs(diffInYears(now, date));
  return { value, unit: 'year', text: `${prefix}${value} year${value !== 1 ? 's' : ''}${suffix}` };
}

export function formatRelativeTime(date: Date): string {
  return getRelativeTime(date).text;
}

// ────────────────────────────────────────────────────────────────────────────
// Parsing
// ────────────────────────────────────────────────────────────────────────────

export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function parseDateOrThrow(value: unknown, fieldName = 'date'): Date {
  const date = parseDate(value);
  if (!date) {
    throw new Error(`Invalid ${fieldName}: ${String(value)}`);
  }
  return date;
}

export function parseDateOrDefault(value: unknown, defaultDate: Date): Date {
  return parseDate(value) || defaultDate;
}

// ────────────────────────────────────────────────────────────────────────────
// Timezone Helpers
// ────────────────────────────────────────────────────────────────────────────

export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const utcHour = date.getUTCHours();
    const utcMinute = date.getUTCMinutes();
    return (hour * 60 + minute) - (utcHour * 60 + utcMinute);
  } catch {
    return 0;
  }
}

export function formatInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...options }).format(date);
  } catch {
    return date.toISOString();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Business Day Helpers
// ────────────────────────────────────────────────────────────────────────────

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

export function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;

  while (remaining > 0) {
    result = addDays(result, direction);
    if (isWeekday(result)) {
      remaining--;
    }
  }

  return result;
}

export function countBusinessDays(start: Date, end: Date): number {
  let count = 0;
  let current = startOfDay(start);
  const endDay = startOfDay(end);

  while (current <= endDay) {
    if (isWeekday(current)) count++;
    current = addDays(current, 1);
  }

  return count;
}

// ────────────────────────────────────────────────────────────────────────────
// Due Date Helpers (GRC-specific)
// ────────────────────────────────────────────────────────────────────────────

export type DueStatus = 'on_time' | 'due_soon' | 'overdue';

export interface DueStatusResult {
  status: DueStatus;
  daysRemaining: number;
  isOverdue: boolean;
  percentage: number;
}

export function getDueStatus(dueDate: Date, warnDays = 7): DueStatusResult {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  const daysRemaining = diffInDays(due, today);
  const isOverdue = daysRemaining < 0;

  let status: DueStatus;
  if (isOverdue) {
    status = 'overdue';
  } else if (daysRemaining <= warnDays) {
    status = 'due_soon';
  } else {
    status = 'on_time';
  }

  // Calculate percentage (100% = on time, 0% = overdue)
  const percentage = isOverdue ? 0 : Math.max(0, Math.min(100, (daysRemaining / warnDays) * 100));

  return { status, daysRemaining, isOverdue, percentage };
}

// ────────────────────────────────────────────────────────────────────────────
// Recurrence Helpers
// ────────────────────────────────────────────────────────────────────────────

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export function getNextOccurrence(date: Date, frequency: RecurrenceFrequency): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'quarterly':
      return addMonths(date, 3);
    case 'yearly':
      return addYears(date, 1);
    default:
      return date;
  }
}

export function generateRecurrences(
  startDate: Date,
  frequency: RecurrenceFrequency,
  count: number
): Date[] {
  const dates: Date[] = [startDate];
  let current = startDate;

  for (let i = 1; i < count; i++) {
    current = getNextOccurrence(current, frequency);
    dates.push(current);
  }

  return dates;
}
