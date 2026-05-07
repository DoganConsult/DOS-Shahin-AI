-- 20260511_1300_legacy_label_extraction.sql
-- DOCTRINE REJECTION (AGENTS.md ZERO LEGACY / ZERO HARDCODE):
--
-- The original content of this migration extracted ~324 hardcoded
-- label_en literals from the legacy frontend tree and INSERTed them
-- into dos.dynamic_ui_routes with synthetic UUIDs, path_pattern='/unknown',
-- and NULL component_key (NOT NULL violation, immediate fail).
--
-- Beyond the NOT NULL fail, the entire payload contradicts doctrine:
--   - hardcoded display labels in SQL ("Risk Management", "AI Governance"...)
--   - synthetic /unknown path_patterns with no resolver intent
--   - module_code='runtime'/'registries' ad-hoc tags
--   - bypasses dos.dynamic_ui_component_registry approval gating
--   - bypasses dos.workspace_shell_i18n publisher-locked seed path
--
-- Per AGENTS.md: "If the data is required, store it. If the schema is
-- missing, migrate it. If the runtime needs it, UI-OS resolves it. If the
-- frontend invents it, the patch fails."  Labels MUST land in
-- dos.workspace_shell_i18n via publisher-locked seeds, NOT in
-- dynamic_ui_routes as ad-hoc title strings.
--
-- This file is preserved as a no-op so the runner records the checksum,
-- the migration ledger remains contiguous, and the rejection is
-- auditable. Replacement seed work (real route + i18n bindings per
-- module) lives in module-specific phase migrations
-- (e.g. 20260511_1500..1512 for AI, 20260511_0700..1240 for foundation).

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '20260511_1300_legacy_label_extraction.sql: rejected by doctrine, applied as no-op (see file header).';
END$$;

COMMIT;
