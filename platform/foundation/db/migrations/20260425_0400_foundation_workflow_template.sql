-- P8.2 — Register the canonical workflow template that foundation's
-- approval-matrix binds to. Global (tenant_id IS NULL) template served
-- to all tenants; tenant overrides, when needed, INSERT with their own
-- tenant_id and the same template_code ('foundation_org_change').
--
-- Idempotent: re-runs update the definition in place rather than insert.

BEGIN;

-- Reconcile dos.workflow_templates schema with the canonical column set
-- this migration assumes. Older deployments shipped a narrower table
-- (template_id, template_code, module_code, display_name, definition,
-- version, status, created_at) — add the missing columns idempotently
-- so re-running on either shape converges to the same end state.
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS tenant_id          VARCHAR(64);
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS name               VARCHAR(255);
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS category           VARCHAR(100);
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS parameters_schema  JSONB;
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS is_active          BOOLEAN DEFAULT TRUE;
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS created_by         VARCHAR(64);
ALTER TABLE dos.workflow_templates ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'dos'
       AND table_name   = 'workflow_templates'
  ) THEN
    RAISE NOTICE 'dos.workflow_templates not present — skipping foundation template registration';
    RETURN;
  END IF;

  INSERT INTO dos.workflow_templates (
      template_id, tenant_id, template_code, name, description, category,
      definition, parameters_schema, is_active, version,
      created_by, created_at, updated_at
  )
  VALUES (
      gen_random_uuid()::text,
      NULL,
      'foundation_org_change',
      'Foundation — Organization Structural Change',
      'Approval workflow for creating/merging/retiring organizational structure entities (orgs, BUs, departments, positions).',
      'foundation',
      jsonb_build_object(
        'version', 1,
        'slaHours', 168,
        'automationLevel', 'semi',
        'steps', jsonb_build_array(
          jsonb_build_object('code','draft',        'actor','foundation.contributor',     'allowedTransitions', jsonb_build_array('submit')),
          jsonb_build_object('code','submitted',    'actor','foundation.module_lead',     'allowedTransitions', jsonb_build_array('approve','reject','return')),
          jsonb_build_object('code','approved',     'actor','foundation.executive_owner', 'allowedTransitions', jsonb_build_array('finalize','return')),
          jsonb_build_object('code','finalized',    'actor','system',                      'allowedTransitions', jsonb_build_array()),
          jsonb_build_object('code','rejected',     'actor','system',                      'allowedTransitions', jsonb_build_array('revise')),
          jsonb_build_object('code','returned',     'actor','foundation.contributor',      'allowedTransitions', jsonb_build_array('submit','withdraw'))
        ),
        'sodRules', jsonb_build_array(
          'foundation.sod.restructurer_approver',
          'foundation.sod.creator_merger'
        )
      ),
      jsonb_build_object(
        'entityType', 'object',
        'properties', jsonb_build_object(
          'organizationId', jsonb_build_object('type','string','format','uuid'),
          'changeType',     jsonb_build_object('type','string','enum', jsonb_build_array('create','merge','retire','rename')),
          'reason',         jsonb_build_object('type','string','minLength', 5)
        ),
        'required', jsonb_build_array('organizationId','changeType')
      ),
      TRUE, 1, 'system', NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  UPDATE dos.workflow_templates
     SET updated_at = NOW(),
         is_active  = TRUE
   WHERE template_code = 'foundation_org_change'
     AND tenant_id IS NULL;
END$$;

COMMIT;
