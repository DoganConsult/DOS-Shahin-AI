import { describe, it, expect, vi } from 'vitest';

vi.mock('@dos/module-sdk', () => ({ registerModule: vi.fn() }));

describe('grc-query module manifest', () => {
  it('exports a valid manifest', async () => {
    const mod = await import('./grc-query.module');
    const manifest = mod.GRC_QUERY_MANIFEST ?? mod.default;
    expect(manifest).toBeTruthy();
    expect(manifest.code).toBe('grc-query');
    expect(manifest.nameEn).toBeTruthy();
    expect(manifest.nameAr).toBeTruthy();
    expect(manifest.tier).toBeTruthy();
    expect(manifest.routeBase).toBeTruthy();
  });

  it('has security permissions defined', async () => {
    const mod = await import('./grc-query.module');
    const manifest = mod.GRC_QUERY_MANIFEST ?? mod.default;
    expect(manifest.securityPermissions?.length).toBeGreaterThan(0);
  });

  it('has security roles defined', async () => {
    const mod = await import('./grc-query.module');
    const manifest = mod.GRC_QUERY_MANIFEST ?? mod.default;
    expect(manifest.securityRoles?.length).toBeGreaterThan(0);
  });
});
