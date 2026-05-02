/**
 * Pure functions for the PulseIndicator widget.
 * No Angular dependencies — fully testable in isolation.
 */

export type PulseState = 'green' | 'amber' | 'red';

/**
 * Computes pulse indicator state from lastUpdated timestamp.
 *
 * - errorState true → 'red'
 * - lastUpdated null → 'red'
 * - diff < 5 min → 'green'
 * - diff 5–15 min → 'amber'
 * - diff > 15 min → 'red'
 */
export function computePulseState(
  lastUpdated: Date | null,
  now: Date,
  errorState: boolean
): PulseState {
  if (errorState) return 'red';
  if (lastUpdated === null) return 'red';

  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMin = diffMs / 60_000;

  if (diffMin < 5) return 'green';
  if (diffMin <= 15) return 'amber';
  return 'red';
}

/**
 * Formats a timestamp as a human-readable relative string.
 * Supports Arabic ('ar') and English ('en').
 *
 * Examples (en): "just now", "2 min ago", "1 hr ago", "3 hrs ago", "1 day ago"
 * Examples (ar): "الآن", "منذ ٢ دقيقة", "منذ ساعة", "منذ ٣ ساعات", "منذ يوم"
 */
export function formatRelativeTime(date: Date, now: Date, lang: 'ar' | 'en'): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (lang === 'ar') {
    return formatArabic(diffMin, diffHr, diffDay);
  }
  return formatEnglish(diffMin, diffHr, diffDay);
}

// ── Arabic formatting ──

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => AR_DIGITS[parseInt(d, 10)]);
}

function formatArabic(min: number, hr: number, day: number): string {
  if (min < 1) return 'الآن';
  if (min < 60) {
    if (min === 1) return 'منذ دقيقة';
    if (min === 2) return 'منذ دقيقتين';
    return `منذ ${toArabicDigits(min)} دقيقة`;
  }
  if (hr < 24) {
    if (hr === 1) return 'منذ ساعة';
    if (hr === 2) return 'منذ ساعتين';
    return `منذ ${toArabicDigits(hr)} ساعات`;
  }
  if (day === 1) return 'منذ يوم';
  if (day === 2) return 'منذ يومين';
  return `منذ ${toArabicDigits(day)} أيام`;
}

// ── English formatting ──

function formatEnglish(min: number, hr: number, day: number): string {
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return hr === 1 ? '1 hr ago' : `${hr} hrs ago`;
  return day === 1 ? '1 day ago' : `${day} days ago`;
}
