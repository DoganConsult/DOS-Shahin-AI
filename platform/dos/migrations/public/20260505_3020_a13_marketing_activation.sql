BEGIN;

INSERT INTO dos.agent_registry (
  agent_code,
  display_name_en,
  display_name_ar,
  role_key,
  capabilities,
  permission_key,
  brand_tile_kind,
  status,
  confidence_default
) VALUES (
  'A13',
  'Landing Copilot Agent',
  'وكيل المساعد في الصفحة الرئيسية',
  'landing',
  ARRAY['public_qna', 'lead_capture', 'demo_intent', 'pricing_intent', 'docs_intent']::text[],
  'agent.public.copilot',
  'agent-tile',
  'active',
  0.85
)
ON CONFLICT (agent_code) DO UPDATE
  SET display_name_en = EXCLUDED.display_name_en,
      display_name_ar = EXCLUDED.display_name_ar,
      role_key = EXCLUDED.role_key,
      capabilities = EXCLUDED.capabilities,
      permission_key = EXCLUDED.permission_key,
      brand_tile_kind = EXCLUDED.brand_tile_kind,
      status = EXCLUDED.status,
      confidence_default = EXCLUDED.confidence_default,
      updated_at = now();

INSERT INTO dos.agent_module_binding (
  agent_code,
  module_code,
  workbench_route,
  audit_route,
  followup_route,
  enabled
) VALUES (
  'A13',
  'marketing',
  '/',
  NULL,
  '/contact',
  TRUE
)
ON CONFLICT (agent_code, module_code) DO UPDATE
  SET workbench_route = EXCLUDED.workbench_route,
      audit_route = EXCLUDED.audit_route,
      followup_route = EXCLUDED.followup_route,
      enabled = EXCLUDED.enabled;

UPDATE dos.ui_route_template_binding b
SET props = jsonb_set(
              jsonb_set(
                b.props,
                '{homeContent,agentic,title}',
                to_jsonb('Ten agents already at work.'::text),
                TRUE
              ),
              '{homeContent,agentic,tiles}',
              (
                SELECT jsonb_agg(tile ORDER BY ord)
                  FROM (
                    SELECT tile, ord
                      FROM jsonb_array_elements(COALESCE(b.props #> '{homeContent,agentic,tiles}', '[]'::jsonb)) WITH ORDINALITY AS existing(tile, ord)
                     WHERE tile->>'agentCode' <> 'A13'
                    UNION ALL
                    SELECT jsonb_build_object(
                             'agentCode', 'A13',
                             'displayName', 'Landing Copilot Agent',
                             'displayNameAr', 'وكيل المساعد في الصفحة الرئيسية',
                             'role', 'landing'
                           ),
                           1000::bigint
                  ) AS tiles
              ),
              TRUE
            ),
    version = b.version + 1,
    updated_at = now()
WHERE b.route = '/';

DO $$
DECLARE
  missing_count integer;
  root_tile_count integer;
  root_has_a13 boolean;
BEGIN
  SELECT count(*)
    INTO missing_count
    FROM (VALUES ('A13')) AS expected(agent_code)
    LEFT JOIN dos.agent_registry a
      ON a.agent_code = expected.agent_code
     AND a.status = 'active'
     AND a.role_key = 'landing'
     AND a.permission_key = 'agent.public.copilot'
    LEFT JOIN dos.agent_module_binding b
      ON b.agent_code = expected.agent_code
     AND b.module_code = 'marketing'
     AND b.enabled = TRUE
   WHERE a.agent_code IS NULL
      OR b.agent_code IS NULL;

  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'A13 marketing activation left % missing rows', missing_count;
  END IF;

  SELECT jsonb_array_length(props #> '{homeContent,agentic,tiles}'),
         EXISTS (
           SELECT 1
             FROM jsonb_array_elements(props #> '{homeContent,agentic,tiles}') AS tile
            WHERE tile->>'agentCode' = 'A13'
         )
    INTO root_tile_count, root_has_a13
    FROM dos.ui_route_template_binding
   WHERE route = '/';

  IF root_tile_count <> 10 OR root_has_a13 IS NOT TRUE THEN
    RAISE EXCEPTION 'A13 root marketing payload invalid: tiles=%, has_a13=%', root_tile_count, root_has_a13;
  END IF;
END $$;

COMMIT;
