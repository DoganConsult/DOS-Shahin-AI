import { describe, it, expect, beforeAll } from 'vitest';
import { setModuleRegistry } from '@dos/module-sdk';

// Provide a minimal in-memory registry so registerModule() doesn't throw.
const _registeredManifests: any[] = [];
setModuleRegistry({ register: (m: any) => _registeredManifests.push(m) });

let manifest: any;

beforeAll(async () => {
  const mod = await import('./foundation.module');
  manifest = mod.FOUNDATION_MANIFEST ?? mod.default?.manifest;
});

describe('Foundation Module Manifest', () => {
  it('has correct module code', () => { expect(manifest?.code).toBe('foundation'); });
  it('has bilingual names', () => { expect(manifest?.nameEn).toBeTruthy(); expect(manifest?.nameAr).toBeTruthy(); });
  it('has tier and category', () => { expect(manifest?.tier).toBeTruthy(); expect(manifest?.category).toBeTruthy(); });
  it('has security permissions wired', () => { expect(manifest?.securityPermissions?.length).toBeGreaterThan(0); });
  it('has security roles wired', () => { expect(manifest?.securityRoles?.length).toBeGreaterThan(0); });
  it('has approval rules wired', () => { expect(manifest?.approvalRules?.length).toBeGreaterThan(0); });
  it('has route base', () => { expect(manifest?.routeBase).toBeTruthy(); });
  it('has event namespace', () => { expect(manifest?.eventNamespace).toBeTruthy(); });
});
