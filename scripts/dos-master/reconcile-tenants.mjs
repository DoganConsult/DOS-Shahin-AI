#!/usr/bin/env node
/**
 * reconcile-tenants.mjs — Tenant Authorization + Workspace-Shell Bridge
 *
 * Per-tenant idempotent reconciliation that brings every dos.tenants row
 * to the "fully-authorized + fully-shelled" contract (12 layers per the
 * 2026-05-04 audit). Backfills:
 *   1. dos.tenant_memberships (active, role=tenant_admin) for every user
 *   2. dos.user_role_assignments (active, role=tenant_admin)
 *   3. dos.tenant_product_activation (shahin-ai + foundation, active)
 *   4. dos.tenant_trials + dos.tenant_subscriptions
 *   5. dos.tenant_product_entitlements (shahin-ai active)
 *   6. dos.tenant_module_entitlements (foundation + 27 trial mods active)
 *   7. archive ghost tenants (no user) with audit row in dos_master writer log
 *
 * Cohort routing:
 *   A — fully-bundled        → ensure role assignment only
 *   B — legacy seed          → backfill product activation + trial bundle + role
 *   C/D/E — ghost            → archive (status='inactive'), audit
 *   F — membership-less user → insert active membership + role
 *
 * CLI:
 *   pnpm tenant:reconcile [--dry-run] [--tenant <id>] [--archive-ghosts]
 *                         [--report-only]
 */
import { Client } from 'pg';

const argv = process.argv.slice(2);
function flag(name, def) {
  const eq = `--${name}=`;
  for (const a of argv) if (a.startsWith(eq)) return a.slice(eq.length);
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const DRY = !!flag('dry-run', false);
const REPORT = !!flag('report-only', false);
const ARCHIVE_GHOSTS = !!flag('archive-ghosts', false);
const ONLY_TENANT = flag('tenant', null);

const TRIAL_DAYS = Number(process.env.TRIAL_DEFAULT_DAYS || 14);
const GRACE_DAYS = Number(process.env.TRIAL_GRACE_DAYS || 7);
const TRIAL_MODULES = (process.env.TRIAL_ALLOWED_MODULES
  || 'foundation,risk,compliance,controls,evidence,audit,policy,vendor,asset,incident,issues,remediation,workflow,notification,inbox,attestation,training,privacy,bcp,dora,knowledge,reporting,analytics,onboarding,action,ksa-regulatory,qiyas,agrc-engine,ai-os,mcp,dynamic-ui'
).split(',').map(s => s.trim()).filter(Boolean);

const newId = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

async function withClient(fn) {
  const cs = process.env.DATABASE_URL
    || `postgres://${process.env.PGUSER || 'dos_auth'}:${process.env.PGPASSWORD || 'dos_auth_pass_2026'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'shahin_grc'}`;
  const c = new Client({ connectionString: cs });
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}

async function classify(c, t) {
  const u  = await c.query(`SELECT user_id, email FROM dos.users WHERE tenant_id=$1 LIMIT 1`, [t.tenant_id]);
  const m  = await c.query(`SELECT user_id, role_code FROM dos.tenant_memberships WHERE tenant_id=$1 AND status='active' LIMIT 1`, [t.tenant_id]);
  const ra = await c.query(`SELECT 1 FROM dos.user_role_assignments WHERE tenant_id=$1 AND is_active=true LIMIT 1`, [t.tenant_id]);
  const sa = await c.query(`SELECT 1 FROM dos.tenant_product_activation WHERE tenant_id=$1 AND product_key='shahin-ai' AND status='active'`, [t.tenant_id]);
  const fa = await c.query(`SELECT 1 FROM dos.tenant_product_activation WHERE tenant_id=$1 AND product_key='foundation' AND status='active'`, [t.tenant_id]);
  const pe = await c.query(`SELECT 1 FROM dos.tenant_product_entitlements WHERE tenant_id=$1 AND entitlement_status='active'`, [t.tenant_id]);
  const fe = await c.query(`SELECT 1 FROM dos.tenant_module_entitlements WHERE tenant_id=$1 AND module_code='foundation' AND entitlement_status='active'`, [t.tenant_id]);
  const tr = await c.query(`SELECT 1 FROM dos.tenant_trials WHERE tenant_id=$1`, [t.tenant_id]);
  const has = {
    user: u.rows.length > 0,
    member: m.rows.length > 0,
    role: ra.rows.length > 0,
    shahin: sa.rows.length > 0,
    foundation: fa.rows.length > 0,
    prodEnt: pe.rows.length > 0,
    foundEnt: fe.rows.length > 0,
    trial: tr.rows.length > 0,
  };
  let cohort;
  if (!has.user && !has.member) cohort = 'C';
  else if (!has.user && has.member) cohort = 'E';
  else if (has.user && !has.member) cohort = 'F';
  else if (has.user && has.member && has.shahin && has.foundation && has.prodEnt && has.foundEnt && has.trial) cohort = 'A';
  else cohort = 'B';
  return { cohort, has, user: u.rows[0], member: m.rows[0] };
}

async function ensureMembership(c, tenantId, userId) {
  if (DRY) return;
  await c.query(
    `INSERT INTO dos.tenant_memberships (user_id, tenant_id, role_code, status, membership_type, is_tenant_owner)
       VALUES ($1, $2, 'tenant_admin', 'active', 'internal', false)
       ON CONFLICT DO NOTHING`,
    [userId, tenantId],
  );
}

async function ensureRoleAssignment(c, tenantId, userId, email) {
  if (DRY) return;
  const r = await c.query(
    `SELECT 1 FROM dos.user_role_assignments
      WHERE tenant_id=$1 AND user_id=$2 AND role_code='tenant_admin' AND is_active=true LIMIT 1`,
    [tenantId, userId],
  );
  if (r.rows.length > 0) return;
  await c.query(
    `INSERT INTO dos.user_role_assignments
       (assignment_id, user_id, tenant_id, role_code, scope, granted_by, granted_at, is_active)
       VALUES ($1, $2, $3, 'tenant_admin', NULL, 'reconcile-tenants', now(), true)`,
    [newId('asn'), userId, tenantId],
  );
}

async function ensureProductActivation(c, tenantId) {
  if (DRY) return;
  for (const key of ['shahin-ai', 'foundation']) {
    await c.query(
      `INSERT INTO dos.tenant_product_activation (tenant_id, product_key, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT DO NOTHING`,
      [tenantId, key],
    );
  }
}

async function ensureTrialBundle(c, tenantId, ownerUserId, signupDomain) {
  if (DRY) return;
  // Skip if already present
  const ex = await c.query(
    `SELECT trial_id FROM dos.tenant_trials
      WHERE tenant_id=$1 AND product_code='shahin-ai'
        AND status IN ('trial_pending_verification','trial_active','trial_expiring','trial_grace')
      LIMIT 1`,
    [tenantId],
  );
  if (ex.rows.length > 0) return;

  const trialId = newId('tri');
  const subId = newId('sub');
  const prodEntId = newId('pen');
  const now = new Date();
  const endsAt = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
  const grace  = new Date(endsAt.getTime() + GRACE_DAYS * 86_400_000);

  await c.query(
    `INSERT INTO dos.tenant_trials
       (trial_id, tenant_id, product_code, plan_code, status, starts_at, ends_at, grace_ends_at,
        created_by_user_id, signup_domain, verification_status, source, metadata)
     VALUES ($1,$2,'shahin-ai','trial','trial_active',$3,$4,$5,$6,$7,'verified','reconcile-backfill',$8::jsonb)`,
    [trialId, tenantId, now.toISOString(), endsAt.toISOString(), grace.toISOString(),
     ownerUserId, signupDomain || null, JSON.stringify({ defaultDays: TRIAL_DAYS, graceDays: GRACE_DAYS, source: 'reconcile-tenants' })],
  );

  await c.query(
    `INSERT INTO dos.tenant_subscriptions
       (subscription_id, tenant_id, product_code, plan_code, status, billing_status, trial_id,
        current_period_start, current_period_end, grace_ends_at, provider_mode, metadata)
     VALUES ($1,$2,'shahin-ai','trial','trialing','no_payment_required',$3,$4,$5,$6,'manual',$7::jsonb)`,
    [subId, tenantId, trialId, now.toISOString(), endsAt.toISOString(), grace.toISOString(),
     JSON.stringify({ source: 'reconcile-tenants' })],
  );

  await c.query(
    `INSERT INTO dos.tenant_product_entitlements
       (entitlement_id, tenant_id, product_code, entitlement_status, source, trial_id, subscription_id,
        starts_at, ends_at, metadata)
     VALUES ($1,$2,'shahin-ai','active','trial',$3,$4,$5,$6,$7::jsonb)`,
    [prodEntId, tenantId, trialId, subId, now.toISOString(), endsAt.toISOString(), JSON.stringify({})],
  );

  for (const m of TRIAL_MODULES) {
    const isDna = m === 'foundation';
    await c.query(
      `INSERT INTO dos.tenant_module_entitlements
         (entitlement_id, tenant_id, product_code, module_code, entitlement_status, source,
          trial_id, subscription_id, limits_json, starts_at, ends_at, metadata)
       VALUES ($1,$2,'shahin-ai',$3,'active',$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb)
       ON CONFLICT DO NOTHING`,
      [newId('men'), tenantId, m, isDna ? 'platform_dna' : 'trial', trialId, subId,
       JSON.stringify(isDna ? {} : { maxUsers: 10, aiCredits: 1000, watermarkExports: true }),
       now.toISOString(), endsAt.toISOString(), JSON.stringify({})],
    );
  }

  await c.query(
    `INSERT INTO dos.trial_audit_log
       (tenant_id, trial_id, user_id, product_code, action, old_status, new_status, reason, metadata_json)
     VALUES ($1,$2,$3,'shahin-ai','trial_created', NULL, 'trial_active', 'reconcile-backfill', $4::jsonb)`,
    [tenantId, trialId, ownerUserId, JSON.stringify({ source: 'reconcile-tenants' })],
  );
}

async function archiveGhost(c, tenantId, code) {
  if (DRY) return;
  await c.query(`UPDATE dos.tenants SET status='inactive' WHERE tenant_id=$1`, [tenantId]);
  await c.query(`SET dos.actor = 'dos-master'`);
  await c.query(
    `INSERT INTO dos.dos_master_writer_audit
       (actor, session_role, table_schema, table_name, op, row_pk, new_row)
     VALUES ('reconcile-tenants', 'dos-master', 'dos', 'tenants', 'UPDATE', $1, $2::jsonb)`,
    [tenantId, JSON.stringify({ tenant_id: tenantId, code, action: 'archived-as-ghost', reason: 'no-user-no-membership' })],
  );
}

async function reconcileOne(c, t) {
  const cls = await classify(c, t);
  const cohort = cls.cohort;
  const actions = [];

  if (cohort === 'C' || cohort === 'D' || cohort === 'E') {
    if (ARCHIVE_GHOSTS) {
      await archiveGhost(c, t.tenant_id, t.tenant_code);
      actions.push('archived-ghost');
    } else {
      actions.push('SKIP-ghost(no --archive-ghosts)');
    }
    return { tenant_id: t.tenant_id, code: t.tenant_code, cohort, actions };
  }

  if (cohort === 'F') {
    if (cls.user) {
      await ensureMembership(c, t.tenant_id, cls.user.user_id);
      actions.push('inserted-membership');
    }
  }

  // For cohorts A, B, F with user present: ensure role + product activation + trial bundle.
  const userId = cls.user?.user_id || cls.member?.user_id;
  const email = cls.user?.email;
  if (userId) {
    if (!cls.has.role) { await ensureRoleAssignment(c, t.tenant_id, userId, email); actions.push('role-assigned'); }
    if (!cls.has.shahin || !cls.has.foundation) { await ensureProductActivation(c, t.tenant_id); actions.push('product-activated'); }
    if (!cls.has.trial || !cls.has.prodEnt || !cls.has.foundEnt) {
      const dom = email ? (email.split('@')[1] || null) : null;
      await ensureTrialBundle(c, t.tenant_id, userId, dom);
      actions.push('trial-bundle');
    }
  }
  if (actions.length === 0) actions.push('NOOP-already-complete');
  return { tenant_id: t.tenant_id, code: t.tenant_code, cohort, actions };
}

async function main() {
  await withClient(async (c) => {
    const where = ONLY_TENANT ? `WHERE tenant_id = $1` : '';
    const args = ONLY_TENANT ? [ONLY_TENANT] : [];
    const r = await c.query(
      `SELECT tenant_id, tenant_code, tenant_name, status FROM dos.tenants ${where} ORDER BY created_at`,
      args,
    );
    console.log(`[reconcile-tenants] mode=${DRY ? 'DRY-RUN' : 'WRITE'} report-only=${REPORT} archive-ghosts=${ARCHIVE_GHOSTS} target=${ONLY_TENANT || 'ALL'} count=${r.rows.length}`);
    const tally = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, archived: 0, written: 0 };
    for (const t of r.rows) {
      if (REPORT) {
        const cls = await classify(c, t);
        tally[cls.cohort] = (tally[cls.cohort] || 0) + 1;
        console.log(`  ${t.tenant_id.padEnd(20)} ${t.tenant_code?.padEnd(22) || '?'} cohort=${cls.cohort} user=${cls.has.user} mem=${cls.has.member} role=${cls.has.role} prod=${cls.has.shahin}/${cls.has.foundation} trial=${cls.has.trial}`);
        continue;
      }
      try {
        const result = await reconcileOne(c, t);
        tally[result.cohort] = (tally[result.cohort] || 0) + 1;
        if (result.actions.some(a => a === 'archived-ghost')) tally.archived++;
        if (result.actions.some(a => a !== 'NOOP-already-complete' && !a.startsWith('SKIP'))) tally.written++;
        console.log(`  ${t.tenant_id.padEnd(20)} cohort=${result.cohort} → ${result.actions.join(', ')}`);
      } catch (e) {
        console.error(`  ${t.tenant_id} FAILED: ${e.message}`);
      }
    }
    console.log(`[reconcile-tenants] tally`, tally);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
