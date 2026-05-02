/**
 * Callback-time Dogan bootstrap.
 *
 * Invoked from `GET /api/auth/oidc/callback` after the Keycloak ID-token
 * has been verified. Resolves an existing platform identity for the
 * Keycloak `sub` (via `iam_identities`) or, if absent, atomically creates:
 *   - tenant
 *   - user mirror
 *   - iam_identities row
 *   - tenant membership
 *   - onboarding session (draft)
 *   - platform_outbox event for workspace provisioning kickoff
 *
 * On any failure, the whole transaction rolls back. The caller MUST NOT
 * issue a platform session unless this function returns a successful
 * `BootstrapOutcome`.
 *
 * Idempotency: a Postgres advisory lock keyed by the Keycloak realm + sub
 * serializes concurrent callbacks for the same user (e.g. tab-flapping
 * during registration). On a re-entry the existing iam_identities row is
 * found and the function returns `kind: 'EXISTING'` without writing.
 */

import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { safeQuery, getClient, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { buildDefaultKeycloakAdminClient } from '@dos/dauth-shared';

export interface BootstrapInput {
  realm: string;
  keycloakUserId: string;
  email: string;
  username: string | null;
  /** From the simplified user-profile (dogan-user-profile.json). */
  company: string | null;
  country: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  idempotencyKey: string;
}

export type BootstrapOutcome =
  | {
      kind: 'EXISTING';
      userId: string;
      tenantId: string;
    }
  | {
      kind: 'CREATED';
      userId: string;
      tenantId: string;
      tenantCode: string;
    }
  | {
      kind: 'BLOCKED';
      reason: 'MISSING_EMAIL';
    }
  | {
      kind: 'FAILED';
      reason: string;
      /**
       * Typed error code for the OIDC callback to branch on. Group D
       * (workspace-provisioning audit) introduced retryable codes
       * (`BOOTSTRAP_PREFLIGHT_FAILED`, `ENTITLEMENT_SEED_INCOMPLETE`)
       * that signal an ops-side issue (catalog drift, schema drift)
       * rather than user fault — the callback uses this to skip the
       * `disableKeycloakUser` step so the user can retry the moment ops
       * fixes the catalog. Untyped errors (no `code`) keep the
       * pre-existing disable-on-failure behaviour as a safety backstop.
       */
      code?: string;
    };

function lockKey(realm: string, kcSub: string): { hi: number; lo: number } {
  const hash = crypto.createHash('sha256').update(`kc:${realm}:${kcSub}`).digest();
  const hi = hash.readInt32BE(0);
  const lo = hash.readInt32BE(4);
  return { hi, lo };
}

async function findExistingIdentity(
  realm: string,
  kcSub: string,
): Promise<{ userId: string; tenantId: string } | null> {
  const res = await safeQuery<{ userId: string; tenantId: string }>(
    `SELECT u.user_id AS "userId", u.tenant_id AS "tenantId"
       FROM public.iam_identities ii
       JOIN public.users u ON u.user_id = ii.user_id
      WHERE ii.provider = 'keycloak'
        AND ii.external_subject = $1
        AND (ii.realm = $2 OR ii.realm IS NULL)
      LIMIT 1`,
    [kcSub, realm],
  ).catch((err) => {
    const msg = String((err as Error)?.message || err);
    if (!msg.includes('iam_identities')) {
      logger.warn('[kc-bootstrap] identity lookup failed', { err: msg.slice(0, 160) });
    }
    return { rows: [] as { userId: string; tenantId: string }[] };
  });
  return res.rows[0] ?? null;
}

function generateTenantCode(orgName: string): string {
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${slug || 'tenant'}-${suffix}`;
}

function schemaNameFor(tenantId: string): string {
  // Must match the DB CHECK constraint `tenants_schema_name_canonical_check`:
  //   schema_name = 'tenant_' || regexp_replace(tenant_id, '[^a-zA-Z0-9_]', '', 'g')
  return `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '')}`.slice(0, 63);
}

const FREE_MAIL_DOMAINS = new Set([
  'gmail', 'googlemail', 'yahoo', 'yahoomail', 'outlook', 'hotmail',
  'live', 'msn', 'icloud', 'me', 'mac', 'aol', 'proton', 'protonmail',
  'mail', 'gmx', 'zoho', 'yandex', 'fastmail',
]);

function deriveCompanyFromEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return 'Personal Workspace';
  const root = (email.slice(at + 1).split('.')[0] || '').toLowerCase();
  if (!root || FREE_MAIL_DOMAINS.has(root)) return 'Personal Workspace';
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function deriveDisplayName(input: BootstrapInput, email: string): string {
  // firstName + lastName is the canonical name on the simplified user-profile;
  // fall back to KC username, then the local-part of the email.
  const joined = [input.firstName, input.lastName]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return (
    joined ||
    (input.username || '').trim() ||
    email.split('@')[0] ||
    'New User'
  );
}

export async function bootstrapKeycloakRegistration(
  input: BootstrapInput,
): Promise<BootstrapOutcome> {
  const email = (input.email || '').trim().toLowerCase();
  if (!email) return { kind: 'BLOCKED', reason: 'MISSING_EMAIL' };

  // The simplified user-profile (dogan-user-profile.json) requires
  // company + country at registration; only phone is optional. We still
  // soft-default `company` from the email domain so a Keycloak admin
  // creating a user without filling the form gets a usable workspace.
  const rawCompany = (input.company || '').trim();
  const company = rawCompany || deriveCompanyFromEmail(email);
  const companyDerived = rawCompany.length === 0;

  const name = deriveDisplayName(input, email);
  const country = (input.country || '').trim() || null;
  const phone = (input.phone || '').trim() || null;

  if (companyDerived) {
    logger.info('[kc-bootstrap] first-login using derived company', {
      kcSub: input.keycloakUserId,
      realm: input.realm,
      companyDerived,
    });
  }

  const existing = await findExistingIdentity(input.realm, input.keycloakUserId);
  if (existing) return { kind: 'EXISTING', ...existing };

  // Tenant IDs must fit `tenants.tenant_id VARCHAR(16)` and the per-tenant
  // schema-name CHECK constraint (`tenant_<id>` ≤ 63 chars). Match the
  // SPA register path (services/onboarding-service register-tenant-user.ts:293)
  // which uses a 12-hex-char compaction of a uuid: 12 < 16, no hyphens, OK
  // for `regexp_replace(tenant_id,'[^a-zA-Z0-9_]','','g')` schema derivation.
  const tenantId = uuid().replace(/-/g, '').slice(0, 12);
  const userId = uuid();
  const tenantCode = generateTenantCode(company);
  const schemaName = schemaNameFor(tenantId);
  const lock = lockKey(input.realm, input.keycloakUserId);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [lock.hi, lock.lo]);

    // Re-check identity under the lock — another concurrent callback may have
    // bootstrapped the same user.
    const dupRes = await client.query<{ userId: string; tenantId: string }>(
      `SELECT u.user_id AS "userId", u.tenant_id AS "tenantId"
         FROM public.iam_identities ii
         JOIN public.users u ON u.user_id = ii.user_id
        WHERE ii.provider = 'keycloak'
          AND ii.external_subject = $1
        LIMIT 1`,
      [input.keycloakUserId],
    );
    if (dupRes.rows[0]) {
      await client.query('ROLLBACK');
      return { kind: 'EXISTING', ...dupRes.rows[0] };
    }

    // Tenant. tenant_name_ar is no longer collected on the simplified
    // user-profile — left NULL for now and can be set later from
    // tenant settings.
    await client.query(
      `INSERT INTO public.tenants
         (tenant_id, org_name, tenant_code, tenant_name_en, tenant_name_ar, schema_name, status, plan)
       VALUES ($1, $2, $3, $4, $5, $6, 'registered', 'free')`,
      [tenantId, company, tenantCode, company, null, schemaName],
    );

    // User mirror — Keycloak owns the password, so password_hash is a marker.
    // platform_role MUST be NULL for self-registered users — they are tenant
    // admins of their own tenant only, NEVER platform-tier admins.
    // emailVerified is propagated from the OIDC id_token claim so the
    // onboarding wizard does not have to ask the user to verify again.
    const placeholderHash = `keycloak:${input.keycloakUserId}`;
    const firstName = (input.firstName || '').trim() || null;
    const lastName = (input.lastName || '').trim() || null;
    await client.query(
      `INSERT INTO public.users
         (user_id, email, password_hash, name, full_name, first_name, last_name,
          tenant_id, role, status,
          is_super_admin, onboarding_complete, platform_role,
          email_verified, email_verified_at)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, 'owner', 'active',
               FALSE, FALSE, NULL,
               $8, CASE WHEN $8 THEN NOW() ELSE NULL END)`,
      [userId, email, placeholderHash, name, firstName, lastName, tenantId, input.emailVerified === true],
    );

    // iam_identities — Keycloak sub mapping. Required for callback identity
    // resolution on subsequent logins.
    await client.query(
      `INSERT INTO public.iam_identities (user_id, provider, external_subject, realm)
       VALUES ($1, 'keycloak', $2, $3)
       ON CONFLICT (provider, external_subject, realm) DO NOTHING`,
      [userId, input.keycloakUserId, input.realm],
    );

    // Tenant membership
    await client.query(
      `INSERT INTO public.tenant_user_memberships
         (tenant_id, user_id, membership_type, is_tenant_owner, status)
       VALUES ($1, $2, 'internal', TRUE, 'active')`,
      [tenantId, userId],
    );

    // Onboarding wizard disabled: do NOT create an onboarding_sessions
    // row. New tenants land directly in /workspace-home with just the
    // user profile + tenant name; any per-tenant setup that previously
    // happened in the wizard is deferred to lazy resolution inside the
    // workspace.

    // Platform outbox — workspace provisioning kickoff. Best-effort:
    // wrapped in a SAVEPOINT so a failure (e.g. column drift, missing
    // table) does NOT abort the surrounding bootstrap transaction.
    await client.query('SAVEPOINT outbox_sp');
    try {
      const outboxRows: Array<[string, string, string, string]> = [
        // workspace provisioning kickoff (consumed by tenant-service)
        [
          'workspace',
          'workspace.provisioning.requested',
          tenantId,
          JSON.stringify({
            apiVersion: 'v1',
            tenantId,
            userId,
            email,
            companyName: company,
            source: 'keycloak-callback-bootstrap',
            keycloakUserId: input.keycloakUserId,
          }),
        ],
        // membership add (consumed by openfga tuple-sync → tenant#member)
        [
          'tenant_user_membership',
          'dauth.membership.added',
          tenantId,
          JSON.stringify({ apiVersion: 'v1', userId, tenantId, role: 'admin' }),
        ],
        // tenant_admin assignment (consumed by openfga tuple-sync → tenant#admin)
        [
          'tenant_user_membership',
          'dauth.tenant_admin.assigned',
          tenantId,
          JSON.stringify({ apiVersion: 'v1', userId, tenantId }),
        ],
      ];
      for (const [aggType, evtType, tid, payloadJson] of outboxRows) {
        await client.query(
          `INSERT INTO public.platform_outbox
             (aggregate_type, aggregate_id, event_type, tenant_id, payload, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
          [aggType, tid, evtType, tid, payloadJson],
        );
      }
      await client.query('RELEASE SAVEPOINT outbox_sp');
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT outbox_sp').catch(() => {});
      await client.query('RELEASE SAVEPOINT outbox_sp').catch(() => {});
      const msg = String((err as Error)?.message || err);
      logger.warn('[kc-bootstrap] platform_outbox insert skipped', {
        err: msg.slice(0, 160),
      });
    }

    const productCode = (process.env.DOS_PRODUCT_CODE || 'shahin-ai').trim();

    // Platform DOS hierarchy — register tenant in the DOS catalog and attach
    // the product. Without these rows platform-admin "tenants by product"
    // queries miss the new tenant until a reconciliation cron picks it up.
    // Best-effort: SAVEPOINT so a missing platform_dos schema or FK gap
    // (e.g. unsynced products_registry) does NOT abort bootstrap.
    await client.query('SAVEPOINT dos_hierarchy_sp');
    try {
      await client.query(
        `INSERT INTO platform_dos.tenants_registry
           (tenant_id, product_code, status, display_name, attributes)
         VALUES ($1, $2, 'active', $3, $4::jsonb)
         ON CONFLICT (tenant_id) DO NOTHING`,
        [tenantId, productCode, company,
         JSON.stringify({ source: 'kc-bootstrap', tenant_code: tenantCode })],
      );
      await client.query(
        `INSERT INTO platform_dos.tenant_products
           (tenant_id, product_code, status, attributes)
         VALUES ($1, $2, 'active', $3::jsonb)
         ON CONFLICT (tenant_id, product_code) DO NOTHING`,
        [tenantId, productCode, JSON.stringify({ source: 'kc-bootstrap' })],
      );
      await client.query('RELEASE SAVEPOINT dos_hierarchy_sp');
    } catch (dosErr) {
      await client.query('ROLLBACK TO SAVEPOINT dos_hierarchy_sp').catch(() => {});
      await client.query('RELEASE SAVEPOINT dos_hierarchy_sp').catch(() => {});
      logger.warn('[kc-bootstrap] platform_dos hierarchy insert skipped', {
        err: String((dosErr as Error)?.message || dosErr).slice(0, 160),
      });
    }

    // Seed default module entitlements for the new tenant from the
    // canonical product_modules catalog (status='active' AND enabled=true).
    //
    // Failure modes — Group D fix (D-10/D-11):
    //   1. product_modules is empty (catalog-sync didn't run, or migration
    //      drift): the SELECT returns 0 rows, the INSERT inserts 0 rows,
    //      no exception is raised. Pre-fix this was silent — tenant was
    //      committed without entitlements, gateway returned MODULE_NOT_ENTITLED
    //      on every subsequent API call, user stuck on /onboarding.
    //   2. Schema drift causes a throw: pre-fix this was caught and only
    //      `warn`-logged, so the tenant was still committed.
    //
    // Both cases now throw out of this block so the surrounding catch-all
    // ROLLBACK fires — tenant + user + iam_identities + session + outbox
    // all undone. User sees a clean registration failure (`kind: 'FAILED'`),
    // ops sees a structured `[kc-bootstrap] bootstrap transaction failed`
    // line with the reason. Server-startup preflight (server.ts:preflightProductCatalog)
    // makes the empty-catalog case a boot-time failure rather than a
    // per-registration one.
    //
    // ENTITLEMENT_SEED_INCOMPLETE error code is shared with the activation
    // pipeline (modules/onboarding/.../activation-steps.ts:seedModuleEntitlements)
    // so audit/log greps treat both sites uniformly.
    const expectedRes = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM public.product_modules
        WHERE product_key = $1 AND enabled = TRUE AND status = 'active'`,
      [productCode],
    );
    const expected = Number(expectedRes.rows[0]?.count ?? 0);
    if (expected === 0) {
      const err = new Error(
        `BOOTSTRAP_PREFLIGHT_FAILED: product_modules has no enabled active rows for product_key=${productCode}`,
      ) as Error & { code?: string; details?: unknown };
      err.code = 'BOOTSTRAP_PREFLIGHT_FAILED';
      err.details = { productCode, reason: 'product_modules_not_seeded' };
      throw err;
    }
    const seedRes = await client.query<{ module_code: string }>(
      `INSERT INTO public.tenant_module_entitlement_registry
         (tenant_id, module_code, entitled, status, entitlement_source, activated_at, updated_at)
       SELECT $1, pm.module_code, TRUE, 'active', 'kc-bootstrap', NOW(), NOW()
         FROM public.product_modules pm
        WHERE pm.product_key = $2 AND pm.enabled = TRUE AND pm.status = 'active'
       ON CONFLICT (tenant_id, module_code) DO NOTHING
       RETURNING module_code`,
      [tenantId, productCode],
    );
    const actual = seedRes.rows.length;
    if (actual < expected) {
      const inserted = seedRes.rows.map((r) => r.module_code);
      const err = new Error(
        `ENTITLEMENT_SEED_INCOMPLETE: tenant ${tenantId} got ${actual}/${expected} expected modules`,
      ) as Error & { code?: string; details?: unknown };
      err.code = 'ENTITLEMENT_SEED_INCOMPLETE';
      err.details = { tenantId, productCode, expected, actual, inserted };
      throw err;
    }
    logger.info('[kc-bootstrap] tenant entitled', {
      tenantId,
      productCode,
      modulesSeeded: actual,
    });

    await client.query('COMMIT');
    logger.info('[kc-bootstrap] tenant + user provisioned from Keycloak callback', {
      tenantId,
      userId,
      tenantCode,
      keycloakUserId: input.keycloakUserId,
    });

    // Post-commit, best-effort side effects. Failures here MUST NOT
    // invalidate the platform-side commit — a reconciliation cron picks
    // up the orphan signals.
    await Promise.all([
      provisionTenantSchemaSafe(tenantId),
      attachKeycloakTenantAdmin(input.keycloakUserId, tenantId),
    ]);

    return {
      kind: 'CREATED',
      userId,
      tenantId,
      tenantCode,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: unknown } | null)?.code != null
      ? String((err as { code: unknown }).code)
      : undefined;
    logger.error('[kc-bootstrap] bootstrap transaction failed', {
      err: msg,
      code,
      keycloakUserId: input.keycloakUserId,
    });
    return { kind: 'FAILED', reason: msg, code };
  } finally {
    client.release();
  }
}

// ───────────────────────── Post-commit side effects ─────────────────────────

/**
 * Idempotent CREATE SCHEMA for the tenant. Inlined (rather than depending on
 * the onboarding-service helper) so auth-service has no cross-service import.
 */
async function provisionTenantSchemaSafe(tenantId: string): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    // Phase I-3: grant migrator + verifier role privileges on the new
    // schema so the per-tenant migration runner does not fail later.
    const { grantTenantSchemaPrivileges } = await import('@dos/db');
    await grantTenantSchemaPrivileges(schema, safeQuery);
    logger.info('[kc-bootstrap] tenant schema ready (with grants)', { tenantId, schema });
  } catch (err) {
    logger.warn('[kc-bootstrap] tenant schema create failed (cron will retry)', {
      tenantId,
      err: (err as Error)?.message ?? String(err),
    });
  }
}

/**
 * Assign realm role `tenant_admin` to the Keycloak user and attach them to
 * `/tenants/<tenantId>`. Uses the narrow admin-write client. Best-effort —
 * `dauth.kc.sync_pending` is emitted on failure for the reconciliation cron.
 */
async function attachKeycloakTenantAdmin(kcUserId: string, tenantId: string): Promise<void> {
  const admin = buildDefaultKeycloakAdminClient();
  if (!admin) {
    logger.info('[kc-bootstrap] admin-write client not configured; skipping tenant_admin attach');
    return;
  }
  try {
    await admin.ensureRealmRole('tenant_admin', 'DAuth: Tenant administrator');
    await admin.assignRealmRole(kcUserId, 'tenant_admin');
  } catch (err) {
    logger.warn('[kc-bootstrap] assignRealmRole(tenant_admin) failed', {
      kcUserId,
      err: (err as Error)?.message ?? String(err),
    });
  }
  try {
    await admin.createGroup({ name: 'tenants' }).catch(() => null);
    const grp = await admin.createGroup({
      name: tenantId,
      parentPath: '/tenants',
      attributes: { dos_tenant_id: [tenantId] },
    });
    await admin.addUserToGroup(kcUserId, grp.groupId);
  } catch (err) {
    logger.warn('[kc-bootstrap] tenant group attach failed', {
      kcUserId,
      tenantId,
      err: (err as Error)?.message ?? String(err),
    });
  }
}
