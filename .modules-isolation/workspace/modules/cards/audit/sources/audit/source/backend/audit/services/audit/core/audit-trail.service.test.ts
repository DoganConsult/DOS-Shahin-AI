/**
 * Co-located tests for audit-trail.service.ts
 * Tests pure functions: csvEscape. DB-dependent functions require integration tests.
 */
import {  describe, it, expect , vi as _vi } from 'vitest';
import { csvEscape, type AuditEntry, type AuditFilters as _AuditFilters } from './audit-trail.service';

describe('audit-trail.service — csvEscape', () => {
  it('returns empty string for null/undefined', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('returns plain text unchanged when no special chars', () => {
    expect(csvEscape('hello world')).toBe('hello world');
  });

  it('wraps values containing commas in double quotes', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
  });

  it('escapes double quotes by doubling them', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('neutralizes CSV formula injection with leading =', () => {
    const result = csvEscape('=CMD()');
    expect(result).toContain("'");
    expect(result.startsWith('"')).toBe(true);
  });

  it('neutralizes CSV formula injection with leading +', () => {
    const result = csvEscape('+1+2');
    expect(result).toContain("'");
  });

  it('neutralizes CSV formula injection with leading -', () => {
    const result = csvEscape('-1-2');
    expect(result).toContain("'");
  });

  it('neutralizes CSV formula injection with leading @', () => {
    const result = csvEscape('@SUM(A1)');
    expect(result).toContain("'");
  });

  it('handles newlines by quoting', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('audit-trail.service — type definitions', () => {
  it('AuditEntry interface accepts all valid action types', () => {
    const entry: AuditEntry = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      module: 'risk',
      action: 'create',
      entityType: 'risk',
      entityId: 'r-001',
    };
    expect(entry.action).toBe('create');

    // Verify custom string actions are accepted via intersection type
    const customEntry: AuditEntry = { ...entry, action: 'custom_action' };
    expect(customEntry.action).toBe('custom_action');
  });
});
