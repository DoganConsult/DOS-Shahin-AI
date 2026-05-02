#!/usr/bin/env tsx
/**
 * Seeds platform-scoped RBAC catalogue tables in platform_dauth.*
 * from the canonical TypeScript source of truth.
 *
 * Platform-scoped (populates once per DB):
 *   - platform_dauth.permissions       ← CANONICAL_PERMISSIONS
 *   - platform_dauth.functional_roles  ← CANONICAL_ROLES + ROLE_PERMISSION_MAP
 *   - platform_dauth.role_permissions  ← flattened ROLE_PERMISSION_MAP
 *   - platform_dauth.access_profiles   ← canonical persona profiles
 *
 * Tenant-scoped catalogues live in <tenant_schema>.* and are
 * populated by seedDynamicRbacData() per-tenant at provisioning time.
 *
 * This script is idempotent (ON CONFLICT DO NOTHING) and only
 * adds rows that are missing. It does not remove or rename
 * existing platform-admin-service rows.
 *
 * Usage:
 *   set -a && . platform/config-center/env/migrator.env && set +a
 *   npx tsx platform/dauth/scripts/seed-platform-catalogue.ts
 */

import { Client } from 'pg';
import { CANONICAL_PERMISSIONS } from '../packages/core/access/rbac/canonical-permissions';
import { CANONICAL_ROLES } from '../packages/core/access/rbac/canonical-roles';
import { ROLE_PERMISSION_MAP } from '../packages/core/access/rbac/role-permission-map';

interface Summary {
  permissions: number;
  roles: number;
  rolePermissions: number;
  accessProfiles: number;
}

const CANONICAL_ACCESS_PROFILES = [
  { code: 'platform_super_admin', name: 'Platform Super Admin', description: 'Full platform access — all roles, all modules' },
  { code: 'tenant_admin',         name: 'Tenant Admin',         description: 'Tenant administration — user management, module config, settings' },
  { code: 'standard_user',        name: 'Standard User',        description: 'Default access — read-level access to assigned modules' },
  { code: 'viewer',               name: 'Viewer',               description: 'Read-only access across enabled modules' },
];

async function seed(client: Client): Promise<Summary> {
  const summary: Summary = { permissions: 0, roles: 0, rolePermissions: 0, accessProfiles: 0 };

  for (const p of CANONICAL_PERMISSIONS) {
    const r = await client.query(
      `INSERT INTO platform_dauth.permissions
         (permission_id, permission_code, module_code, resource_type, action_type, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (permission_id) DO NOTHING`,
      [p.code, p.code, p.module, p.resource, p.action, p.name],
    );
    summary.permissions += r.rowCount ?? 0;
  }

  for (const role of CANONICAL_ROLES) {
    const perms = ROLE_PERMISSION_MAP[role.code] ?? [];
    const r = await client.query(
      `INSERT INTO platform_dauth.functional_roles
         (role_id, role_code, display_name, description, permissions)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (role_id) DO NOTHING`,
      [role.code, role.code, role.name, role.description, perms],
    );
    summary.roles += r.rowCount ?? 0;
  }

  const knownPerms = new Set(CANONICAL_PERMISSIONS.map((p) => p.code));
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    for (const permCode of permCodes) {
      if (!knownPerms.has(permCode)) continue;
      const r = await client.query(
        `INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
         SELECT $1::varchar, $2::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM platform_dauth.role_permissions
           WHERE role_id = $1::varchar AND permission_id = $2::varchar
         )`,
        [roleCode, permCode],
      );
      summary.rolePermissions += r.rowCount ?? 0;
    }
  }

  for (const profile of CANONICAL_ACCESS_PROFILES) {
    const perms = ROLE_PERMISSION_MAP[profile.code] ?? [];
    const r = await client.query(
      `INSERT INTO platform_dauth.access_profiles
         (profile_id, profile_code, display_name, description, permissions)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (profile_id) DO NOTHING`,
      [profile.code, profile.code, profile.name, profile.description, perms],
    );
    summary.accessProfiles += r.rowCount ?? 0;
  }

  return summary;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required (use platform/config-center/env/migrator.env)');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    console.error('seed-platform-catalogue: starting');
    const s = await seed(client);
    console.error(
      `seed-platform-catalogue: inserted permissions=${s.permissions} roles=${s.roles} ` +
      `role_permissions=${s.rolePermissions} access_profiles=${s.accessProfiles}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('seed-platform-catalogue: fatal', err);
  process.exit(1);
});
