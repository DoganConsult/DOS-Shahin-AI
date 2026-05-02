-- Seed dos.config_values with platform-scope defaults derived from
-- dos.config_definitions.default_value. Only inserts rows where no
-- (definition_id, scope_type='platform', scope_id='platform', is_active)
-- value already exists. Idempotent.
--
-- 99 of 130 definitions have a NULL config_key (legacy seed gap) — backfill
-- a deterministic key first using owner_domain + lower(label-with-_) so the
-- INSERT constraint is satisfied and the API can resolve them by code.
UPDATE dos.config_definitions
   SET config_key = COALESCE(owner_domain,'platform') || '.' ||
                    regexp_replace(lower(COALESCE(label,'def_'||id::text)),
                                   '[^a-z0-9]+','_','g')
 WHERE config_key IS NULL OR config_key = '';

INSERT INTO dos.config_values
  (config_key, scope_type, scope_id, value, definition_id, is_active, source, updated_by, notes)
SELECT
  d.config_key, 'platform', 'platform',
  COALESCE(d.default_value, 'null'::jsonb),
  d.id, TRUE, 'seed:platform-default', 'system',
  'seeded from dos.config_definitions.default_value'
FROM dos.config_definitions d
WHERE NOT EXISTS (
  SELECT 1 FROM dos.config_values v
   WHERE v.definition_id = d.id
     AND v.scope_type = 'platform'
     AND v.scope_id = 'platform'
     AND v.is_active = TRUE
);
