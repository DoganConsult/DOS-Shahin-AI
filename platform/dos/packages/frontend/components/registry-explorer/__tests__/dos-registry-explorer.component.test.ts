import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(process.cwd(), 'platform/dos/packages/frontend/components/registry-explorer/dos-registry-explorer.component.ts'),
  'utf8',
);

describe('DosRegistryExplorerComponent — file surface', () => {
  it('is a standalone Angular component with the expected selector', () => {
    expect(SRC).toMatch(/standalone:\s*true/);
    expect(SRC).toMatch(/selector:\s*['"]dos-registry-explorer['"]/);
    expect(SRC).toMatch(/export class DosRegistryExplorerComponent/);
  });

  it('uses OnPush change detection', () => {
    expect(SRC).toMatch(/changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
  });

  it('injects THREE DOS DI tokens (no direct @dos/dos-core import)', () => {
    expect(SRC).toMatch(/inject<DOSModuleRegistryPort>\(DOS_MODULE_REGISTRY_PORT\)/);
    expect(SRC).toMatch(/inject<DOSProductRegistryPort>\(DOS_PRODUCT_REGISTRY_PORT\)/);
    expect(SRC).toMatch(/inject<DOSTenantLookupPort>\(DOS_TENANT_LOOKUP_PORT\)/);
    expect(SRC).not.toMatch(/from ['"]@dos\/dos-core/);
  });

  it('renders distinct sections for products, modules, tenant lookup', () => {
    expect(SRC).toMatch(/<section class="dos-explorer__products"/);
    expect(SRC).toMatch(/<section class="dos-explorer__modules"/);
    expect(SRC).toMatch(/<section class="dos-explorer__tenant-lookup"/);
  });

  it('modules table offers filter radios for layer', () => {
    expect(SRC).toMatch(/\[\(ngModel\)\]="layerFilter"\s+value=""/);
    expect(SRC).toMatch(/\[\(ngModel\)\]="layerFilter"\s+value="platform"/);
    expect(SRC).toMatch(/\[\(ngModel\)\]="layerFilter"\s+value="product"/);
  });

  it('uses signals for reactive state', () => {
    expect(SRC).toMatch(/readonly loading = signal/);
    expect(SRC).toMatch(/readonly error = signal/);
    expect(SRC).toMatch(/_modules = signal/);
    expect(SRC).toMatch(/_products = signal/);
    expect(SRC).toMatch(/_tenant = signal/);
  });

  it('refreshAll() + applyFilter() + lookupTenant() handlers exist', () => {
    expect(SRC).toMatch(/async refreshAll\(\):/);
    expect(SRC).toMatch(/async applyFilter\(\):/);
    expect(SRC).toMatch(/async lookupTenant\(\):/);
  });
});
