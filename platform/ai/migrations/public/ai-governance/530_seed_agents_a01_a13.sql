-- Seeds the 13 canonical platform agents (A01..A13) into ai_agent_registry.
-- Idempotent via ON CONFLICT (asset_id, version_number).
-- Deterministic asset_id derived from the agent code so re-runs are stable.

INSERT INTO public.ai_agent_registry (
  agent_version_id, asset_id, version_number, agent_config, capabilities,
  approval_status, deployment_status, is_active, created_by, created_at, updated_at,
  approved_by, approved_at, change_summary
)
SELECT
  gen_random_uuid(),
  asset_uuid,
  1,
  jsonb_build_object(
    'agentCode', code, 'name', name, 'domain', domain,
    'model', 'claude-sonnet-4-5', 'temperature', 0.2,
    'promptName', 'agent.' || lower(code) || '.system',
    'datasetName', 'dataset.' || lower(code) || '.smoke'
  ),
  jsonb_build_array(domain, 'tool-calling', 'multi-tenant'),
  'approved', 'production', TRUE,
  'platform-ai-bootstrap', now(), now(),
  'platform-ai-bootstrap', now(),
  'Initial canonical seed of A01..A13 from platform/ai bundle'
FROM (VALUES
  ('A01','Onboarding Agent','foundation','11111111-0000-0000-0000-000000000001'::uuid),
  ('A02','Identity Provisioning Agent','admin','11111111-0000-0000-0000-000000000002'::uuid),
  ('A03','Framework Mapping Agent','compliance','11111111-0000-0000-0000-000000000003'::uuid),
  ('A04','Control Authoring Agent','compliance','11111111-0000-0000-0000-000000000004'::uuid),
  ('A05','Evidence Collection Agent','evidence','11111111-0000-0000-0000-000000000005'::uuid),
  ('A06','Gap Remediation Agent','remediation','11111111-0000-0000-0000-000000000006'::uuid),
  ('A07','Risk Register Agent','risk','11111111-0000-0000-0000-000000000007'::uuid),
  ('A08','Policy Lifecycle Agent','governance','11111111-0000-0000-0000-000000000008'::uuid),
  ('A09','Third-Party Risk Agent','vendor','11111111-0000-0000-0000-000000000009'::uuid),
  ('A10','Audit Reporting Agent','audit','11111111-0000-0000-0000-000000000010'::uuid),
  ('A11','BCP Continuity Agent','bcp','11111111-0000-0000-0000-000000000011'::uuid),
  ('A12','Security Awareness & Training Agent','training','11111111-0000-0000-0000-000000000012'::uuid),
  ('A13','Policy Review & Landing Copilot','copilot','11111111-0000-0000-0000-000000000013'::uuid)
) AS agents(code, name, domain, asset_uuid)
ON CONFLICT (asset_id, version_number) DO UPDATE SET
  agent_config      = EXCLUDED.agent_config,
  capabilities      = EXCLUDED.capabilities,
  approval_status   = EXCLUDED.approval_status,
  deployment_status = EXCLUDED.deployment_status,
  is_active         = EXCLUDED.is_active,
  updated_at        = now(),
  approved_by       = EXCLUDED.approved_by,
  approved_at       = EXCLUDED.approved_at,
  change_summary    = EXCLUDED.change_summary;

-- Seed missing platform AI permissions (idempotent on permission_code).
INSERT INTO platform_dauth.permissions (permission_id, permission_code, module_code, resource_type, action_type, description)
VALUES
  ('ai.kernel.admin',      'ai.kernel.admin',      'ai', 'kernel',     'admin',  'Administer AI-OS kernel (autonomy, kill switches, snapshots)'),
  ('ai.governance.review', 'ai.governance.review', 'ai', 'governance', 'review', 'Review AI governance findings, bias reports, and impact assessments'),
  ('ai.temporal.invoke',   'ai.temporal.invoke',   'ai', 'workflow',   'invoke', 'Start agent workflows on the AI-OS Temporal task queue'),
  ('ai.landing.invoke',    'ai.landing.invoke',    'ai', 'copilot',    'invoke', 'Invoke the public landing copilot (A13 surface)')
ON CONFLICT (permission_id) DO NOTHING;
