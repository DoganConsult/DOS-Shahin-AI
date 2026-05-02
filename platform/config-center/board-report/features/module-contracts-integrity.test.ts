import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const FEATURES_DIR = resolve(__dirname);

const ALL_UPGRADED_MODULES = [
  'action', 'admin', 'agrc-engine', 'analytics', 'asset', 'audit',
  'bcp', 'bootstrap', 'controls', 'dashboard', 'dora', 'exception',
  'governance-ai', 'governance-os', 'inbox', 'incident', 'integrations',
  'issues', 'journey', 'ksa-regulatory', 'local-knowledge', 'navigation',
  'notification', 'onboarding', 'packs', 'policy', 'portals', 'privacy',
  'proactive-leadership', 'provisioning', 'qiyas', 'records', 'remediation',
  'reporting', 'reports', 'risk', 'training', 'vendor', 'widgets',
];

const ARTIFACT_FILES = [
  { name: 'contracts', pattern: (m: string) => `${m}/contracts/${m}.contracts.ts` },
  { name: 'state', pattern: (m: string) => `${m}/state/${m}.state.ts` },
  { name: 'workflows', pattern: (m: string) => `${m}/workflows/${m}-lifecycle.ts` },
  { name: 'testing', pattern: (m: string) => `${m}/testing/${m}.test-utils.ts` },
  { name: 'index', pattern: (m: string) => `${m}/index.ts` },
];

describe('Module contract artifact existence', () => {
  for (const mod of ALL_UPGRADED_MODULES) {
    describe(mod, () => {
      for (const artifact of ARTIFACT_FILES) {
        it(`has ${artifact.name} file`, () => {
          const filePath = resolve(FEATURES_DIR, artifact.pattern(mod));
          expect(existsSync(filePath), `Missing: ${artifact.pattern(mod)}`).toBe(true);
        });
      }
    });
  }
});

describe('Contract quality — no generic stubs', () => {
  for (const mod of ALL_UPGRADED_MODULES) {
    const contractPath = resolve(FEATURES_DIR, `${mod}/contracts/${mod}.contracts.ts`);
    if (!existsSync(contractPath)) continue;
    const content = readFileSync(contractPath, 'utf-8');

    it(`${mod} contracts have no unknown[] types`, () => {
      expect(content).not.toContain('unknown[]');
    });

    it(`${mod} contracts have at least 4 exported types/interfaces`, () => {
      const exportCount = (content.match(/export (type|interface) /g) || []).length;
      expect(exportCount, `${mod} has only ${exportCount} exports`).toBeGreaterThanOrEqual(4);
    });

    it(`${mod} contracts have no generic 3-status pattern`, () => {
      expect(content).not.toMatch(new RegExp(`${mod.replace(/-/g, '_')}_draft`));
    });
  }

  for (const mod of ALL_UPGRADED_MODULES) {
    const statePath = resolve(FEATURES_DIR, `${mod}/state/${mod}.state.ts`);
    if (!existsSync(statePath)) continue;
    const stateContent = readFileSync(statePath, 'utf-8');

    it(`${mod} state has no unknown[] signals`, () => {
      expect(stateContent).not.toContain('unknown[]');
    });

    it(`${mod} state imports from contracts`, () => {
      expect(stateContent).toContain('../contracts/');
    });
  }
});

const MODULES_WITH_TYPED_TRANSITIONS = [
  'action', 'admin', 'agrc-engine', 'analytics', 'asset', 'audit',
  'bcp', 'bootstrap', 'controls', 'dashboard', 'dora', 'exception',
  'governance-ai', 'governance-os', 'inbox', 'incident', 'integrations',
  'issues', 'journey', 'ksa-regulatory', 'local-knowledge', 'navigation',
  'notification', 'onboarding', 'packs', 'policy', 'portals', 'privacy',
  'proactive-leadership', 'provisioning', 'qiyas', 'records', 'remediation',
  'reporting', 'reports', 'risk', 'training', 'vendor', 'widgets',
];

describe('Lifecycle transition maps — structural integrity', () => {
  for (const mod of MODULES_WITH_TYPED_TRANSITIONS) {
    const lifecyclePath = resolve(FEATURES_DIR, `${mod}/workflows/${mod}-lifecycle.ts`);
    if (!existsSync(lifecyclePath)) continue;
    const content = readFileSync(lifecyclePath, 'utf-8');

    it(`${mod} lifecycle exports a states array`, () => {
      expect(content).toMatch(/export const \w+_STATES/i);
    });

    it(`${mod} lifecycle exports a transition validation function`, () => {
      expect(content).toMatch(/export function isValid\w*Transition|export function canTransition|export function isValidTransition/);
    });

    it(`${mod} lifecycle imports from contracts`, () => {
      expect(content).toContain('../contracts/');
    });
  }
});

describe('Testing utilities — mock factory quality', () => {
  for (const mod of ALL_UPGRADED_MODULES) {
    const testUtilsPath = resolve(FEATURES_DIR, `${mod}/testing/${mod}.test-utils.ts`);
    if (!existsSync(testUtilsPath)) continue;
    const content = readFileSync(testUtilsPath, 'utf-8');

    it(`${mod} test-utils has at least 2 mock factories`, () => {
      const mockCount = (content.match(/export function mock/g) || []).length;
      expect(mockCount, `${mod} has only ${mockCount} mock factories`).toBeGreaterThanOrEqual(2);
    });

    it(`${mod} test-utils imports from contracts`, () => {
      expect(content).toContain('../contracts/');
    });

    it(`${mod} test-utils uses Partial<T> override pattern`, () => {
      expect(content).toContain('Partial<');
    });

    it(`${mod} mock factories return concrete data (no placeholder TODOs)`, () => {
      expect(content).not.toContain('TODO');
      expect(content).not.toContain('placeholder');
    });
  }
});

describe('Barrel index — export completeness', () => {
  for (const mod of ALL_UPGRADED_MODULES) {
    const indexPath = resolve(FEATURES_DIR, `${mod}/index.ts`);
    if (!existsSync(indexPath)) continue;
    const content = readFileSync(indexPath, 'utf-8');

    it(`${mod} index exports state service`, () => {
      expect(content).toMatch(/export \{[\s\S]*?State[\s\S]*?\} from/);
    });

    it(`${mod} index exports contract types`, () => {
      expect(content).toMatch(/export type \{[\s\S]*?Contract[\s\S]*?\} from|export \{[\s\S]*?Contract[\s\S]*?\} from/);
    });
  }
});

describe('Cross-module consistency — diagnostics contract shape', () => {
  for (const mod of ALL_UPGRADED_MODULES) {
    const contractPath = resolve(FEATURES_DIR, `${mod}/contracts/${mod}.contracts.ts`);
    if (!existsSync(contractPath)) continue;
    const content = readFileSync(contractPath, 'utf-8');

    const hasDiagnostics = content.includes('DiagnosticsContract');
    if (!hasDiagnostics) continue;

    it(`${mod} diagnostics contract has moduleCode field`, () => {
      expect(content).toMatch(/moduleCode:\s*string/);
    });

    it(`${mod} diagnostics contract has healthy field`, () => {
      expect(content).toMatch(/healthy:\s*boolean/);
    });

    it(`${mod} diagnostics contract has checks array`, () => {
      expect(content).toMatch(/checks:\s*\{/);
    });

    it(`${mod} diagnostics contract has checkedAt field`, () => {
      expect(content).toMatch(/checkedAt:\s*string/);
    });
  }
});
