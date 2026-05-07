-- =====================================================================
-- Foundation + Module-Settings Route Bindings — Enterprise Detail Seed
-- =====================================================================
-- Closes the per-archetype detail gaps surfaced by the audit:
--
--   /foundation               (command-home)   was minimal scaffold —
--                                              now mirrors /foundation/overview
--                                              quality (subtitle, eyebrow,
--                                              ai_headline, status_tags,
--                                              primary_action, props pillars).
--
--   /foundation/sod           (module-settings) lacked ai_headline_en/ar.
--
-- Idempotent. Test-DB safe. Only writes when the target field is empty.
-- =====================================================================

BEGIN;

-- 1. /foundation root — promote to enterprise-grade command-home detail.
UPDATE dos.ui_route_template_binding
   SET title_en       = 'Foundation control center',
       title_ar       = 'مركز تحكم المؤسسة',
       subtitle_en    = COALESCE(NULLIF(subtitle_en, ''),
                          'Live posture of identity, structure, governance, and access risk.'),
       subtitle_ar    = COALESCE(NULLIF(subtitle_ar, ''),
                          'الوضع الحي للهوية والهيكل والحوكمة ومخاطر الوصول.'),
       eyebrow_en     = COALESCE(NULLIF(eyebrow_en, ''), 'Foundation'),
       eyebrow_ar     = COALESCE(NULLIF(eyebrow_ar, ''), 'المؤسسة'),
       ai_headline_en = COALESCE(NULLIF(ai_headline_en, ''),
                          'AI advisor highlights drift risks across foundation domains.'),
       ai_headline_ar = COALESCE(NULLIF(ai_headline_ar, ''),
                          'مستشار الذكاء الاصطناعي يبرز مخاطر الانحراف عبر مجالات المؤسسة.'),
       status_tags    = CASE WHEN status_tags = '[]'::jsonb
                             THEN '[{"label":"Live","labelAr":"حي","severity":"info"},
                                    {"label":"DB-driven","labelAr":"مستند للبيانات","severity":"low"}]'::jsonb
                             ELSE status_tags END,
       primary_action = COALESCE(primary_action,
                          '{"label":"Open foundation overview",
                            "labelAr":"افتح نظرة المؤسسة",
                            "action":{"kind":"navigate","path":"/foundation/overview"}}'::jsonb),
       props          = CASE WHEN props = '{}'::jsonb
                             THEN '{
                               "kpis": [],
                               "title": "Foundation",
                               "eyebrow": "Module",
                               "loading": false,
                               "subtitle": "Organization structure, access governance, and operational posture.",
                               "pillarsEn": {
                                 "evidence": "Aggregates from foundation_* tables, access reviews, audit trail.",
                                 "nextAction": "Open the overview to triage the top signals.",
                                 "whatChanged": "Module entry now resolves through Dynamic UI + UI-OS only.",
                                 "whyItMatters": "Foundation drift cascades into every downstream module.",
                                 "riskOrOpportunity": "Catch identity, role, and access drift before audit windows."
                               },
                               "pillarsAr": {
                                 "evidence": "مجمعات من جداول foundation_* ومراجعات الوصول وسجل التدقيق.",
                                 "nextAction": "افتح النظرة العامة لمعالجة أعلى الإشارات.",
                                 "whatChanged": "نقطة دخول الوحدة تحل الآن عبر Dynamic UI + UI-OS فقط.",
                                 "whyItMatters": "انحراف المؤسسة ينتشر إلى كل وحدة لاحقة.",
                                 "riskOrOpportunity": "اكتشف انحراف الهوية والأدوار والوصول قبل نوافذ التدقيق."
                               }
                             }'::jsonb
                             ELSE props END,
       updated_at = now()
 WHERE route = '/foundation';

-- 2. /foundation/sod — module-settings archetype, fill missing AI headlines.
UPDATE dos.ui_route_template_binding
   SET ai_headline_en = COALESCE(NULLIF(ai_headline_en, ''),
                          'AI advisor flags conflicting role pairings before approval.'),
       ai_headline_ar = COALESCE(NULLIF(ai_headline_ar, ''),
                          'مستشار الذكاء الاصطناعي يبرز اقترانات الأدوار المتعارضة قبل الموافقة.'),
       updated_at     = now()
 WHERE route = '/foundation/sod'
   AND (ai_headline_en IS NULL OR ai_headline_en = ''
        OR ai_headline_ar IS NULL OR ai_headline_ar = '');

-- 3. Assertions — fail loud on residual emptiness in foundation routes.
DO $$
DECLARE
  v_gaps int;
BEGIN
  SELECT count(*) INTO v_gaps
    FROM dos.ui_route_template_binding b
   WHERE b.route LIKE '/foundation%'
     AND (
       b.title_en IS NULL OR b.title_en = ''
       OR b.title_ar IS NULL OR b.title_ar = ''
       OR b.subtitle_en IS NULL OR b.subtitle_en = ''
       OR b.subtitle_ar IS NULL OR b.subtitle_ar = ''
       OR b.eyebrow_en IS NULL OR b.eyebrow_en = ''
       OR b.eyebrow_ar IS NULL OR b.eyebrow_ar = ''
       OR b.ai_headline_en IS NULL OR b.ai_headline_en = ''
       OR b.ai_headline_ar IS NULL OR b.ai_headline_ar = ''
       OR b.status_tags = '[]'::jsonb
       OR b.primary_action IS NULL
       OR b.props = '{}'::jsonb
     );
  IF v_gaps > 0 THEN
    RAISE EXCEPTION 'FAIL: % foundation route binding(s) still have empty enterprise fields', v_gaps;
  END IF;
  RAISE NOTICE 'OK: every /foundation%% binding row has full enterprise detail';
END $$;

COMMIT;
