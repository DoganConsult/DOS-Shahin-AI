-- dos:draft
BEGIN;
ALTER TABLE dos.dynamic_ui_widgets
  DROP COLUMN IF EXISTS meta_key,
  DROP COLUMN IF EXISTS subtitle_key,
  DROP COLUMN IF EXISTS title_key,
  DROP COLUMN IF EXISTS eyebrow_key,
  DROP COLUMN IF EXISTS error_state_key,
  DROP COLUMN IF EXISTS empty_state_key,
  DROP COLUMN IF EXISTS min_width_px,
  DROP COLUMN IF EXISTS cols_lg,
  DROP COLUMN IF EXISTS cols_md,
  DROP COLUMN IF EXISTS cols_sm,
  DROP COLUMN IF EXISTS engine,
  DROP COLUMN IF EXISTS motion_profile,
  DROP COLUMN IF EXISTS accent_token,
  DROP COLUMN IF EXISTS density,
  DROP COLUMN IF EXISTS tone,
  DROP COLUMN IF EXISTS variant;
DROP INDEX IF EXISTS dos.ix_dui_widgets_signature;
COMMIT;
