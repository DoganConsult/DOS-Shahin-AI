-- 20260512_0910_foundation_sod_enterprise_seed.sql
--
-- Focused enhancement for /foundation/sod (module-settings archetype).
-- DB-first, idempotent, no frontend fallback.
--
-- Objectives:
-- 1) Remove legacy placeholder narrative from pillars.
-- 2) Seed enterprise-grade SoD settings sections with concrete values.
-- 3) Provide locale-capable labels for settings template UI strings.
-- 4) Populate typed masthead i18n columns (title/subtitle/eyebrow).
--
-- NOTE:
-- The module-settings template remains render-only; all displayed values
-- come from this DB contract row through /api/ui-os/template-binding.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET title_en = 'Segregation of duties',
       title_ar = 'فصل الواجبات',
       subtitle_en = 'Conflict rules, exception governance, and periodic review controls.',
       subtitle_ar = 'قواعد التعارض وحوكمة الاستثناءات وضوابط المراجعة الدورية.',
       eyebrow_en = 'Foundation',
       eyebrow_ar = 'المؤسسة',
       status_tags = '[
         {"label":"Policy active","labelAr":"السياسة مفعلة","severity":"success"},
         {"label":"Quarterly review","labelAr":"مراجعة ربع سنوية","severity":"info"}
       ]'::jsonb,
       primary_action = '{
         "label":"Create conflict rule",
         "labelAr":"إضافة قاعدة تعارض",
         "route":"/foundation/sod?tab=rules&mode=create",
         "actionKey":"foundation.sod.rule.create",
         "severity":"info"
       }'::jsonb,
       props = (
         COALESCE(props, '{}'::jsonb)
         || jsonb_build_object(
           'title', 'Segregation of duties',
           'subtitle', 'Conflict rules, exception governance, and periodic review controls.',
           'eyebrow', 'Foundation',
           'aiHeadline', 'SoD policy posture and exception pressure by reviewer capacity.',
           'readOnlyLabel', 'Read-only - write access required',
           'readOnlyLabelAr', 'للقراءة فقط - يتطلب صلاحية تعديل',
           'saveLabel', 'Publish policy update',
           'saveLabelAr', 'نشر تحديث السياسة',
           'savingLabel', 'Publishing update...',
           'savingLabelAr', 'جاري نشر التحديث...',
           'discardLabel', 'Discard draft',
           'discardLabelAr', 'إلغاء المسودة',
           'settingLabelHeader', 'Control',
           'settingLabelHeaderAr', 'الضابط',
           'settingValueHeader', 'Configured value',
           'settingValueHeaderAr', 'القيمة المهيأة',
           'pillars', jsonb_build_object(
             'whyItMatters', 'SoD policy drift expands fraud and approval-risk exposure.',
             'evidence', 'Ruleset, exception queue, review cadence, and owner accountability.',
             'riskOrOpportunity', 'Reduce unauthorized combinations and overdue exceptions.',
             'whatChanged', 'Conflict-rule baseline refreshed with owner and SLA controls.'
           ),
           'sections', '[
             {
               "id":"rules",
               "label":"Conflict rules",
               "labelAr":"قواعد التعارض",
               "description":"Core mutually-exclusive access combinations.",
               "descriptionAr":"تركيبات الصلاحيات المتعارضة الأساسية.",
               "items":[
                 {
                   "id":"rules.count",
                   "label":"Active rules",
                   "labelAr":"القواعد النشطة",
                   "value":"18",
                   "valueAr":"18",
                   "status":"success",
                   "hint":"3 new rules added this quarter.",
                   "hintAr":"تمت إضافة 3 قواعد جديدة هذا الربع."
                 },
                 {
                   "id":"rules.coverage",
                   "label":"Coverage",
                   "labelAr":"التغطية",
                   "value":"92%",
                   "valueAr":"92%",
                   "status":"success",
                   "hint":"Mapped to finance, procurement, and payroll critical paths.",
                   "hintAr":"مرتبطة بالمسارات الحرجة للمالية والمشتريات والرواتب."
                 }
               ]
             },
             {
               "id":"exceptions",
               "label":"Exceptions",
               "labelAr":"الاستثناءات",
               "description":"Temporary conflict overrides with owner and expiry.",
               "descriptionAr":"تجاوزات تعارض مؤقتة مع مالك وتاريخ انتهاء.",
               "items":[
                 {
                   "id":"exceptions.open",
                   "label":"Open exceptions",
                   "labelAr":"الاستثناءات المفتوحة",
                   "value":"7",
                   "valueAr":"7",
                   "status":"warning",
                   "hint":"2 exceptions exceed approval SLA.",
                   "hintAr":"هناك استثناءان تجاوزا زمن الاعتماد."
                 },
                 {
                   "id":"exceptions.expiring",
                   "label":"Expiring in 7 days",
                   "labelAr":"تنتهي خلال 7 أيام",
                   "value":"3",
                   "valueAr":"3",
                   "status":"warning",
                   "hint":"Owner action required before auto-revoke.",
                   "hintAr":"مطلوب إجراء من المالك قبل الإلغاء التلقائي."
                 }
               ]
             },
             {
               "id":"reviews",
               "label":"Periodic reviews",
               "labelAr":"المراجعات الدورية",
               "description":"Reviewer assignment and attestation cadence.",
               "descriptionAr":"توزيع المراجعين وإيقاع التصديق الدوري.",
               "items":[
                 {
                   "id":"reviews.cycle",
                   "label":"Review cycle",
                   "labelAr":"دورة المراجعة",
                   "value":"Quarterly",
                   "valueAr":"ربع سنوية",
                   "status":"info",
                   "hint":"Next campaign starts in 12 days.",
                   "hintAr":"الحملة القادمة تبدأ خلال 12 يوماً."
                 },
                 {
                   "id":"reviews.backlog",
                   "label":"Pending attestations",
                   "labelAr":"التصديقات المعلقة",
                   "value":"14",
                   "valueAr":"14",
                   "status":"warning",
                   "hint":"Backlog concentrated in procurement workflows.",
                   "hintAr":"التراكم متركز في إجراءات المشتريات."
                 }
               ]
             },
             {
               "id":"enforcement",
               "label":"Enforcement",
               "labelAr":"الإنفاذ",
               "description":"Runtime control mode and audit evidence handling.",
               "descriptionAr":"وضع الإنفاذ في التشغيل وإدارة أدلة التدقيق.",
               "items":[
                 {
                   "id":"enforcement.mode",
                   "label":"Enforcement mode",
                   "labelAr":"وضع الإنفاذ",
                   "value":"Block + Alert",
                   "valueAr":"حظر + تنبيه",
                   "status":"success",
                   "hint":"Violating assignments are blocked at grant time.",
                   "hintAr":"يتم حظر التعيينات المخالفة وقت منح الصلاحية."
                 },
                 {
                   "id":"enforcement.audit",
                   "label":"Evidence retention",
                   "labelAr":"الاحتفاظ بالأدلة",
                   "value":"365 days",
                   "valueAr":"365 يوماً",
                   "status":"info",
                   "hint":"All overrides written to immutable audit trail.",
                   "hintAr":"جميع التجاوزات تُسجل في سجل تدقيق غير قابل للتعديل."
                 }
               ]
             }
           ]'::jsonb
         )
       ),
       version = GREATEST(version, 0) + 1
 WHERE route = '/foundation/sod';

DO $$
DECLARE
  ok_count INT;
BEGIN
  SELECT COUNT(*) INTO ok_count
    FROM dos.ui_route_template_binding
   WHERE route = '/foundation/sod'
     AND COALESCE(title_en, '') <> ''
     AND COALESCE(title_ar, '') <> ''
     AND COALESCE(subtitle_en, '') <> ''
     AND COALESCE(subtitle_ar, '') <> ''
     AND COALESCE(eyebrow_ar, '') <> ''
     AND jsonb_typeof(props->'sections') = 'array'
     AND jsonb_array_length(props->'sections') >= 4;
  IF ok_count <> 1 THEN
    RAISE EXCEPTION 'foundation/sod enterprise seed assertion failed';
  END IF;
END $$;

COMMIT;
