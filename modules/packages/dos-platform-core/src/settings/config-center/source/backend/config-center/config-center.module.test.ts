import { describe, it, expect, vi } from 'vitest';

vi.mock('@dos/module-sdk', () => ({ registerModule: vi.fn() }));

describe('config-center module manifest', () => {
  it('exports a valid manifest', async () => {
    const mod = await import('./config-center.module');
    const manifest = mod.CONFIG_CENTER_MANIFEST ?? mod.default;
    expect(manifest).toBeTruthy();
    expect(manifest.code).toBe('config-center');
    expect(manifest.nameEn).toBeTruthy();
    expect(manifest.nameAr).toBeTruthy();
    expect(manifest.tier).toBeTruthy();
    expect(manifest.routeBase).toBeTruthy();
  });

  it('has security permissions defined', async () => {
    const mod = await import('./config-center.module');
    const manifest = mod.CONFIG_CENTER_MANIFEST ?? mod.default;
    expect(manifest.securityPermissions?.length).toBeGreaterThan(0);
  });

  it('has security roles defined', async () => {
    const mod = await import('./config-center.module');
    const manifest = mod.CONFIG_CENTER_MANIFEST ?? mod.default;
    expect(manifest.securityRoles?.length).toBeGreaterThan(0);
  });
});
