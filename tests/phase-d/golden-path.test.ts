/**
 * Phase D — Release Gate E2E Proof
 *
 * D1: end-to-end golden path  (fresh tenant -> workspace-ready -> first
 *     agent wave -> first teammate activation)
 * D2: telemetry proof         (the whole lifecycle can be reconstructed
 *                              from persisted state)
 * D3: idempotency & load      (replay + concurrent dispatch do not duplicate
 *                              durable state)
 *
 * This suite runs against the REAL Postgres instance configured in
 * vitest.phase-d.config.mjs. It intentionally bypasses the HTTP surface
 * and drives the dispatcher/executors/invitations modules directly so
 * the failure signal points at runtime logic, not transport glue.
 *
 * Run:
 *   pnpm exec vitest run -c vitest.phase-d.config.mjs \
 *     tests/phase-d/golden-path.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import * as crypto from 'node:crypto';

// Resolve built dist — services are compiled to dist/ by their build step.
// We import the JS directly so the test exercises exactly what is deployed.
import {
  dispatchPostProvisionHandoff,
  FIRST_AGENT_WAVE,
  HANDOFF_PHASE_POST_ONBOARDING,
  getHandoffCycleByKey,
 
} from '../../services/onboarding-service/dist/services/post-provision-dispatcher.service.js';
import {
  getHandoffResultsByWorkspace,
  getEvidenceHandoffResults,
} from '../../services/onboarding-service/dist/services/handoff-agent-executors.service.js';
import {
  createHandoffInvitation,
  acceptHandoffInvitation,
  listHandoffInvitationsForWorkspace,
} from '../../services/onboarding-service/dist/services/handoff-invitations.service.js';
import { getAgentFleetStatus } from '../../services/onboarding-service/dist/services/agent-fleet.service.js';
// Load the publisher via createRequire so the test shares the exact CJS
// module instance used by the compiled handoff-invitations.service.js
// (which does `require("../events/publisher")`). Using ESM `import` here
// would produce a second module copy and our mock bus would never be read.
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);
const { setServiceBus } = require_(
  '../../services/onboarding-service/dist/events/publisher.js',
) as { setServiceBus: (bus: unknown) => void };

const DATABASE_URL = process.env.DATABASE_URL!;

// ── Capturing mock event bus so audit/event emission is observable. ──
interface CapturedEvent { type: string; payload: any; meta: any }
const capturedEvents: CapturedEvent[] = [];
setServiceBus({
  publish: async (type: string, payload: any, meta: any) => {
    capturedEvents.push({ type, payload, meta });
  },
} as any);

// ── Shared fixtures ─────────────────────────────────────────────────
const pool = new Pool({ connectionString: DATABASE_URL });
const TENANT_ID = 'pD_' + Date.now().toString(36).slice(-6);
const WORKSPACE_ID = 'ws_' + crypto.randomBytes(4).toString('hex');
const OWNER_USER_ID = 'u_pd_' + crypto.randomBytes(4).toString('hex');
let SESSION_ID: string;

async function cleanup() {
  // Order matters — FKs from child to parent.
  const tables = [
    'onboarding_handoff_evidence_requests',
    'onboarding_handoff_invitations',
    'onboarding_handoff_agent_findings',
    'onboarding_handoff_agent_runs',
    'onboarding_workspace_handoff_cycles',
    'onboarding_inference_items',
    'onboarding_inference_bundles',
    'onboarding_sessions',
    'invitations',
    'tenant_user_memberships',
  ];
  for (const t of tables) {
    await pool.query(`DELETE FROM public.${t} WHERE tenant_id::text = $1`, [TENANT_ID]).catch(() => {});
  }
  await pool.query(`DELETE FROM public.users WHERE tenant_id::text = $1`, [TENANT_ID]).catch(() => {});
  await pool.query(`DELETE FROM dos.evidences WHERE tenant_id::text = $1`, [TENANT_ID]).catch(() => {});
  await pool.query(`DELETE FROM dos.controls WHERE tenant_id::text = $1`, [TENANT_ID]).catch(() => {});
  await pool.query(`DELETE FROM dos.compliance_frameworks WHERE tenant_id::text = $1`, [TENANT_ID]).catch(() => {});
  await pool.query(`DELETE FROM public.tenants WHERE tenant_id = $1`, [TENANT_ID]).catch(() => {});
}

beforeAll(async () => {
  await cleanup();

  // Tenant + owner user (registration analog).
  await pool.query(
    `INSERT INTO public.tenants
       (tenant_id, org_name, industry, org_size, status,
        tenant_code, tenant_name_en, schema_name)
     VALUES ($1, $2, 'financial_services', '201-500', 'active', $3, $4, $5)`,
    [TENANT_ID, 'Phase D Test Org', TENANT_ID, 'Phase D Test Org', `t_${TENANT_ID.toLowerCase()}`],
  );
  await pool.query(
    `INSERT INTO public.users (user_id, email, password_hash, name, full_name, tenant_id, role, status, platform_role, email_verified)
     VALUES ($1, $2, '', 'Phase D Owner', 'Phase D Owner', $3, 'owner', 'active', 'owner', TRUE)`,
    [OWNER_USER_ID, `owner+${TENANT_ID}@test.local`, TENANT_ID],
  );

  // Onboarding session (post-registration, anchors answered, journey resolved).
  const sessionKey = 'sess_' + crypto.randomBytes(6).toString('hex');
  const s = await pool.query(
    `INSERT INTO public.onboarding_sessions
       (session_key, status, tenant_id, workspace_id, started_by_user_id,
        organization_name, language_code, effective_journey_profile)
     VALUES ($1, 'approved', $2, $3, $4, 'Phase D Test Org', 'en', 'express')
     RETURNING id`,
    [sessionKey, TENANT_ID, WORKSPACE_ID, OWNER_USER_ID],
  );
  SESSION_ID = s.rows[0].id as string;

  // Anchor answers in v2 table (handoff payload snapshot reads these).
  const anchors: Array<[string, any]> = [
    ['org_name',            'Phase D Test Org'],
    ['org_type',            'private'],
    ['org_size',            '201-500'],
    ['sector',              'financial_services'],
    ['country',             'SAU'],
    ['regulatory_bodies',   ['SAMA', 'NCA']],
    ['frameworks_confirmed',['ISO_27001', 'SAMA_CSF']],
    ['governance_model',    'centralized'],
    ['grc_maturity',        'initial'],
    ['data_start_mode',     'clean_start'],
  ];
  for (const [code, value] of anchors) {
    await pool.query(
      `INSERT INTO public.onboarding_session_answers
         (session_id, question_code, answer_value)
       VALUES ($1::uuid, $2, $3::jsonb)
       ON CONFLICT DO NOTHING`,
      [SESSION_ID, code, JSON.stringify({ value })],
    ).catch(async () => {
      // Fallback to legacy table if v2 schema/column differs.
      await pool.query(
        `INSERT INTO public.onboarding_answers
           (session_id, question_code, answer_text, answer_json)
         VALUES ($1::uuid, $2, $3, $4::jsonb)`,
        [SESSION_ID, code, typeof value === 'string' ? value : null, JSON.stringify(value)],
      ).catch(() => {});
    });
  }

  // Inference bundle + accepted items (B2/B3 artifact).
  const b = await pool.query(
    `INSERT INTO public.onboarding_inference_bundles
       (session_id, tenant_id, inference_version, mapping_version,
        needs_confirmation, bundle_json, inputs_fingerprint)
     VALUES ($1::uuid, $2, 'v1.0.0', 'm1.0.0', FALSE, '{}'::jsonb, 'test-fp-1')
     RETURNING id`,
    [SESSION_ID, TENANT_ID],
  );
  const BUNDLE_ID = b.rows[0].id as string;

  const items: Array<[string, string, string, number, string]> = [
    ['framework', 'ISO_27001', 'ISO/IEC 27001', 0.92, 'lookup'],
    ['framework', 'SAMA_CSF',  'SAMA CSF',      0.90, 'lookup'],
    ['regulator', 'SAMA',      'SAMA',          0.95, 'lookup'],
    ['regulator', 'NCA',       'NCA',           0.88, 'lookup'],
  ];
  for (const [kind, code, label, conf, source] of items) {
    await pool.query(
      `INSERT INTO public.onboarding_inference_items
         (bundle_id, session_id, item_kind, item_code, item_label,
          confidence, source_tag, status, resolved_in_version)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'accepted', 'v1.0.0')`,
      [BUNDLE_ID, SESSION_ID, kind, code, label, conf, source],
    );
  }

  // Seed frameworks in dos schema. The applied deployment's schema does not
  // carry a 'code' column on compliance_frameworks (matches ops/009b) so we
  // seed only the columns that exist and rely on the inference-bundle
  // fallback inside A05 for code-keyed framework identity.
  await pool.query(
    `INSERT INTO dos.compliance_frameworks (tenant_id, name, status)
     VALUES ($1, $2, 'active'), ($1, $3, 'active')`,
    [TENANT_ID, 'ISO/IEC 27001', 'SAMA CSF'],
  ).catch(() => {});
}, 60_000);

afterAll(async () => {
  await cleanup();
  await pool.end();
});

// ═════════════════════════════════════════════════════════════════════════
// D1 — Golden path: dispatch → first agent wave → durable outputs
// ═════════════════════════════════════════════════════════════════════════
describe('Phase D1 — end-to-end golden path', () => {
  it('dispatches exactly one handoff cycle from a workspace-ready tenant', async () => {
    const result = await dispatchPostProvisionHandoff({
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      sessionId: SESSION_ID,
      userId: OWNER_USER_ID,
      provisioningJobId: 'test-prov-job-1',
      eventId: 'test-evt-1',
    });
    expect(result.created).toBe(true);
    expect(result.reason).toBe('newly_created');
    expect(result.phase).toBe(HANDOFF_PHASE_POST_ONBOARDING);
    expect(result.agentsPlanned.sort()).toEqual([...FIRST_AGENT_WAVE].sort());
    // Status must be completed or degraded — never silent.
    expect(['completed', 'degraded']).toContain(result.status);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM public.onboarding_workspace_handoff_cycles
       WHERE tenant_id = $1 AND workspace_id = $2`,
      [TENANT_ID, WORKSPACE_ID],
    );
    expect(rows[0].c).toBe(1);
  });

  it('creates one run per FIRST_AGENT_WAVE agent with terminal status', async () => {
    const { rows } = await pool.query(
      `SELECT agent_id, status, findings_count, proposed_actions_count, result_json
       FROM public.onboarding_handoff_agent_runs
       WHERE tenant_id = $1
       ORDER BY agent_id`,
      [TENANT_ID],
    );
    const ids = rows.map(r => r.agent_id).sort();
    expect(ids).toEqual([...FIRST_AGENT_WAVE].sort());
    for (const r of rows) {
      expect(['completed', 'degraded', 'failed']).toContain(r.status);
      expect(r.result_json).toBeTruthy();
    }
  });

  it('A05 produces durable evidence_requests grounded in seeded frameworks', async () => {
    const evidence = await getEvidenceHandoffResults(TENANT_ID, WORKSPACE_ID);
    expect(evidence).not.toBeNull();
    expect(evidence!.totals.total).toBeGreaterThan(0);
    expect(evidence!.requests.length).toBeGreaterThan(0);
    // At least one row must carry a real framework_code from the seeded set.
    const fwCodes = new Set(evidence!.requests.map((r: any) => r.frameworkCode));
    expect(fwCodes.has('ISO_27001') || fwCodes.has('SAMA_CSF')).toBe(true);
  });

  it('first teammate invite → accept → real membership + role assignment', async () => {
    const cycle = await getHandoffCycleByKey(TENANT_ID, WORKSPACE_ID, HANDOFF_PHASE_POST_ONBOARDING);
    expect(cycle).not.toBeNull();

    const invite = await createHandoffInvitation({
      cycleId: cycle!.cycleId,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      invitedBy: OWNER_USER_ID,
      email: `teammate+${TENANT_ID}@test.local`,
      roleCode: 'compliance_lead',
    });
    expect(invite.state).toBe('invited');
    expect(invite.token).toBeTruthy();

    const accepted = await acceptHandoffInvitation({ token: invite.token });
    expect(accepted.state).toBe('role_assigned');
    expect(accepted.membershipId).toBeTruthy();
    expect(accepted.acceptedUserId).toBeTruthy();

    const mem = await pool.query(
      `SELECT status, org_role_code FROM public.tenant_user_memberships
       WHERE tenant_id = $1 AND user_id = $2`,
      [TENANT_ID, accepted.acceptedUserId],
    );
    expect(mem.rows[0].status).toBe('active');
    expect(mem.rows[0].org_role_code).toBe('compliance_lead');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// D2 — Telemetry proof: lifecycle reconstructable from persisted state
// ═════════════════════════════════════════════════════════════════════════
describe('Phase D2 — telemetry', () => {
  it('handoff cycle exposes dispatch target + last_transition_at', async () => {
    const { rows } = await pool.query(
      `SELECT status, dispatch_target, agents_dispatched, last_transition_at
       FROM public.onboarding_workspace_handoff_cycles
       WHERE tenant_id = $1`,
      [TENANT_ID],
    );
    expect(rows[0].dispatch_target).not.toBeNull();
    expect(Array.isArray(rows[0].agents_dispatched)).toBe(true);
    expect(rows[0].last_transition_at).not.toBeNull();
  });

  it('per-agent findings exist and are groupable by agent_id', async () => {
    const { rows } = await pool.query(
      `SELECT agent_id, finding_type, COUNT(*)::int AS c
       FROM public.onboarding_handoff_agent_findings
       WHERE tenant_id = $1
       GROUP BY agent_id, finding_type`,
      [TENANT_ID],
    );
    expect(rows.length).toBeGreaterThan(0);
    // At least one agent must have produced findings or proposed actions.
    const total = rows.reduce((n, r) => n + r.c, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('lifecycle is reconstructable through getHandoffResultsByWorkspace', async () => {
    const res = await getHandoffResultsByWorkspace(TENANT_ID, WORKSPACE_ID);
    expect(res).not.toBeNull();
    expect(res!.cycle).toBeTruthy();
    expect(res!.agents.length).toBe(FIRST_AGENT_WAVE.length);
    for (const a of res!.agents) {
      expect(a.agentId).toBeTruthy();
      expect(typeof a.findingsCount).toBe('number');
      expect(typeof a.proposedActionsCount).toBe('number');
    }
  });

  it('captured event bus recorded invitation + team activation events', () => {
    const types = capturedEvents.map(e => e.type);
    expect(types).toContain('onboarding.handoff.invitation_created');
    expect(types).toContain('onboarding.handoff.invitation_accepted');
    expect(types).toContain('onboarding.handoff.team_activated');
  });

  it('fleet status surface is truthful — 5 live, 7 inactive', async () => {
    const fleet = await getAgentFleetStatus(TENANT_ID, WORKSPACE_ID);
    expect(fleet.counts.total).toBe(12);
    expect(fleet.counts.live).toBe(FIRST_AGENT_WAVE.length);
    expect(fleet.counts.inactive).toBe(12 - FIRST_AGENT_WAVE.length);
    // Inactive agents must not pretend to report work.
    for (const a of fleet.agents) {
      if (a.executorStatus === 'inactive') {
        expect(a.lastRunAt).toBeNull();
        expect(a.findingsCount).toBe(0);
        expect(a.proposedActionsCount).toBe(0);
        expect(a.reason).toBe('no_executor_wired');
      } else if (a.executorStatus === 'live') {
        expect(a.enabledForHandoff).toBe(true);
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
// D3 — Idempotency & load proof
// ═════════════════════════════════════════════════════════════════════════
describe('Phase D3 — idempotency & load', () => {
  it('replay of the same dispatch returns already_exists (no duplicate cycle)', async () => {
    const result = await dispatchPostProvisionHandoff({
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      sessionId: SESSION_ID,
      userId: OWNER_USER_ID,
      provisioningJobId: 'test-prov-job-1',
      eventId: 'test-evt-1',
    });
    expect(result.created).toBe(false);
    expect(result.reason).toBe('already_exists');

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM public.onboarding_workspace_handoff_cycles
       WHERE tenant_id = $1 AND workspace_id = $2 AND phase = $3`,
      [TENANT_ID, WORKSPACE_ID, HANDOFF_PHASE_POST_ONBOARDING],
    );
    expect(rows[0].c).toBe(1);
  });

  it('re-accept of an invitation is a no-op (no duplicate membership)', async () => {
    const invites = await listHandoffInvitationsForWorkspace(TENANT_ID, WORKSPACE_ID);
    expect(invites.length).toBeGreaterThan(0);
    const first = invites[0];
    const again = await acceptHandoffInvitation({ token: first.token });
    expect(again.state).toBe('role_assigned');

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM public.tenant_user_memberships
       WHERE tenant_id = $1`,
      [TENANT_ID],
    );
    expect(rows[0].c).toBe(1);
  });

  it('5 concurrent dispatches for a new workspace yield exactly one cycle', async () => {
    const wsId = 'ws_conc_' + crypto.randomBytes(3).toString('hex');
    // Create session for this workspace so payload builder can resolve it.
    const s = await pool.query(
      `INSERT INTO public.onboarding_sessions
         (session_key, status, tenant_id, workspace_id, started_by_user_id, language_code)
       VALUES ($1, 'approved', $2, $3, $4, 'en') RETURNING id`,
      ['sess_conc_' + crypto.randomBytes(4).toString('hex'), TENANT_ID, wsId, OWNER_USER_ID],
    );
    const sid = s.rows[0].id as string;

    const dispatches = Array.from({ length: 5 }).map(() =>
      dispatchPostProvisionHandoff({
        tenantId: TENANT_ID,
        workspaceId: wsId,
        sessionId: sid,
        userId: OWNER_USER_ID,
        provisioningJobId: 'test-prov-conc',
        eventId: 'test-evt-conc',
      }),
    );
    const results = await Promise.all(dispatches);

    const createdCount = results.filter(r => r.created).length;
    expect(createdCount).toBe(1);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM public.onboarding_workspace_handoff_cycles
       WHERE tenant_id = $1 AND workspace_id = $2 AND phase = $3`,
      [TENANT_ID, wsId, HANDOFF_PHASE_POST_ONBOARDING],
    );
    expect(rows[0].c).toBe(1);

    const runs = await pool.query(
      `SELECT agent_id, COUNT(*)::int AS c
       FROM public.onboarding_handoff_agent_runs
       WHERE tenant_id = $1 AND workspace_id = $2
       GROUP BY agent_id`,
      [TENANT_ID, wsId],
    );
    for (const r of runs.rows) expect(r.c).toBe(1);
  });
});
