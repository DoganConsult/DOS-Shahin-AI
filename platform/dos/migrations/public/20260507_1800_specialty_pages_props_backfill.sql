-- 20260507_1800_specialty_pages_props_backfill.sql
-- Backfill props for EMPTY specialty pages:
--   module.heatmap.page, module.ownership_map.page, module.work_queue,
--   module.command_dashboard.page, module.posture.page,
--   module.compliance_calendar.page, module.calendar.page,
--   module.incident_response.page, module.agent_registry.page,
--   module.record.detail.page, module.workflow_timeline.page (remaining)
-- Idempotent.

BEGIN;

UPDATE dos.ui_route_template_binding SET
  props = v.p, title_en = v.ten, title_ar = v.tar,
  subtitle_en = v.sen, subtitle_ar = v.sar,
  eyebrow_en = COALESCE(eyebrow_en, v.een), eyebrow_ar = COALESCE(eyebrow_ar, v.ear),
  version = version + 1, updated_at = now()
FROM (VALUES
  -- module.heatmap.page
  ('/admin/runtime/health','Runtime health','صحة وقت التشغيل',
   'Runtime environment health heatmap.','خارطة حرارة صحة بيئة وقت التشغيل.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Runtime health","subtitle":"Runtime environment health heatmap.","loading":false,"cells":[],"axes":{"x":[],"y":[]},"legend":{"green":"Healthy","amber":"Degraded","red":"Down"}}'::jsonb),
  ('/compliance/heatmap','Compliance heatmap','خارطة حرارة الامتثال',
   'Control effectiveness heatmap by framework domain.','خارطة حرارة فعالية الضوابط حسب نطاق الإطار.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance heatmap","subtitle":"Control effectiveness heatmap by framework domain.","loading":false,"cells":[],"axes":{"x":[],"y":[]},"legend":{"green":"Effective","amber":"Partial","red":"Ineffective"}}'::jsonb),
  -- module.ownership_map.page
  ('/admin/integrations/catalog','Integration catalog','كتالوج التكاملات',
   'Integration ownership and dependency map.','خارطة ملكية التكاملات والتبعيات.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Integration catalog","subtitle":"Integration ownership and dependency map.","loading":false,"nodes":[],"edges":[]}'::jsonb),
  ('/admin/integrations/webhooks','Webhooks','خطافات الويب',
   'Webhook configuration and event routing map.','خارطة تكوين خطافات الويب وتوجيه الأحداث.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Webhooks","subtitle":"Webhook configuration and event routing map.","loading":false,"nodes":[],"edges":[]}'::jsonb),
  ('/admin/integrations/apis','API registry','سجل واجهات برمجة التطبيقات',
   'Platform API catalog and integration ownership.','كتالوج واجهات برمجة التطبيقات وملكية التكامل.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"API registry","subtitle":"Platform API catalog and integration ownership.","loading":false,"nodes":[],"edges":[]}'::jsonb),
  ('/risk/ownership','Risk ownership','ملكية المخاطر',
   'Risk register ownership and accountability map.','خارطة ملكية ومساءلة سجل المخاطر.','Risk','المخاطر',
   '{"eyebrow":"Risk","title":"Risk ownership","subtitle":"Risk register ownership and accountability map.","loading":false,"nodes":[],"edges":[]}'::jsonb),
  -- module.work_queue
  ('/compliance/evidence-ops','Evidence ops','عمليات الأدلة',
   'Evidence collection, validation and triage queue.','قائمة انتظار جمع الأدلة والتحقق منها وفرزها.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Evidence ops","subtitle":"Evidence collection, validation and triage queue.","loading":false,"queues":[{"id":"pending","label":"Pending","labelAr":"قيد الانتظار"},{"id":"in-review","label":"In review","labelAr":"قيد المراجعة"},{"id":"approved","label":"Approved","labelAr":"تمت الموافقة"},{"id":"rejected","label":"Rejected","labelAr":"مرفوض"}],"columns":[{"key":"title","label":"Evidence","labelAr":"الدليل","sortable":true},{"key":"type","label":"Type","labelAr":"النوع"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}]}'::jsonb),
  ('/compliance/work-queue','Compliance queue','قائمة انتظار الامتثال',
   'Compliance task and action item work queue.','قائمة انتظار مهام الامتثال وعناصر الإجراءات.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance queue","subtitle":"Compliance task and action item work queue.","loading":false,"queues":[{"id":"open","label":"Open","labelAr":"مفتوح"},{"id":"in-progress","label":"In progress","labelAr":"قيد التنفيذ"},{"id":"done","label":"Done","labelAr":"مكتمل"}],"columns":[{"key":"title","label":"Task","labelAr":"المهمة","sortable":true},{"key":"priority","type":"tag","label":"Priority","labelAr":"الأولوية"},{"key":"dueDate","type":"date","label":"Due","labelAr":"الاستحقاق"}]}'::jsonb),
  ('/evidence/requests','Evidence requests','طلبات الأدلة',
   'Pending and completed evidence request queue.','قائمة انتظار طلبات الأدلة المعلقة والمكتملة.','Evidence','الأدلة',
   '{"eyebrow":"Evidence","title":"Evidence requests","subtitle":"Pending and completed evidence request queue.","loading":false,"queues":[{"id":"requested","label":"Requested","labelAr":"مطلوب"},{"id":"submitted","label":"Submitted","labelAr":"مُقدَّم"},{"id":"reviewed","label":"Reviewed","labelAr":"تمت مراجعته"}],"columns":[{"key":"title","label":"Request","labelAr":"الطلب","sortable":true},{"key":"requestedBy","label":"By","labelAr":"بواسطة"},{"key":"dueDate","type":"date","label":"Due","labelAr":"الاستحقاق"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}]}'::jsonb),
  ('/evidence/tasks','Evidence tasks','مهام الأدلة',
   'Evidence task assignment and completion queue.','قائمة انتظار تعيين مهام الأدلة واكتمالها.','Evidence','الأدلة',
   '{"eyebrow":"Evidence","title":"Evidence tasks","subtitle":"Evidence task assignment and completion queue.","loading":false,"queues":[{"id":"assigned","label":"Assigned","labelAr":"مُعيَّن"},{"id":"in-progress","label":"In progress","labelAr":"قيد التنفيذ"},{"id":"completed","label":"Completed","labelAr":"مكتمل"}],"columns":[{"key":"title","label":"Task","labelAr":"المهمة","sortable":true},{"key":"assignee","label":"Assignee","labelAr":"المُكلَّف"},{"key":"dueDate","type":"date","label":"Due","labelAr":"الاستحقاق"},{"key":"status","type":"tag","label":"Status","labelAr":"الحالة"}]}'::jsonb),
  -- module.command_dashboard.page
  ('/admin/config-center/deployments','Deployments','عمليات النشر',
   'Platform deployment history and rollout dashboard.','لوحة معلومات سجل نشر المنصة والطرح.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Deployments","subtitle":"Platform deployment history and rollout dashboard.","loading":false,"widgets":[{"id":"recent-deploys","type":"list"},{"id":"rollout-status","type":"status"},{"id":"service-versions","type":"table"}]}'::jsonb),
  ('/admin/dnoc/command','DNOC command','مركز أوامر العمليات',
   'Network operations command and control dashboard.','لوحة معلومات قيادة والتحكم في عمليات الشبكة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"DNOC command","subtitle":"Network operations command and control dashboard.","loading":false,"widgets":[{"id":"service-map","type":"topology"},{"id":"alert-feed","type":"feed"},{"id":"sla-status","type":"kpi"}]}'::jsonb),
  ('/admin/platform/overview','Platform overview','نظرة عامة على المنصة',
   'Executive platform health and operations dashboard.','لوحة معلومات صحة وعمليات المنصة التنفيذية.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Platform overview","subtitle":"Executive platform health and operations dashboard.","loading":false,"widgets":[{"id":"tenant-count","type":"kpi"},{"id":"active-users","type":"kpi"},{"id":"system-health","type":"status"}]}'::jsonb),
  -- module.posture.page (EMPTY ones — non-foundation)
  ('/admin/runtime/posture','Runtime posture','وضع وقت التشغيل',
   'Platform security and operational posture signals.','إشارات الأمان والوضع التشغيلي للمنصة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Runtime posture","subtitle":"Platform security and operational posture signals.","loading":false,"pillars":{"evidence":"Runtime posture signals."},"signals":[]}'::jsonb),
  ('/compliance/posture','Compliance posture','وضع الامتثال',
   'Aggregate compliance posture across all frameworks.','الوضع الإجمالي للامتثال عبر جميع الأطر.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance posture","subtitle":"Aggregate compliance posture across all frameworks.","loading":false,"pillars":{"evidence":"Compliance posture overview."},"signals":[]}'::jsonb),
  ('/risk/posture','Risk posture','وضع المخاطر',
   'Enterprise risk posture and residual risk overview.','نظرة عامة على وضع مخاطر المؤسسة والمخاطر المتبقية.','Risk','المخاطر',
   '{"eyebrow":"Risk","title":"Risk posture","subtitle":"Enterprise risk posture and residual risk overview.","loading":false,"pillars":{"evidence":"Risk posture overview."},"signals":[]}'::jsonb),
  -- module.compliance_calendar.page
  ('/compliance/calendar','Compliance calendar','تقويم الامتثال',
   'Regulatory deadlines, review dates and attestation schedule.','المواعيد التنظيمية وتواريخ المراجعة وجدول الإقرار.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Compliance calendar","subtitle":"Regulatory deadlines, review dates and attestation schedule.","loading":false,"events":[],"calendarMode":"month"}'::jsonb),
  ('/risk/calendar','Risk calendar','تقويم المخاطر',
   'Risk review, escalation and treatment deadline calendar.','تقويم مراجعة المخاطر والتصعيد ومواعيد المعالجة.','Risk','المخاطر',
   '{"eyebrow":"Risk","title":"Risk calendar","subtitle":"Risk review, escalation and treatment deadline calendar.","loading":false,"events":[],"calendarMode":"month"}'::jsonb),
  -- module.calendar.page
  ('/audit/calendar','Audit calendar','تقويم التدقيق',
   'Audit engagement and fieldwork scheduling calendar.','تقويم جدولة ارتباطات التدقيق وأعمال الميدان.','Audit','التدقيق',
   '{"eyebrow":"Audit","title":"Audit calendar","subtitle":"Audit engagement and fieldwork scheduling calendar.","loading":false,"events":[]}'::jsonb),
  ('/workflow/calendar','Workflow calendar','تقويم سير العمل',
   'Workflow due dates, milestones and deadline calendar.','تقويم مواعيد سير العمل والمعالم والمواعيد النهائية.','Workflow','سير العمل',
   '{"eyebrow":"Workflow","title":"Workflow calendar","subtitle":"Workflow due dates, milestones and deadline calendar.","loading":false,"events":[]}'::jsonb),
  -- module.incident_response.page
  ('/admin/incidents','Incidents','الحوادث',
   'Platform operational incident register and response log.','سجل حوادث منصة التشغيل وسجل الاستجابة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Incidents","subtitle":"Platform operational incident register and response log.","loading":false,"incidents":[],"severity":["critical","high","medium","low"]}'::jsonb),
  ('/risk/incidents','Risk incidents','حوادث المخاطر',
   'Risk materialisation and incident response register.','سجل تحقق المخاطر والاستجابة للحوادث.','Risk','المخاطر',
   '{"eyebrow":"Risk","title":"Risk incidents","subtitle":"Risk materialisation and incident response register.","loading":false,"incidents":[],"severity":["critical","high","medium","low"]}'::jsonb),
  -- module.agent_registry.page
  ('/admin/ai/agents','AI agents','وكلاء الذكاء الاصطناعي',
   'Registered AI agents, capabilities and deployment status.','وكلاء الذكاء الاصطناعي المسجلون والقدرات وحالة النشر.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"AI agents","subtitle":"Registered AI agents, capabilities and deployment status.","loading":false,"agents":[],"filters":[{"key":"status","label":"Status","labelAr":"الحالة"},{"key":"capability","label":"Capability","labelAr":"القدرة"}]}'::jsonb),
  ('/ai/registry','Agent registry','سجل الوكلاء',
   'AI agent catalog with version and capability matrix.','كتالوج وكلاء الذكاء الاصطناعي مع مصفوفة الإصدار والقدرات.','AI','الذكاء الاصطناعي',
   '{"eyebrow":"AI","title":"Agent registry","subtitle":"AI agent catalog with version and capability matrix.","loading":false,"agents":[],"filters":[{"key":"status","label":"Status","labelAr":"الحالة"},{"key":"type","label":"Type","labelAr":"النوع"}]}'::jsonb),
  -- module.record.detail.page
  ('/profile','My profile','ملفي الشخصي',
   'Your account profile, preferences and security settings.','ملف حسابك الشخصي والتفضيلات وإعدادات الأمان.','Platform','المنصة',
   '{"eyebrow":"Platform","title":"My profile","subtitle":"Your account profile, preferences and security settings.","loading":false,"sections":[{"id":"personal","label":"Personal information","labelAr":"المعلومات الشخصية","fields":[]},{"id":"preferences","label":"Preferences","labelAr":"التفضيلات","fields":[]},{"id":"security","label":"Security","labelAr":"الأمان","fields":[]}],"recordType":"user-profile"}'::jsonb),
  ('/tenant-profile','Organisation profile','ملف المؤسسة',
   'Organisation details, branding and workspace settings.','تفاصيل المؤسسة والعلامة التجارية وإعدادات مساحة العمل.','Platform','المنصة',
   '{"eyebrow":"Platform","title":"Organisation profile","subtitle":"Organisation details, branding and workspace settings.","loading":false,"sections":[{"id":"details","label":"Organisation details","labelAr":"تفاصيل المؤسسة","fields":[]},{"id":"branding","label":"Branding","labelAr":"العلامة التجارية","fields":[]},{"id":"workspace","label":"Workspace","labelAr":"مساحة العمل","fields":[]}],"recordType":"tenant-profile"}'::jsonb)
) AS v(route,ten,tar,sen,sar,een,ear,p)
WHERE dos.ui_route_template_binding.route = v.route
  AND (dos.ui_route_template_binding.props = '{}'::jsonb OR dos.ui_route_template_binding.props IS NULL);

DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.ui_route_template_binding
  WHERE template_export IN (
    'module.heatmap.page','module.ownership_map.page','module.work_queue',
    'module.command_dashboard.page','module.posture.page',
    'module.compliance_calendar.page','module.calendar.page',
    'module.incident_response.page','module.agent_registry.page','module.record.detail.page'
  ) AND (props = '{}'::jsonb OR props IS NULL);
  RAISE NOTICE '20260507_1800: % specialty page rows still empty after backfill', n;
END $$;
COMMIT;
