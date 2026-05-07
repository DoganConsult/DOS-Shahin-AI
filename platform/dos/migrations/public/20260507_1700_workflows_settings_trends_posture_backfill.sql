-- 20260507_1700_workflows_settings_trends_posture_backfill.sql
-- Backfill props for EMPTY: module.workflows.page, module.workflow_timeline.page,
-- module.settings.page, module.trends.page, module.posture.page,
-- module.reports.page, module.roadmap.page.
-- Idempotent.

BEGIN;

UPDATE dos.ui_route_template_binding SET
  props = v.p, title_en = v.ten, title_ar = v.tar,
  subtitle_en = v.sen, subtitle_ar = v.sar,
  eyebrow_en = COALESCE(eyebrow_en, v.een), eyebrow_ar = COALESCE(eyebrow_ar, v.ear),
  version = version + 1, updated_at = now()
FROM (VALUES
  -- module.workflows.page (workflow-control)
  ('/audit/engagements','Audit engagements','ارتباطات التدقيق',
   'Plan, execute and close audit engagements.','تخطيط وتنفيذ وإغلاق ارتباطات التدقيق.','Audit','التدقيق',
   '{"eyebrow":"Audit","title":"Audit engagements","subtitle":"Plan, execute and close audit engagements.","loading":false,"pillars":{"evidence":"Engagement register."},"records":[],"filterLabel":"Status","statusOptions":["planned","in-progress","completed","cancelled"]}'::jsonb),
  ('/compliance/assessments','Assessments','التقييمات',
   'Compliance and control assessment workflows.','سير عمل تقييمات الامتثال والضوابط.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Assessments","subtitle":"Compliance and control assessment workflows.","loading":false,"pillars":{"evidence":"Assessment register."},"records":[],"filterLabel":"Status","statusOptions":["open","in-review","completed","overdue"]}'::jsonb),
  ('/controls/testing','Control testing','اختبار الضوابط',
   'Scheduled and ad-hoc control effectiveness testing.','اختبار فعالية الضوابط المجدول والمخصص.','Controls','الضوابط',
   '{"eyebrow":"Controls","title":"Control testing","subtitle":"Scheduled and ad-hoc control effectiveness testing.","loading":false,"pillars":{"evidence":"Testing register."},"records":[],"filterLabel":"Result","statusOptions":["passed","failed","in-progress","not-tested"]}'::jsonb),
  ('/evidence/reviews','Evidence reviews','مراجعات الأدلة',
   'Evidence sufficiency and quality review queue.','قائمة انتظار مراجعة كفاية وجودة الأدلة.','Evidence','الأدلة',
   '{"eyebrow":"Evidence","title":"Evidence reviews","subtitle":"Evidence sufficiency and quality review queue.","loading":false,"pillars":{"evidence":"Review queue."},"records":[],"filterLabel":"Status","statusOptions":["pending","in-review","approved","rejected"]}'::jsonb),
  ('/workflow/designer','Workflow designer','مصمم سير العمل',
   'Visual workflow design and configuration studio.','استوديو تصميم سير العمل المرئي وتكوينه.','Workflow','سير العمل',
   '{"eyebrow":"Workflow","title":"Workflow designer","subtitle":"Visual workflow design and configuration studio.","loading":false,"pillars":{"evidence":"Workflow designer."},"records":[],"filterLabel":"Type","statusOptions":["draft","published","archived"]}'::jsonb),
  -- module.workflow_timeline.page
  ('/admin/multi-tenant/provisioning','Tenant provisioning','توفير المستأجرين',
   'Tenant lifecycle and provisioning timeline.','الجدول الزمني لدورة حياة المستأجرين وتوفيرهم.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Tenant provisioning","subtitle":"Tenant lifecycle and provisioning timeline.","loading":false,"events":[]}'::jsonb),
  ('/workflow/executions','Workflow executions','تنفيذات سير العمل',
   'Live and historical workflow execution timeline.','الجدول الزمني لتنفيذات سير العمل الحية والتاريخية.','Workflow','سير العمل',
   '{"eyebrow":"Workflow","title":"Workflow executions","subtitle":"Live and historical workflow execution timeline.","loading":false,"events":[]}'::jsonb),
  -- module.settings.page
  ('/admin/config-center/compare','Config compare','مقارنة التكوين',
   'Compare configuration snapshots across environments.','مقارنة لقطات التكوين عبر البيئات.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Config compare","subtitle":"Compare configuration snapshots across environments.","loading":false,"sections":[]}'::jsonb),
  ('/admin/config-center/resolve','Config resolution','حل التكوين',
   'Resolve configuration drift and conflicts.','حل انجراف التكوين والتعارضات.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Config resolution","subtitle":"Resolve configuration drift and conflicts.","loading":false,"sections":[]}'::jsonb),
  ('/admin/config-center/workspace','Workspace config','تكوين مساحة العمل',
   'Platform workspace configuration settings.','إعدادات تكوين مساحة عمل المنصة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Workspace config","subtitle":"Platform workspace configuration settings.","loading":false,"sections":[]}'::jsonb),
  ('/compliance/admin','Compliance admin','إدارة الامتثال',
   'Compliance module administration and configuration.','إدارة وحدة الامتثال وتكوينها.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance admin","subtitle":"Compliance module administration and configuration.","loading":false,"sections":[]}'::jsonb),
  ('/settings','Settings','الإعدادات',
   'Platform account and workspace settings.','إعدادات حساب المنصة ومساحة العمل.','Platform','المنصة',
   '{"eyebrow":"Platform","title":"Settings","subtitle":"Platform account and workspace settings.","loading":false,"sections":[{"id":"profile","label":"Profile","labelAr":"الملف الشخصي","fields":[]},{"id":"preferences","label":"Preferences","labelAr":"التفضيلات","fields":[]},{"id":"notifications","label":"Notifications","labelAr":"الإشعارات","fields":[]},{"id":"security","label":"Security","labelAr":"الأمان","fields":[]}]}'::jsonb),
  ('/tenant-settings','Tenant settings','إعدادات المستأجر',
   'Tenant-level configuration and preferences.','تكوين المستأجر وتفضيلاته.','Platform','المنصة',
   '{"eyebrow":"Platform","title":"Tenant settings","subtitle":"Tenant-level configuration and preferences.","loading":false,"sections":[{"id":"general","label":"General","labelAr":"عام","fields":[]},{"id":"branding","label":"Branding","labelAr":"العلامة التجارية","fields":[]},{"id":"security","label":"Security","labelAr":"الأمان","fields":[]},{"id":"integrations","label":"Integrations","labelAr":"التكاملات","fields":[]}]}'::jsonb),
  -- module.trends.page
  ('/admin/config-center/gateway','Gateway metrics','مقاييس البوابة',
   'API gateway traffic, latency and error rate trends.','اتجاهات حركة مرور البوابة والكمون ومعدل الأخطاء.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Gateway metrics","subtitle":"API gateway traffic, latency and error rate trends.","loading":false,"series":[],"axes":{"x":"Time","y":"Requests"}}'::jsonb),
  ('/admin/config-center/health','System health','صحة النظام',
   'Platform service health and uptime trend overview.','نظرة عامة على صحة خدمات المنصة ومؤشرات التوفر.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"System health","subtitle":"Platform service health and uptime trend overview.","loading":false,"series":[],"axes":{"x":"Time","y":"Uptime %"}}'::jsonb),
  ('/admin/dnoc/metrics','DNOC metrics','مقاييس مركز عمليات الشبكة',
   'Network operations centre monitoring trends.','اتجاهات مراقبة مركز عمليات الشبكة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"DNOC metrics","subtitle":"Network operations centre monitoring trends.","loading":false,"series":[],"axes":{"x":"Time","y":"Events"}}'::jsonb),
  ('/controls/monitoring','Controls monitoring','مراقبة الضوابط',
   'Continuous control monitoring signals and trends.','إشارات واتجاهات مراقبة الضوابط المستمرة.','Controls','الضوابط',
   '{"eyebrow":"Controls","title":"Controls monitoring","subtitle":"Continuous control monitoring signals and trends.","loading":false,"series":[],"axes":{"x":"Time","y":"Score"}}'::jsonb),
  ('/workflow/analytics','Workflow analytics','تحليلات سير العمل',
   'Workflow throughput, cycle time and bottleneck trends.','اتجاهات إنتاجية سير العمل ووقت الدورة ونقاط الاختناق.','Workflow','سير العمل',
   '{"eyebrow":"Workflow","title":"Workflow analytics","subtitle":"Workflow throughput, cycle time and bottleneck trends.","loading":false,"series":[],"axes":{"x":"Time","y":"Throughput"}}'::jsonb),
  -- module.reports.page
  ('/audit/reports','Audit reports','تقارير التدقيق',
   'Generated audit reports and regulatory submissions.','تقارير التدقيق المُنشأة والطلبات التنظيمية.','Audit','التدقيق',
   '{"eyebrow":"Audit","title":"Audit reports","subtitle":"Generated audit reports and regulatory submissions.","loading":false,"reportTypes":["executive-summary","detailed-findings","regulator-pack"],"exportFormats":["pdf","xlsx","csv"]}'::jsonb),
  ('/compliance/reports','Compliance reports','تقارير الامتثال',
   'Compliance posture reports and framework exports.','تقارير وضع الامتثال وتصدير الأطر.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance reports","subtitle":"Compliance posture reports and framework exports.","loading":false,"reportTypes":["posture-summary","gap-analysis","control-coverage","regulator-pack"],"exportFormats":["pdf","xlsx","csv"]}'::jsonb),
  -- module.roadmap.page
  ('/admin/multi-tenant/quotas','Quota roadmap','خارطة طريق الحصص',
   'Tenant quota allocation and capacity planning roadmap.','خارطة طريق تخصيص حصص المستأجرين وتخطيط السعة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Quota roadmap","subtitle":"Tenant quota allocation and capacity planning roadmap.","loading":false,"milestones":[]}'::jsonb),
  ('/compliance/roadmap','Compliance roadmap','خارطة طريق الامتثال',
   'Remediation milestones and compliance improvement plan.','معالم المعالجة وخطة تحسين الامتثال.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance roadmap","subtitle":"Remediation milestones and compliance improvement plan.","loading":false,"milestones":[]}'::jsonb)
) AS v(route,ten,tar,sen,sar,een,ear,p)
WHERE dos.ui_route_template_binding.route = v.route
  AND (dos.ui_route_template_binding.props = '{}'::jsonb OR dos.ui_route_template_binding.props IS NULL);

DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.ui_route_template_binding
  WHERE template_export IN ('module.workflows.page','module.workflow_timeline.page',
    'module.settings.page','module.trends.page','module.reports.page','module.roadmap.page')
    AND (props = '{}'::jsonb OR props IS NULL);
  RAISE NOTICE '20260507_1700: % rows still empty after backfill', n;
END $$;
COMMIT;
