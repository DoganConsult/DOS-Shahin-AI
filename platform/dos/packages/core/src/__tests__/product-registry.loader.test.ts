import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadProducts,
  discoverProductManifests,
  createDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
} from '..';

function makeTempRepo(): string {
  return mkdtempSync(join(tmpdir(), 'dos-test-'));
}

function writeProductManifest(
  repoRoot: string,
  productDir: string,
  manifest: Record<string, unknown>,
): void {
  const dir = join(repoRoot, 'products', productDir, 'manifest');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'product.manifest.json'), JSON.stringify(manifest, null, 2));
}

describe('loadProducts', () => {
  let repoRoot: string;
  let products: InMemoryProductsRepository;
  let events: InMemoryEventsLogRepository;
  let port: ReturnType<typeof createDOSPort>;

  beforeEach(() => {
    repoRoot = makeTempRepo();
    products = new InMemoryProductsRepository();
    events = new InMemoryEventsLogRepository();
    port = createDOSPort({
      tenants: new InMemoryTenantsRepository(),
      modules: new InMemoryModulesRepository(),
      products,
      events,
      backbonePublisher: { publish: async () => {} },
      backboneSubscriber: { subscribe: () => {} },
    });
  });
  afterEach(() => rmSync(repoRoot, { recursive: true, force: true }));

  it('returns empty result when there is no products/ directory', async () => {
    const r = await loadProducts({ port, products, repoRoot });
    expect(r).toEqual({ discovered: 0, registered: [], errors: [] });
  });

  it('registers every product with a valid manifest', async () => {
    writeProductManifest(repoRoot, 'shahin', {
      product_code: 'shahin-ai',
      version: '1.0.0',
      enabled_by_default: false,
      display_name: 'Shahin-AI GRC',
    });
    writeProductManifest(repoRoot, 'tajiir', {
      productCode: 'tajiir',
      version: '0.1.0',
      displayName: 'Tajiir',
    });

    const r = await loadProducts({ port, products, repoRoot });
    expect(r.registered).toHaveLength(2);
    expect(r.errors).toEqual([]);
    const codes = (await products.list()).map((p) => p.productCode).sort();
    expect(codes).toEqual(['shahin-ai', 'tajiir']);

    // Each registration publishes a dos.product.registered event.
    const registerEvents = await events.byType('dos.product.registered', 10);
    expect(registerEvents).toHaveLength(2);
  });

  it('honours enabled_by_default = false (tajiir default true, shahin explicitly false)', async () => {
    writeProductManifest(repoRoot, 'shahin', { product_code: 'shahin-ai', version: '1', enabled_by_default: false });
    writeProductManifest(repoRoot, 'tajiir', { product_code: 'tajiir', version: '1' });

    await loadProducts({ port, products, repoRoot });
    const list = await products.list();
    const shahin = list.find((p) => p.productCode === 'shahin-ai')!;
    const tajiir = list.find((p) => p.productCode === 'tajiir')!;
    expect(shahin.enabled).toBe(false);
    expect(tajiir.enabled).toBe(true);
  });

  it('falls back to directory name when manifest omits product_code', async () => {
    writeProductManifest(repoRoot, 'falafel', { version: '0.5.0' });
    const r = await loadProducts({ port, products, repoRoot });
    expect(r.registered[0].productCode).toBe('falafel');
  });

  it('collects parse errors without blocking the rest', async () => {
    writeProductManifest(repoRoot, 'good', { product_code: 'good-1', version: '1' });
    // invalid JSON
    const dir = join(repoRoot, 'products', 'broken', 'manifest');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'product.manifest.json'), '{ not json');

    const r = await loadProducts({ port, products, repoRoot });
    expect(r.registered).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].dir).toBe('broken');
  });

  it('is idempotent — re-run upserts without failing', async () => {
    writeProductManifest(repoRoot, 'shahin', { product_code: 'shahin-ai', version: '1.0.0' });
    await loadProducts({ port, products, repoRoot });
    // Bump version, re-run.
    writeProductManifest(repoRoot, 'shahin', { product_code: 'shahin-ai', version: '1.0.1' });
    const r = await loadProducts({ port, products, repoRoot });
    expect(r.errors).toHaveLength(0);
    const list = await products.list();
    expect(list).toHaveLength(1);
    expect(list[0].version).toBe('1.0.1');
  });
});

describe('discoverProductManifests', () => {
  it('returns an array without touching the DB', () => {
    const repoRoot = makeTempRepo();
    try {
      writeProductManifest(repoRoot, 'p1', { product_code: 'p1', version: '1' });
      writeProductManifest(repoRoot, 'p2', { product_code: 'p2', version: '2' });
      const out = discoverProductManifests(repoRoot);
      expect(out.map((o) => o.descriptor.productCode).sort()).toEqual(['p1', 'p2']);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
