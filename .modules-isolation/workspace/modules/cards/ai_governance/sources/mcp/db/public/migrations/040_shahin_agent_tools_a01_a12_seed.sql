-- ============================================================================
-- 040_shahin_agent_tools_a01_a12_seed.sql
--
-- Seeds public.mcp_tool_registry with the 30 tools declared by A01..A12 and
-- mirrors the canonical agents into dos.ai_agent_registry so the AI engine
-- can resolve them at runtime. Also seeds dos.ai_workflow_triggers with the
-- core agent->workflow signal bindings.
--
-- Idempotent — safe to re-run. Conflict targets:
--   public.mcp_tool_registry (tool_name)  via uq_mcp_tool_name
--   dos.ai_agent_registry    (agent_code) -- enforced via partial unique idx
--
-- Canonical CHECK domains observed in DDL:
--   approval_mode  : none | single | multi_step | risk_based | manual_gate
--   autonomy (L0..L3)
--   execution_type : internal_service | workflow_action | connector_action
--                  | http_proxy | job_dispatch | approval_only
--   visibility_scope: all | internal | admin_only | beta
--   data_classification: public | internal | confidential | restricted
--   sensitivity_level : normal | elevated | high | critical
--   risk_level        : critical | high | medium | low
--   status            : draft | active | deprecated | retired
-- ============================================================================

BEGIN;

-- ── 1. Enforce unique agent_code on dos.ai_agent_registry (idempotent) ──
CREATE UNIQUE INDEX IF NOT EXISTS uq_dos_ai_agent_registry_agent_code
  ON dos.ai_agent_registry (agent_code);

-- ── 2. Mirror A01..A12 into dos.ai_agent_registry (AI engine view) ──
INSERT INTO dos.ai_agent_registry (agent_code, name_en, name_ar, capabilities, model_code, is_active)
SELECT
  m.agent_id,
  m.name_en,
  m.name_ar,
  to_jsonb(m.capabilities),
  'claude-3-5-sonnet',
  TRUE
FROM public.mcp_agent_registry m
WHERE m.agent_id ~ '^A[0-9]{2}$'
ON CONFLICT (agent_code) DO UPDATE
  SET name_en      = EXCLUDED.name_en,
      name_ar      = EXCLUDED.name_ar,
      capabilities = EXCLUDED.capabilities,
      is_active    = TRUE;

-- ── 3. Seed mcp_tool_registry: 30 tools ──
-- Helper macro is just a comment for the reader; we inline values for clarity.

INSERT INTO public.mcp_tool_registry (
  tool_name, display_name_en, display_name_ar, description_en, description_ar,
  agent_id, owner_module_code, domain_code, category, tags, visibility_scope,
  execution_type, handler_key, provider_key, execution_config,
  input_schema, output_schema,
  risk_level, data_classification, sensitivity_level,
  required_permissions, required_roles, allowed_actor_types, allowed_platform_modes,
  requires_tenant_context, requires_user_context,
  approval_mode, approval_config,
  min_autonomy, max_autonomy, default_autonomy,
  human_review_on_error, human_review_on_sensitive_data,
  autonomous_retries_allowed, max_calls_per_min,
  status, version, effective_from,
  is_enabled, is_system, sort_order, created_by
) VALUES
  -- ───── A01 Onboarding Agent ─────────────────────────────────────────────
  ('recommend_frameworks','Recommend Frameworks','توصية الأطر التنظيمية',
   'Reads tenant industry/size/licensing signals and ranks NCA-ECC, SAMA-CSF, PDPL, ISO27001, PCI-DSS with confidence.',
   'يحلل بيانات المنشأة ويرتب الأطر التنظيمية مع درجة الثقة.',
   'A01','onboarding','onboarding','advisory','{shahin-ai,onboarding}','all',
   'internal_service','onboarding.recommendFrameworks','claude','{}'::jsonb,
   '{"type":"object","properties":{"assessmentId":{"type":"string"}},"required":["assessmentId"]}'::jsonb,
   '{"type":"object","properties":{"recommendations":{"type":"array"}}}'::jsonb,
   'low','internal','normal','{onboarding:read}','{tenant_admin}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L2','L2',TRUE,FALSE,2,30,
   'active',1,NOW(),TRUE,TRUE,1,'system'),

  ('seed_workspace','Seed Workspace','تهيئة بيئة العمل',
   'Provisions tenant rows (controls, evidence buckets, role profiles) from selected frameworks.',
   'ينشئ السجلات الأساسية للمستأجر بناءً على الأطر المختارة.',
   'A01','onboarding','onboarding','provisioning','{shahin-ai,write}','internal',
   'job_dispatch','onboarding.seedWorkspace','workspace-seeder',
   '{"async":true,"jobQueue":"workspace-seed"}'::jsonb,
   '{"type":"object","properties":{"frameworks":{"type":"array","items":{"type":"string"}}},"required":["frameworks"]}'::jsonb,
   '{"type":"object","properties":{"provisionId":{"type":"string"},"rowsCreated":{"type":"integer"}}}'::jsonb,
   'high','internal','elevated','{tenant:provision,onboarding:write}','{tenant_admin}','{user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["tenant_admin"]}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,5,
   'active',1,NOW(),TRUE,TRUE,2,'system'),

  ('assess_industry','Assess Industry Profile','تقييم القطاع والحجم',
   'Classifies industry/size/maturity into a tenant profile vector for downstream agents.',
   'يصنف القطاع والحجم والنضج في متجه ملف المستأجر.',
   'A01','onboarding','onboarding','classification','{shahin-ai,onboarding}','all',
   'internal_service','onboarding.assessIndustry','claude','{}'::jsonb,
   '{"type":"object","properties":{"assessmentId":{"type":"string"}},"required":["assessmentId"]}'::jsonb,
   '{"type":"object","properties":{"profile":{"type":"object"}}}'::jsonb,
   'low','internal','normal','{onboarding:read}','{tenant_admin}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L2','L2',TRUE,FALSE,2,30,
   'active',1,NOW(),TRUE,TRUE,3,'system'),

  -- ───── A02 Identity Management Agent ────────────────────────────────────
  ('provision_user','Provision User','إنشاء مستخدم',
   'Creates user in Keycloak and tenant DB, attaches default role profile.',
   'ينشئ مستخدماً في Keycloak ويمنحه ملف الدور الافتراضي.',
   'A02','identity','identity','provisioning','{iam,write}','internal',
   'connector_action','identity.provisionUser','keycloak-admin',
   '{"connector":"keycloak","operation":"create_user"}'::jsonb,
   '{"type":"object","properties":{"email":{"type":"string","format":"email"},"firstName":{"type":"string"},"lastName":{"type":"string"},"roleProfile":{"type":"string"}},"required":["email","roleProfile"]}'::jsonb,
   '{"type":"object","properties":{"userId":{"type":"string"}}}'::jsonb,
   'high','confidential','high','{iam:user:create}','{iam_admin}','{user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["iam_admin"]}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,20,
   'active',1,NOW(),TRUE,TRUE,4,'system'),

  ('assign_role','Assign Role','تعيين دور',
   'Grants role/profile and evaluates SoD policy before commit.',
   'يمنح الدور بعد التحقق من تعارض الواجبات.',
   'A02','identity','identity','authorization','{iam,sod}','internal',
   'internal_service','identity.assignRole','pg-sql',
   '{"sodCheck":true}'::jsonb,
   '{"type":"object","properties":{"userId":{"type":"string"},"roleCode":{"type":"string"}},"required":["userId","roleCode"]}'::jsonb,
   '{"type":"object","properties":{"granted":{"type":"boolean"},"sodViolation":{"type":["string","null"]}}}'::jsonb,
   'high','confidential','high','{iam:role:assign}','{iam_admin}','{user}','{shahin-ai}',
   TRUE,TRUE,'multi_step','{"approvers":["iam_admin","grc_officer"],"reason":"SoD"}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,20,
   'active',1,NOW(),TRUE,TRUE,5,'system'),

  ('enforce_mfa','Enforce MFA','فرض المصادقة الثنائية',
   'Requires MFA factor enrollment; locks login until MFA active.',
   'يفرض تسجيل عامل MFA ويغلق الدخول حتى التفعيل.',
   'A02','identity','identity','security','{iam,mfa}','internal',
   'connector_action','identity.enforceMfa','keycloak-admin',
   '{"connector":"keycloak","operation":"require_mfa"}'::jsonb,
   '{"type":"object","properties":{"userId":{"type":"string"}},"required":["userId"]}'::jsonb,
   '{"type":"object","properties":{"enforced":{"type":"boolean"}}}'::jsonb,
   'medium','internal','elevated','{iam:mfa:enforce}','{iam_admin}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L2','L2',TRUE,FALSE,2,60,
   'active',1,NOW(),TRUE,TRUE,6,'system'),

  -- ───── A03 Framework Mapping Agent ──────────────────────────────────────
  ('cross_map_controls','Cross-Map Controls','الربط المتقاطع للضوابط',
   'Builds N×M control intersection across NCA, SAMA, ISO, PCI, PDPL.',
   'ينشئ مصفوفة الربط بين الأطر التنظيمية.',
   'A03','compliance','mapping','analysis','{compliance,governance}','all',
   'internal_service','frameworks.crossMap','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"frameworks":{"type":"array","items":{"type":"string"}}}}'::jsonb,
   '{"type":"object","properties":{"mappings":{"type":"array"}}}'::jsonb,
   'low','internal','normal','{compliance:read}','{compliance_officer}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L3','L2',TRUE,FALSE,3,15,
   'active',1,NOW(),TRUE,TRUE,7,'system'),

  ('score_confidence','Score Mapping Confidence','تقييم ثقة الربط',
   'Computes embedding-similarity + lexical confidence per control mapping.',
   'يحسب الثقة لكل عملية ربط باستخدام التضمين والقواعد اللغوية.',
   'A03','compliance','mapping','analysis','{compliance,ai}','all',
   'internal_service','frameworks.scoreConfidence','embedding',
   '{"chainsAfter":"cross_map_controls"}'::jsonb,
   '{"type":"object","properties":{"mappingIds":{"type":"array","items":{"type":"string"}}},"required":["mappingIds"]}'::jsonb,
   '{"type":"object","properties":{"scores":{"type":"array","items":{"type":"object","properties":{"mappingId":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1}}}}}}'::jsonb,
   'low','internal','normal','{compliance:read}','{compliance_officer}','{agent}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L3','L2',TRUE,FALSE,3,15,
   'active',1,NOW(),TRUE,TRUE,8,'system'),

  -- ───── A04 Control Authoring Agent ──────────────────────────────────────
  ('author_control','Author Control Draft','صياغة مسودة ضابط',
   'Drafts bilingual control narrative with citations.',
   'يصيغ مسودة ضابط ثنائية اللغة مع المراجع.',
   'A04','controls','controls','authoring','{controls,write}','all',
   'internal_service','controls.authorDraft','claude','{}'::jsonb,
   '{"type":"object","properties":{"frameworkRef":{"type":"string"},"controlCode":{"type":"string"}},"required":["frameworkRef","controlCode"]}'::jsonb,
   '{"type":"object","properties":{"draftId":{"type":"string"},"contentEn":{"type":"string"},"contentAr":{"type":"string"}}}'::jsonb,
   'medium','internal','normal','{controls:write}','{control_owner}','{agent,user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["control_owner"]}'::jsonb,'L0','L2','L1',TRUE,TRUE,2,20,
   'active',1,NOW(),TRUE,TRUE,9,'system'),

  ('draft_test_procedure','Draft Test Procedure','صياغة إجراء اختبار',
   'Generates test steps and required evidence list per control.',
   'ينشئ خطوات الاختبار وقائمة الأدلة المطلوبة.',
   'A04','controls','controls','authoring','{controls,test}','all',
   'internal_service','controls.draftTest','claude','{}'::jsonb,
   '{"type":"object","properties":{"controlId":{"type":"string"}},"required":["controlId"]}'::jsonb,
   '{"type":"object","properties":{"procedureId":{"type":"string"},"steps":{"type":"array"}}}'::jsonb,
   'medium','internal','normal','{controls:write}','{control_owner}','{agent,user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["control_owner"]}'::jsonb,'L0','L2','L1',TRUE,TRUE,2,20,
   'active',1,NOW(),TRUE,TRUE,10,'system'),

  -- ───── A05 Evidence Collection Agent ────────────────────────────────────
  ('collect_evidence','Collect Evidence','جمع الأدلة',
   'Pulls/uploads evidence artefacts and updates control coverage.',
   'يجمع الأدلة ويحدّث تغطية الضوابط.',
   'A05','evidence','evidence','collection','{evidence,write}','all',
   'internal_service','evidence.collect','object-store','{}'::jsonb,
   '{"type":"object","properties":{"controlId":{"type":"string"},"sourceUri":{"type":"string"}},"required":["controlId","sourceUri"]}'::jsonb,
   '{"type":"object","properties":{"evidenceId":{"type":"string"}}}'::jsonb,
   'medium','confidential','elevated','{evidence:write}','{evidence_owner}','{agent,user}','{shahin-ai}',
   TRUE,TRUE,'none','{}'::jsonb,'L1','L2','L1',TRUE,TRUE,2,30,
   'active',1,NOW(),TRUE,TRUE,11,'system'),

  ('analyze_document','Analyze Document','تحليل المستند',
   'Extracts metadata, summary and control references via RAG.',
   'يستخرج البيانات الوصفية والملخص ومراجع الضوابط عبر RAG.',
   'A05','evidence','evidence','rag','{evidence,ai}','all',
   'internal_service','evidence.analyzeDocument','claude','{}'::jsonb,
   '{"type":"object","properties":{"evidenceId":{"type":"string"}},"required":["evidenceId"]}'::jsonb,
   '{"type":"object","properties":{"summary":{"type":"string"},"references":{"type":"array"}}}'::jsonb,
   'medium','confidential','elevated','{evidence:read}','{evidence_owner}','{agent}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L3','L2',TRUE,TRUE,3,30,
   'active',1,NOW(),TRUE,TRUE,12,'system'),

  ('check_freshness','Check Evidence Freshness','فحص حداثة الأدلة',
   'Recomputes is_stale vs policy retention windows.',
   'يعيد احتساب صلاحية الأدلة وفق سياسة الاحتفاظ.',
   'A05','evidence','evidence','monitoring','{evidence,health}','all',
   'internal_service','evidence.checkFreshness','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"controlId":{"type":["string","null"]}}}'::jsonb,
   '{"type":"object","properties":{"stale":{"type":"array"}}}'::jsonb,
   'low','internal','normal','{evidence:read}','{evidence_owner}','{agent}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L2','L3','L3',FALSE,FALSE,3,60,
   'active',1,NOW(),TRUE,TRUE,13,'system'),

  -- ───── A06 Gap Remediation Agent ────────────────────────────────────────
  ('score_priority','Score Remediation Priority','تقييم أولوية المعالجة',
   'Risk-weighted priority for findings = severity × likelihood × asset criticality.',
   'يحسب أولوية المعالجة المرجحة بالمخاطر.',
   'A06','compliance','remediation','analysis','{remediation,risk}','all',
   'internal_service','remediation.scorePriority','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"findingIds":{"type":"array","items":{"type":"string"}}}}'::jsonb,
   '{"type":"object","properties":{"priorities":{"type":"array"}}}'::jsonb,
   'low','internal','normal','{remediation:read}','{compliance_officer}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L2','L3','L2',TRUE,FALSE,3,30,
   'active',1,NOW(),TRUE,TRUE,14,'system'),

  ('generate_roadmap','Generate Remediation Roadmap','إنشاء خارطة المعالجة',
   'Builds phased remediation plan with owners and due dates; writes proposed actions.',
   'ينشئ خطة معالجة مرحلية مع المسؤولين والمواعيد.',
   'A06','compliance','remediation','planning','{remediation,write}','internal',
   'workflow_action','remediation.generateRoadmap','workflow-engine',
   '{"writesProposedActions":true}'::jsonb,
   '{"type":"object","properties":{"findings":{"type":"array"},"horizonDays":{"type":"integer"}},"required":["findings"]}'::jsonb,
   '{"type":"object","properties":{"roadmapId":{"type":"string"},"actions":{"type":"array"}}}'::jsonb,
   'high','internal','elevated','{remediation:write}','{compliance_officer}','{user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["compliance_officer"]}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,10,
   'active',1,NOW(),TRUE,TRUE,15,'system'),

  -- ───── A07 Risk Register Agent ──────────────────────────────────────────
  ('score_risk_5x5','Score Risk (5×5)','تقييم المخاطر 5×5',
   '5×5 likelihood × impact scoring with appetite check.',
   'تقييم 5×5 مع التحقق من شهية المخاطر.',
   'A07','risk','risk','analysis','{risk,read}','all',
   'internal_service','risk.score5x5','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"riskId":{"type":"string"}},"required":["riskId"]}'::jsonb,
   '{"type":"object","properties":{"score":{"type":"integer"},"appetiteBreached":{"type":"boolean"}}}'::jsonb,
   'low','internal','normal','{risk:read}','{risk_officer}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L3','L2',TRUE,FALSE,3,30,
   'active',1,NOW(),TRUE,TRUE,16,'system'),

  ('track_kri','Track KRI','تتبع مؤشرات المخاطر',
   'Computes KRI deltas vs threshold; emits kri_breach event.',
   'يحسب فروقات المؤشرات ويصدر حدث تجاوز العتبة.',
   'A07','risk','risk','monitoring','{risk,kri}','all',
   'internal_service','risk.trackKri','pg-sql',
   '{"emitsSignal":"kri_breach"}'::jsonb,
   '{"type":"object","properties":{"kriIds":{"type":"array","items":{"type":"string"}}}}'::jsonb,
   '{"type":"object","properties":{"breaches":{"type":"array"}}}'::jsonb,
   'medium','internal','elevated','{risk:read}','{risk_officer}','{agent}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L3','L2',TRUE,FALSE,3,60,
   'active',1,NOW(),TRUE,TRUE,17,'system'),

  ('update_register','Update Risk Register','تحديث سجل المخاطر',
   'Mutates risk row (rating, owner, treatment).',
   'يعدل صف المخاطرة (التقييم، المالك، المعالجة).',
   'A07','risk','risk','mutation','{risk,write}','internal',
   'internal_service','risk.updateRegister','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"riskId":{"type":"string"},"patch":{"type":"object"}},"required":["riskId","patch"]}'::jsonb,
   '{"type":"object","properties":{"updated":{"type":"boolean"}}}'::jsonb,
   'high','internal','elevated','{risk:write}','{risk_officer}','{user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["risk_officer"]}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,15,
   'active',1,NOW(),TRUE,TRUE,18,'system'),

  -- ───── A08 Policy Lifecycle Agent ───────────────────────────────────────
  ('draft_policy','Draft Policy','صياغة سياسة',
   'Generates bilingual policy draft from template + selected frameworks.',
   'يصيغ مسودة سياسة ثنائية اللغة من القالب والأطر.',
   'A08','governance','policy','authoring','{policy,write}','all',
   'internal_service','policy.draft','claude','{}'::jsonb,
   '{"type":"object","properties":{"templateId":{"type":"string"},"frameworks":{"type":"array"}},"required":["templateId"]}'::jsonb,
   '{"type":"object","properties":{"policyId":{"type":"string"}}}'::jsonb,
   'medium','internal','normal','{policy:write}','{policy_owner}','{agent,user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["policy_owner"]}'::jsonb,'L0','L2','L1',TRUE,TRUE,2,20,
   'active',1,NOW(),TRUE,TRUE,19,'system'),

  ('run_approval','Run Policy Approval','تشغيل اعتماد السياسة',
   'Starts approval workflow; uses board-level gate for critical policies.',
   'يبدأ سير اعتماد السياسة، مع لجنة عليا للسياسات الحرجة.',
   'A08','governance','policy','workflow','{policy,approval}','internal',
   'workflow_action','policy.runApproval','workflow-engine',
   '{"workflowCode":"policy-approval-flow"}'::jsonb,
   '{"type":"object","properties":{"policyId":{"type":"string"},"criticality":{"type":"string","enum":["normal","high","critical"]}},"required":["policyId"]}'::jsonb,
   '{"type":"object","properties":{"workflowInstanceId":{"type":"string"}}}'::jsonb,
   'high','internal','elevated','{policy:approve}','{policy_owner,board_member}','{user}','{shahin-ai}',
   TRUE,TRUE,'risk_based','{"mapping":{"normal":"single","high":"multi_step","critical":"manual_gate"}}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,10,
   'active',1,NOW(),TRUE,TRUE,20,'system'),

  ('distribute_policy','Distribute Policy','توزيع السياسة',
   'Pushes published policy to acknowledgement queue.',
   'يوزع السياسة المعتمدة على طابور الإقرار.',
   'A08','governance','policy','distribution','{policy,write}','internal',
   'internal_service','policy.distribute','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"policyId":{"type":"string"},"audience":{"type":"array"}},"required":["policyId"]}'::jsonb,
   '{"type":"object","properties":{"distributedTo":{"type":"integer"}}}'::jsonb,
   'medium','internal','elevated','{policy:distribute}','{policy_owner}','{user}','{shahin-ai}',
   TRUE,TRUE,'none','{}'::jsonb,'L1','L2','L1',TRUE,TRUE,2,15,
   'active',1,NOW(),TRUE,TRUE,21,'system'),

  -- ───── A09 Third-Party Risk Agent ───────────────────────────────────────
  ('run_ddq','Run Vendor DDQ','تشغيل استبيان العناية الواجبة',
   'Sends due-diligence questionnaire and ingests responses.',
   'يرسل استبيان العناية الواجبة ويستقبل الإجابات.',
   'A09','vendor','vendor','assessment','{vendor,write}','all',
   'workflow_action','vendor.runDdq','workflow-engine',
   '{"workflowCode":"vendor-ddq-flow"}'::jsonb,
   '{"type":"object","properties":{"vendorId":{"type":"string"},"templateId":{"type":"string"}},"required":["vendorId","templateId"]}'::jsonb,
   '{"type":"object","properties":{"workflowInstanceId":{"type":"string"}}}'::jsonb,
   'medium','restricted','elevated','{vendor:write}','{vendor_owner}','{user}','{shahin-ai}',
   TRUE,TRUE,'none','{}'::jsonb,'L1','L2','L1',TRUE,TRUE,2,15,
   'active',1,NOW(),TRUE,TRUE,22,'system'),

  ('monitor_sla','Monitor Vendor SLA','مراقبة اتفاقيات الخدمة',
   'Tracks SLA breach windows from contract metadata.',
   'يتتبع نوافذ مخالفة اتفاقيات الخدمة.',
   'A09','vendor','vendor','monitoring','{vendor,sla}','all',
   'internal_service','vendor.monitorSla','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"vendorId":{"type":["string","null"]}}}'::jsonb,
   '{"type":"object","properties":{"breaches":{"type":"array"}}}'::jsonb,
   'low','restricted','elevated','{vendor:read}','{vendor_owner}','{agent}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L2','L3','L3',FALSE,FALSE,3,60,
   'active',1,NOW(),TRUE,TRUE,23,'system'),

  ('score_vendor','Score Vendor Risk','تقييم مخاطر المورد',
   'Computes vendor risk score (financial + cyber + compliance).',
   'يحسب درجة مخاطر المورد المالية والسيبرانية والامتثالية.',
   'A09','vendor','vendor','analysis','{vendor,risk}','all',
   'internal_service','vendor.score','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"vendorId":{"type":"string"}},"required":["vendorId"]}'::jsonb,
   '{"type":"object","properties":{"score":{"type":"integer"}}}'::jsonb,
   'medium','restricted','elevated','{vendor:read}','{vendor_owner}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L3','L2',TRUE,FALSE,3,30,
   'active',1,NOW(),TRUE,TRUE,24,'system'),

  -- ───── A10 Audit Reporting Agent ────────────────────────────────────────
  ('generate_regulator_pack','Generate Regulator Pack','إنشاء حزمة الجهة الرقابية',
   'Produces regulator-ready bilingual PDF/Excel pack with signed artefact.',
   'ينتج حزمة جاهزة للجهة الرقابية بصيغ PDF و Excel.',
   'A10','audit','audit','reporting','{audit,export}','all',
   'job_dispatch','audit.generateRegulatorPack','export-engine',
   '{"async":true,"jobQueue":"regulator-pack","emitsEvent":"audit.export.completed"}'::jsonb,
   '{"type":"object","properties":{"regulator":{"type":"string","enum":["NCA","SAMA","SDAIA","CMA","CST"]},"frameworkRef":{"type":"string"}},"required":["regulator"]}'::jsonb,
   '{"type":"object","properties":{"packId":{"type":"string"},"signedUrl":{"type":"string"}}}'::jsonb,
   'high','confidential','high','{audit:export}','{audit_lead}','{user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["audit_lead"]}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,5,
   'active',1,NOW(),TRUE,TRUE,25,'system'),

  ('build_exec_dashboard','Build Executive Dashboard','بناء اللوحة التنفيذية',
   'Refreshes executive dashboard widgets.',
   'يحدّث ودجات اللوحة التنفيذية.',
   'A10','audit','audit','reporting','{audit,dashboard}','all',
   'http_proxy','audit.buildExecDashboard','dashboard-widgets-service',
   '{"endpoint":"/internal/refresh"}'::jsonb,
   '{"type":"object"}'::jsonb,
   '{"type":"object","properties":{"refreshedAt":{"type":"string","format":"date-time"}}}'::jsonb,
   'low','internal','normal','{audit:read}','{audit_lead,executive}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L1','L3','L2',TRUE,FALSE,3,30,
   'active',1,NOW(),TRUE,TRUE,26,'system'),

  -- ───── A11 Business Continuity Agent ────────────────────────────────────
  ('run_bia','Run BIA','تشغيل تحليل الأثر',
   'Executes Business Impact Analysis cycle.',
   'يشغل دورة تحليل أثر الأعمال.',
   'A11','bcp','bcp','assessment','{bcp,write}','all',
   'workflow_action','bcp.runBia','workflow-engine',
   '{"workflowCode":"bcp-bia-flow"}'::jsonb,
   '{"type":"object","properties":{"scope":{"type":"string"}},"required":["scope"]}'::jsonb,
   '{"type":"object","properties":{"workflowInstanceId":{"type":"string"}}}'::jsonb,
   'medium','internal','elevated','{bcp:write}','{bcp_owner}','{user}','{shahin-ai}',
   TRUE,TRUE,'none','{}'::jsonb,'L1','L2','L1',TRUE,TRUE,2,10,
   'active',1,NOW(),TRUE,TRUE,27,'system'),

  ('track_rto_rpo','Track RTO/RPO','تتبع RTO و RPO',
   'Continuously checks RTO/RPO compliance vs targets.',
   'يتحقق باستمرار من الامتثال لـ RTO و RPO.',
   'A11','bcp','bcp','monitoring','{bcp,health}','all',
   'internal_service','bcp.trackRtoRpo','pg-sql','{}'::jsonb,
   '{"type":"object"}'::jsonb,
   '{"type":"object","properties":{"breaches":{"type":"array"}}}'::jsonb,
   'low','internal','normal','{bcp:read}','{bcp_owner}','{agent}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L2','L3','L3',FALSE,FALSE,3,60,
   'active',1,NOW(),TRUE,TRUE,28,'system'),

  ('schedule_exercise','Schedule BCP Exercise','جدولة تمرين الاستمرارية',
   'Schedules a BCP exercise via Temporal cron.',
   'يجدول تمرين استمرارية الأعمال عبر Temporal.',
   'A11','bcp','bcp','scheduling','{bcp,temporal}','internal',
   'connector_action','bcp.scheduleExercise','temporal',
   '{"connector":"temporal","operation":"create_schedule"}'::jsonb,
   '{"type":"object","properties":{"exerciseId":{"type":"string"},"cron":{"type":"string"}},"required":["exerciseId","cron"]}'::jsonb,
   '{"type":"object","properties":{"scheduleId":{"type":"string"}}}'::jsonb,
   'medium','internal','elevated','{bcp:write}','{bcp_owner}','{user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["bcp_owner"]}'::jsonb,'L0','L1','L1',TRUE,TRUE,2,10,
   'active',1,NOW(),TRUE,TRUE,29,'system'),

  -- ───── A12 Training & Awareness Agent ───────────────────────────────────
  ('assign_training','Assign Training','تعيين تدريب',
   'Bulk-assigns training to users; honors campaign auto-remediation.',
   'يعين تدريباً جماعياً مع المعالجة التلقائية للحملات.',
   'A12','training','training','assignment','{training,write}','all',
   'internal_service','training.assign','pg-sql',
   '{"chainsFrom":"run_phishing_sim"}'::jsonb,
   '{"type":"object","properties":{"trainingId":{"type":"string"},"userIds":{"type":"array","items":{"type":"string"}}},"required":["trainingId","userIds"]}'::jsonb,
   '{"type":"object","properties":{"assigned":{"type":"integer"}}}'::jsonb,
   'medium','internal','elevated','{training:write}','{training_owner}','{user,agent}','{shahin-ai}',
   TRUE,TRUE,'none','{}'::jsonb,'L1','L2','L1',TRUE,TRUE,2,30,
   'active',1,NOW(),TRUE,TRUE,30,'system'),

  ('run_phishing_sim','Run Phishing Simulation','تشغيل محاكاة التصيد',
   'Launches phishing simulation campaign and tracks click metrics.',
   'يطلق حملة محاكاة تصيد ويتتبع معدلات النقر.',
   'A12','training','training','simulation','{training,phishing}','internal',
   'workflow_action','training.runPhishingSim','workflow-engine',
   '{"workflowCode":"phishing-simulation-flow","emitsSignal":"phishing_clicked"}'::jsonb,
   '{"type":"object","properties":{"campaignId":{"type":"string"}},"required":["campaignId"]}'::jsonb,
   '{"type":"object","properties":{"workflowInstanceId":{"type":"string"}}}'::jsonb,
   'high','internal','elevated','{training:phishing}','{training_owner}','{user}','{shahin-ai}',
   TRUE,TRUE,'single','{"approvers":["training_owner"]}'::jsonb,'L0','L1','L1',TRUE,TRUE,1,5,
   'active',1,NOW(),TRUE,TRUE,31,'system'),

  ('track_completion','Track Training Completion','تتبع إكمال التدريب',
   'Aggregates completion stats per user/team.',
   'يجمع إحصاءات الإكمال على مستوى المستخدم والفريق.',
   'A12','training','training','reporting','{training,read}','all',
   'internal_service','training.trackCompletion','pg-sql','{}'::jsonb,
   '{"type":"object","properties":{"campaignId":{"type":["string","null"]}}}'::jsonb,
   '{"type":"object","properties":{"completionRate":{"type":"number"}}}'::jsonb,
   'low','internal','normal','{training:read}','{training_owner}','{agent,user}','{shahin-ai}',
   TRUE,FALSE,'none','{}'::jsonb,'L2','L3','L3',FALSE,FALSE,3,60,
   'active',1,NOW(),TRUE,TRUE,32,'system')

ON CONFLICT (tool_name) DO UPDATE SET
  display_name_en = EXCLUDED.display_name_en,
  display_name_ar = EXCLUDED.display_name_ar,
  description_en  = EXCLUDED.description_en,
  description_ar  = EXCLUDED.description_ar,
  agent_id        = EXCLUDED.agent_id,
  owner_module_code = EXCLUDED.owner_module_code,
  domain_code     = EXCLUDED.domain_code,
  category        = EXCLUDED.category,
  tags            = EXCLUDED.tags,
  visibility_scope = EXCLUDED.visibility_scope,
  execution_type  = EXCLUDED.execution_type,
  handler_key     = EXCLUDED.handler_key,
  provider_key    = EXCLUDED.provider_key,
  execution_config = EXCLUDED.execution_config,
  input_schema    = EXCLUDED.input_schema,
  output_schema   = EXCLUDED.output_schema,
  risk_level      = EXCLUDED.risk_level,
  data_classification = EXCLUDED.data_classification,
  sensitivity_level = EXCLUDED.sensitivity_level,
  required_permissions = EXCLUDED.required_permissions,
  required_roles  = EXCLUDED.required_roles,
  allowed_actor_types = EXCLUDED.allowed_actor_types,
  allowed_platform_modes = EXCLUDED.allowed_platform_modes,
  requires_tenant_context = EXCLUDED.requires_tenant_context,
  requires_user_context = EXCLUDED.requires_user_context,
  approval_mode   = EXCLUDED.approval_mode,
  approval_config = EXCLUDED.approval_config,
  min_autonomy    = EXCLUDED.min_autonomy,
  max_autonomy    = EXCLUDED.max_autonomy,
  default_autonomy = EXCLUDED.default_autonomy,
  human_review_on_error = EXCLUDED.human_review_on_error,
  human_review_on_sensitive_data = EXCLUDED.human_review_on_sensitive_data,
  autonomous_retries_allowed = EXCLUDED.autonomous_retries_allowed,
  max_calls_per_min = EXCLUDED.max_calls_per_min,
  status          = EXCLUDED.status,
  is_enabled      = EXCLUDED.is_enabled,
  sort_order      = EXCLUDED.sort_order,
  updated_at      = NOW();

-- ── 4. Seed dos.ai_workflow_triggers (signal → workflow) ──
INSERT INTO dos.ai_workflow_triggers (trigger_id, tenant_id, module, signal, rule, workflow_code, enabled)
VALUES
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','risk',      'kri_breach',        '{"agentId":"A07"}'::jsonb,'risk-treatment-flow',     TRUE),
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','evidence',  'evidence_stale',    '{"agentId":"A05"}'::jsonb,'evidence-refresh-flow',   TRUE),
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','policy',    'policy_drafted',    '{"agentId":"A08"}'::jsonb,'policy-approval-flow',    TRUE),
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','training',  'phishing_clicked',  '{"agentId":"A12","chain":"assign_training"}'::jsonb,'phishing-remediation-flow', TRUE),
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','controls',  'control_drafted',   '{"agentId":"A04"}'::jsonb,'control-publish-approval', TRUE),
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','vendor',    'vendor_score_low',  '{"agentId":"A09"}'::jsonb,'vendor-treatment-flow',   TRUE),
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','bcp',       'rto_rpo_breach',    '{"agentId":"A11"}'::jsonb,'bcp-recovery-flow',       TRUE),
  (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','remediation','findings_received','{"agentId":"A06"}'::jsonb,'remediation-roadmap-flow',TRUE)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run manually after apply):
--   SELECT agent_id, COUNT(*) FROM public.mcp_tool_registry WHERE agent_id ~ '^A[0-9]{2}$' GROUP BY agent_id ORDER BY agent_id;
--   SELECT agent_code, is_active FROM dos.ai_agent_registry ORDER BY agent_code;
--   SELECT module, signal, workflow_code FROM dos.ai_workflow_triggers ORDER BY module;
-- ============================================================================
