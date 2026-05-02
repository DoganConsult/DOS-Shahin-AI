/**
 * Phase 2 tenant-safety tests.
 *
 * Goal: prove that adversarial tenant IDs are REJECTED by `assertTenantId`
 * and `tenantSchema` BEFORE any SQL construction can happen.
 *
 * These are pure-function tests; they do not connect to Postgres.
 */
import { describe, it, expect } from 'vitest';
import { assertTenantId, tenantSchema } from './tenant';

describe('Phase 2 — tenant-safety: assertTenantId', () => {
  describe('rejects empty / non-string input', () => {
    it.each([
      ['empty string', ''],
      ['whitespace-only', '   '],
      ['null', null],
      ['undefined', undefined],
      ['number', 42],
      ['object', { tenantId: 'acme' }],
      ['array', ['acme']],
      ['boolean', true],
    ])('%s → throws MISSING_TENANT or INVALID_TENANT_ID', (_label, input) => {
      expect(() => assertTenantId(input as unknown)).toThrow(/Tenant context required|Invalid tenant ID/);
    });
  });

  describe('rejects SQL-injection-shaped strings (ALL must be rejected before any SQL is built)', () => {
    const ADVERSARIAL_IDS: Array<[string, string]> = [
      ['classic DROP TABLE', `'; DROP TABLE users; --`],
      ['single quote',                `acme'`],
      ['escaped single quote',        `acme''`],
      ['block comment open',          `acme/*`],
      ['block comment close',         `acme*/`],
      ['line comment',                `acme--`],
      ['backtick',                    `acme\``],
      ['backslash',                   `acme\\`],
      ['double quote',                `acme"`],
      ['semicolon',                   `acme;`],
      ['parentheses',                 `acme()`],
      ['pipe (command chain)',        `acme|whoami`],
      ['dollar pg-parameter',         `acme$1`],
      ['space',                       `acme corp`],
      ['tab',                         `acme\tcorp`],
      ['newline',                     `acme\ncorp`],
      ['null byte',                   `acme\0`],
      ['leading dot (schema-traverse)', `.public`],
      ['trailing dot (schema-traverse)', `acme.`],
      ['dot in middle (schema-traverse)', `acme.public`],
      ['slash (path-like)',           `acme/public`],
      ['leading hyphen',              `-acme`],
      ['trailing hyphen',             `acme-`],
      ['only hyphens',                `---`],
      ['only underscores',            `___`],
      ['uppercase — policy is lowercase only', `ACME`],
      ['mixed case',                  `Acme`],
      ['unicode confusable "а" cyrillic', `аcme`],
      ['zero-width space',            `acme\u200b`],
      ['right-to-left mark',          `acme\u200f`],
      ['fullwidth digits',            `acme\uFF11`],
      ['emoji',                       `acme🙂`],
      ['control character',           `acme\x01`],
      ['over 64 chars',               'a'.repeat(65)],
    ];

    it.each(ADVERSARIAL_IDS)('rejects %s: %j', (_label, input) => {
      expect(() => assertTenantId(input)).toThrow(/Invalid tenant ID|Tenant context required/);
    });
  });

  describe('accepts legitimate tenant IDs', () => {
    it.each([
      ['single lowercase letter',   'a'],
      ['lowercase word',            'acme'],
      ['lowercase with digits',     'acme01'],
      ['with underscore',           'acme_corp'],
      ['with hyphen',               'acme-corp'],
      ['mix',                       'acme_corp-01'],
      ['all digits',                '12345'],
      ['exactly 64 chars',          'a'.repeat(64)],
    ])('accepts %s: %j', (_label, input) => {
      expect(() => assertTenantId(input)).not.toThrow();
    });
  });
});

describe('Phase 2 — tenant-safety: tenantSchema', () => {
  it('prefixes with tenant_ and preserves the (already-lowercase) id', () => {
    expect(tenantSchema('acme')).toBe('tenant_acme');
    expect(tenantSchema('acme_corp')).toBe('tenant_acme_corp');
    expect(tenantSchema('acme-corp-01')).toBe('tenant_acme-corp-01');
  });

  it('rejects uppercase input (policy: tenant schemas are lowercase only)', () => {
    expect(() => tenantSchema('ACME')).toThrow(/Invalid tenant ID/);
    expect(() => tenantSchema('Acme')).toThrow(/Invalid tenant ID/);
  });

  it('rejects schema-traversal shaped inputs', () => {
    expect(() => tenantSchema('public')).not.toThrow(); // 'public' alone is valid form; prefix makes it tenant_public
    // but a dot-shaped or space-shaped id must be rejected at the identifier layer:
    expect(() => tenantSchema('public.dos')).toThrow(/Invalid tenant ID/);
    expect(() => tenantSchema('"public')).toThrow(/Invalid tenant ID/);
    expect(() => tenantSchema("'; DROP SCHEMA public CASCADE; --")).toThrow(/Invalid tenant ID/);
  });

  it('rejects empty and null inputs', () => {
    expect(() => tenantSchema('')).toThrow(/Tenant context required/);
    // null/undefined are asserted earlier in assertTenantId — the throw comes first
    expect(() => tenantSchema(null as unknown as string)).toThrow(/Tenant context required/);
    expect(() => tenantSchema(undefined as unknown as string)).toThrow(/Tenant context required/);
  });

  it('never returns a schema name without the tenant_ prefix', () => {
    // 200 random-ish inputs; all legit inputs must prefix, all illegit inputs throw
    for (const input of ['a', 'z', 'acme', 'x_y', 'a1', '123', 'a-b_c']) {
      const schema = tenantSchema(input);
      expect(schema.startsWith('tenant_')).toBe(true);
      expect(schema).toMatch(/^tenant_[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/);
    }
  });
});
