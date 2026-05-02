-- dos:draft
BEGIN;
ALTER TABLE dos.dynamic_ui_navigation
  DROP COLUMN IF EXISTS status_label_key,
  DROP COLUMN IF EXISTS status_kind;
COMMIT;
