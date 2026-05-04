#!/usr/bin/env node
/**
 * DOS Master CLI — Doctrine Article 9 (CLI ↔ UI parity).
 *
 * Subcommands implemented in M6 D1:
 *   dos product:add        --code <c> --name <n> [--edition standard]
 *                          [--marketing /] [--workspace /workspace-home]
 *   dos product:list
 *   dos product:enroll     --product <c> --module <m> [--edition standard]
 *                          [--enabled true]
 *   dos service:register   --code <c> --name <n> --zone <public|tenant|admin>
 *                          --port <n> [--pm2 <name>]
 *   dos service:list
 *   dos doctrine:list
 *   dos rollout:list
 *   dos publish:revisions  [--target-kind k] [--target-key k]
 *   dos signup:flows
 *
 * Every write is mediated by the `dos-master` PG application identity
 * (SET dos.actor='dos-master') so the trg_dos_master_only enforcement
 * fires through the same path as the onboarding-service HTTP API.
 *
 * Connection: DATABASE_URL or PG_* envs. No external deps beyond `pg`,
 * which is already present in the workspace.
 */
import { Client } from 'pg';

const argv = process.argv.slice(2);
const cmd = argv.shift();

function flag(name, def) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

function bool(v, def = false) {
  if (v === undefined) return def;
  if (v === true || v === 'true' || v === '1') return true;
  if (v === false || v === 'false' || v === '0') return false;
  return def;
}

async function withClient(fn) {
  const cs = process.env.DATABASE_URL
    || `postgres://${process.env.PGUSER || 'dos_auth'}:${process.env.PGPASSWORD || 'dos_auth_pass_2026'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'shahin_grc'}`;
  const c = new Client({ connectionString: cs });
  await c.connect();
  try {
    await c.query(`SET dos.actor = 'dos-master'`);
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function productAdd() {
  const code = flag('code'); const name = flag('name');
  if (!code || !name) { console.error('--code and --name required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos_master.product_registry
         (product_code, display_name, edition_default, marketing_root, workspace_root, status)
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT (product_code) DO UPDATE SET
         display_name=EXCLUDED.display_name,
         edition_default=EXCLUDED.edition_default,
         marketing_root=EXCLUDED.marketing_root,
         workspace_root=EXCLUDED.workspace_root`,
      [code, name, flag('edition', 'standard'), flag('marketing', null), flag('workspace', null)],
    );
    console.log(`[dos] product registered: ${code}`);
  });
}

async function productList() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT product_code, display_name, edition_default, status FROM dos_master.product_registry ORDER BY product_code`,
    );
    console.table(r.rows);
  });
}

async function productEnroll() {
  const product = flag('product'); const mod = flag('module');
  if (!product || !mod) { console.error('--product and --module required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos_master.product_module_enrollment (product_code, module_code, edition, enabled)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_code, module_code, edition) DO UPDATE SET enabled=EXCLUDED.enabled`,
      [product, mod, flag('edition', 'standard'), bool(flag('enabled'), true)],
    );
    console.log(`[dos] enrolled ${product} ← ${mod}`);
  });
}

async function serviceRegister() {
  const code = flag('code'); const name = flag('name');
  const zone = flag('zone'); const port = Number(flag('port'));
  if (!code || !name || !zone || !port) {
    console.error('--code --name --zone --port required'); process.exit(2);
  }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos_master.service_registry (service_code, display_name, trust_zone, port, pm2_name, status)
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT (service_code) DO UPDATE SET
         display_name=EXCLUDED.display_name, trust_zone=EXCLUDED.trust_zone,
         port=EXCLUDED.port, pm2_name=EXCLUDED.pm2_name`,
      [code, name, zone, port, flag('pm2', null)],
    );
    console.log(`[dos] service registered: ${code} :${port} [${zone}]`);
  });
}

async function serviceList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT service_code, port, trust_zone, status FROM dos_master.service_registry ORDER BY port`);
    console.table(r.rows);
  });
}

async function doctrineList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT article_no, title, enforced_by FROM dos_master.doctrine_article ORDER BY article_no`);
    console.table(r.rows);
  });
}

async function rolloutList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT id, title, status, created_at FROM dos.rollout_plan ORDER BY created_at DESC LIMIT 50`);
    console.table(r.rows);
  });
}

async function publishRevisions() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT id, target_kind, target_key, revision_no, status, created_at
         FROM dos.publish_revision
        ORDER BY created_at DESC LIMIT 50`,
    );
    console.table(r.rows);
  });
}

async function signupFlows() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT flow_code, product_code, display_name, enabled FROM dos_master.signup_flow ORDER BY flow_code`);
    console.table(r.rows);
  });
}

async function signupAttempts() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT id, flow_code, email, status, tenant_id, created_at
         FROM dos_master.signup_attempt
        ORDER BY created_at DESC LIMIT 50`,
    );
    console.table(r.rows);
  });
}

async function publishTargetAdd() {
  const kind = flag('kind'); const key = flag('key'); const name = flag('name');
  if (!kind || !key || !name) { console.error('--kind --key --name required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos.publish_target (target_kind, target_key, display_name, owner_team)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (target_kind, target_key) DO UPDATE SET display_name=EXCLUDED.display_name`,
      [kind, key, name, flag('owner', null)],
    );
    console.log(`[dos] publish target: ${kind}:${key}`);
  });
}

async function publishRevisionAdd() {
  const kind = flag('kind'); const key = flag('key'); const by = flag('by', 'dos-master-cli');
  const payload = flag('payload', '{}');
  if (!kind || !key) { console.error('--kind --key required'); process.exit(2); }
  return withClient(async (c) => {
    const n = await c.query(
      `SELECT COALESCE(MAX(revision_no),0)+1 AS n FROM dos.publish_revision WHERE target_kind=$1 AND target_key=$2`,
      [kind, key],
    );
    const r = await c.query(
      `INSERT INTO dos.publish_revision (target_kind, target_key, revision_no, payload, created_by, status)
       VALUES ($1,$2,$3,$4::jsonb,$5,'draft') RETURNING id, revision_no`,
      [kind, key, Number(n.rows[0].n), payload, by],
    );
    console.log(`[dos] revision created: ${r.rows[0].id} (rev ${r.rows[0].revision_no})`);
  });
}

async function publishGo() {
  const id = flag('id');
  if (!id) { console.error('--id required'); process.exit(2); }
  return withClient(async (c) => {
    const cur = await c.query(`SELECT target_kind, target_key, status FROM dos.publish_revision WHERE id=$1::uuid`, [id]);
    if (!cur.rows.length) { console.error('revision_not_found'); process.exit(3); }
    const { target_kind, target_key } = cur.rows[0];
    const sup = await c.query(
      `UPDATE dos.publish_revision SET status='superseded'
        WHERE target_kind=$1 AND target_key=$2 AND status='live' AND id<>$3::uuid`,
      [target_kind, target_key, id],
    );
    await c.query(`UPDATE dos.publish_revision SET status='live' WHERE id=$1::uuid`, [id]);
    await c.query(
      `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
       VALUES ('global', $1, $2, 'v1', 0)`,
      [`${target_kind}:${target_key}`, `publish_revision:${id}`],
    );
    console.log(`[dos] published live; superseded ${sup.rowCount ?? 0}`);
  });
}

async function publishRollback() {
  const id = flag('id'); const by = flag('by', 'dos-master-cli'); const reason = flag('reason', 'cli rollback');
  if (!id) { console.error('--id required'); process.exit(2); }
  return withClient(async (c) => {
    const cur = await c.query(`SELECT target_kind, target_key, status FROM dos.publish_revision WHERE id=$1::uuid`, [id]);
    if (!cur.rows.length || cur.rows[0].status !== 'live') { console.error('not_live'); process.exit(3); }
    await c.query(`INSERT INTO dos.publish_rollback (revision_id, rolled_back_by, reason) VALUES ($1::uuid,$2,$3)`, [id, by, reason]);
    await c.query(`UPDATE dos.publish_revision SET status='rolled_back' WHERE id=$1::uuid`, [id]);
    await c.query(
      `UPDATE dos.publish_revision SET status='live'
        WHERE id = (SELECT id FROM dos.publish_revision WHERE target_kind=$1 AND target_key=$2 AND status='superseded' ORDER BY revision_no DESC LIMIT 1)`,
      [cur.rows[0].target_kind, cur.rows[0].target_key],
    );
    await c.query(
      `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
       VALUES ('global', $1, $2, 'v1', 0)`,
      [`${cur.rows[0].target_kind}:${cur.rows[0].target_key}`, `publish_rollback:${id}`],
    );
    console.log(`[dos] rolled back ${id}`);
  });
}

async function adminUserAdd() {
  const email = flag('email'); const name = flag('name');
  if (!email || !name) { console.error('--email --name required'); process.exit(2); }
  return withClient(async (c) => {
    const r = await c.query(
      `INSERT INTO platform_admin.platform_admin_user (email, display_name, status)
       VALUES ($1,$2,'active')
       ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name
       RETURNING id`,
      [email, name],
    );
    console.log(`[dos] admin user: ${email} ${r.rows[0].id}`);
  });
}

async function adminRoleAdd() {
  const code = flag('code'); const name = flag('name'); const pillar = flag('pillar');
  if (!code || !name || !pillar) { console.error('--code --name --pillar required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO platform_admin.platform_admin_role (role_code, display_name, pillar, description)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (role_code) DO UPDATE SET display_name=EXCLUDED.display_name, pillar=EXCLUDED.pillar`,
      [code, name, pillar, flag('desc', null)],
    );
    console.log(`[dos] admin role: ${code} [${pillar}]`);
  });
}

async function adminGrant() {
  const userId = flag('user'); const role = flag('role'); const by = flag('by', 'dos-master-cli');
  if (!userId || !role) { console.error('--user --role required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO platform_admin.platform_admin_grant (user_id, role_code, granted_by)
       VALUES ($1::uuid,$2,$3)
       ON CONFLICT (user_id, role_code) DO UPDATE SET revoked_at=NULL, granted_by=EXCLUDED.granted_by`,
      [userId, role, by],
    );
    console.log(`[dos] granted ${role} to ${userId}`);
  });
}

async function tenantList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT tenant_id, tenant_code, tenant_name, status FROM dos.tenants ORDER BY tenant_id LIMIT 50`);
    console.table(r.rows);
  });
}

async function tenantComposer() {
  const id = flag('tenant');
  if (!id) { console.error('--tenant required'); process.exit(2); }
  return withClient(async (c) => {
    const t = await c.query(`SELECT tenant_id, tenant_code, status FROM dos.tenants WHERE tenant_id=$1`, [id]);
    if (!t.rows.length) { console.error('tenant_not_found'); process.exit(3); }
    const m = await c.query(`SELECT count(*)::int AS n FROM dos.tenant_memberships WHERE tenant_id=$1 AND status='active'`, [id]);
    const e = await c.query(`SELECT count(*)::int AS n FROM dos.tenant_module_entitlements WHERE tenant_id=$1`, [id]);
    console.log('tenant:', t.rows[0]);
    console.log('members:', m.rows[0].n, '| entitlements:', e.rows[0].n);
  });
}

async function pillarPageAdd() {
  const pillar = flag('pillar'); const key = flag('key'); const name = flag('name');
  const route = flag('route'); const arche = flag('archetype', 'dashboard-grid');
  const perm = flag('perm');
  if (!pillar || !key || !name || !route || !perm) { console.error('--pillar --key --name --route --perm required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos.admin_pillar_page (pillar_code, page_key, display_name, archetype, route, permission_required, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (pillar_code, page_key) DO UPDATE SET
         display_name=EXCLUDED.display_name, archetype=EXCLUDED.archetype,
         route=EXCLUDED.route, permission_required=EXCLUDED.permission_required`,
      [pillar, key, name, arche, route, perm, Number(flag('order', 1))],
    );
    console.log(`[dos] pillar page: ${pillar}/${key} -> ${route}`);
  });
}

async function pillarList() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT pillar_code, page_key, route, archetype FROM dos.admin_pillar_page ORDER BY pillar_code, display_order`);
    console.table(r.rows);
  });
}

async function adminUsers() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT id, email, display_name, status FROM platform_admin.platform_admin_user ORDER BY email`);
    console.table(r.rows);
  });
}

async function adminRoles() {
  return withClient(async (c) => {
    const r = await c.query(`SELECT role_code, pillar, display_name FROM platform_admin.platform_admin_role ORDER BY pillar, role_code`);
    console.table(r.rows);
  });
}

async function rolloutPlanAdd() {
  const title = flag('title'); const by = flag('by', 'dos-master-cli');
  if (!title) { console.error('--title required'); process.exit(2); }
  return withClient(async (c) => {
    const r = await c.query(
      `INSERT INTO dos.rollout_plan (title, status, created_by) VALUES ($1,'draft',$2) RETURNING id`,
      [title, by],
    );
    console.log(`[dos] rollout plan: ${r.rows[0].id}`);
  });
}

async function rolloutAdvance() {
  const plan = flag('plan'); const ring = flag('ring');
  if (!plan || !ring) { console.error('--plan --ring required'); process.exit(2); }
  return withClient(async (c) => {
    const cur = await c.query(`SELECT id, ring_order FROM dos.rollout_ring WHERE plan_id=$1::uuid AND ring_code=$2`, [plan, ring]);
    if (!cur.rows.length) { console.error('ring_not_found'); process.exit(3); }
    await c.query(`UPDATE dos.rollout_ring SET status='succeeded', ended_at=now() WHERE id=$1::uuid`, [cur.rows[0].id]);
    const next = await c.query(
      `UPDATE dos.rollout_ring SET status='active', started_at=now()
        WHERE plan_id=$1::uuid AND ring_order=$2 AND status='pending' RETURNING ring_code`,
      [plan, cur.rows[0].ring_order + 1],
    );
    if (!next.rows.length) await c.query(`UPDATE dos.rollout_plan SET status='succeeded' WHERE id=$1::uuid`, [plan]);
    else await c.query(`UPDATE dos.rollout_plan SET status='running' WHERE id=$1::uuid AND status='draft'`, [plan]);
    console.log(`[dos] advanced ${ring} → ${next.rows[0]?.ring_code ?? 'plan-complete'}`);
  });
}

async function rolloutRollback() {
  const plan = flag('plan'); const ring = flag('ring');
  const by = flag('by', 'dos-master-cli'); const reason = flag('reason', 'cli rollback');
  if (!plan || !ring) { console.error('--plan --ring required'); process.exit(2); }
  return withClient(async (c) => {
    const cur = await c.query(`SELECT id FROM dos.rollout_ring WHERE plan_id=$1::uuid AND ring_code=$2`, [plan, ring]);
    if (!cur.rows.length) { console.error('ring_not_found'); process.exit(3); }
    await c.query(`INSERT INTO dos.rollout_rollback (ring_id, triggered_by, reason, succeeded_at) VALUES ($1::uuid,$2,$3,now())`, [cur.rows[0].id, by, reason]);
    await c.query(`UPDATE dos.rollout_ring SET status='rolled_back', ended_at=now() WHERE id=$1::uuid`, [cur.rows[0].id]);
    await c.query(`UPDATE dos.rollout_plan SET status='rolled_back' WHERE id=$1::uuid`, [plan]);
    console.log(`[dos] rolled back ${ring}`);
  });
}

async function rolloutComposition() {
  const plan = flag('plan');
  if (!plan) { console.error('--plan required'); process.exit(2); }
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT r.ring_code, r.status, r.ring_order, count(g.*) AS gates, count(co.*) AS cohorts
         FROM dos.rollout_ring r
         LEFT JOIN dos.rollout_health_gate g ON g.ring_id = r.id
         LEFT JOIN dos.rollout_cohort co ON co.ring_id = r.id
        WHERE r.plan_id = $1::uuid
        GROUP BY r.id ORDER BY r.ring_order`,
      [plan],
    );
    console.table(r.rows);
  });
}

async function doctrineAck() {
  const article = flag('article'); const by = flag('by', 'dos-master-cli');
  if (!article) { console.error('--article required'); process.exit(2); }
  return withClient(async (c) => {
    await c.query(
      `INSERT INTO dos_master.doctrine_acknowledgement (article_no, actor, ack_at) VALUES ($1::int,$2,now()) ON CONFLICT (actor, article_no) DO NOTHING`,
      [article, by],
    );
    console.log(`[dos] doctrine article ${article} acknowledged by ${by}`);
  });
}

async function provisioningJobs() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT id, tenant_id, product_code, edition, status, created_at
         FROM dos_master.provisioning_job
        ORDER BY created_at DESC LIMIT 50`,
    );
    console.table(r.rows);
  });
}

const dispatch = {
  'product:add': productAdd,
  'product:list': productList,
  'product:enroll': productEnroll,
  'service:register': serviceRegister,
  'service:list': serviceList,
  'doctrine:list': doctrineList,
  'rollout:list': rolloutList,
  'publish:revisions': publishRevisions,
  'signup:flows': signupFlows,
  'signup:attempts': signupAttempts,
  'provisioning:jobs': provisioningJobs,
  'publish:target:add': publishTargetAdd,
  'publish:revision:add': publishRevisionAdd,
  'publish:go': publishGo,
  'publish:rollback': publishRollback,
  'admin:user:add': adminUserAdd,
  'admin:user:list': adminUsers,
  'admin:role:add': adminRoleAdd,
  'admin:role:list': adminRoles,
  'admin:grant': adminGrant,
  'pillar:page:add': pillarPageAdd,
  'pillar:list': pillarList,
  'tenant:list': tenantList,
  'tenant:composer': tenantComposer,
  'rollout:plan:add': rolloutPlanAdd,
  'rollout:advance': rolloutAdvance,
  'rollout:rollback': rolloutRollback,
  'rollout:composition': rolloutComposition,
  'doctrine:ack': doctrineAck,
};

if (!cmd || cmd === '-h' || cmd === '--help') {
  console.log('Usage: dos <command> [--flag value ...]');
  console.log('Commands:');
  for (const k of Object.keys(dispatch).sort()) console.log('  dos', k);
  process.exit(cmd ? 0 : 1);
}

const fn = dispatch[cmd];
if (!fn) { console.error(`unknown command: ${cmd}`); process.exit(2); }
fn().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
