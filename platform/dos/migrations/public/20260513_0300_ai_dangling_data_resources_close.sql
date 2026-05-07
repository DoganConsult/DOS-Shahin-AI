-- 20260513_0300_ai_dangling_data_resources_close.sql
-- Close dangling data_resource_key references on ai-os routes:
--   - ai.resource.hub          (referenced by /ai hub overview routes)
--   - ai.resource.governance   (referenced by /ai/governance overview routes)
-- Doctrine: AGENTS.md "If runtime data is missing, store it; do not
-- patch around it in code."
-- Idempotent via unique (module_code, resource_key, COALESCE(tenant_id,'*')).

BEGIN;

INSERT INTO dos.dynamic_ui_data_resources
  (tenant_id, module_code, resource_key, resource_type, url_or_query,
   permission, cache_ttl_sec, realtime_topic, pagination, shape_ref, is_active)
VALUES
  (NULL, 'ai-os', 'ai.resource.hub', 'api',
   '/api/ai/hub',
   'ai.read', 60, 'ai.hub.changed',
   '{"limit":50,"offset":0}'::jsonb, 'AIHubDTO', TRUE),
  (NULL, 'ai-os', 'ai.resource.governance', 'api',
   '/api/ai-governance/overview',
   'ai.governance.policies.read', 60, 'ai.governance.changed',
   '{"limit":50,"offset":0}'::jsonb, 'GovernanceOverviewDTO', TRUE)
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
    FROM dos.dynamic_ui_routes r
    LEFT JOIN dos.dynamic_ui_data_resources d
      ON d.module_code='ai-os' AND d.resource_key = r.data_resource_key
   WHERE r.module_code='ai-os' AND r.data_resource_key IS NOT NULL
     AND d.resource_key IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'ai-os routes still reference % missing data_resource_key(s)', n;
  END IF;
END$$;

COMMIT;
