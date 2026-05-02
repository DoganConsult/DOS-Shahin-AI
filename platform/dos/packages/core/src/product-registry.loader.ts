/**
 * Product Registry loader.
 *
 * Reads every products/<name>/manifest/product.manifest.json on disk
 * and upserts each entry into ProductsRepository. Called from the
 * dos-service bootstrap so the platform_dos.products_registry table
 * reflects the products the deployment ships with, on every boot.
 *
 * Also publishes a `dos.product.registered` event per newly-seen
 * product — downstream consumers (frontends, admin tools, AI agents)
 * can react without having to poll.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DOSPort, ProductDescriptor } from '@dos/ports/dos';
import type { ProductsRepository } from './repositories';

export interface ProductManifestJson {
  product_code?: string;
  productCode?: string;
  display_name?: string;
  displayName?: string;
  status?: string;
  version?: string;
  enabled_by_default?: boolean;
  enabledByDefault?: boolean;
}

export interface LoadProductsDeps {
  readonly port: DOSPort;
  readonly products: ProductsRepository;
  readonly repoRoot: string;
}

export interface LoadProductsResult {
  readonly discovered: number;
  readonly registered: readonly ProductDescriptor[];
  readonly errors: ReadonlyArray<{ dir: string; error: string }>;
}

/**
 * Discover every products/<name>/manifest/product.manifest.json on disk
 * and return a ProductDescriptor per valid manifest.
 */
export function discoverProductManifests(repoRoot: string): Array<{
  dir: string;
  descriptor: ProductDescriptor;
  displayName?: string;
}> {
  const productsDir = join(repoRoot, 'products');
  if (!existsSync(productsDir)) return [];
  const out: Array<{ dir: string; descriptor: ProductDescriptor; displayName?: string }> = [];
  for (const name of readdirSync(productsDir)) {
    const manifestPath = join(productsDir, name, 'manifest', 'product.manifest.json');
    if (!existsSync(manifestPath)) continue;
    try {
      const json = JSON.parse(readFileSync(manifestPath, 'utf8')) as ProductManifestJson;
      const productCode = json.product_code ?? json.productCode ?? name;
      const version = json.version ?? '0.0.0';
      const enabled = json.enabled_by_default !== false && json.enabledByDefault !== false;
      const displayName = json.display_name ?? json.displayName;
      out.push({ dir: name, descriptor: { productCode, version, enabled }, displayName });
    } catch {
      // skip invalid manifest; loadProducts will capture an error row.
    }
  }
  return out;
}

export async function loadProducts(deps: LoadProductsDeps): Promise<LoadProductsResult> {
  const productsDir = join(deps.repoRoot, 'products');
  if (!existsSync(productsDir)) {
    return { discovered: 0, registered: [], errors: [] };
  }

  const errors: Array<{ dir: string; error: string }> = [];
  const registered: ProductDescriptor[] = [];
  const names = readdirSync(productsDir);

  for (const name of names) {
    const manifestPath = join(productsDir, name, 'manifest', 'product.manifest.json');
    if (!existsSync(manifestPath)) continue;

    let json: ProductManifestJson;
    try {
      json = JSON.parse(readFileSync(manifestPath, 'utf8')) as ProductManifestJson;
    } catch (err) {
      errors.push({ dir: name, error: err instanceof Error ? err.message : String(err) });
      continue;
    }

    const descriptor: ProductDescriptor = {
      productCode: json.product_code ?? json.productCode ?? name,
      version: json.version ?? '0.0.0',
      enabled: json.enabled_by_default !== false && json.enabledByDefault !== false,
    };

    try {
      await deps.products.register(descriptor);
      registered.push(descriptor);
      await deps.port
        .publishEvent({
          eventType: 'dos.product.registered',
          tenantId: 'platform',
          occurredAt: new Date().toISOString(),
          payload: { ...descriptor, displayName: json.display_name ?? json.displayName ?? null },
        })
        .catch(() => { /* registration event is best-effort */ });
    } catch (err) {
      errors.push({ dir: name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { discovered: names.length, registered, errors };
}
