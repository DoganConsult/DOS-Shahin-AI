-- 20260507_1900_admin_ai_specialist_pages_backfill.sql
-- Backfill props for EMPTY admin, AI and specialist pages:
--   module.user_agent_workbench.page, module.agent_flow.page,
--   module.audit_evidence.page, module.export.page, module.entry.page,
--   module.followup_center.page, module.org_chart.page (empty one),
--   module.delegation_center.page (empty one), module.overview.page (empty ones)
-- Also covers any remaining unmatched EMPTY rows with a safe generic scaffold.
-- Idempotent.

BEGIN;

UPDATE dos.ui_route_template_binding SET
  props = v.p, title_en = v.ten, title_ar = v.tar,
  subtitle_en = v.sen, subtitle_ar = v.sar,
  eyebrow_en = COALESCE(eyebrow_en, v.een), eyebrow_ar = COALESCE(eyebrow_ar, v.ear),
  version = version + 1, updated_at = now()
FROM (VALUES
  -- module.user_agent_workbench.page
  ('/admin/ai/governance','AI governance workbench','مقاعد حوكمة الذكاء الاصطناعي',
   'AI agent governance, audit and oversight workbench.','مقعد حوكمة ومراجعة ورقابة وكيل الذكاء الاصطناعي.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"AI governance workbench","subtitle":"AI agent governance, audit and oversight workbench.","loading":false,"agentId":null,"context":{"mode":"governance","permissions":["platform.admin.ai.read"]}}'::jsonb),
  -- module.agent_flow.page
  ('/ai/flows','Agent flows','تدفقات الوكلاء',
   'AI agent orchestration flow designer and executor.','مصمم ومنفذ تدفق تنسيق وكيل الذكاء الاصطناعي.','AI','الذكاء الاصطناعي',
   '{"eyebrow":"AI","title":"Agent flows","subtitle":"AI agent orchestration flow designer and executor.","loading":false,"flowId":null,"steps":[]}'::jsonb),
  -- module.audit_evidence.page
  ('/audit/evidence','Audit evidence','أدلة التدقيق',
   'Upload, tag and link evidence to audit engagements.','رفع الأدلة وتصنيفها وربطها بارتباطات التدقيق.','Audit','التدقيق',
   '{"eyebrow":"Audit","title":"Audit evidence","subtitle":"Upload, tag and link evidence to audit engagements.","loading":false,"evidenceTypes":["document","screenshot","log","report","certificate"],"upload":{"accept":".pdf,.xlsx,.csv,.png,.jpg,.zip","maxSizeMb":50}}'::jsonb),
  -- module.export.page
  ('/compliance/export','Export center','مركز التصدير',
   'Generate and download compliance exports and packs.','إنشاء وتنزيل عمليات التصدير وحزم الامتثال.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Export center","subtitle":"Generate and download compliance exports and packs.","loading":false,"formats":["pdf","xlsx","csv","json"],"scope":{"modules":[],"dateRange":null}}'::jsonb),
  -- module.entry.page
  ('/admin/entry','Admin entry','مدخل الإدارة',
   'Platform administration entry and quick-links hub.','مدخل إدارة المنصة ومحور الروابط السريعة.','Admin','الإدارة',
   '{"eyebrow":"Admin","title":"Admin entry","subtitle":"Platform administration entry and quick-links hub.","loading":false,"entryType":"admin-hub","form":{}}'::jsonb),
  -- module.followup_center.page
  ('/compliance/follow-up','Follow-up center','مركز المتابعة',
   'Action items, follow-ups and accountability tracking.','عناصر الإجراءات والمتابعات وتتبع المساءلة.','Compliance','الامتثال',
   '{"eyebrow":"Compliance","title":"Follow-up center","subtitle":"Action items, follow-ups and accountability tracking.","loading":false,"items":[],"priority":["critical","high","medium","low"]}'::jsonb),
  -- module.overview.page (any remaining empty ones)
  ('/risk/overview','Risk overview','نظرة عامة على المخاطر',
   'Enterprise risk register summary and key indicators.','ملخص سجل مخاطر المؤسسة والمؤشرات الرئيسية.','Risk','المخاطر',
   '{"eyebrow":"Risk","title":"Risk overview","subtitle":"Enterprise risk register summary and key indicators.","loading":false,"kpis":[],"tabs":[],"pillars":{"evidence":"Risk register summary."},"nbaActions":[]}'::jsonb),
  ('/controls/overview','Controls overview','نظرة عامة على الضوابط',
   'Control effectiveness summary and monitoring indicators.','ملخص فعالية الضوابط ومؤشرات المراقبة.','Controls','الضوابط',
   '{"eyebrow":"Controls","title":"Controls overview","subtitle":"Control effectiveness summary and monitoring indicators.","loading":false,"kpis":[],"tabs":[],"pillars":{"evidence":"Control effectiveness summary."},"nbaActions":[]}'::jsonb),
  ('/evidence/overview','Evidence overview','نظرة عامة على الأدلة',
   'Evidence collection health and coverage summary.','ملخص صحة جمع الأدلة والتغطية.','Evidence','الأدلة',
   '{"eyebrow":"Evidence","title":"Evidence overview","subtitle":"Evidence collection health and coverage summary.","loading":false,"kpis":[],"tabs":[],"pillars":{"evidence":"Evidence coverage summary."},"nbaActions":[]}'::jsonb)
) AS v(route,ten,tar,sen,sar,een,ear,p)
WHERE dos.ui_route_template_binding.route = v.route
  AND (dos.ui_route_template_binding.props = '{}'::jsonb OR dos.ui_route_template_binding.props IS NULL);

-- Generic safe scaffold for any remaining EMPTY rows not matched above
-- Uses the route's existing title_en/title_ar (if set) or derives from route path.
UPDATE dos.ui_route_template_binding SET
  props = jsonb_build_object(
    'eyebrow', COALESCE(eyebrow_en, 'Platform'),
    'title', COALESCE(title_en, regexp_replace(route, '^.*/([^/]+)$', '\1')),
    'subtitle', COALESCE(subtitle_en, ''),
    'loading', false
  ),
  version = version + 1,
  updated_at = now()
WHERE (props = '{}'::jsonb OR props IS NULL)
  AND template_export NOT IN (
    'auth.login.page','auth.mfa.page','auth.register.page',
    'auth.forgot-password.page','auth.reset-password.page',
    'marketing.home.page','marketing.pricing.page','marketing.trust.page',
    'marketing.security.page','marketing.contact.page','marketing.about.page',
    'marketing.legal.page','marketing.platform.page','marketing.resources.page',
    'marketing.executive-kit.page'
  );

DO $$
DECLARE n integer; remaining_routes text;
BEGIN
  SELECT COUNT(*), string_agg(route, ', ' ORDER BY route) INTO n, remaining_routes
  FROM dos.ui_route_template_binding
  WHERE (props = '{}'::jsonb OR props IS NULL)
    AND template_export NOT LIKE 'auth.%'
    AND template_export NOT LIKE 'marketing.%';
  IF n > 0 THEN
    RAISE WARNING '20260507_1900: % non-auth/marketing rows still empty: %', n, remaining_routes;
  ELSE
    RAISE NOTICE '20260507_1900 PASS: all non-auth/marketing binding rows have props';
  END IF;
END $$;
COMMIT;
