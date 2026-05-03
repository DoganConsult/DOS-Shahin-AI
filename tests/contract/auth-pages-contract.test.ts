/**
 * Phase M1.6 — Carbon Auth Pages Pack contract test.
 *
 * Source-level (no DOM) verification that the auth surface stays coherent
 * with the Carbon-only Dynamic-UI registry.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AUTH_PAGE_KEYS,
  AUTH_COMPONENT_KEYS,
  AUTH_EVENTS,
  isAuthPageKey,
  isAuthComponentKey,
  type AuthLoginPayload,
  type AuthRegisterPayload,
  type AuthMfaPayload,
} from '../../platform/ui-system/dos-ui-system/src/auth/auth.contract';

const REPO = resolve(__dirname, '..', '..');
const COMP_FILE = resolve(REPO, 'platform/ui-system/dos-ui-system/src/auth/auth-components.ts');
const PAGE_FILE = resolve(REPO, 'platform/ui-system/dos-ui-system/src/auth/auth-pages.ts');
const SEED_SQL  = resolve(REPO, 'platform/dos/migrations/public/20260503_0028_auth_pages_pack.sql');
const COMP_MAP  = resolve(REPO, 'platform/dos/registry/component-map.ts');
const UI_INDEX  = resolve(REPO, 'platform/ui-system/dos-ui-system/src/index.ts');

const EXPECTED_PAGES = [
  'auth.login.page','auth.register.page','auth.forgot-password.page',
  'auth.mfa.page','auth.reset-password.page',
] as const;

const EXPECTED_PRIMITIVES = [
  'auth.shell','auth.brand-panel','auth.login-card','auth.register-card',
  'auth.forgot-password-card','auth.reset-password-card','auth.mfa-card',
  'auth.field','auth.password-field','auth.dropdown','auth.checkbox',
  'auth.submit','auth.sso-actions','auth.notification','auth.progress',
  'auth.help','auth.language-toggle','auth.security-note','auth.skeleton',
] as const;

const EXPECTED_EVENTS = [
  'auth.login.submitted','auth.register.submitted','auth.register.step.changed',
  'auth.forgot-password.submitted','auth.reset-password.submitted',
  'auth.mfa.submitted','auth.sso.requested','auth.locale.changed',
] as const;

const PRIMITIVE_CLASSES = [
  'DosAuthShellComponent','DosAuthBrandPanelComponent','DosAuthLoginCardComponent',
  'DosAuthRegisterCardComponent','DosAuthForgotPasswordCardComponent',
  'DosAuthResetPasswordCardComponent','DosAuthMfaCardComponent',
  'DosAuthFieldComponent','DosAuthPasswordFieldComponent','DosAuthDropdownComponent',
  'DosAuthCheckboxComponent','DosAuthSubmitComponent','DosAuthSsoActionsComponent',
  'DosAuthNotificationComponent','DosAuthProgressComponent','DosAuthHelpComponent',
  'DosAuthLanguageToggleComponent','DosAuthSecurityNoteComponent','DosAuthSkeletonComponent',
] as const;

const PAGE_CLASSES = [
  'DosAuthLoginPageComponent','DosAuthRegisterPageComponent',
  'DosAuthForgotPasswordPageComponent','DosAuthMfaPageComponent',
  'DosAuthResetPasswordPageComponent',
] as const;

describe('M1.6 — auth pages pack contract', () => {
  it('declares the 5 page keys + 19 primitive keys + 8 events', () => {
    expect(AUTH_PAGE_KEYS).toEqual([...EXPECTED_PAGES]);
    expect(AUTH_COMPONENT_KEYS).toEqual([...EXPECTED_PRIMITIVES]);
    expect(AUTH_EVENTS).toEqual([...EXPECTED_EVENTS]);
    expect(new Set(AUTH_PAGE_KEYS).size).toBe(5);
    expect(new Set(AUTH_COMPONENT_KEYS).size).toBe(19);
    expect(new Set(AUTH_EVENTS).size).toBe(8);
  });

  it('typeguards reject unknown keys', () => {
    expect(isAuthPageKey('auth.login.page')).toBe(true);
    expect(isAuthPageKey('marketing.home.page')).toBe(false);
    expect(isAuthComponentKey('auth.field')).toBe(true);
    expect(isAuthComponentKey('agent.card')).toBe(false);
  });

  it('payload types are well-formed', () => {
    const login: AuthLoginPayload = { email: 'a@b.c', password: 'p', rememberMe: true };
    const reg: AuthRegisterPayload = {
      fullName: 'n', email: 'e', password: 'p', company: 'c',
      country: 'SA', acceptedTerms: true,
    };
    const mfa: AuthMfaPayload = { code: '000000', method: 'totp' };
    expect(login.email).toBe('a@b.c');
    expect(reg.country).toBe('SA');
    expect(mfa.method).toBe('totp');
  });

  describe('source-level invariants', () => {
    const csrc = readFileSync(COMP_FILE, 'utf8');
    const psrc = readFileSync(PAGE_FILE, 'utf8');

    it('exports a standalone Dos*Component class for every primitive', () => {
      for (const cls of PRIMITIVE_CLASSES) {
        expect(csrc).toMatch(new RegExp(`export class ${cls}\\b`));
      }
    });

    it('exports a standalone Dos*PageComponent class for every page', () => {
      for (const cls of PAGE_CLASSES) {
        expect(psrc).toMatch(new RegExp(`export class ${cls}\\b`));
      }
    });

    it('owns no local executor (no fetch / HttpClient / pool.query / XHR / localStorage)', () => {
      const strip = (s: string) => s
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const src of [strip(csrc), strip(psrc)]) {
        expect(src).not.toMatch(/\bfetch\s*\(/);
        expect(src).not.toMatch(/\bHttpClient\b/);
        expect(src).not.toMatch(/\bpool\.query\b/);
        expect(src).not.toMatch(/\bnew\s+XMLHttpRequest\b/);
        expect(src).not.toMatch(/\blocalStorage\b/);
      }
    });

    it('every event key appears in components source', () => {
      for (const e of EXPECTED_EVENTS) {
        // submitted-style events live in the cards; locale.changed in toggle, etc.
        // every key must appear at least once across the components file.
        expect(csrc).toContain(`'${e}'`);
      }
    });

    it('login + register + forgot + reset + mfa cards expose markCompleted hook', () => {
      const cards = [
        'DosAuthLoginCardComponent',
        'DosAuthRegisterCardComponent',
        'DosAuthForgotPasswordCardComponent',
        'DosAuthResetPasswordCardComponent',
        'DosAuthMfaCardComponent',
      ];
      for (const cls of cards) {
        const idx = csrc.indexOf(`export class ${cls}`);
        expect(idx).toBeGreaterThan(-1);
        const next = csrc.indexOf('export class', idx + 12);
        const body = csrc.slice(idx, next === -1 ? csrc.length : next);
        expect(body).toMatch(/markCompleted\s*\(/);
      }
    });

    it('login card emits auth.login.submitted; register emits step.changed', () => {
      expect(csrc).toContain("'auth.login.submitted'");
      expect(csrc).toContain("'auth.register.submitted'");
      expect(csrc).toContain("'auth.register.step.changed'");
    });

    it('mfa card opts into bottom-sheet on mobile', () => {
      expect(csrc).toContain("data-mobile-mode");
      expect(csrc).toMatch(/bottom-sheet/);
    });

    it('pages flip dir to rtl when locale=ar', () => {
      // shell sets [attr.dir]
      expect(csrc).toMatch(/locale === 'ar' \? 'rtl' : 'ltr'/);
    });
  });

  describe('DB seed coherence (migration 0028)', () => {
    const seed = readFileSync(SEED_SQL, 'utf8');

    it('registers all 5 page keys + 19 primitive keys as ibm-carbon, approved', () => {
      for (const k of [...EXPECTED_PAGES, ...EXPECTED_PRIMITIVES]) {
        expect(seed).toContain(`'${k}'`);
      }
      const carbonRows = (seed.match(/'ibm-carbon'/g) || []).length;
      expect(carbonRows).toBeGreaterThanOrEqual(EXPECTED_PAGES.length + EXPECTED_PRIMITIVES.length);
      expect(seed).toMatch(/'approved'/);
    });

    it('inserts the 5 public auth routes with tenant_id IS NULL', () => {
      for (const r of ['/login','/register','/forgot-password','/mfa','/reset-password']) {
        expect(seed).toContain(`'${r}'`);
      }
      expect(seed).toMatch(/tenant_id\s+IS\s+NULL[\s\S]+module_code\s*=\s*'dauth'/i);
    });
  });

  describe('registry + index wiring', () => {
    const map = readFileSync(COMP_MAP, 'utf8');
    const idx = readFileSync(UI_INDEX, 'utf8');

    it('component-map.ts registers all 24 auth.* keys', () => {
      for (const k of [...EXPECTED_PAGES, ...EXPECTED_PRIMITIVES]) {
        expect(map).toContain(`'${k}'`);
      }
    });

    it('@dos/ui-system index re-exports the 3 auth modules', () => {
      expect(idx).toMatch(/auth\/auth\.contract/);
      expect(idx).toMatch(/auth\/auth-components/);
      expect(idx).toMatch(/auth\/auth-pages/);
    });
  });
});
