-- =====================================================================
-- UI-OS Carbon Design System token seed (20260501_0308)
--
-- Wave 10c — Carbon as the canonical default theme. Seeds the
-- `dos.dynamic_ui_theme_tokens` catalog with the IBM Carbon
-- `--cds-*` CSS variable tokens at scope='global' so the
-- ui-os-service /api/ui-os/branding + /api/ui-os/theme endpoints
-- can resolve a Carbon-conformant default for any tenant that has
-- not overridden them at scope='tenant'/'module'/'route'.
--
-- Carbon packages are already installed under
--   products/shahin-ai/app/node_modules/@carbon/{themes,colors,layout,
--   motion,grid,type,styles,icons-angular,charts-angular,...}
-- so no FE package install is needed in this migration.
--
-- Idempotent: deletes any prior global cds-* rows then re-inserts.
-- =====================================================================

BEGIN;

DELETE FROM dos.dynamic_ui_theme_tokens
 WHERE scope = 'global'
   AND tenant_id IS NULL
   AND module_code IS NULL
   AND route IS NULL
   AND token_key LIKE 'cds-%';

INSERT INTO dos.dynamic_ui_theme_tokens
  (tenant_id, module_code, token_key, token_value, scope, route, is_active)
VALUES
  -- ── Carbon "white" theme background / layered surfaces ─────────────
  (NULL, NULL, 'cds-background',                  '#ffffff', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-background-hover',            '#8d8d8d1f','global', NULL, TRUE),
  (NULL, NULL, 'cds-background-active',           '#8d8d8d7a','global', NULL, TRUE),
  (NULL, NULL, 'cds-background-selected',         '#8d8d8d33','global', NULL, TRUE),
  (NULL, NULL, 'cds-background-selected-hover',   '#8d8d8d52','global', NULL, TRUE),
  (NULL, NULL, 'cds-background-inverse',          '#393939', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-background-brand',            '#0f62fe', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-01',                    '#f4f4f4', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-02',                    '#ffffff', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-03',                    '#f4f4f4', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-hover-01',              '#e8e8e8', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-hover-02',              '#e8e8e8', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-hover-03',              '#e8e8e8', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-active-01',             '#c6c6c6', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-selected-01',           '#e0e0e0', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-layer-accent-01',             '#e0e0e0', 'global', NULL, TRUE),
  -- ── Field / input layered tokens ───────────────────────────────────
  (NULL, NULL, 'cds-field-01',                    '#f4f4f4', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-field-02',                    '#ffffff', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-field-03',                    '#f4f4f4', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-field-hover-01',              '#e8e8e8', 'global', NULL, TRUE),
  -- ── Border tokens ──────────────────────────────────────────────────
  (NULL, NULL, 'cds-border-subtle-00',            '#e0e0e0', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-border-subtle-01',            '#c6c6c6', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-border-subtle-02',            '#e0e0e0', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-border-strong-01',            '#8d8d8d', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-border-interactive',          '#0f62fe', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-border-inverse',              '#161616', 'global', NULL, TRUE),
  -- ── Text tokens ────────────────────────────────────────────────────
  (NULL, NULL, 'cds-text-primary',                '#161616', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-text-secondary',              '#525252', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-text-placeholder',            '#a8a8a8', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-text-helper',                 '#6f6f6f', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-text-on-color',               '#ffffff', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-text-inverse',                '#ffffff', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-text-error',                  '#da1e28', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-text-disabled',               '#16161640','global', NULL, TRUE),
  -- ── Link / interactive ─────────────────────────────────────────────
  (NULL, NULL, 'cds-link-primary',                '#0f62fe', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-link-primary-hover',          '#0043ce', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-link-secondary',              '#0043ce', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-link-visited',                '#8a3ffc', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-interactive',                 '#0f62fe', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-focus',                       '#0f62fe', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-focus-inset',                 '#ffffff', 'global', NULL, TRUE),
  -- ── Button tokens ──────────────────────────────────────────────────
  (NULL, NULL, 'cds-button-primary',              '#0f62fe', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-primary-hover',        '#0050e6', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-primary-active',       '#002d9c', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-secondary',            '#393939', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-secondary-hover',      '#474747', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-tertiary',             '#0f62fe', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-danger-primary',       '#da1e28', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-danger-secondary',     '#da1e28', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-button-disabled',             '#c6c6c6', 'global', NULL, TRUE),
  -- ── Status / support ───────────────────────────────────────────────
  (NULL, NULL, 'cds-support-error',               '#da1e28', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-support-success',             '#24a148', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-support-warning',             '#f1c21b', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-support-info',                '#0043ce', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-support-error-inverse',       '#fa4d56', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-support-success-inverse',     '#42be65', 'global', NULL, TRUE),
  -- ── Spacing scale (Carbon 8-step) ──────────────────────────────────
  (NULL, NULL, 'cds-spacing-01',                  '0.125rem','global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-02',                  '0.25rem', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-03',                  '0.5rem',  'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-04',                  '0.75rem', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-05',                  '1rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-06',                  '1.5rem',  'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-07',                  '2rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-08',                  '2.5rem',  'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-09',                  '3rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-10',                  '4rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-11',                  '5rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-12',                  '6rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-spacing-13',                  '10rem',   'global', NULL, TRUE),
  -- ── Type scale (productive + expressive bases) ─────────────────────
  (NULL, NULL, 'cds-body-compact-01-font-size',   '0.875rem','global', NULL, TRUE),
  (NULL, NULL, 'cds-body-compact-01-line-height', '1.28572', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-body-01-font-size',           '0.875rem','global', NULL, TRUE),
  (NULL, NULL, 'cds-body-01-line-height',         '1.42857', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-01-font-size',        '0.875rem','global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-01-line-height',      '1.42857', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-02-font-size',        '1rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-03-font-size',        '1.25rem', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-04-font-size',        '1.75rem', 'global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-05-font-size',        '2rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-06-font-size',        '2.625rem','global', NULL, TRUE),
  (NULL, NULL, 'cds-heading-07-font-size',        '3.375rem','global', NULL, TRUE),
  -- ── Container heights (Carbon density scale) ───────────────────────
  (NULL, NULL, 'cds-layout-density-padding-inline-condensed', '0.5rem',  'global', NULL, TRUE),
  (NULL, NULL, 'cds-layout-density-padding-inline-normal',    '1rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-layout-size-height-sm',       '2rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-layout-size-height-md',       '2.5rem',  'global', NULL, TRUE),
  (NULL, NULL, 'cds-layout-size-height-lg',       '3rem',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-layout-size-height-xl',       '4rem',    'global', NULL, TRUE),
  -- ── Motion ─────────────────────────────────────────────────────────
  (NULL, NULL, 'cds-motion-duration-fast-01',     '70ms',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-duration-fast-02',     '110ms',   'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-duration-moderate-01', '150ms',   'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-duration-moderate-02', '240ms',   'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-duration-slow-01',     '400ms',   'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-duration-slow-02',     '700ms',   'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-easing-standard',      'cubic-bezier(0.2, 0, 0.38, 0.9)',  'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-easing-entrance',      'cubic-bezier(0, 0, 0.38, 0.9)',    'global', NULL, TRUE),
  (NULL, NULL, 'cds-motion-easing-exit',          'cubic-bezier(0.2, 0, 1, 0.9)',     'global', NULL, TRUE);

COMMIT;
