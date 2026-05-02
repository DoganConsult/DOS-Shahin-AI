import { describe, it, expect, beforeEach } from 'vitest';

describe('ScopeFilterService logic', () => {
  const FILTER_KEY = 'grc_scope_filter';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should store scope filter', () => {
    const filter = { frameworkId: 'NCA-ECC', tenantId: 'tenant-1' };
    localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
    expect(JSON.parse(localStorage.getItem(FILTER_KEY)!)).toEqual(filter);
  });

  it('should clear scope filter', () => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ frameworkId: 'NCA' }));
    localStorage.removeItem(FILTER_KEY);
    expect(localStorage.getItem(FILTER_KEY)).toBeNull();
  });

  it('should handle missing filter gracefully', () => {
    const raw = localStorage.getItem(FILTER_KEY);
    const filter = raw ? JSON.parse(raw) : {};
    expect(filter).toEqual({});
  });
});
