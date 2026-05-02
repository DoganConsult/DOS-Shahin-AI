-- AI-OS Wave 2 — Seed ai_context_sources from existing tenant data so the
-- RAG pipeline has retrievable rows for A03/A04/A07/A08 immediately. This
-- bootstraps grounded answers from frameworks, controls, policies, and
-- audit_plans without waiting for an embedding back-fill job.
--
-- Idempotent: ON CONFLICT (agent_id, source_ref) DO UPDATE refreshes the
-- title/content/tags so re-runs after a content change update the row.

BEGIN;

-- A03 (Framework Mapping) — every framework row becomes a context source.
INSERT INTO ai_context_sources (agent_id, source_type, source_ref, title, content, tags)
SELECT
  'A03',
  'framework',
  'frameworks:' || framework_id,
  name,
  COALESCE(name, '') || E'\n' ||
    'Category: ' || COALESCE(category, 'compliance') || E'\n' ||
    'Status: '   || COALESCE(status,   'not_started') || E'\n' ||
    'Mandatory: ' || COALESCE(mandatory::text, 'false') || E'\n' ||
    'Total controls: ' || COALESCE(total_controls::text, '0') || E'\n\n' ||
    COALESCE(description, ''),
  ARRAY['framework', COALESCE(category, 'compliance')]
FROM frameworks
ON CONFLICT (agent_id, source_ref) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- A04 (Control Authoring) — every control row.
INSERT INTO ai_context_sources (agent_id, source_type, source_ref, title, content, tags)
SELECT
  'A04',
  'control',
  'controls:' || control_id,
  title,
  title || E'\n' ||
    'Domain: ' || COALESCE(domain_name, 'unspecified') || E'\n' ||
    'Status: ' || COALESCE(status, 'not_started') || E'\n' ||
    'Priority: ' || COALESCE(priority, 'medium') || E'\n' ||
    'Frameworks: ' || COALESCE(array_to_string(frameworks, ', '), '(none)') || E'\n\n' ||
    COALESCE(description, ''),
  ARRAY['control', COALESCE(domain_name, 'unspecified')] || COALESCE(frameworks, ARRAY[]::text[])
FROM controls
ON CONFLICT (agent_id, source_ref) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- A07 (Audit Prep) — every audit_plan row.
INSERT INTO ai_context_sources (agent_id, source_type, source_ref, title, content, tags)
SELECT
  'A07',
  'audit',
  'audit_plans:' || id::text,
  name,
  name || E'\n' ||
    'Plan year: ' || COALESCE(plan_year::text, '?') || E'\n' ||
    'Status: ' || COALESCE(status, 'draft') || E'\n' ||
    'Risk-based: ' || COALESCE(risk_based::text, 'true') || E'\n' ||
    'Total hours: ' || COALESCE(total_hours::text, '0') || E'\n\n' ||
    'Objective: ' || COALESCE(objective, '') || E'\n\n' ||
    'Methodology: ' || COALESCE(methodology, ''),
  ARRAY['audit', COALESCE(status, 'draft')]
FROM audit_plans
ON CONFLICT (agent_id, source_ref) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- A08 (Policy Lifecycle) — every policy row.
INSERT INTO ai_context_sources (agent_id, source_type, source_ref, title, content, tags)
SELECT
  'A08',
  'policy',
  'policies:' || policy_ref,
  title,
  title || E'\n' ||
    'Type: ' || COALESCE(policy_type, 'internal') || E'\n' ||
    'Status: ' || COALESCE(status, 'draft') || E'\n\n' ||
    COALESCE(description, ''),
  ARRAY['policy', COALESCE(policy_type, 'internal'), COALESCE(status, 'draft')]
FROM policies
ON CONFLICT (agent_id, source_ref) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  updated_at = NOW();

COMMIT;
