"use strict";
/**
 * @dos/module-sdk date utilities
 * Date and time helpers for module development
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECONDS_PER_WEEK = exports.SECONDS_PER_DAY = exports.SECONDS_PER_HOUR = exports.SECONDS_PER_MINUTE = exports.MS_PER_WEEK = exports.MS_PER_DAY = exports.MS_PER_HOUR = exports.MS_PER_MINUTE = exports.MS_PER_SECOND = void 0;
exports.now = now;
exports.nowISO = nowISO;
exports.nowUnixMs = nowUnixMs;
exports.nowUnixSec = nowUnixSec;
exports.fromUnixMs = fromUnixMs;
exports.fromUnixSec = fromUnixSec;
exports.addMilliseconds = addMilliseconds;
exports.addSeconds = addSeconds;
exports.addMinutes = addMinutes;
exports.addHours = addHours;
exports.addDays = addDays;
exports.addWeeks = addWeeks;
exports.addMonths = addMonths;
exports.addYears = addYears;
exports.subtractMilliseconds = subtractMilliseconds;
exports.subtractSeconds = subtractSeconds;
exports.subtractMinutes = subtractMinutes;
exports.subtractHours = subtractHours;
exports.subtractDays = subtractDays;
exports.subtractWeeks = subtractWeeks;
exports.isBefore = isBefore;
exports.isAfter = isAfter;
exports.isSameDay = isSameDay;
exports.isSameMonth = isSameMonth;
exports.isSameYear = isSameYear;
exports.isInPast = isInPast;
exports.isInFuture = isInFuture;
exports.isToday = isToday;
exports.isYesterday = isYesterday;
exports.isTomorrow = isTomorrow;
exports.isWithinRange = isWithinRange;
exports.diffInMilliseconds = diffInMilliseconds;
exports.diffInSeconds = diffInSeconds;
exports.diffInMinutes = diffInMinutes;
exports.diffInHours = diffInHours;
exports.diffInDays = diffInDays;
exports.diffInWeeks = diffInWeeks;
exports.diffInMonths = diffInMonths;
exports.diffInYears = diffInYears;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.startOfWeek = startOfWeek;
exports.endOfWeek = endOfWeek;
exports.startOfMonth = startOfMonth;
exports.endOfMonth = endOfMonth;
exports.startOfQuarter = startOfQuarter;
exports.endOfQuarter = endOfQuarter;
exports.startOfYear = startOfYear;
exports.endOfYear = endOfYear;
exports.formatISO = formatISO;
exports.formatISODate = formatISODate;
exports.formatISOTime = formatISOTime;
exports.formatDateSimple = formatDateSimple;
exports.formatTimeSimple = formatTimeSimple;
exports.formatDateTimeSimple = formatDateTimeSimple;
exports.getRelativeTime = getRelativeTime;
exports.formatRelativeTime = formatRelativeTime;
exports.parseDate = parseDate;
exports.parseDateOrThrow = parseDateOrThrow;
exports.parseDateOrDefault = parseDateOrDefault;
exports.getTimezoneOffset = getTimezoneOffset;
exports.formatInTimezone = formatInTimezone;
exports.isWeekend = isWeekend;
exports.isWeekday = isWeekday;
exports.addBusinessDays = addBusinessDays;
exports.countBusinessDays = countBusinessDays;
exports.getDueStatus = getDueStatus;
exports.getNextOccurrence = getNextOccurrence;
exports.generateRecurrences = generateRecurrences;
// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────
exports.MS_PER_SECOND = 1000;
exports.MS_PER_MINUTE = 60 * exports.MS_PER_SECOND;
exports.MS_PER_HOUR = 60 * exports.MS_PER_MINUTE;
exports.MS_PER_DAY = 24 * exports.MS_PER_HOUR;
exports.MS_PER_WEEK = 7 * exports.MS_PER_DAY;
exports.SECONDS_PER_MINUTE = 60;
exports.SECONDS_PER_HOUR = 60 * exports.SECONDS_PER_MINUTE;
exports.SECONDS_PER_DAY = 24 * exports.SECONDS_PER_HOUR;
exports.SECONDS_PER_WEEK = 7 * exports.SECONDS_PER_DAY;
// ────────────────────────────────────────────────────────────────────────────
// Date Creation
// ────────────────────────────────────────────────────────────────────────────
function now() {
    return new Date();
}
function nowISO() {
    return new Date().toISOString();
}
function nowUnixMs() {
    return Date.now();
}
function nowUnixSec() {
    return Math.floor(Date.now() / 1000);
}
function fromUnixMs(ms) {
    return new Date(ms);
}
function fromUnixSec(sec) {
    return new Date(sec * 1000);
}
// ────────────────────────────────────────────────────────────────────────────
// Date Arithmetic
// ────────────────────────────────────────────────────────────────────────────
function addMilliseconds(date, ms) {
    return new Date(date.getTime() + ms);
}
function addSeconds(date, seconds) {
    return addMilliseconds(date, seconds * exports.MS_PER_SECOND);
}
function addMinutes(date, minutes) {
    return addMilliseconds(date, minutes * exports.MS_PER_MINUTE);
}
function addHours(date, hours) {
    return addMilliseconds(date, hours * exports.MS_PER_HOUR);
}
function addDays(date, days) {
    return addMilliseconds(date, days * exports.MS_PER_DAY);
}
function addWeeks(date, weeks) {
    return addMilliseconds(date, weeks * exports.MS_PER_WEEK);
}
function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}
function addYears(date, years) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}
function subtractMilliseconds(date, ms) {
    return addMilliseconds(date, -ms);
}
function subtractSeconds(date, seconds) {
    return addSeconds(date, -seconds);
}
function subtractMinutes(date, minutes) {
    return addMinutes(date, -minutes);
}
function subtractHours(date, hours) {
    return addHours(date, -hours);
}
function subtractDays(date, days) {
    return addDays(date, -days);
}
function subtractWeeks(date, weeks) {
    return addWeeks(date, -weeks);
}
// ────────────────────────────────────────────────────────────────────────────
// Date Comparison
// ────────────────────────────────────────────────────────────────────────────
function isBefore(date, other) {
    return date.getTime() < other.getTime();
}
function isAfter(date, other) {
    return date.getTime() > other.getTime();
}
function isSameDay(date1, date2) {
    return (date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate());
}
function isSameMonth(date1, date2) {
    return (date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth());
}
function isSameYear(date1, date2) {
    return date1.getFullYear() === date2.getFullYear();
}
function isInPast(date) {
    return date.getTime() < Date.now();
}
function isInFuture(date) {
    return date.getTime() > Date.now();
}
function isToday(date) {
    return isSameDay(date, new Date());
}
function isYesterday(date) {
    return isSameDay(date, subtractDays(new Date(), 1));
}
function isTomorrow(date) {
    return isSameDay(date, addDays(new Date(), 1));
}
function isWithinRange(date, start, end) {
    const time = date.getTime();
    return time >= start.getTime() && time <= end.getTime();
}
// ────────────────────────────────────────────────────────────────────────────
// Date Difference
// ────────────────────────────────────────────────────────────────────────────
function diffInMilliseconds(date1, date2) {
    return date1.getTime() - date2.getTime();
}
function diffInSeconds(date1, date2) {
    return Math.floor(diffInMilliseconds(date1, date2) / exports.MS_PER_SECOND);
}
function diffInMinutes(date1, date2) {
    return Math.floor(diffInMilliseconds(date1, date2) / exports.MS_PER_MINUTE);
}
function diffInHours(date1, date2) {
    return Math.floor(diffInMilliseconds(date1, date2) / exports.MS_PER_HOUR);
}
function diffInDays(date1, date2) {
    return Math.floor(diffInMilliseconds(date1, date2) / exports.MS_PER_DAY);
}
function diffInWeeks(date1, date2) {
    return Math.floor(diffInMilliseconds(date1, date2) / exports.MS_PER_WEEK);
}
function diffInMonths(date1, date2) {
    const yearDiff = date1.getFullYear() - date2.getFullYear();
    const monthDiff = date1.getMonth() - date2.getMonth();
    return yearDiff * 12 + monthDiff;
}
function diffInYears(date1, date2) {
    return date1.getFullYear() - date2.getFullYear();
}
// ────────────────────────────────────────────────────────────────────────────
// Date Boundaries
// ────────────────────────────────────────────────────────────────────────────
function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}
function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}
function startOfWeek(date, weekStartsOn = 0) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    result.setDate(result.getDate() - diff);
    return startOfDay(result);
}
function endOfWeek(date, weekStartsOn = 0) {
    return endOfDay(addDays(startOfWeek(date, weekStartsOn), 6));
}
function startOfMonth(date) {
    const result = new Date(date);
    result.setDate(1);
    return startOfDay(result);
}
function endOfMonth(date) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    return endOfDay(result);
}
function startOfQuarter(date) {
    const quarter = Math.floor(date.getMonth() / 3);
    const result = new Date(date);
    result.setMonth(quarter * 3, 1);
    return startOfDay(result);
}
function endOfQuarter(date) {
    const quarter = Math.floor(date.getMonth() / 3);
    const result = new Date(date);
    result.setMonth(quarter * 3 + 3, 0);
    return endOfDay(result);
}
function startOfYear(date) {
    const result = new Date(date);
    result.setMonth(0, 1);
    return startOfDay(result);
}
function endOfYear(date) {
    const result = new Date(date);
    result.setMonth(11, 31);
    return endOfDay(result);
}
// ────────────────────────────────────────────────────────────────────────────
// Date Formatting
// ────────────────────────────────────────────────────────────────────────────
function formatISO(date) {
    return date.toISOString();
}
function formatISODate(date) {
    return date.toISOString().split('T')[0];
}
function formatISOTime(date) {
    return date.toISOString().split('T')[1].split('.')[0];
}
function formatDateSimple(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatTimeSimple(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}
function formatDateTimeSimple(date) {
    return `${formatDateSimple(date)} ${formatTimeSimple(date)}`;
}
function getRelativeTime(date, now = new Date()) {
    const diffMs = now.getTime() - date.getTime();
    const absDiff = Math.abs(diffMs);
    const isPast = diffMs > 0;
    const prefix = isPast ? '' : 'in ';
    const suffix = isPast ? ' ago' : '';
    if (absDiff < exports.MS_PER_MINUTE) {
        const value = Math.floor(absDiff / exports.MS_PER_SECOND);
        return { value, unit: 'second', text: `${prefix}${value} second${value !== 1 ? 's' : ''}${suffix}` };
    }
    if (absDiff < exports.MS_PER_HOUR) {
        const value = Math.floor(absDiff / exports.MS_PER_MINUTE);
        return { value, unit: 'minute', text: `${prefix}${value} minute${value !== 1 ? 's' : ''}${suffix}` };
    }
    if (absDiff < exports.MS_PER_DAY) {
        const value = Math.floor(absDiff / exports.MS_PER_HOUR);
        return { value, unit: 'hour', text: `${prefix}${value} hour${value !== 1 ? 's' : ''}${suffix}` };
    }
    if (absDiff < exports.MS_PER_WEEK) {
        const value = Math.floor(absDiff / exports.MS_PER_DAY);
        return { value, unit: 'day', text: `${prefix}${value} day${value !== 1 ? 's' : ''}${suffix}` };
    }
    if (absDiff < exports.MS_PER_DAY * 30) {
        const value = Math.floor(absDiff / exports.MS_PER_WEEK);
        return { value, unit: 'week', text: `${prefix}${value} week${value !== 1 ? 's' : ''}${suffix}` };
    }
    if (absDiff < exports.MS_PER_DAY * 365) {
        const value = Math.abs(diffInMonths(now, date));
        return { value, unit: 'month', text: `${prefix}${value} month${value !== 1 ? 's' : ''}${suffix}` };
    }
    const value = Math.abs(diffInYears(now, date));
    return { value, unit: 'year', text: `${prefix}${value} year${value !== 1 ? 's' : ''}${suffix}` };
}
function formatRelativeTime(date) {
    return getRelativeTime(date).text;
}
// ────────────────────────────────────────────────────────────────────────────
// Parsing
// ────────────────────────────────────────────────────────────────────────────
function parseDate(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}
function parseDateOrThrow(value, fieldName = 'date') {
    const date = parseDate(value);
    if (!date) {
        throw new Error(`Invalid ${fieldName}: ${String(value)}`);
    }
    return date;
}
function parseDateOrDefault(value, defaultDate) {
    return parseDate(value) || defaultDate;
}
// ────────────────────────────────────────────────────────────────────────────
// Timezone Helpers
// ────────────────────────────────────────────────────────────────────────────
function getTimezoneOffset(timezone, date = new Date()) {
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
    }
    catch {
        return 0;
    }
}
function formatInTimezone(date, timezone, options = {}) {
    try {
        return new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...options }).format(date);
    }
    catch {
        return date.toISOString();
    }
}
// ────────────────────────────────────────────────────────────────────────────
// Business Day Helpers
// ────────────────────────────────────────────────────────────────────────────
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}
function isWeekday(date) {
    return !isWeekend(date);
}
function addBusinessDays(date, days) {
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
function countBusinessDays(start, end) {
    let count = 0;
    let current = startOfDay(start);
    const endDay = startOfDay(end);
    while (current <= endDay) {
        if (isWeekday(current))
            count++;
        current = addDays(current, 1);
    }
    return count;
}
function getDueStatus(dueDate, warnDays = 7) {
    const today = startOfDay(new Date());
    const due = startOfDay(dueDate);
    const daysRemaining = diffInDays(due, today);
    const isOverdue = daysRemaining < 0;
    let status;
    if (isOverdue) {
        status = 'overdue';
    }
    else if (daysRemaining <= warnDays) {
        status = 'due_soon';
    }
    else {
        status = 'on_time';
    }
    // Calculate percentage (100% = on time, 0% = overdue)
    const percentage = isOverdue ? 0 : Math.max(0, Math.min(100, (daysRemaining / warnDays) * 100));
    return { status, daysRemaining, isOverdue, percentage };
}
function getNextOccurrence(date, frequency) {
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
function generateRecurrences(startDate, frequency, count) {
    const dates = [startDate];
    let current = startDate;
    for (let i = 1; i < count; i++) {
        current = getNextOccurrence(current, frequency);
        dates.push(current);
    }
    return dates;
}
//# sourceMappingURL=date.js.map