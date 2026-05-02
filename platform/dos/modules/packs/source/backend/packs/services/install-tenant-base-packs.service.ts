import { withClient } from '../ports/database.port';
import { safeQuery } from "@dos/db";

const SCHEMA_PATTERN = /^[a-z0-9_]+$/i;

export async function installTenantBasePacks(params: {
  tenantId: string;
  schema: string;
  locale?: 'en' | 'ar';
  mode?: 'government' | 'enterprise' | 'default';
}): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.packs_items" + (""), []);
      return result?.rows || [];
}
