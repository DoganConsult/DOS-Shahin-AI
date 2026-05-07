-- Seed canonical AI agent catalog A01..A13 in dos.dynamic_ui_agents.
-- Required by 13 AI-phase migrations (20260511_1500..1512) which insert
-- into dos.dynamic_ui_page_agents referencing these agent_ids.
-- Idempotent: ON CONFLICT DO NOTHING on PK (agent_id).

BEGIN;

INSERT INTO dos.dynamic_ui_agents
  (agent_id, module_code, name_key, description_key, level, scope,
   capabilities, requires_human_approval, audit_required, default_risk_level, is_active)
VALUES
  ('A01', 'ai-os', 'ai.agent.A01.name', 'ai.agent.A01.desc', 'L2', 'autonomous',
   '{}'::jsonb, true, true, 'medium', true),
  ('A02', 'ai-os', 'ai.agent.A02.name', 'ai.agent.A02.desc', 'L2', 'orchestrator',
   '{}'::jsonb, true, true, 'medium', true),
  ('A03', 'ai-os', 'ai.agent.A03.name', 'ai.agent.A03.desc', 'L1', 'framework_mapping',
   '{}'::jsonb, true, true, 'low', true),
  ('A04', 'ai-os', 'ai.agent.A04.name', 'ai.agent.A04.desc', 'L1', 'control_authoring',
   '{}'::jsonb, true, true, 'low', true),
  ('A05', 'ai-os', 'ai.agent.A05.name', 'ai.agent.A05.desc', 'L2', 'evidence',
   '{}'::jsonb, true, true, 'medium', true),
  ('A06', 'ai-os', 'ai.agent.A06.name', 'ai.agent.A06.desc', 'L2', 'risk_signals',
   '{}'::jsonb, true, true, 'medium', true),
  ('A07', 'ai-os', 'ai.agent.A07.name', 'ai.agent.A07.desc', 'L2', 'risk_monitor',
   '{}'::jsonb, true, true, 'medium', true),
  ('A08', 'ai-os', 'ai.agent.A08.name', 'ai.agent.A08.desc', 'L1', 'governance',
   '{}'::jsonb, true, true, 'low', true),
  ('A09', 'ai-os', 'ai.agent.A09.name', 'ai.agent.A09.desc', 'L1', 'regulatory',
   '{}'::jsonb, true, true, 'low', true),
  ('A10', 'ai-os', 'ai.agent.A10.name', 'ai.agent.A10.desc', 'L1', 'audit_prep',
   '{}'::jsonb, true, true, 'low', true),
  ('A11', 'ai-os', 'ai.agent.A11.name', 'ai.agent.A11.desc', 'L2', 'training',
   '{}'::jsonb, true, true, 'low', true),
  ('A12', 'ai-os', 'ai.agent.A12.name', 'ai.agent.A12.desc', 'L2', 'reporting',
   '{}'::jsonb, true, true, 'low', true),
  ('A13', 'ai-os', 'ai.agent.A13.name', 'ai.agent.A13.desc', 'L1', 'copilot',
   '{}'::jsonb, true, true, 'low', true)
ON CONFLICT (agent_id) DO NOTHING;

COMMIT;
