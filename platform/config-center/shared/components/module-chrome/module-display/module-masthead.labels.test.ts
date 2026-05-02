import { describe, expect, it } from 'vitest';

import {
  describeFreshness,
  shouldDisplayHealthTag,
} from './module-masthead.labels';

describe('module-masthead.labels', () => {
  it('hides the health tag until a real health level exists', () => {
    expect(shouldDisplayHealthTag('unknown')).toBe(false);
    expect(shouldDisplayHealthTag('healthy')).toBe(true);
    expect(shouldDisplayHealthTag('critical')).toBe(true);
  });

  it('describes freshness in minutes, hours, and days', () => {
    const now = Date.parse('2026-01-01T12:00:00.000Z');

    expect(describeFreshness(now, '2026-01-01T11:59:30.000Z')).toEqual({ unit: 'just-now' });
    expect(describeFreshness(now, '2026-01-01T11:45:00.000Z')).toEqual({ unit: 'minutes', count: 15 });
    expect(describeFreshness(now, '2026-01-01T09:00:00.000Z')).toEqual({ unit: 'hours', count: 3 });
    expect(describeFreshness(now, '2025-12-29T12:00:00.000Z')).toEqual({ unit: 'days', count: 3 });
  });
});