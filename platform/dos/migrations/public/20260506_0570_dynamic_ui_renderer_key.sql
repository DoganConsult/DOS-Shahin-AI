-- 20260506_0570_dynamic_ui_renderer_key.sql
-- Forward-only. Adds the hybrid-static renderer contract columns to
-- dos.dynamic_ui_component_registry so the resolver can emit a typed
-- (componentKey, componentType, rendererKey, carbonKey) tuple per
-- surface. The Angular SPA's surface-renderer maps rendererKey →
-- approved Angular component class via a static COMPONENT_MAP; the DB
-- never stores Angular class names.
--
-- Seed semantics:
--   workspace.frame.* → component_type='shell-frame', renderer_key='shell.frame'
--                       (rendered as no-op by surface-renderer; ShellHost
--                       owns Carbon ui-shell composition for layout policy.)
--   workspace.<bucket>.* (action / data / input / nav / etc.) → component_type=<bucket>
--                       renderer_key intentionally LEFT NULL until an
--                       approved Angular component is registered in
--                       @dos/ui-system COMPONENT_MAP. Resolver still
--                       emits the tuple; renderer fails closed and logs
--                       an unsupported-renderer diagnostic.
--
-- Idempotent.

BEGIN;

ALTER TABLE dos.dynamic_ui_component_registry
  ADD COLUMN IF NOT EXISTS renderer_key   TEXT,
  ADD COLUMN IF NOT EXISTS component_type TEXT;

CREATE INDEX IF NOT EXISTS ix_dynamic_ui_component_registry_renderer_key
  ON dos.dynamic_ui_component_registry(renderer_key)
  WHERE renderer_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_dynamic_ui_component_registry_component_type
  ON dos.dynamic_ui_component_registry(component_type)
  WHERE component_type IS NOT NULL;

-- Seed: structural shell-frame primitives.
UPDATE dos.dynamic_ui_component_registry
   SET component_type = 'shell-frame',
       renderer_key   = 'shell.frame'
 WHERE component_key LIKE 'workspace.frame.%'
   AND (component_type IS DISTINCT FROM 'shell-frame'
        OR renderer_key IS DISTINCT FROM 'shell.frame');

-- Seed: visual buckets get a component_type derived from the second
-- segment of the component_key. renderer_key stays NULL until the
-- @dos/ui-system COMPONENT_MAP registers a concrete Angular class for
-- the bucket; the surface-renderer logs an `unsupported-renderer`
-- diagnostic when it encounters a NULL rendererKey.
UPDATE dos.dynamic_ui_component_registry
   SET component_type = split_part(component_key, '.', 2)
 WHERE component_key LIKE 'workspace.%'
   AND component_key NOT LIKE 'workspace.frame.%'
   AND component_type IS NULL;

COMMIT;
