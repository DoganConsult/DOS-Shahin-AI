-- AI-OS Wave 2 — Extend agent_tool_permissions seed to all 13 agents
-- across every active tenant. Follows the 531 idempotent soft-revoke +
-- insert pattern. Read-only baseline grants for A01-A13; write-gated
-- (level=approval_required) tools for the four write-capable agents
-- A02 / A04 / A06 / A08 (per packages/shahin-product/src/agrc-agents.ts
-- approvalBoundary='high'|'medium').
--
-- Idempotent: existing active grants are soft-revoked (active=FALSE,
-- revoked_at=NOW()) before each insert, so reruns produce one active row
-- per (tenant_id, agent_id, tool_name, action).

DO $$
DECLARE
  rec_tenant   RECORD;
  rec_grant    RECORD;
  inserted_n   integer := 0;

  -- Per-agent read-only allow-lists keyed by canonical agent_id.
  -- Aligned with the agent's domain (foundation/admin/compliance/etc.)
  -- and the in-code tool builders under runtime/ai/tools/<agent>/.
  --
  -- A01 already covered by 531; we re-seed here so reruns of 533 alone
  -- still produce a complete grant matrix without depending on 531 having
  -- been applied first.
  agent_reads jsonb := '{
    "A01": ["foundation.read","tenant.read","workspace.read","organization.read","identity.read","permission.read"],
    "A02": ["identity.read","permission.read","role.read","user.read","mfa.read"],
    "A03": ["framework.read","control.read","mapping.read","regulatory.read"],
    "A04": ["control.read","framework.read","test_procedure.read","control_status.read"],
    "A05": ["risk.read","heat_map.read","threat.read","control_effectiveness.read"],
    "A06": ["finding.read","gap.read","remediation.read","action_plan.read"],
    "A07": ["audit.read","evidence.read","control.read","audit_plan.read"],
    "A08": ["policy.read","policy_lifecycle.read","framework.read","approval.read"],
    "A09": ["incident.read","alert.read","threat.read","timeline.read"],
    "A10": ["vendor.read","contract.read","third_party.read","sla.read"],
    "A11": ["training.read","awareness.read","completion.read","quiz.read"],
    "A12": ["report.read","metric.read","dashboard.read","kpi.read"],
    "A13": ["public_content.read","faq.read","framework.read","tenant_meta.read"]
  }'::jsonb;

  -- Write actions that require human approval (HITL). Only the four
  -- write-capable agents per the canonical agrc-agents.ts metadata.
  agent_writes jsonb := '{
    "A02": ["user.invite","permission.assign","role.assign","mfa.enforce","organization.write"],
    "A04": ["control.write","control.publish","test_procedure.write"],
    "A06": ["finding.write","remediation.assign","action_plan.write"],
    "A08": ["policy.write","policy.publish","policy.retire","approval.request"]
  }'::jsonb;
BEGIN
  -- Iterate over every active tenant. Reuses the 531 fallback rule:
  -- "active|provisioned|live|ga" tenants get the seed. public.tenants
  -- stores tenant_id as varchar so we filter to valid UUIDs only — the
  -- agent_tool_permissions FK side requires uuid.
  FOR rec_tenant IN
    SELECT tenant_id
      FROM public.tenants
     WHERE COALESCE(status, 'active') IN ('active','provisioned','live','ga','registered','onboarding')
       AND tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    -- Read-only grants: every agent A01..A13.
    FOR rec_grant IN
      SELECT je.key AS agent_id, jt.tool_name
        FROM jsonb_each(agent_reads) je,
             LATERAL jsonb_array_elements_text(je.value) AS jt(tool_name)
    LOOP
      UPDATE public.agent_tool_permissions
         SET active = FALSE, revoked_at = NOW()
       WHERE tenant_id = rec_tenant.tenant_id::uuid
         AND agent_id  = rec_grant.agent_id::text
         AND tool_name = rec_grant.tool_name::text
         AND action    = 'invoke'
         AND active    = TRUE;

      INSERT INTO public.agent_tool_permissions (
        tenant_id, agent_id, tool_name, action, level, conditions, granted_by, notes
      )
      VALUES (
        rec_tenant.tenant_id::uuid, rec_grant.agent_id::text, rec_grant.tool_name::text, 'invoke', 'allow',
        jsonb_build_object('source','533-bootstrap','wave','2','readOnly', TRUE),
        NULL, 'Wave 2 baseline read-only grant'
      );
      inserted_n := inserted_n + 1;
    END LOOP;

    -- Write grants gated by HITL: A02 / A04 / A06 / A08 only.
    FOR rec_grant IN
      SELECT je.key AS agent_id, jt.tool_name
        FROM jsonb_each(agent_writes) je,
             LATERAL jsonb_array_elements_text(je.value) AS jt(tool_name)
    LOOP
      UPDATE public.agent_tool_permissions
         SET active = FALSE, revoked_at = NOW()
       WHERE tenant_id = rec_tenant.tenant_id::uuid
         AND agent_id  = rec_grant.agent_id::text
         AND tool_name = rec_grant.tool_name::text
         AND action    = 'invoke'
         AND active    = TRUE;

      INSERT INTO public.agent_tool_permissions (
        tenant_id, agent_id, tool_name, action, level, conditions, granted_by, notes
      )
      VALUES (
        rec_tenant.tenant_id::uuid, rec_grant.agent_id::text, rec_grant.tool_name::text, 'invoke', 'approval_required',
        jsonb_build_object('source','533-bootstrap','wave','2','hitl', TRUE),
        NULL, 'Wave 2 approval-gated write grant'
      );
      inserted_n := inserted_n + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE '[533] Seeded % tool-permission rows across all active tenants', inserted_n;
END$$;
