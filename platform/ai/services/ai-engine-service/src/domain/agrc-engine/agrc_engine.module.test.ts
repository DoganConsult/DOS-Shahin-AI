import {  describe, it, expect, beforeAll , vi as _vi } from 'vitest';

let manifest: any;
_vi.mock('@dos/module-sdk', () => ({ registerModule: _vi.fn() }));

beforeAll(async () => {
  const mod = await import('./agrc_engine.module');
  manifest = mod.AGRC_ENGINE_MANIFEST ?? mod.default?.manifest;
});

describe('Agrc Engine Module Manifest', () => {
  it('has correct module code', () => { expect(manifest?.code).toBe('agrc-engine'); });
  it('has bilingual names', () => { expect(manifest?.nameEn).toBeTruthy(); expect(manifest?.nameAr).toBeTruthy(); });
  it('has tier and category', () => { expect(manifest?.tier).toBeTruthy(); expect(manifest?.category).toBeTruthy(); });
  it('has security permissions wired', () => { expect(manifest?.securityPermissions?.length).toBeGreaterThan(0); });
  it('has security roles wired', () => { expect(manifest?.securityRoles?.length).toBeGreaterThan(0); });
  it('has approval rules wired', () => { expect(manifest?.approvalRules?.length).toBeGreaterThan(0); });
  it('has route base', () => { expect(manifest?.routeBase).toBeTruthy(); });
  it('has event namespace', () => { expect(manifest?.eventNamespace).toBeTruthy(); });
});
