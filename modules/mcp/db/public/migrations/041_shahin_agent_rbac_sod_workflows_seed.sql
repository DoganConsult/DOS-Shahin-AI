-- ============================================================================
-- 041_shahin_agent_rbac_sod_workflows_seed.sql
--
-- Seeds:
--   * public.agent_tool_permissions  — one execute grant per (agent_id, tool)
--   * public.agent_sod_policies      — SoD rules for high-risk actions
--   * dos.workflow_templates         — 8 named templates referenced by
--                                      ai_workflow_triggers (run_approval,
--                                      generate_roadmap, run_phishing_sim, ...)
--
-- Idempotent. Tenant-scoped to the platform tenant
-- 00000000-0000-0000-0000-000000000000 (used as the global default tenant).
-- ============================================================================

BEGIN;

-- ── 1. agent_tool_permissions: grant execute on every catalog tool ──
INSERT INTO public.agent_tool_permissions
  (tenant_id, agent_id, tool_name, action, level, active, notes)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  t.agent_id,
  t.tool_name,
  'execute',
  CASE
    WHEN t.risk_level IN ('critical','high') THEN 'approval_required'
    ELSE 'allow'
  END,
  TRUE,
  'Seeded by migration 041 from mcp_tool_registry'
FROM public.mcp_tool_registry t
WHERE t.agent_id ~ '^A[0-9]{2}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_tool_permissions p
     WHERE p.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
       AND p.agent_id = t.agent_id
       AND p.tool_name = t.tool_name
       AND p.action = 'execute'
  );

-- ── 2. agent_sod_policies: SoD rules for high-impact actions ──
INSERT INTO public.agent_sod_policies
  (tenant_id, proposer_type, approver_type, action_key, outcome, reason, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000000','agent','human','assign_role',          'escalate','SoD: a role assignment proposed by an agent must be approved by a human IAM admin','system'),
  ('00000000-0000-0000-0000-000000000000','agent','human','provision_user',       'escalate','PII creation must be approved by a human IAM admin','system'),
  ('00000000-0000-0000-0000-000000000000','agent','human','update_register',      'escalate','Risk register mutation requires risk officer approval','system'),
  ('00000000-0000-0000-0000-000000000000','agent','human','run_approval',         'escalate','Policy approval start requires human policy owner','system'),
  ('00000000-0000-0000-0000-000000000000','agent','human','seed_workspace',       'escalate','Tenant provisioning requires tenant admin approval','system'),
  ('00000000-0000-0000-0000-000000000000','agent','human','generate_roadmap',     'escalate','Remediation roadmap creates action items; requires compliance officer','system'),
  ('00000000-0000-0000-0000-000000000000','agent','human','run_phishing_sim',     'escalate','Phishing simulation campaigns require training owner approval','system'),
  ('00000000-0000-0000-0000-000000000000','agent','human','generate_regulator_pack','escalate','Regulator-ready pack requires audit lead approval','system'),
  ('00000000-0000-0000-0000-000000000000','agent','agent','assign_role',         'block',   'Agents cannot approve role assignments proposed by other agents','system'),
  ('00000000-0000-0000-0000-000000000000','agent','agent','update_register',     'block',   'Agents cannot self-approve risk register changes','system')
ON CONFLICT (tenant_id, proposer_type, approver_type, action_key) DO UPDATE
  SET outcome = EXCLUDED.outcome,
      reason  = EXCLUDED.reason;

-- ── 3. dos.workflow_templates: 8 named templates referenced by triggers ──
-- Use deterministic template_id strings so the seed is idempotent.
INSERT INTO dos.workflow_templates
  (template_id, template_code, module_code, display_name, definition,
   version, status, name, description, category, is_active, created_by)
VALUES
  ('wf-risk-treatment',     'risk-treatment-flow',     'risk',
    'Risk Treatment Flow',
    '{"steps":[{"id":"assess","action":"score_risk_5x5"},{"id":"treat","action":"propose_treatment","approval":"single"},{"id":"monitor","action":"track_kri"}]}'::jsonb,
    1,'active','Risk Treatment','Triage and treatment for KRI breach','risk',TRUE,'system'),
  ('wf-evidence-refresh',   'evidence-refresh-flow',   'evidence',
    'Evidence Refresh Flow',
    '{"steps":[{"id":"detect","action":"check_freshness"},{"id":"collect","action":"collect_evidence"},{"id":"analyze","action":"analyze_document"}]}'::jsonb,
    1,'active','Evidence Refresh','Refresh stale evidence artefacts','evidence',TRUE,'system'),
  ('wf-policy-approval',    'policy-approval-flow',    'policy',
    'Policy Approval Flow',
    '{"steps":[{"id":"draft","action":"draft_policy"},{"id":"review","approval":"single"},{"id":"distribute","action":"distribute_policy"}]}'::jsonb,
    1,'active','Policy Approval','End-to-end policy approval lifecycle','policy',TRUE,'system'),
  ('wf-phishing-remediation','phishing-remediation-flow','training',
    'Phishing Remediation Flow',
    '{"steps":[{"id":"detect","action":"phishing_clicked"},{"id":"assign","action":"assign_training"},{"id":"track","action":"track_completion"}]}'::jsonb,
    1,'active','Phishing Remediation','Auto-remediate phishing failures','training',TRUE,'system'),
  ('wf-control-publish',    'control-publish-approval','controls',
    'Control Publish Approval',
    '{"steps":[{"id":"draft","action":"author_control"},{"id":"test","action":"draft_test_procedure"},{"id":"approve","approval":"single"}]}'::jsonb,
    1,'active','Control Publish','Author + test + approve','controls',TRUE,'system'),
  ('wf-vendor-treatment',   'vendor-treatment-flow',   'vendor',
    'Vendor Treatment Flow',
    '{"steps":[{"id":"score","action":"score_vendor"},{"id":"ddq","action":"run_ddq"},{"id":"sla","action":"monitor_sla"}]}'::jsonb,
    1,'active','Vendor Treatment','Vendor risk treatment','vendor',TRUE,'system'),
  ('wf-bcp-recovery',       'bcp-recovery-flow',       'bcp',
    'BCP Recovery Flow',
    '{"steps":[{"id":"detect","action":"track_rto_rpo"},{"id":"bia","action":"run_bia"},{"id":"exercise","action":"schedule_exercise"}]}'::jsonb,
    1,'active','BCP Recovery','Recovery exercise on RTO/RPO breach','bcp',TRUE,'system'),
  ('wf-remediation-roadmap','remediation-roadmap-flow','remediation',
    'Remediation Roadmap Flow',
    '{"steps":[{"id":"score","action":"score_priority"},{"id":"plan","action":"generate_roadmap","approval":"single"}]}'::jsonb,
    1,'active','Remediation Roadmap','Plan phased remediation','remediation',TRUE,'system')
ON CONFLICT (template_id) DO UPDATE
  SET template_code = EXCLUDED.template_code,
      module_code   = EXCLUDED.module_code,
      display_name  = EXCLUDED.display_name,
      definition    = EXCLUDED.definition,
      status        = EXCLUDED.status,
      name          = EXCLUDED.name,
      description   = EXCLUDED.description,
      category      = EXCLUDED.category,
      is_active     = EXCLUDED.is_active,
      updated_at    = NOW();

COMMIT;
