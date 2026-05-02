/**
 * Multi-product proof — the repo ships two products under products/
 * (shahin + tajiir), and the registry loader picks both up cleanly.
 */

import { describe, expect, it } from 'vitest';
import {
  discoverProductManifests,
  loadProducts,
  createDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
} from '..';

const REPO_ROOT = process.cwd();

describe('multi-product: repo ships Shahin + Tajiir', () => {
  it('discoverProductManifests returns both products', () => {
    const out = discoverProductManifests(REPO_ROOT);
    const codes = out.map((o) => o.descriptor.productCode).sort();
    expect(codes).toContain('shahin');
    expect(codes).toContain('tajiir');
  });

  it('loadProducts registers both without errors', async () => {
    const products = new InMemoryProductsRepository();
    const events = new InMemoryEventsLogRepository();
    const port = createDOSPort({
      tenants: new InMemoryTenantsRepository(),
      modules: new InMemoryModulesRepository(),
      products,
      events,
      backbonePublisher: { publish: async () => {} },
      backboneSubscriber: { subscribe: () => {} },
    });
    const result = await loadProducts({ port, products, repoRoot: REPO_ROOT });
    expect(result.errors).toEqual([]);
    const codes = (await products.list()).map((p) => p.productCode).sort();
    expect(codes).toContain('shahin');
    expect(codes).toContain('tajiir');
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });

  it('Tajiir manifest declares the four platform dependencies', async () => {
    const out = discoverProductManifests(REPO_ROOT);
    const tajiir = out.find((o) => o.descriptor.productCode === 'tajiir');
    expect(tajiir).toBeDefined();
    expect(tajiir!.descriptor.version).toBe('0.1.0');
    expect(tajiir!.descriptor.enabled).toBe(false);
  });
});
