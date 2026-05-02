-- ============================================================================
-- 039_shahin_public_agents_a01_a12.sql
--
-- Backfills the canonical Shahin-AI public agent identity (A01..A12) into
-- public.mcp_agent_registry and rebuilds public.agent_registry as a
-- public-visible filtered view. Idempotent — safe to re-run.
--
-- Decision: the public landing page identity is A01..A12 (Shahin-AI public
-- catalog). Internal onb-* agents remain in the table for foundation intake
-- but are excluded from public.agent_registry by `public_visible = FALSE`.
-- ============================================================================

BEGIN;

-- ── Schema extension: visibility & product binding ──────────────────────
ALTER TABLE public.mcp_agent_registry
  ADD COLUMN IF NOT EXISTS product_code      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS public_visible    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_identity   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS role_en           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role_ar           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS visitor_runnable  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image_path        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tools             TEXT[] NOT NULL DEFAULT '{}';

-- Existing onb-* rows must stay internal.
UPDATE public.mcp_agent_registry
   SET public_visible = FALSE
 WHERE agent_id LIKE 'onb-%' AND public_visible IS DISTINCT FROM FALSE;

-- ── Backfill A01..A12 (Shahin-AI public catalog) ───────────────────────
INSERT INTO public.mcp_agent_registry (
  agent_id, name_en, name_ar, summary_en, summary_ar,
  owner_module_code, domain_code, module_codes, capabilities, tools, tags,
  icon, color, status, is_enabled, is_system, sort_order, created_by,
  product_code, public_visible, public_identity,
  role_en, role_ar, visitor_runnable, image_path
) VALUES
  ('A01','Onboarding Agent','وكيل التهيئة',
   'Guides new tenants through onboarding, captures industry/size/licenses and recommends KSA frameworks.',
   'يوجه المستأجرين الجدد خلال الإعداد ويوصي بالأطر التنظيمية السعودية المناسبة.',
   'onboarding','onboarding','{onboarding}',
   '{Industry intake,Framework recommendation,Workspace seed}',
   '{recommend_frameworks,seed_workspace,assess_industry}',
   '{shahin-ai,public}','pi-compass','#6366f1','active',TRUE,TRUE,1,'system',
   'shahin-ai',TRUE,'A01','Onboarding Monitor','مراقب التهيئة',TRUE,'assets/agents/A01.png'),
  ('A02','Identity Management Agent','وكيل إدارة الهوية',
   'Provisions users, assigns RBAC roles, enforces least-privilege, configures MFA and audits access.',
   'يدير دورة حياة هوية المستخدم ويعين أدوار RBAC ويفرض أقل الصلاحيات.',
   'identity','identity','{identity,access}',
   '{SSO / Azure AD,RBAC,MFA enforcement}',
   '{provision_user,assign_role,enforce_mfa}',
   '{shahin-ai,public}','pi-id-card','#8b5cf6','active',TRUE,TRUE,2,'system',
   'shahin-ai',TRUE,'A02','Identity & RBAC','الهوية والصلاحيات',TRUE,'assets/agents/A02.png'),
  ('A03','Framework Mapping Agent','وكيل ربط الأطر التنظيمية',
   'Maps controls across NCA-ECC, SAMA-CSF, PDPL, ISO 27001 and PCI-DSS.',
   'يربط الضوابط عبر الأطر التنظيمية السعودية وينتج مصفوفات موحدة.',
   'compliance','mapping','{compliance,governance}',
   '{Cross-framework mapping,Confidence scoring}',
   '{cross_map_controls,score_confidence}',
   '{shahin-ai,public}','pi-sitemap','#3b82f6','active',TRUE,TRUE,3,'system',
   'shahin-ai',TRUE,'A03','Framework Analyzer','محلل الأطر',TRUE,'assets/agents/A03.png'),
  ('A04','Control Authoring Agent','وكيل تأليف الضوابط',
   'Drafts controls, security policies and procedures with bilingual content and citations.',
   'يصيغ ضوابط الامتثال والسياسات وإجراءات التنفيذ المتوافقة مع المتطلبات السعودية.',
   'controls','controls','{controls,governance}',
   '{Bilingual drafting,Test procedures}',
   '{author_control,draft_test_procedure}',
   '{shahin-ai,public}','pi-pencil','#10b981','active',TRUE,TRUE,4,'system',
   'shahin-ai',TRUE,'A04','Control Lifecycle','دورة حياة الضوابط',TRUE,'assets/agents/A04.png'),
  ('A05','Evidence Collection Agent','وكيل جمع الأدلة',
   'Automates evidence gathering, document analysis, freshness tracking and gap detection.',
   'يؤتمت جمع الأدلة وتحليل المستندات ويتتبع حداثة الأدلة ويحدد الثغرات.',
   'evidence','evidence','{evidence,audit}',
   '{Document analysis,Freshness checks}',
   '{collect_evidence,analyze_document,check_freshness}',
   '{shahin-ai,public}','pi-file-check','#14b8a6','active',TRUE,TRUE,5,'system',
   'shahin-ai',TRUE,'A05','Evidence Manager','مدير الأدلة',TRUE,'assets/agents/A05.png'),
  ('A06','Gap Remediation Agent','وكيل معالجة الثغرات',
   'Analyzes findings, calculates risk-weighted priorities and generates phased remediation roadmaps.',
   'يحلل النتائج ويحسب الأولويات المرجحة بالمخاطر وينشئ خرائط معالجة مرحلية.',
   'compliance','remediation','{compliance}',
   '{Priority scoring,Roadmap generation}',
   '{score_priority,generate_roadmap}',
   '{shahin-ai,public}','pi-wrench','#ef4444','active',TRUE,TRUE,6,'system',
   'shahin-ai',TRUE,'A06','Remediation Planner','مخطط المعالجة',TRUE,'assets/agents/A06.png'),
  ('A07','Risk Register Agent','وكيل سجل المخاطر',
   'Manages the enterprise risk register, scores using 5x5 matrices and tracks KRIs and appetite.',
   'يدير سجل المخاطر المؤسسية ويقيّم باستخدام مصفوفات 5×5 ويتتبع المؤشرات.',
   'risk','risk','{risk}',
   '{5x5 scoring,KRI tracking}',
   '{score_risk_5x5,track_kri,update_register}',
   '{shahin-ai,public}','pi-chart-line','#06b6d4','active',TRUE,TRUE,7,'system',
   'shahin-ai',TRUE,'A07','Risk Assessor','مقيّم المخاطر',TRUE,'assets/agents/A07.png'),
  ('A08','Policy Lifecycle Agent','وكيل دورة حياة السياسات',
   'Manages drafting, review, approval, distribution, periodic review and retirement of policies.',
   'يدير دورة حياة السياسات الكاملة من الصياغة إلى التقاعد.',
   'governance','policy','{governance,policy}',
   '{Approval workflow,Distribution}',
   '{draft_policy,run_approval,distribute_policy}',
   '{shahin-ai,public}','pi-book','#f97316','active',TRUE,TRUE,8,'system',
   'shahin-ai',TRUE,'A08','Policy Manager','مدير السياسات',TRUE,'assets/agents/A08.png'),
  ('A09','Third-Party Risk Agent','وكيل مخاطر الأطراف الثالثة',
   'Assesses vendor risk via DDQs, monitors SLA compliance and supply chain alignment.',
   'يقيم مخاطر الموردين عبر استبيانات العناية الواجبة ويتتبع الامتثال لـ SLA.',
   'vendor','vendor','{vendor,risk}',
   '{DDQ,SLA monitoring}',
   '{run_ddq,monitor_sla,score_vendor}',
   '{shahin-ai,public}','pi-building','#a855f7','active',TRUE,TRUE,9,'system',
   'shahin-ai',TRUE,'A09','Vendor Assessor','مقيّم الموردين',TRUE,'assets/agents/A09.png'),
  ('A10','Audit Reporting Agent','وكيل تقارير التدقيق',
   'Generates regulator-ready audit reports for NCA, SAMA and SDAIA with bilingual artefacts.',
   'ينشئ تقارير تدقيق جاهزة للجهات الرقابية مع مرفقات ثنائية اللغة.',
   'audit','audit','{audit,reporting}',
   '{Regulator packs,Executive dashboards}',
   '{generate_regulator_pack,build_exec_dashboard}',
   '{shahin-ai,public}','pi-file-pdf','#0284c7','active',TRUE,TRUE,10,'system',
   'shahin-ai',TRUE,'A10','Audit Reporter','مُعدّ التقارير',TRUE,'assets/agents/A10.png'),
  ('A11','Business Continuity Agent','وكيل استمرارية الأعمال',
   'Manages BIA, BCP coverage, RTO/RPO tracking, exercises and disaster recovery readiness.',
   'يدير تخطيط استمرارية الأعمال وتحليل الأثر وجاهزية التعافي.',
   'bcp','bcp','{bcp}',
   '{BIA / RTO / RPO,Exercise scheduling}',
   '{run_bia,track_rto_rpo,schedule_exercise}',
   '{shahin-ai,public}','pi-shield','#059669','active',TRUE,TRUE,11,'system',
   'shahin-ai',TRUE,'A11','BCP Manager','مدير الاستمرارية',TRUE,'assets/agents/A11.png'),
  ('A12','Training & Awareness Agent','وكيل التدريب والتوعية',
   'Runs training assignments, completion tracking, phishing simulations and certification management.',
   'يدير برامج التوعية الأمنية وتعيين التدريب وتتبع الإتمام.',
   'training','training','{training}',
   '{Phishing simulation,Certification}',
   '{assign_training,run_phishing_sim,track_completion}',
   '{shahin-ai,public}','pi-graduation-cap','#d946ef','active',TRUE,TRUE,12,'system',
   'shahin-ai',TRUE,'A12','Training Manager','مدير التدريب',TRUE,'assets/agents/A12.png')
ON CONFLICT (agent_id) DO UPDATE SET
  name_en          = EXCLUDED.name_en,
  name_ar          = EXCLUDED.name_ar,
  summary_en       = EXCLUDED.summary_en,
  summary_ar       = EXCLUDED.summary_ar,
  owner_module_code= EXCLUDED.owner_module_code,
  domain_code      = EXCLUDED.domain_code,
  module_codes     = EXCLUDED.module_codes,
  capabilities     = EXCLUDED.capabilities,
  tools            = EXCLUDED.tools,
  tags             = EXCLUDED.tags,
  icon             = EXCLUDED.icon,
  color            = EXCLUDED.color,
  status           = EXCLUDED.status,
  is_enabled       = EXCLUDED.is_enabled,
  sort_order       = EXCLUDED.sort_order,
  product_code     = EXCLUDED.product_code,
  public_visible   = EXCLUDED.public_visible,
  public_identity  = EXCLUDED.public_identity,
  role_en          = EXCLUDED.role_en,
  role_ar          = EXCLUDED.role_ar,
  visitor_runnable = EXCLUDED.visitor_runnable,
  image_path       = EXCLUDED.image_path,
  updated_at       = NOW();

-- ── Rebuild the public-facing view to filter on public_visible ───────────
DROP VIEW IF EXISTS public.agent_registry;

CREATE VIEW public.agent_registry AS
SELECT
  agent_id,
  name_en,
  name_ar,
  COALESCE(role_en, domain_code)        AS role_en,
  COALESCE(role_ar, name_ar)            AS role_ar,
  domain_code                            AS domain_en,
  is_enabled                             AS enabled,
  sort_order,
  summary_en,
  summary_ar,
  owner_module_code,
  capabilities,
  tools,
  tags,
  icon,
  color,
  status,
  is_system,
  product_code,
  public_visible,
  public_identity,
  visitor_runnable,
  image_path,
  created_at,
  updated_at
FROM public.mcp_agent_registry
WHERE public_visible = TRUE;

CREATE INDEX IF NOT EXISTS idx_mcp_agent_public
  ON public.mcp_agent_registry (public_visible, sort_order)
  WHERE public_visible = TRUE;

COMMIT;
