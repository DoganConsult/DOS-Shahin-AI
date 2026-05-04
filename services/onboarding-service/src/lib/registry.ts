import { masterQuery } from '@dos/db/master';

/**
 * DOS Master M6 — onboarding repository.
 * Every write sets `dos.actor='onboarding-service'` so the
 * `trg_dos_master_only` floor is satisfied. The application-level role
 * grant `(onboarding-service, dos-master)` must exist in
 * `dos.dos_master_grant`; bootstrap migration adds it.
 */

async function actorPrelude(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export interface ProductRow {
  product_code?: string;
  display_name?: string;
  edition_default?: string | null;
  marketing_root?: string | null;
  workspace_root?: string | null;
  status?: 'active' | 'beta' | 'retired';
}

export async function addProduct(row: ProductRow): Promise<void> {
  if (!row.product_code || !row.display_name) {
    throw new Error('product_code and display_name required');
  }
  await actorPrelude();
  await masterQuery(
    `INSERT INTO dos_master.product_registry
        (product_code, display_name, edition_default, marketing_root, workspace_root, status)
     VALUES ($1,$2,$3,$4,$5, COALESCE($6,'active'))
     ON CONFLICT (product_code) DO UPDATE SET
        display_name=EXCLUDED.display_name,
        edition_default=EXCLUDED.edition_default,
        marketing_root=EXCLUDED.marketing_root,
        workspace_root=EXCLUDED.workspace_root,
        status=EXCLUDED.status`,
    [row.product_code, row.display_name, row.edition_default ?? null,
     row.marketing_root ?? null, row.workspace_root ?? null, row.status ?? 'active'],
  );
}

export async function enrollModule(productCode: string, moduleCode: string, edition = 'standard', enabled = true): Promise<void> {
  await actorPrelude();
  await masterQuery(
    `INSERT INTO dos_master.product_module_enrollment
        (product_code, module_code, edition, enabled)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (product_code, module_code, edition)
     DO UPDATE SET enabled = EXCLUDED.enabled`,
    [productCode, moduleCode, edition, enabled],
  );
}

export async function listProducts(): Promise<Record<string, unknown>[]> {
  const r = await masterQuery(
    `SELECT product_code, display_name, edition_default, marketing_root,
            workspace_root, status
       FROM dos_master.product_registry
      ORDER BY product_code`,
  );
  return r.rows as Record<string, unknown>[];
}

export async function listEnrollments(productCode?: string): Promise<Record<string, unknown>[]> {
  const r = productCode
    ? await masterQuery(
        `SELECT product_code, module_code, edition, enabled
           FROM dos_master.product_module_enrollment
          WHERE product_code = $1
          ORDER BY module_code`,
        [productCode],
      )
    : await masterQuery(
        `SELECT product_code, module_code, edition, enabled
           FROM dos_master.product_module_enrollment
          ORDER BY product_code, module_code`,
      );
  return r.rows as Record<string, unknown>[];
}

export interface ServiceRow {
  service_code?: string;
  display_name?: string;
  trust_zone?: 'public' | 'tenant' | 'admin';
  port?: number;
  pm2_name?: string | null;
}

export async function registerService(row: ServiceRow): Promise<void> {
  if (!row.service_code || !row.display_name || !row.trust_zone || row.port === undefined) {
    throw new Error('service_code, display_name, trust_zone, port required');
  }
  await actorPrelude();
  await masterQuery(
    `INSERT INTO dos_master.service_registry
        (service_code, display_name, trust_zone, port, pm2_name, status)
     VALUES ($1,$2,$3,$4,$5,'active')
     ON CONFLICT (service_code)
     DO UPDATE SET display_name=EXCLUDED.display_name,
                   trust_zone=EXCLUDED.trust_zone,
                   port=EXCLUDED.port,
                   pm2_name=EXCLUDED.pm2_name,
                   status='active'`,
    [row.service_code, row.display_name, row.trust_zone, row.port, row.pm2_name ?? null],
  );
}

export async function listServices(): Promise<Record<string, unknown>[]> {
  const r = await masterQuery(
    `SELECT service_code, display_name, trust_zone, port, pm2_name, status
       FROM dos_master.service_registry
      ORDER BY service_code`,
  );
  return r.rows as Record<string, unknown>[];
}
