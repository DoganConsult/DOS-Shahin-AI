import { randomUUID, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc';
const BCRYPT_ROUNDS = 12;

type KeycloakConfig = {
  baseUrl: string;
  realm: string;
  adminClientId: string;
  adminClientSecret: string;
};

function getKeycloakConfig(): KeycloakConfig | null {
  const baseUrl = process.env.KEYCLOAK_BASE_URL;
  const realm = process.env.KEYCLOAK_REALM;
  const adminClientId =
    process.env.KEYCLOAK_ADMIN_WRITE_CLIENT_ID ||
    process.env.KEYCLOAK_ADMIN_CLIENT_ID ||
    '';
  const adminClientSecret =
    process.env.KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET ||
    process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ||
    '';
  if (!baseUrl || !realm || !adminClientId || !adminClientSecret) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ''), realm, adminClientId, adminClientSecret };
}

async function getKeycloakAdminToken(cfg: KeycloakConfig): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.adminClientId,
    client_secret: cfg.adminClientSecret,
  });
  const res = await fetch(
    `${cfg.baseUrl}/realms/${encodeURIComponent(cfg.realm)}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
  );
  if (!res.ok) {
    throw new Error(`Keycloak admin token fetch failed: ${res.status}`);
  }
  const json = await res.json();
  if (!json?.access_token) {
    throw new Error('Keycloak admin token response missing access_token');
  }
  return json.access_token as string;
}

async function findKeycloakUserIdByEmail(cfg: KeycloakConfig, token: string, email: string): Promise<string | null> {
  const url = `${cfg.baseUrl}/admin/realms/${encodeURIComponent(cfg.realm)}/users?email=${encodeURIComponent(email)}&exact=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const list = await res.json();
  return Array.isArray(list) && list.length > 0 ? (list[0]?.id ?? null) : null;
}

async function upsertKeycloakUser(
  cfg: KeycloakConfig,
  token: string,
  user: { email: string; firstName?: string; lastName?: string; enabled: boolean; userId: string; tenantId: string; role: string; password: string },
): Promise<string> {
  const existingId = await findKeycloakUserIdByEmail(cfg, token, user.email);
  if (!existingId) {
    const createBody = {
      username: user.email,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      enabled: user.enabled,
      emailVerified: true,
      attributes: {
        dauth_user_id: [user.userId],
        dauth_tenant_id: [user.tenantId],
        dauth_role: [user.role],
      },
      credentials: [{ type: 'password', value: user.password, temporary: false }],
    };
    const createRes = await fetch(
      `${cfg.baseUrl}/admin/realms/${encodeURIComponent(cfg.realm)}/users`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody),
      },
    );
    if (createRes.status !== 201) {
      const text = await createRes.text().catch(() => '');
      throw new Error(`Keycloak create user failed: ${createRes.status} ${text}`);
    }
    const loc = createRes.headers.get('location') ?? '';
    const userId = loc.split('/').pop() ?? '';
    if (!userId) throw new Error('Keycloak create user missing location header');
    return userId;
  }

  const updateBody = {
    email: user.email,
    enabled: user.enabled,
    emailVerified: true,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    attributes: {
      dauth_user_id: [user.userId],
      dauth_tenant_id: [user.tenantId],
      dauth_role: [user.role],
    },
  };
  const updRes = await fetch(
    `${cfg.baseUrl}/admin/realms/${encodeURIComponent(cfg.realm)}/users/${encodeURIComponent(existingId)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody),
    },
  );
  if (!updRes.ok && updRes.status !== 204) {
    const text = await updRes.text().catch(() => '');
    throw new Error(`Keycloak update user failed: ${updRes.status} ${text}`);
  }
  const pwRes = await fetch(
    `${cfg.baseUrl}/admin/realms/${encodeURIComponent(cfg.realm)}/users/${encodeURIComponent(existingId)}/reset-password`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'password', value: user.password, temporary: false }),
    },
  );
  if (!pwRes.ok && pwRes.status !== 204) {
    const text = await pwRes.text().catch(() => '');
    throw new Error(`Keycloak reset-password failed: ${pwRes.status} ${text}`);
  }

  return existingId;
}

function shortId(len = 12): string {
  return randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

const PLATFORM_ADMIN = {
  userId: randomUUID(),
  email: 'admin@dogan-ai.com',
  password: 'D0gan@Platform2026!',
  name: 'Ahmet Dogan',
  firstName: 'Ahmet',
  lastName: 'Dogan',
  role: 'super_admin',
};

const PLATFORM_TENANT = {
  tenantId: shortId(12),
  name: 'Dogan-AI Platform',
  slug: 'dogan-ai',
  status: 'active',
  plan: 'enterprise',
  domain: 'dogan-ai.com',
};

const CANONICAL_ROLES = [
  'super_admin',
  'platform_admin',
  'tenant_admin',
  'tenant_owner',
  'compliance_officer',
  'risk_manager',
  'auditor',
  'governance_lead',
  'standard_user',
  'viewer',
  'api_service',
];

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    let seededTenantId: string | null = null;
    let seededUserId: string | null = null;
    try {
      await client.query('BEGIN');

      const existingUser = await client.query(
        `SELECT user_id, tenant_id FROM public.users WHERE LOWER(email) = LOWER($1)`,
        [PLATFORM_ADMIN.email],
      );

      if (existingUser.rows.length > 0) {
        console.log(`[seed] Admin user ${PLATFORM_ADMIN.email} already exists — skipping seed.`);
        seededUserId = existingUser.rows[0].user_id;
        seededTenantId = existingUser.rows[0].tenant_id;
        await client.query('COMMIT');
      } else {
        const passwordHash = await bcrypt.hash(PLATFORM_ADMIN.password, BCRYPT_ROUNDS);
        const tenantCode = `tenant_${PLATFORM_TENANT.tenantId}`;
        const schemaName = tenantCode;

        console.log('[seed] Creating platform tenant in public.tenants...');
        await client.query(
          `INSERT INTO public.tenants (tenant_id, org_name, industry, org_size, plan, status, tenant_code, tenant_name_en, schema_name, created_at, updated_at)
           VALUES ($1, $2, 'technology', '1-50', $3, 'active', $4, $5, $6, NOW(), NOW())
           ON CONFLICT (tenant_id) DO NOTHING`,
          [PLATFORM_TENANT.tenantId, PLATFORM_TENANT.name, PLATFORM_TENANT.plan, tenantCode, PLATFORM_TENANT.name, schemaName],
        );

        console.log('[seed] Creating platform tenant in dos.tenants...');
        await client.query(
          `INSERT INTO dos.tenants (tenant_id, tenant_code, tenant_name_en, schema_name, status, product_key, settings, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'agrc', '{}'::jsonb, NOW(), NOW())
           ON CONFLICT (tenant_id) DO NOTHING`,
          [PLATFORM_TENANT.tenantId, tenantCode, PLATFORM_TENANT.name, schemaName, PLATFORM_TENANT.status],
        );

        console.log('[seed] Creating admin in public.users (auth)...');
        await client.query(
          `INSERT INTO public.users (user_id, email, password_hash, name, full_name, tenant_id, role, platform_role,
             is_super_admin, status, onboarding_complete, email_verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 'active', TRUE, TRUE, NOW(), NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [PLATFORM_ADMIN.userId, PLATFORM_ADMIN.email, passwordHash, PLATFORM_ADMIN.name,
            PLATFORM_ADMIN.name, PLATFORM_TENANT.tenantId, PLATFORM_ADMIN.role, 'super_admin'],
        );

        console.log('[seed] Creating admin in dos.users (user-service)...');
        await client.query(
          `INSERT INTO dos.users (user_id, email, display_name, tenant_id, status, platform_role, password_hash, email_verified, email_verified_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'active', 'admin', $5, TRUE, NOW(), NOW(), NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [PLATFORM_ADMIN.userId, PLATFORM_ADMIN.email, PLATFORM_ADMIN.name,
            PLATFORM_TENANT.tenantId, passwordHash],
        );

        console.log('[seed] Creating tenant membership...');
        await client.query(
          `INSERT INTO public.tenant_user_memberships (tenant_id, user_id, membership_type, is_tenant_owner, status, org_role_code)
           VALUES ($1, $2, 'internal', TRUE, 'active', 'owner')
           ON CONFLICT DO NOTHING`,
          [PLATFORM_TENANT.tenantId, PLATFORM_ADMIN.userId],
        );

        console.log('[seed] Creating subscription...');
        await client.query(
          `INSERT INTO public.subscriptions (tenant_id, plan, status, started_at, created_at, updated_at)
           VALUES ($1, 'enterprise', 'active', NOW(), NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [PLATFORM_TENANT.tenantId],
        );

        console.log('[seed] Creating role assignments...');
        for (const roleCode of ['super_admin', 'platform_admin', 'tenant_admin']) {
          await client.query(
            `INSERT INTO dos.user_role_assignments (id, user_id, functional_role_id, role_code, is_active, assigned_at)
             SELECT $1, $2, fr.id, $3::varchar, TRUE, NOW()
               FROM dos.functional_roles fr
              WHERE fr.code = $3::varchar
              LIMIT 1
             ON CONFLICT DO NOTHING`,
            [randomUUID(), PLATFORM_ADMIN.userId, roleCode],
          );
        }

        console.log('[seed] Seeding Wave-1 module entitlements...');
        const WAVE1_MODULES = [
          'platform',
          'workspace',
          'dashboard',
          'foundation',
          'workflow',
          'policy',
          'compliance',
          'controls',
          'evidence',
          'audit',
          'reporting',
        ];
        for (const moduleCode of WAVE1_MODULES) {
          await client.query(
            `INSERT INTO public.tenant_module_entitlements
               (tenant_id, module_code, entitled, status, entitlement_source, activated_at, updated_at)
             VALUES ($1, $2, TRUE, 'active', 'wave1-seed', NOW(), NOW())
             ON CONFLICT (tenant_id, module_code) DO UPDATE
               SET entitled = EXCLUDED.entitled,
                   status   = EXCLUDED.status,
                   updated_at = NOW()`,
            [PLATFORM_TENANT.tenantId, moduleCode],
          );
          await client.query(
            `INSERT INTO public.tenant_modules (tenant_id, module_code, is_enabled, activation_source, activated_at)
             VALUES ($1, $2, TRUE, 'wave1-seed', NOW())
             ON CONFLICT (tenant_id, module_code) DO UPDATE
               SET is_enabled = EXCLUDED.is_enabled,
                   activation_source = EXCLUDED.activation_source,
                   activated_at = NOW()`,
            [PLATFORM_TENANT.tenantId, moduleCode],
          ).catch(() => { /* optional table — skip if absent in this env */ });
        }

        console.log('[seed] Recording seed execution...');
        await client.query(
          `INSERT INTO public.seed_history (seed_key, applied_at, row_count)
           VALUES ('platform-admin-seed', NOW(), 1)`,
        );

        await client.query('COMMIT');

        seededTenantId = PLATFORM_TENANT.tenantId;
        seededUserId = PLATFORM_ADMIN.userId;

        console.log('');
        console.log('=== PLATFORM SEED COMPLETE ===');
        console.log(`Tenant:  ${PLATFORM_TENANT.name} (${PLATFORM_TENANT.tenantId})`);
        console.log(`Admin:   ${PLATFORM_ADMIN.email}`);
        console.log(`Pass:    ${PLATFORM_ADMIN.password}`);
        console.log(`User ID: ${PLATFORM_ADMIN.userId}`);
        console.log('Roles:   super_admin, platform_admin, tenant_admin');
        console.log('');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    if (seededTenantId && seededUserId) {
      const kc = getKeycloakConfig();
      if (kc) {
        const kcToken = await getKeycloakAdminToken(kc);
        await upsertKeycloakUser(kc, kcToken, {
          email: PLATFORM_ADMIN.email,
          firstName: PLATFORM_ADMIN.firstName,
          lastName: PLATFORM_ADMIN.lastName,
          enabled: true,
          userId: seededUserId,
          tenantId: seededTenantId,
          role: PLATFORM_ADMIN.role,
          password: PLATFORM_ADMIN.password,
        });
      }
    }
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
