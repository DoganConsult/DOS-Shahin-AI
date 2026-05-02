-- dos:draft
-- =====================================================================
-- F.2d — dynamic_ui_navigation extension (20260502_0140)
--
-- The sidebar navigation table (dos.dynamic_ui_navigation) ships with
-- module_code + label_key + route + icon + sort_order. Two columns are
-- still missing for the luxury bar:
--
--   status_kind        — 'trial' | 'expired' | 'new' | 'beta' | NULL
--                        Drives the small badge to the right of the
--                        nav label (e.g. "trial 14d", "NEW").
--   status_label_key   — i18n key for the badge text. NULL = no badge.
--
-- Sidebar resolver joins this with i18n_translations + tenant trial
-- state to produce the rendered nav item.
-- =====================================================================
BEGIN;

ALTER TABLE dos.dynamic_ui_navigation
  ADD COLUMN IF NOT EXISTS status_kind      VARCHAR(40)
    CHECK (status_kind IN ('trial','expired','new','beta','locked','external')),
  ADD COLUMN IF NOT EXISTS status_label_key VARCHAR(300);

COMMENT ON COLUMN dos.dynamic_ui_navigation.status_kind IS
  'Optional badge kind to render alongside the nav label. Drives badge tone.';
COMMENT ON COLUMN dos.dynamic_ui_navigation.status_label_key IS
  'i18n key for badge text. Resolves through dos.i18n_translations.';

COMMIT;
