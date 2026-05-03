-- =====================================================================
-- 0170 — Phase F-F8: archetype data-extension tables (13 new tables).
--
-- Adds the per-archetype `dos.ui_route_*` props tables for the 16
-- archetypes that previously had no extension store, so the
-- `template-binding` resolver can return real arrays for:
--   command-home  / command-dashboard  / module-settings  / evidence-reports
--     → satisfied by the existing 8 base props tables (kpis, columns,
--       tabs, nba, settings_sections, report_cards, workqueue_groups,
--       heatmap_axes) + alias mapping in DynamicTemplatePageComponent.
--   decision-dashboard, posture-overview, trend-intelligence,
--   intelligent-register, risk-landscape, record-story, guided-create,
--   action-queue, workflow-control, audit-trail (legacy),
--   ai-advisor, activation-journey
--     → require the new tables created here.
--
-- Every table:
--   * scopes by `route` (FK to `dos.ui_route_template_binding(route)`
--     ON DELETE CASCADE)
--   * orders by `sort_order` (NOT NULL, default 0)
--   * carries bilingual EN/AR text columns where the template renders
--     user-facing labels
--   * is opt-in for the props-coverage gate — they are NOT added to
--     scripts/ui-registry/lib/props-schema.mjs in this wave so the
--     existing customer-gate keeps GREEN. A follow-up wave can promote
--     specific archetypes once the per-route bilingual seed lands.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS, no row inserted).
-- =====================================================================
BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- decision-dashboard — urgent / blocked / activity items
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_decision_item (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  item_id      text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('urgent','blocked','activity')),
  sort_order   int  NOT NULL DEFAULT 0,
  label_en     text NOT NULL,
  label_ar     text,
  owner        text,
  severity     text,
  due_at       timestamptz,
  link         text,
  status       text,
  PRIMARY KEY (route, item_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_decision_item_route_kind
  ON dos.ui_route_decision_item(route, kind, sort_order);

-- ───────────────────────────────────────────────────────────────────────
-- posture-overview — score KPIs / maturity domains / top gaps
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_posture_score (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  score_id     text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('score','maturity','gap')),
  sort_order   int  NOT NULL DEFAULT 0,
  label_en     text NOT NULL,
  label_ar     text,
  value        text,
  max_value    text,
  severity     text,
  status       text,
  PRIMARY KEY (route, score_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_posture_score_route_kind
  ON dos.ui_route_posture_score(route, kind, sort_order);

-- ───────────────────────────────────────────────────────────────────────
-- trend-intelligence — series + AI insights
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_trend_series (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  series_id    text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  name_en      text NOT NULL,
  name_ar      text,
  color        text,
  points       jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (route, series_id)
);
CREATE TABLE IF NOT EXISTS dos.ui_route_ai_insight (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  insight_id   text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  text_en      text NOT NULL,
  text_ar      text,
  severity     text,
  action       text,
  PRIMARY KEY (route, insight_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- intelligent-register — generic record rows (payload jsonb)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_record_row (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  row_id       text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity     text,
  status       text,
  PRIMARY KEY (route, row_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_record_row_route ON dos.ui_route_record_row(route, sort_order);

-- ───────────────────────────────────────────────────────────────────────
-- risk-landscape — heatmap cells + top items
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_heatmap_cell (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  cell_id      text NOT NULL,
  x            int  NOT NULL,
  y            int  NOT NULL,
  count        int  NOT NULL DEFAULT 0,
  severity     text,
  label_en     text,
  label_ar     text,
  PRIMARY KEY (route, cell_id)
);
CREATE TABLE IF NOT EXISTS dos.ui_route_heatmap_top_item (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  item_id      text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  title_en     text NOT NULL,
  title_ar     text,
  severity     text,
  link         text,
  PRIMARY KEY (route, item_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- record-story — key fields + timeline
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_record_field (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  field_id     text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  label_en     text NOT NULL,
  label_ar     text,
  value        text,
  kind         text,
  PRIMARY KEY (route, field_id)
);
CREATE TABLE IF NOT EXISTS dos.ui_route_record_timeline_event (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  event_id     text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  occurred_at  timestamptz NOT NULL,
  label_en     text NOT NULL,
  label_ar     text,
  actor        text,
  kind         text,
  link         text,
  PRIMARY KEY (route, event_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- guided-create — wizard form steps (fields jsonb)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_form_step (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  step_id      text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  label_en     text NOT NULL,
  label_ar     text,
  fields       jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed    boolean NOT NULL DEFAULT false,
  ai_prefilled boolean NOT NULL DEFAULT false,
  PRIMARY KEY (route, step_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- action-queue — work tasks
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_work_task (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  task_id      text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  title_en     text NOT NULL,
  title_ar     text,
  owner        text,
  due_at       timestamptz,
  severity     text,
  status       text,
  link         text,
  ai_score     numeric(5,2),
  PRIMARY KEY (route, task_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- audit-trail (legacy) — events
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_audit_event (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  event_id     text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  occurred_at  timestamptz NOT NULL,
  actor        text,
  action       text NOT NULL,
  source       text,
  target       text,
  severity     text,
  description_en text,
  description_ar text,
  PRIMARY KEY (route, event_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- ai-advisor — recommendations
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_ai_recommendation (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  recommendation_id text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  kind         text,
  title_en     text NOT NULL,
  title_ar     text,
  body_en      text,
  body_ar      text,
  confidence   numeric(5,2),
  action_route text,
  action_label_en text,
  action_label_ar text,
  PRIMARY KEY (route, recommendation_id)
);

-- ───────────────────────────────────────────────────────────────────────
-- activation-journey — onboarding setup steps
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_activation_step (
  route        text NOT NULL REFERENCES dos.ui_route_template_binding(route) ON DELETE CASCADE,
  step_id      text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  label_en     text NOT NULL,
  label_ar     text,
  description_en text,
  description_ar text,
  status       text,
  link         text,
  PRIMARY KEY (route, step_id)
);

COMMIT;
