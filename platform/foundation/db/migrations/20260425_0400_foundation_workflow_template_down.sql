-- Down for 20260425_0400 — remove canonical foundation_org_change workflow template.
BEGIN;

DELETE FROM dos.workflow_templates
 WHERE template_code = 'foundation_org_change'
   AND tenant_id IS NULL;

COMMIT;
