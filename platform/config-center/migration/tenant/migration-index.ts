/**
 * DOS-AIO Tenant Migration Index
 * Programmatic runner for all module migrations
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { query } from '@dos/db';

const MODULES_DIR = join(__dirname, '../../modules');

export async function runTenantMigrations(tenantSchema: string): Promise<void> {
  const modules = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const mod of modules) {
    const migrationDir = join(MODULES_DIR, mod, 'source/backend', mod, 'migrations');
    if (!existsSync(migrationDir)) continue;

    const sqlFiles = readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const sqlFile of sqlFiles) {
      const sql = readFileSync(join(migrationDir, sqlFile), 'utf-8')
        .replace(/__TENANT_SCHEMA__/g, tenantSchema);

      try {
        await query(sql);
        console.log(`✅ [${mod}] ${sqlFile} applied`);
      } catch (err) {
        console.error(`❌ [${mod}] ${sqlFile} failed:`, err);
        throw err;
      }
    }
  }
}
