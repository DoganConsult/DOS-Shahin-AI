import { describe, it, expect, vi } from 'vitest';

vi.mock('@dos/module-sdk', () => ({ registerModule: vi.fn() }));

describe('playbooks module manifest', () => {
  it('exports a valid manifest', async () => {
    const mod = await import('./playbooks.module');
    const manifest = mod.PLAYBOOKS_MANIFEST ?? mod.default;
    expect(manifest).toBeTruthy();
    expect(manifest.code).toBe('playbooks');
    expect(manifest.nameEn).toBeTruthy();
    expect(manifest.nameAr).toBeTruthy();
    expect(manifest.tier).toBeTruthy();
    expect(manifest.routeBase).toBeTruthy();
  });

  it('has security permissions defined', async () => {
    const mod = await import('./playbooks.module');
    const manifest = mod.PLAYBOOKS_MANIFEST ?? mod.default;
    expect(manifest.securityPermissions?.length).toBeGreaterThan(0);
  });

  it('has security roles defined', async () => {
    const mod = await import('./playbooks.module');
    const manifest = mod.PLAYBOOKS_MANIFEST ?? mod.default;
    expect(manifest.securityRoles?.length).toBeGreaterThan(0);
  });
});
