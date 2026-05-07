-- 20260507_1600_records_page_props_backfill.sql
-- Backfill props for all EMPTY module.records.page routes (intelligent-register).
-- Idempotent: only updates rows where props is still empty/null.

BEGIN;

UPDATE dos.ui_route_template_binding SET
  props = v.p, title_en = v.ten, title_ar = v.tar,
  subtitle_en = v.sen, subtitle_ar = v.sar,
  eyebrow_en = COALESCE(eyebrow_en, v.een), eyebrow_ar = COALESCE(eyebrow_ar, v.ear),
  version = version + 1, updated_at = now()
FROM (VALUES
  ('/admin/integrations/catalog','Integration catalog','كتالوج التكاملات',
   'Browse and activate available platform integrations.','تصفح التكاملات المتاحة وتفعيلها.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Integration catalog","subtitle":"Browse and activate available platform integrations.","loading":false,"pillars":{"evidence":"Integration registry."},"records":[],"columns":[{"key":"name","label":"Integration","labelAr":"التكامل","sortable":true},{"key":"category","label":"Category","labelAr":"الفئة"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search integrations","filterLabel":"Category"}'::jsonb),
  ('/admin/ui-system/components','UI components','مكونات واجهة المستخدم',
   'Platform UI component registry and catalog.','سجل وكتالوج مكونات واجهة المنصة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"UI components","subtitle":"Platform UI component registry and catalog.","loading":false,"pillars":{"evidence":"UI component registry."},"records":[],"columns":[{"key":"componentKey","label":"Component","labelAr":"المكوّن","sortable":true},{"key":"vendor","label":"Vendor","labelAr":"المورد"},{"key":"approvalStatus","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search components","filterLabel":"Status"}'::jsonb),
  ('/admin/ui-system/themes','Theme registry','سجل السمات',
   'Design token sets and theme variants.','مجموعات رموز التصميم ومتغيرات السمات.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Theme registry","subtitle":"Design token sets and theme variants.","loading":false,"pillars":{"evidence":"Theme registry."},"records":[],"columns":[{"key":"name","label":"Theme","labelAr":"السمة","sortable":true},{"key":"mode","label":"Mode","labelAr":"الوضع"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search themes","filterLabel":"Mode"}'::jsonb),
  ('/audit/findings','Audit findings','نتائج التدقيق',
   'Open and resolved audit findings register.','سجل نتائج التدقيق المفتوحة والمحلولة.','Audit','التدقيق',
   '{"eyebrow":"Audit","title":"Audit findings","subtitle":"Open and resolved audit findings register.","loading":false,"pillars":{"evidence":"Audit findings register."},"records":[],"columns":[{"key":"title","label":"Finding","labelAr":"النتيجة","sortable":true},{"key":"severity","type":"tag","label":"Severity","labelAr":"الخطورة"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"},{"key":"owner","label":"Owner","labelAr":"المالك"},{"key":"dueDate","type":"date","label":"Due","labelAr":"الاستحقاق"}],"searchPlaceholder":"Search findings","filterLabel":"Severity"}'::jsonb),
  ('/compliance/controls','Controls','الضوابط',
   'Compliance control library and test status.','مكتبة ضوابط الامتثال وحالة الاختبار.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Controls","subtitle":"Compliance control library and test status.","loading":false,"pillars":{"evidence":"Control library."},"records":[],"columns":[{"key":"title","label":"Control","labelAr":"الضابط","sortable":true},{"key":"framework","label":"Framework","labelAr":"الإطار"},{"key":"owner","label":"Owner","labelAr":"المالك"},{"key":"testStatus","type":"tag","label":"Test status","labelAr":"حالة الاختبار"}],"searchPlaceholder":"Search controls","filterLabel":"Framework"}'::jsonb),
  ('/compliance/controls/list','Controls list','قائمة الضوابط',
   'Full control inventory with filtering.','جرد الضوابط الكامل مع التصفية.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Controls list","subtitle":"Full control inventory with filtering.","loading":false,"pillars":{"evidence":"Control inventory."},"records":[],"columns":[{"key":"title","label":"Control","labelAr":"الضابط","sortable":true},{"key":"framework","label":"Framework","labelAr":"الإطار"},{"key":"owner","label":"Owner","labelAr":"المالك"},{"key":"testStatus","type":"tag","label":"Test status","labelAr":"حالة الاختبار"}],"searchPlaceholder":"Search controls","filterLabel":"Status"}'::jsonb),
  ('/compliance/evidence','Evidence','الأدلة',
   'Evidence artifacts linked to controls and audits.','أدلة مرتبطة بالضوابط وعمليات التدقيق.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Evidence","subtitle":"Evidence artifacts linked to controls and audits.","loading":false,"pillars":{"evidence":"Evidence catalog."},"records":[],"columns":[{"key":"title","label":"Evidence","labelAr":"الدليل","sortable":true},{"key":"type","label":"Type","labelAr":"النوع"},{"key":"control","label":"Control","labelAr":"الضابط"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search evidence","filterLabel":"Type"}'::jsonb),
  ('/compliance/exceptions','Exceptions','الاستثناءات',
   'Control exception and waiver register.','سجل استثناءات وتنازلات الضوابط.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Exceptions","subtitle":"Control exception and waiver register.","loading":false,"pillars":{"evidence":"Exception register."},"records":[],"columns":[{"key":"control","label":"Control","labelAr":"الضابط","sortable":true},{"key":"reason","label":"Reason","labelAr":"السبب"},{"key":"approver","label":"Approver","labelAr":"المعتمد"},{"key":"expiryDate","type":"date","label":"Expires","labelAr":"ينتهي"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search exceptions","filterLabel":"Status"}'::jsonb),
  ('/compliance/findings','Compliance findings','نتائج الامتثال',
   'Compliance assessment and gap findings.','نتائج تقييم الامتثال والثغرات.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance findings","subtitle":"Compliance assessment and gap findings.","loading":false,"pillars":{"evidence":"Findings register."},"records":[],"columns":[{"key":"finding","label":"Finding","labelAr":"النتيجة","sortable":true},{"key":"framework","label":"Framework","labelAr":"الإطار"},{"key":"severity","type":"tag","label":"Severity","labelAr":"الخطورة"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search findings","filterLabel":"Severity"}'::jsonb),
  ('/compliance/frameworks','Frameworks','الأطر',
   'Compliance frameworks and standards register.','سجل أطر ومعايير الامتثال.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Frameworks","subtitle":"Compliance frameworks and standards register.","loading":false,"pillars":{"evidence":"Framework register."},"records":[],"columns":[{"key":"name","label":"Framework","labelAr":"الإطار","sortable":true},{"key":"version","label":"Version","labelAr":"الإصدار"},{"key":"controls","label":"Controls","labelAr":"الضوابط"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search frameworks","filterLabel":"Status"}'::jsonb),
  ('/compliance/gaps','Compliance gaps','ثغرات الامتثال',
   'Identified gaps against applicable frameworks.','الثغرات المحددة مقابل الأطر المعمول بها.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance gaps","subtitle":"Identified gaps against applicable frameworks.","loading":false,"pillars":{"evidence":"Gap register."},"records":[],"columns":[{"key":"gap","label":"Gap","labelAr":"الثغرة","sortable":true},{"key":"framework","label":"Framework","labelAr":"الإطار"},{"key":"priority","type":"tag","label":"Priority","labelAr":"الأولوية"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search gaps","filterLabel":"Priority"}'::jsonb),
  ('/compliance/obligations','Obligations','الالتزامات',
   'Regulatory and contractual obligation register.','سجل الالتزامات التنظيمية والتعاقدية.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Obligations","subtitle":"Regulatory and contractual obligation register.","loading":false,"pillars":{"evidence":"Obligation register."},"records":[],"columns":[{"key":"title","label":"Obligation","labelAr":"الالتزام","sortable":true},{"key":"source","label":"Source","labelAr":"المصدر"},{"key":"owner","label":"Owner","labelAr":"المالك"},{"key":"dueDate","type":"date","label":"Due","labelAr":"الاستحقاق"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search obligations","filterLabel":"Source"}'::jsonb),
  ('/compliance/regulator','Regulator relations','علاقات الجهات التنظيمية',
   'Regulatory submissions and correspondence log.','سجل الطلبات التنظيمية والمراسلات.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Regulator relations","subtitle":"Regulatory submissions and correspondence log.","loading":false,"pillars":{"evidence":"Regulator log."},"records":[],"columns":[{"key":"subject","label":"Subject","labelAr":"الموضوع","sortable":true},{"key":"regulator","label":"Regulator","labelAr":"الجهة التنظيمية"},{"key":"submittedDate","type":"date","label":"Submitted","labelAr":"تاريخ التقديم"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search communications","filterLabel":"Status"}'::jsonb),
  ('/controls/library','Control library','مكتبة الضوابط',
   'Master control library across all frameworks.','مكتبة الضوابط الرئيسية عبر جميع الأطر.','Controls','الضوابط',
   '{"eyebrow":"Controls","title":"Control library","subtitle":"Master control library across all frameworks.","loading":false,"pillars":{"evidence":"Control library."},"records":[],"columns":[{"key":"title","label":"Control","labelAr":"الضابط","sortable":true},{"key":"framework","label":"Framework","labelAr":"الإطار"},{"key":"owner","label":"Owner","labelAr":"المالك"},{"key":"effectiveness","type":"tag","label":"Effectiveness","labelAr":"الفعالية"}],"searchPlaceholder":"Search controls","filterLabel":"Framework"}'::jsonb),
  ('/dynamic-ui/components','Components','المكونات',
   'Dynamic UI component registry.','سجل مكونات واجهة المستخدم الديناميكية.','Dynamic UI','واجهة ديناميكية',
   '{"eyebrow":"Dynamic UI","title":"Components","subtitle":"Dynamic UI component registry.","loading":false,"pillars":{"evidence":"Component registry."},"records":[],"columns":[{"key":"componentKey","label":"Key","labelAr":"المفتاح","sortable":true},{"key":"vendor","label":"Vendor","labelAr":"المورد"},{"key":"approvalStatus","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search components","filterLabel":"Status"}'::jsonb),
  ('/dynamic-ui/contracts','Contracts','العقود',
   'UI-OS contract catalog.','كتالوج عقود واجهة نظام التشغيل.','Dynamic UI','واجهة ديناميكية',
   '{"eyebrow":"Dynamic UI","title":"Contracts","subtitle":"UI-OS contract catalog.","loading":false,"pillars":{"evidence":"Contract catalog."},"records":[],"columns":[{"key":"contractKey","label":"Contract","labelAr":"العقد","sortable":true},{"key":"version","label":"Version","labelAr":"الإصدار"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search contracts","filterLabel":"Status"}'::jsonb),
  ('/dynamic-ui/routes','Routes','المسارات',
   'Dynamic UI route metadata catalog.','كتالوج بيانات مسارات واجهة المستخدم.','Dynamic UI','واجهة ديناميكية',
   '{"eyebrow":"Dynamic UI","title":"Routes","subtitle":"Dynamic UI route metadata catalog.","loading":false,"pillars":{"evidence":"Route catalog."},"records":[],"columns":[{"key":"route","label":"Route","labelAr":"المسار","sortable":true},{"key":"renderMode","label":"Render mode","labelAr":"وضع العرض"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search routes","filterLabel":"Render mode"}'::jsonb),
  ('/evidence/catalog','Evidence catalog','كتالوج الأدلة',
   'Searchable evidence artifact catalog.','كتالوج أدلة قابل للبحث.','Evidence','الأدلة',
   '{"eyebrow":"Evidence","title":"Evidence catalog","subtitle":"Searchable evidence artifact catalog.","loading":false,"pillars":{"evidence":"Evidence catalog."},"records":[],"columns":[{"key":"title","label":"Evidence","labelAr":"الدليل","sortable":true},{"key":"type","label":"Type","labelAr":"النوع"},{"key":"control","label":"Control","labelAr":"الضابط"},{"key":"uploadedDate","type":"date","label":"Uploaded","labelAr":"تاريخ الرفع"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search evidence","filterLabel":"Type"}'::jsonb),
  ('/policy/library','Policy library','مكتبة السياسات',
   'Governance and compliance policy library.','مكتبة سياسات الحوكمة والامتثال.','Policy','السياسات',
   '{"eyebrow":"Policy","title":"Policy library","subtitle":"Governance and compliance policy library.","loading":false,"pillars":{"evidence":"Policy library."},"records":[],"columns":[{"key":"title","label":"Policy","labelAr":"السياسة","sortable":true},{"key":"owner","label":"Owner","labelAr":"المالك"},{"key":"reviewDate","type":"date","label":"Review date","labelAr":"تاريخ المراجعة"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search policies","filterLabel":"Status"}'::jsonb),
  ('/workflow/templates','Workflow templates','قوالب سير العمل',
   'Reusable workflow template library.','مكتبة قوالب سير العمل القابلة لإعادة الاستخدام.','Workflow','سير العمل',
   '{"eyebrow":"Workflow","title":"Workflow templates","subtitle":"Reusable workflow template library.","loading":false,"pillars":{"evidence":"Workflow template library."},"records":[],"columns":[{"key":"name","label":"Template","labelAr":"القالب","sortable":true},{"key":"category","label":"Category","labelAr":"الفئة"},{"key":"usageCount","label":"Usage","labelAr":"الاستخدام"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}],"searchPlaceholder":"Search templates","filterLabel":"Category"}'::jsonb),
  ('/workflow/workflows','Workflows','سير العمل',
   'All active and archived workflow instances.','جميع مثيلات سير العمل النشطة والمؤرشفة.','Workflow','سير العمل',
   '{"eyebrow":"Workflow","title":"Workflows","subtitle":"All active and archived workflow instances.","loading":false,"pillars":{"evidence":"Workflow instance register."},"records":[],"columns":[{"key":"name","label":"Workflow","labelAr":"سير العمل","sortable":true},{"key":"type","label":"Type","labelAr":"النوع"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"},{"key":"dueDate","type":"date","label":"Due","labelAr":"الاستحقاق"}],"searchPlaceholder":"Search workflows","filterLabel":"Status"}'::jsonb)
) AS v(route,ten,tar,sen,sar,een,ear,p)
WHERE dos.ui_route_template_binding.route = v.route
  AND (dos.ui_route_template_binding.props = '{}'::jsonb OR dos.ui_route_template_binding.props IS NULL);

DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.ui_route_template_binding
  WHERE template_export = 'module.records.page' AND (props = '{}'::jsonb OR props IS NULL);
  RAISE NOTICE '20260507_1600: % module.records.page rows still empty after backfill', n;
END $$;
COMMIT;
