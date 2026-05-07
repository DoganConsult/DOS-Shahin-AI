-- Wave R1 — Closure: seed missing data resource for /ai/governance/policies.
-- Phase 2 (20260511_1501) referenced ai.resource.governance.policies as the
-- route's data_resource_key but no row was inserted into
-- dos.dynamic_ui_data_resources, leaving the route dangling.
-- Idempotent via ux_dui_data_resources_scope unique index.

BEGIN;

INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  (NULL, 'ai-os', 'ai.resource.governance.policies', 'api',
   '/api/ai-governance/policies',
   'ai.governance.policies.read', 60, 'ai.governance.policies.changed',
   '{"limit":50,"offset":0}'::jsonb, 'PolicyDTO', TRUE)
ON CONFLICT (module_code, resource_key, COALESCE(tenant_id, '*')) DO UPDATE
  SET url_or_query   = EXCLUDED.url_or_query,
      permission     = EXCLUDED.permission,
      cache_ttl_sec  = EXCLUDED.cache_ttl_sec,
      realtime_topic = EXCLUDED.realtime_topic,
      shape_ref      = EXCLUDED.shape_ref;

DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
    FROM dos.dynamic_ui_data_resources
   WHERE module_code='ai-os'
     AND resource_key='ai.resource.governance.policies';
  IF n <> 1 THEN
    RAISE EXCEPTION 'ai.resource.governance.policies seed missing (count=%)', n;
  END IF;
END$$;

COMMIT;
