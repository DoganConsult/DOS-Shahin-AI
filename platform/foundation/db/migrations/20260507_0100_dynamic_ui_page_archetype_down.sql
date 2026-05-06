-- =====================================================================
-- Foundation-AI Wave 2 — DOWN migration for dynamic_ui_page_archetype set
-- Drops the three Wave-2 tables in reverse dependency order. Idempotent.
-- =====================================================================

BEGIN;

DROP INDEX IF EXISTS dos.idx_dyn_ui_page_agent_agent;
DROP INDEX IF EXISTS dos.idx_dyn_ui_page_agent_module;
DROP INDEX IF EXISTS dos.idx_dyn_ui_page_persona_module;
DROP INDEX IF EXISTS dos.idx_dyn_ui_page_archetype_layout;

DROP TABLE IF EXISTS dos.dynamic_ui_page_agent;
DROP TABLE IF EXISTS dos.dynamic_ui_page_persona;
DROP TABLE IF EXISTS dos.dynamic_ui_page_archetype;

COMMIT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name IN
      ('dynamic_ui_page_archetype','dynamic_ui_page_persona','dynamic_ui_page_agent')
  ) THEN
    RAISE EXCEPTION 'Wave 2 down self-assertion failed: residual archetype/persona/agent tables in dos schema';
  END IF;
END $$;
