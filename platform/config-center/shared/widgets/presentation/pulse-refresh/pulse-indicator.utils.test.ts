import { describe, it, expect } from 'vitest';
import { computePulseState, formatRelativeTime } from './pulse-indicator.utils';

// ── computePulseState ──

describe('computePulseState', () => {
  const now = new Date('2025-01-15T12:00:00Z');

  it('returns red when errorState is true regardless of time', () => {
    const fresh = new Date('2025-01-15T11:59:00Z'); // 1 min ago
    expect(computePulseState(fresh, now, true)).toBe('red');
  });

  it('returns red when lastUpdated is null', () => {
    expect(computePulseState(null, now, false)).toBe('red');
  });

  it('returns green when data is less than 5 minutes old', () => {
    const recent = new Date('2025-01-15T11:56:00Z'); // 4 min ago
    expect(computePulseState(recent, now, false)).toBe('green');
  });

  it('returns green when data is exactly 0 minutes old', () => {
    expect(computePulseState(now, now, false)).toBe('green');
  });

  it('returns amber when data is exactly 5 minutes old', () => {
    const fiveMin = new Date('2025-01-15T11:55:00Z');
    expect(computePulseState(fiveMin, now, false)).toBe('amber');
  });

  it('returns amber when data is between 5 and 15 minutes old', () => {
    const tenMin = new Date('2025-01-15T11:50:00Z');
    expect(computePulseState(tenMin, now, false)).toBe('amber');
  });

  it('returns amber when data is exactly 15 minutes old', () => {
    const fifteenMin = new Date('2025-01-15T11:45:00Z');
    expect(computePulseState(fifteenMin, now, false)).toBe('amber');
  });

  it('returns red when data is older than 15 minutes', () => {
    const old = new Date('2025-01-15T11:44:00Z'); // 16 min ago
    expect(computePulseState(old, now, false)).toBe('red');
  });
});

// ── formatRelativeTime ──

describe('formatRelativeTime', () => {
  const now = new Date('2025-01-15T12:00:00Z');

  it('returns "just now" for English when diff < 1 min', () => {
    const recent = new Date('2025-01-15T11:59:30Z');
    expect(formatRelativeTime(recent, now, 'en')).toBe('just now');
  });

  it('returns "الآن" for Arabic when diff < 1 min', () => {
    const recent = new Date('2025-01-15T11:59:30Z');
    expect(formatRelativeTime(recent, now, 'ar')).toBe('الآن');
  });

  it('returns minutes for English', () => {
    const fiveMin = new Date('2025-01-15T11:55:00Z');
    expect(formatRelativeTime(fiveMin, now, 'en')).toBe('5 min ago');
  });

  it('returns minutes for Arabic with Arabic digits', () => {
    const fiveMin = new Date('2025-01-15T11:55:00Z');
    expect(formatRelativeTime(fiveMin, now, 'ar')).toBe('منذ ٥ دقيقة');
  });

  it('returns singular hour for English', () => {
    const oneHr = new Date('2025-01-15T11:00:00Z');
    expect(formatRelativeTime(oneHr, now, 'en')).toBe('1 hr ago');
  });

  it('returns plural hours for English', () => {
    const threeHr = new Date('2025-01-15T09:00:00Z');
    expect(formatRelativeTime(threeHr, now, 'en')).toBe('3 hrs ago');
  });

  it('returns singular day for English', () => {
    const oneDay = new Date('2025-01-14T12:00:00Z');
    expect(formatRelativeTime(oneDay, now, 'en')).toBe('1 day ago');
  });

  it('returns plural days for English', () => {
    const threeDays = new Date('2025-01-12T12:00:00Z');
    expect(formatRelativeTime(threeDays, now, 'en')).toBe('3 days ago');
  });

  it('returns Arabic dual form for 2 minutes', () => {
    const twoMin = new Date('2025-01-15T11:58:00Z');
    expect(formatRelativeTime(twoMin, now, 'ar')).toBe('منذ دقيقتين');
  });

  it('returns Arabic singular for 1 minute', () => {
    const oneMin = new Date('2025-01-15T11:59:00Z');
    expect(formatRelativeTime(oneMin, now, 'ar')).toBe('منذ دقيقة');
  });

  it('returns Arabic hour forms', () => {
    const oneHr = new Date('2025-01-15T11:00:00Z');
    expect(formatRelativeTime(oneHr, now, 'ar')).toBe('منذ ساعة');

    const twoHr = new Date('2025-01-15T10:00:00Z');
    expect(formatRelativeTime(twoHr, now, 'ar')).toBe('منذ ساعتين');

    const threeHr = new Date('2025-01-15T09:00:00Z');
    expect(formatRelativeTime(threeHr, now, 'ar')).toContain('ساعات');
  });

  it('always returns a non-empty string', () => {
    expect(formatRelativeTime(now, now, 'en').length).toBeGreaterThan(0);
    expect(formatRelativeTime(now, now, 'ar').length).toBeGreaterThan(0);
  });
});
