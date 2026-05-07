-- =====================================================================
-- Foundation Module — 6-Tier Polish, Bilingual Completion (EN + AR)
-- =====================================================================
-- The 0300 seed populated the 6-tier prop contract but only carried EN
-- scalars for Tier 1 (identity), Tier 2 (aiHeadline), and primaryAction
-- labels. This seed mirrors every EN scalar with its AR sibling pulled
-- from the binding row's typed `_ar` columns so templates can render
-- both locales without re-querying the binding row.
--
-- Idempotent. Existing AR keys WIN (defaults merged underneath).
-- =====================================================================

BEGIN;

WITH ar_defaults AS (
  SELECT
    b.route,
    -- Tier 1 — Identity AR
    jsonb_build_object(
      'titleAr',    COALESCE(NULLIF(b.title_ar, ''),    'الأساس'),
      'subtitleAr', COALESCE(NULLIF(b.subtitle_ar, ''), ''),
      'eyebrowAr',  COALESCE(NULLIF(b.eyebrow_ar, ''),  'المؤسسة')
    )
    -- Tier 2 — AI Intelligence AR
    || jsonb_build_object(
      'aiHeadlineAr', COALESCE(NULLIF(b.ai_headline_ar, ''),
                        'مستشار الذكاء الاصطناعي يبرز إشارات الانحراف عبر هذه الواجهة.')
    )
    -- Tier 4 — primaryAction AR label (mirror existing label.label/labelAr inside the action when present)
    || CASE
         WHEN b.primary_action IS NOT NULL
              AND b.primary_action ? 'label'
              AND NOT (b.primary_action ? 'labelAr')
         THEN jsonb_build_object(
                'primaryAction',
                b.primary_action || jsonb_build_object('labelAr', b.primary_action->>'label')
              )
         ELSE '{}'::jsonb
       END AS ar_keys
    FROM dos.ui_route_template_binding b
   WHERE b.route LIKE '/foundation%'
)
UPDATE dos.ui_route_template_binding b
   SET props      = d.ar_keys || b.props,
       updated_at = now()
  FROM ar_defaults d
 WHERE b.route = d.route
   AND (
     NOT (b.props ? 'titleAr' AND b.props ? 'subtitleAr' AND
          b.props ? 'eyebrowAr' AND b.props ? 'aiHeadlineAr')
     OR (b.primary_action IS NOT NULL
         AND b.primary_action ? 'label'
         AND NOT (COALESCE(b.props->'primaryAction', '{}'::jsonb) ? 'labelAr'))
   );

-- Assertions — every /foundation* row must carry full bilingual identity + AI headline.
DO $$
DECLARE
  v_missing int;
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM dos.ui_route_template_binding WHERE route LIKE '/foundation%';

  SELECT count(*) INTO v_missing
    FROM dos.ui_route_template_binding b
   WHERE b.route LIKE '/foundation%'
     AND NOT (
       b.props ? 'titleAr' AND b.props ? 'subtitleAr' AND
       b.props ? 'eyebrowAr' AND b.props ? 'aiHeadlineAr' AND
       b.props ? 'title' AND b.props ? 'subtitle' AND
       b.props ? 'eyebrow' AND b.props ? 'aiHeadline'
     );

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'FAIL: % /foundation%% binding row(s) still missing EN/AR identity', v_missing;
  END IF;
  RAISE NOTICE 'OK: all % /foundation%% bindings carry EN+AR Tier 1/2 props', v_count;
END $$;

COMMIT;
