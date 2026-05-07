-- 20260511_1000_ai_explainability_blocks.sql
--
-- Wave 08: AI command/control explainability contracts.
-- Adds DB-owned explainability blocks with typed action JSON payloads.
--
-- Idempotent, additive.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_route_ai_explainability_block (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  block_id      TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  rationale_en  TEXT,
  rationale_ar  TEXT,
  confidence    NUMERIC(5,2),
  status        TEXT,
  action_json   JSONB,
  UNIQUE(route, block_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_route_ai_explainability_block_route
  ON dos.ui_route_ai_explainability_block(route);

INSERT INTO dos.ui_route_ai_explainability_block (
  route, block_id, sort_order, title_en, title_ar, rationale_en, rationale_ar, confidence, status, action_json
)
VALUES
  (
    '/foundation/ownership-mapping',
    'xai-sod-risk-spike',
    10,
    'SoD conflict risk spike',
    'ارتفاع مخاطر تعارض فصل الواجبات',
    'Graph centrality + delegation expiry predicts a temporary SoD conflict spike in policy approvals.',
    'تحليل المركزية في الرسم البياني مع انتهاء التفويض يتنبأ بارتفاع مؤقت في تعارض فصل الواجبات.',
    91.20,
    'ready',
    '{"kind":"dispatch_event","eventName":"ai.control.open_sod_review","payload":{"route":"/foundation/ownership-mapping","focus":"sod-conflict"}}'::jsonb
  ),
  (
    '/foundation/ownership-mapping',
    'xai-ownership-bottleneck',
    20,
    'Ownership approval bottleneck',
    'اختناق في موافقات الملكية',
    'Simulation shows dual-signoff policy may add latency unless delegation fd-3 is bounded and reassigned.',
    'المحاكاة تظهر أن سياسة التوقيع المزدوج قد تزيد التأخير ما لم يتم تقييد التفويض fd-3 وإعادة إسناده.',
    84.50,
    'ready',
    '{"kind":"open_context_tab","tab":"delegations"}'::jsonb
  )
ON CONFLICT (route, block_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  title_en = EXCLUDED.title_en,
  title_ar = EXCLUDED.title_ar,
  rationale_en = EXCLUDED.rationale_en,
  rationale_ar = EXCLUDED.rationale_ar,
  confidence = EXCLUDED.confidence,
  status = EXCLUDED.status,
  action_json = EXCLUDED.action_json;

DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM dos.ui_route_ai_explainability_block
  WHERE route = '/foundation/ownership-mapping';

  IF cnt < 2 THEN
    RAISE EXCEPTION 'ai explainability assertion failed: expected >= 2 rows, got %', cnt;
  END IF;
END $$;

COMMIT;
