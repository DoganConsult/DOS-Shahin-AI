import {  describe, it, expect, beforeAll , vi as _vi } from 'vitest';

let manifest: any;

beforeAll(async () => {
  const mod = await import('./local-knowledge.module');
  manifest = mod.LOCAL_KNOWLEDGE_MANIFEST ?? mod.default?.manifest;
});

describe('Local Knowledge Module Manifest', () => {
  it('has correct module code', () => { expect(manifest?.code).toBe('local-knowledge'); });
  it('has bilingual names', () => { expect(manifest?.nameEn).toBeTruthy(); expect(manifest?.nameAr).toBeTruthy(); });
  it('has tier and category', () => { expect(manifest?.tier).toBeTruthy(); expect(manifest?.category).toBeTruthy(); });
  it('has security permissions wired', () => { expect(manifest?.securityPermissions?.length).toBeGreaterThan(0); });
  it('has security roles wired', () => { expect(manifest?.securityRoles?.length).toBeGreaterThan(0); });
  it('has approval rules wired', () => { expect(manifest?.approvalRules?.length).toBeGreaterThan(0); });
  it('has route base', () => { expect(manifest?.routeBase).toBeTruthy(); });
  it('has event namespace', () => { expect(manifest?.eventNamespace).toBeTruthy(); });
});
