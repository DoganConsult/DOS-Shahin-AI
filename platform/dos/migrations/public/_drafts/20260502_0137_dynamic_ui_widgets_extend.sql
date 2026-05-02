-- dos:draft
-- =====================================================================
-- F.2a — dynamic_ui_widgets variant/tone/density extension (20260502_0137)
--
-- The original `dos.dynamic_ui_widgets` shipped with an opaque JSONB
-- `config` blob — every renderer invented its own shape, no declarative
-- variant dispatch was possible. This migration adds typed columns so
-- the runtime resolver can hand `<dos-widget-frame>` exact inputs:
--
--   variant         → solid | glass | gradient | aurora | minimal
--   tone            → neutral | brand | accent | success | warning | danger | info
--   density         → compact | cozy | comfortable
--   accent_token    → CSS var name (e.g. '--dos-gradient-aurora')
--   motion_profile  → calm | confident | cinematic
--   engine          → carbon | dos-premium  (renderer family dispatch)
--   cols_sm/md/lg   → grid placement breakpoints (THE FIX FOR KPI 4-up)
--   min_width_px    → minmax floor for auto-fit grids
--   empty_state_key → references dos.dynamic_ui_empty_states (created in 0138)
--   error_state_key → free-form key resolved via i18n
--   eyebrow_key     → optional eyebrow text key
--   title_key       → frame title (i18n)
--   subtitle_key    → frame subtitle (i18n)
--   meta_key        → footer meta line (i18n)
--
-- The `config` JSONB stays for renderer-specific options that don't
-- justify a column (e.g. chart series mapping, KPI calculation source).
-- =====================================================================
BEGIN;

ALTER TABLE dos.dynamic_ui_widgets
  ADD COLUMN IF NOT EXISTS variant         VARCHAR(20)  NOT NULL DEFAULT 'solid'
    CHECK (variant IN ('solid','glass','gradient','aurora','minimal')),
  ADD COLUMN IF NOT EXISTS tone            VARCHAR(20)  NOT NULL DEFAULT 'neutral'
    CHECK (tone IN ('neutral','brand','accent','success','warning','danger','info')),
  ADD COLUMN IF NOT EXISTS density         VARCHAR(20)  NOT NULL DEFAULT 'cozy'
    CHECK (density IN ('compact','cozy','comfortable')),
  ADD COLUMN IF NOT EXISTS accent_token    VARCHAR(120),
  ADD COLUMN IF NOT EXISTS motion_profile  VARCHAR(20)  NOT NULL DEFAULT 'confident'
    CHECK (motion_profile IN ('calm','confident','cinematic')),
  ADD COLUMN IF NOT EXISTS engine          VARCHAR(20)  NOT NULL DEFAULT 'dos-premium'
    CHECK (engine IN ('carbon','dos-premium')),
  ADD COLUMN IF NOT EXISTS cols_sm         SMALLINT     NOT NULL DEFAULT 1
    CHECK (cols_sm BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS cols_md         SMALLINT     NOT NULL DEFAULT 2
    CHECK (cols_md BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS cols_lg         SMALLINT     NOT NULL DEFAULT 4
    CHECK (cols_lg BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS min_width_px    INTEGER      NOT NULL DEFAULT 220
    CHECK (min_width_px BETWEEN 80 AND 2000),
  ADD COLUMN IF NOT EXISTS empty_state_key VARCHAR(150),
  ADD COLUMN IF NOT EXISTS error_state_key VARCHAR(150),
  ADD COLUMN IF NOT EXISTS eyebrow_key     VARCHAR(300),
  ADD COLUMN IF NOT EXISTS title_key       VARCHAR(300),
  ADD COLUMN IF NOT EXISTS subtitle_key    VARCHAR(300),
  ADD COLUMN IF NOT EXISTS meta_key        VARCHAR(300);

COMMENT ON COLUMN dos.dynamic_ui_widgets.variant IS
  'Surface treatment for <dos-widget-frame>. Reserved variants: gradient/aurora for signature surfaces only.';
COMMENT ON COLUMN dos.dynamic_ui_widgets.tone IS
  'Semantic tone — drives the left-rail accent on the frame. Aligns with status_labels.tone.';
COMMENT ON COLUMN dos.dynamic_ui_widgets.engine IS
  'Renderer family. carbon = use Carbon primitives (tables/forms); dos-premium = use DOS hero/KPI/aurora visuals.';
COMMENT ON COLUMN dos.dynamic_ui_widgets.cols_lg IS
  'Grid columns at large breakpoint. KPI strips MUST set cols_lg=4, not rely on auto-fit.';

CREATE INDEX IF NOT EXISTS ix_dui_widgets_signature
  ON dos.dynamic_ui_widgets (module_code, route)
  WHERE is_signature = TRUE AND is_active = TRUE;

COMMIT;
