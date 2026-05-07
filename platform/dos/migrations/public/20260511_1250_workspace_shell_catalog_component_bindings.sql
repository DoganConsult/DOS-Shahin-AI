-- 20260511_1250_workspace_shell_catalog_component_bindings.sql
--
-- Workspace shell binding closure:
-- Promote workspace catalog components (action/data/input/nav/polish) from
-- catalog-only into typed renderable shell surfaces with explicit renderer keys.

BEGIN;

WITH target_components AS (
  SELECT component_key,
         CASE
           WHEN component_key LIKE 'workspace.action.%' THEN 'shell.catalog-action'
           WHEN component_key LIKE 'workspace.data.%' THEN 'shell.catalog-data'
           WHEN component_key LIKE 'workspace.input.%' THEN 'shell.catalog-input'
           WHEN component_key LIKE 'workspace.nav.%' THEN 'shell.catalog-nav'
           WHEN component_key LIKE 'workspace.polish.%' THEN 'shell.catalog-polish'
           ELSE NULL
         END AS mapped_renderer_key
  FROM dos.dynamic_ui_component_registry
  WHERE component_key LIKE 'workspace.action.%'
     OR component_key LIKE 'workspace.data.%'
     OR component_key LIKE 'workspace.input.%'
     OR component_key LIKE 'workspace.nav.%'
     OR component_key LIKE 'workspace.polish.%'
)
UPDATE dos.dynamic_ui_component_registry registry
   SET renderer_key = targets.mapped_renderer_key,
       metadata = jsonb_set(
         jsonb_set(COALESCE(registry.metadata, '{}'::jsonb), '{catalog_only}', 'false'::jsonb, true),
         '{shell_renderable}',
         'true'::jsonb,
         true
       )
  FROM target_components targets
 WHERE registry.component_key = targets.component_key
   AND targets.mapped_renderer_key IS NOT NULL;

WITH binding_targets AS (
  SELECT binding.id,
         binding.component_key,
         binding.props,
         registry.component_type
  FROM dos.workspace_shell_binding binding
  JOIN dos.dynamic_ui_component_registry registry
    ON registry.component_key = binding.component_key
  WHERE binding.component_key LIKE 'workspace.action.%'
     OR binding.component_key LIKE 'workspace.data.%'
     OR binding.component_key LIKE 'workspace.input.%'
     OR binding.component_key LIKE 'workspace.nav.%'
     OR binding.component_key LIKE 'workspace.polish.%'
)
UPDATE dos.workspace_shell_binding binding
   SET props = jsonb_set(
         jsonb_set(
           jsonb_set(
             COALESCE(binding_targets.props, '{}'::jsonb),
             '{title}',
             to_jsonb(
               COALESCE(
                 NULLIF(TRIM(COALESCE(binding_targets.props->>'title', '')), ''),
                 INITCAP(REPLACE(SPLIT_PART(binding_targets.component_key, '.', 3), '-', ' '))
               )
             ),
             true
           ),
           '{subtitle}',
           to_jsonb(
             COALESCE(
               NULLIF(TRIM(COALESCE(binding_targets.props->>'subtitle', '')), ''),
               binding_targets.component_type
             )
           ),
           true
         ),
         '{detail}',
         to_jsonb(
           COALESCE(
             NULLIF(TRIM(COALESCE(binding_targets.props->>'detail', '')), ''),
             binding_targets.component_key
           )
         ),
         true
       ),
       version = GREATEST(binding.version, 1)
  FROM binding_targets
 WHERE binding.id = binding_targets.id;

COMMIT;
