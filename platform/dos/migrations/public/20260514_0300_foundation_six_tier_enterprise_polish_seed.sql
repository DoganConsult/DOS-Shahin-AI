-- =====================================================================
-- Foundation Module — 6 Tiers of Enterprise Polish, applied to every
-- approved template archetype binding under /foundation*.
-- =====================================================================
-- Tier 1  Identity         : title, subtitle, eyebrow, loading
-- Tier 2  AI Intelligence  : aiHeadline, heroKpi, pillars
-- Tier 3  KPI Signal Bar   : kpis, statusTags
-- Tier 4  Action Layer     : primaryAction, secondaryActions, nbaActions
-- Tier 5  Navigation       : tabs
-- Tier 6  State            : emptyState, errorState
--
-- Behaviour
--  * Idempotent. Existing prop keys WIN — defaults are merged underneath
--    using `defaults || props` so we only fill blanks, never overwrite.
--  * Pulls scalar identity (title/subtitle/eyebrow/aiHeadline) from the
--    binding row's own typed columns so EN/AR copy stays in lockstep.
--  * statusTags / primaryAction props mirror the binding columns when
--    the column is non-empty; otherwise tier-3/4 defaults apply.
-- =====================================================================

BEGIN;

WITH defaults AS (
  SELECT
    b.route,
    -- ── Tier 1 — Identity ────────────────────────────────────────────
    jsonb_build_object(
      'title',    COALESCE(NULLIF(b.title_en, ''),    'Foundation'),
      'subtitle', COALESCE(NULLIF(b.subtitle_en, ''), ''),
      'eyebrow',  COALESCE(NULLIF(b.eyebrow_en, ''),  'Foundation'),
      'loading',  false
    )
    -- ── Tier 2 — AI Intelligence ─────────────────────────────────────
    || jsonb_build_object(
      'aiHeadline', COALESCE(NULLIF(b.ai_headline_en, ''),
                      'AI advisor surfaces drift signals across this surface.'),
      'heroKpi',    NULL,
      'pillars',    jsonb_build_object(
                      'whyItMatters', 'This control protects foundation integrity and downstream module trust.',
                      'whatChanged',  'Surface now resolves through Dynamic UI + UI-OS only.',
                      'nextAction',   'Triage the top signal and clear the highest-severity tag first.',
                      'evidence',     'Backed by foundation_* tables, audit trail, and access-review history.'
                    )
    )
    -- ── Tier 3 — KPI Signal Bar ──────────────────────────────────────
    || jsonb_build_object(
      'kpis',       '[]'::jsonb,
      'statusTags', CASE WHEN b.status_tags = '[]'::jsonb
                         THEN '[{"label":"Live","labelAr":"حي","severity":"info"},
                                {"label":"DB-driven","labelAr":"مستند للبيانات","severity":"low"}]'::jsonb
                         ELSE b.status_tags END
    )
    -- ── Tier 4 — Action Layer ────────────────────────────────────────
    || jsonb_build_object(
      'primaryAction',     b.primary_action,
      'secondaryActions',  '[]'::jsonb,
      'nbaActions',        '[]'::jsonb
    )
    -- ── Tier 5 — Navigation ──────────────────────────────────────────
    || jsonb_build_object(
      'tabs', '[]'::jsonb
    )
    -- ── Tier 6 — State ───────────────────────────────────────────────
    || jsonb_build_object(
      'emptyState', jsonb_build_object(
                      'title',      'Nothing to show yet',
                      'titleAr',    'لا يوجد شيء للعرض بعد',
                      'subtitle',   'Once data is published this surface will populate.',
                      'subtitleAr', 'بمجرد نشر البيانات ستظهر هذه الواجهة.'
                    ),
      'errorState', jsonb_build_object(
                      'title',      'Something interrupted this surface',
                      'titleAr',    'حدث خلل في هذه الواجهة',
                      'subtitle',   'Retry, or open the audit trail to see what changed.',
                      'subtitleAr', 'حاول مرة أخرى أو افتح سجل التدقيق لمعرفة ما تغير.'
                    )
    ) AS tier_defaults
    FROM dos.ui_route_template_binding b
   WHERE b.route LIKE '/foundation%'
)
UPDATE dos.ui_route_template_binding b
   SET props      = d.tier_defaults || b.props,
       updated_at = now()
  FROM defaults d
 WHERE b.route = d.route
   AND (
     -- Only touch rows where any tier key is missing (idempotence).
     NOT (b.props ? 'title'           AND b.props ? 'subtitle'      AND
          b.props ? 'eyebrow'         AND b.props ? 'loading'       AND
          b.props ? 'aiHeadline'      AND b.props ? 'heroKpi'       AND
          b.props ? 'pillars'         AND b.props ? 'kpis'          AND
          b.props ? 'statusTags'      AND b.props ? 'primaryAction' AND
          b.props ? 'secondaryActions'AND b.props ? 'nbaActions'    AND
          b.props ? 'tabs'            AND b.props ? 'emptyState'    AND
          b.props ? 'errorState')
   );

-- ── Assertions — every /foundation* row must carry all 15 tier keys.
DO $$
DECLARE
  v_missing int;
  v_route_count int;
BEGIN
  SELECT count(*) INTO v_route_count
    FROM dos.ui_route_template_binding WHERE route LIKE '/foundation%';

  SELECT count(*) INTO v_missing
    FROM dos.ui_route_template_binding b
   WHERE b.route LIKE '/foundation%'
     AND NOT (
       b.props ? 'title'            AND b.props ? 'subtitle'        AND
       b.props ? 'eyebrow'          AND b.props ? 'loading'         AND
       b.props ? 'aiHeadline'       AND b.props ? 'heroKpi'         AND
       b.props ? 'pillars'          AND b.props ? 'kpis'            AND
       b.props ? 'statusTags'       AND b.props ? 'primaryAction'   AND
       b.props ? 'secondaryActions' AND b.props ? 'nbaActions'      AND
       b.props ? 'tabs'             AND b.props ? 'emptyState'      AND
       b.props ? 'errorState'
     );

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'FAIL: % /foundation%% binding row(s) still missing tier keys', v_missing;
  END IF;
  RAISE NOTICE 'OK: all % /foundation%% binding rows carry the 6-tier prop contract', v_route_count;
END $$;

COMMIT;
