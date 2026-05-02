import {  describe, it, expect , vi as _vi } from 'vitest';
import { EXCEPTION_MANIFEST } from './exception.module';

const manifest = EXCEPTION_MANIFEST;

describe('Exception Module Manifest', () => {
  it('has correct module code', () => { expect(manifest?.code).toBe('exception'); });
  it('has bilingual names', () => { expect(manifest?.nameEn).toBeTruthy(); expect(manifest?.nameAr).toBeTruthy(); });
  it('has tier and category', () => { expect(manifest?.tier).toBeTruthy(); expect(manifest?.category).toBeTruthy(); });
  it('has security permissions wired', () => { expect(manifest?.securityPermissions?.length).toBeGreaterThan(0); });
  it('has security roles wired', () => { expect(manifest?.securityRoles?.length).toBeGreaterThan(0); });
  it('has approval rules wired', () => { expect(manifest?.approvalRules?.length).toBeGreaterThan(0); });
  it('has route base', () => { expect(manifest?.routeBase).toBeTruthy(); });
  it('has event namespace', () => { expect(manifest?.eventNamespace).toBeTruthy(); });
});
