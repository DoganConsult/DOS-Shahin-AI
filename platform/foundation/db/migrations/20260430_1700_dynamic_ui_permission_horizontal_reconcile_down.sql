-- Down migration for 20260430_1700: drops only the new constraints. The
-- value normalisation is forward-only (re-introducing colon codes is by
-- design impossible once the source seeds are dot-form).
BEGIN;
DO $$
DECLARE t TEXT; col TEXT;
BEGIN
  FOR t, col IN VALUES
    ('dynamic_ui_widgets','permission'),
    ('dynamic_ui_routes','permission_key'),
    ('dynamic_ui_actions','permission'),
    ('dynamic_ui_agent_actions','permission'),
    ('dynamic_ui_kpi','permission'),
    ('dynamic_ui_data_sources','permission')
  LOOP
    EXECUTE format('ALTER TABLE dos.%I DROP CONSTRAINT IF EXISTS chk_perm_dot_form_%s', t, t);
    EXECUTE format('ALTER TABLE dos.%I DROP CONSTRAINT IF EXISTS fk_perm_catalog_%s',  t, t);
  END LOOP;
END$$;
COMMIT;
