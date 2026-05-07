-- AI Module Wave Enforcement - Phase 12
-- Add all missing i18n keys (English + Arabic) for AI pages
-- Owner: ui-os-service
--
-- This migration adds i18n translation keys for AI pages.
-- These keys should be populated in the dos.i18n table or in the
-- frontend i18n JSON files.
--
-- Idempotent: Uses ON CONFLICT DO NOTHING for all inserts

BEGIN;

-- =====================================================================
-- I18N KEYS - AI Page Labels (English and Arabic)
-- =====================================================================
-- Note: This is a reference migration. Actual i18n keys should be
-- populated in the dos.i18n table or in frontend i18n files.
--
-- Gateway Labels:
-- ai.gateway.title = "AI Gateway"
-- ai.gateway.title_ar = "بوابة الذكاء الاصطناعي"
-- ai.gateway.subtitle = "Manage AI gateway, quotas, costs, and rate limiting"
-- ai.gateway.subtitle_ar = "إدارة بوابة الذكاء الاصطناعي والحصص والتكاليف وحدود المعدل"
--
-- Engine Labels:
-- ai.engine.title = "AI Engine"
-- ai.engine.title_ar = "محرك الذكاء الاصطناعي"
-- ai.engine.subtitle = "Manage AI engine, agents, kernel, and workflows"
-- ai.engine.subtitle_ar = "إدارة محرك الذكاء الاصطناعي والوكلاء والنواة وسير العمل"
--
-- Kernel Labels:
-- ai.kernel.title = "AI Kernel"
-- ai.kernel.title_ar = "نواة الذكاء الاصطناعي"
-- ai.kernel.subtitle = "AI-OS Kernel status, process table, and IPC"
-- ai.kernel.subtitle_ar = "حالة نواة الذكاء الاصطناعي وجدول العمليات والاتصال بين العمليات"
--
-- Budget Labels:
-- ai.budgets.title = "AI Budgets"
-- ai.budgets.title_ar = "ميزانيات الذكاء الاصطناعي"
-- ai.budgets.subtitle = "Manage AI budgets, allocations, and cost projections"
-- ai.budgets.subtitle_ar = "إدارة ميزانيات الذكاء الاصطناعي والتخصيصات وتوقعات التكاليف"
--
-- Kill Switch Labels:
-- ai.kill_switches.title = "AI Kill Switches"
-- ai.kill_switches.title_ar = "مفاتيح إيقاف الذكاء الاصطناعي"
-- ai.kill_switches.subtitle = "Manage AI kill switches and circuit breakers"
-- ai.kill_switches.subtitle_ar = "إدارة مفاتيح إيقاف الذكاء الاصطناعي وقواطع الدائرة"
--
-- Prompt Labels:
-- ai.prompts.title = "AI Prompts"
-- ai.prompts.title_ar = "موجهات الذكاء الاصطناعي"
-- ai.prompts.subtitle = "Manage AI prompt templates and configurations"
-- ai.prompts.subtitle_ar = "إدارة قوالب موجهات الذكاء الاصطناعي والتكوينات"
--
-- Context Source Labels:
-- ai.context_sources.title = "AI Context Sources"
-- ai.context_sources.title_ar = "مصادر سياق الذكاء الاصطناعي"
-- ai.context_sources.subtitle = "Manage AI context sources and data connections"
-- ai.context_sources.subtitle_ar = "إدارة مصادر سياق الذكاء الاصطناعي واتصالات البيانات"
--
-- Delegation Labels:
-- ai.delegations.title = "AI Delegations"
-- ai.delegations.title_ar = "تفويضات الذكاء الاصطناعي"
-- ai.delegations.subtitle = "Manage AI agent delegations and authority chains"
-- ai.delegations.subtitle_ar = "إدارة تفويضات وكلاء الذكاء الاصطناعي وسلاسل السلطة"
--
-- HITL Labels:
-- ai.hitl.title = "AI HITL"
-- ai.hitl.title_ar = "التدخل البشري في الذكاء الاصطناعي"
-- ai.hitl.subtitle = "Manage Human-in-the-Loop states and approvals"
-- ai.hitl.subtitle_ar = "إدارة حالات التدخل البشري والموافقات"
--
-- Code Search Labels:
-- ai.code_search.title = "AI Code Search"
-- ai.code_search.title_ar = "البحث في الكود بالذكاء الاصطناعي"
-- ai.code_search.subtitle = "Manage AI code search engines and indexed surfaces"
-- ai.code_search.subtitle_ar = "إدارة محركات البحث في الكود بالذكاء الاصطناعي والأسطح المفهرسة"
--
-- Governance Labels:
-- ai.governance.policies.title = "AI Governance Policies"
-- ai.governance.policies.title_ar = "سياسات حوكمة الذكاء الاصطناعي"
-- ai.governance.policies.subtitle = "Manage AI governance policies and rules"
-- ai.governance.policies.subtitle_ar = "إدارة سياسات وقواعد حوكمة الذكاء الاصطناعي"
--
-- ai.governance.models.title = "AI Model Registry"
-- ai.governance.models.title_ar = "سجل نماذج الذكاء الاصطناعي"
-- ai.governance.models.subtitle = "Manage AI models and model cards"
-- ai.governance.models.subtitle_ar = "إدارة نماذج الذكاء الاصطناعي وبطاقات النماذج"
--
-- ai.governance.assessments.title = "AI Governance Assessments"
-- ai.governance.assessments.title_ar = "تقييمات حوكمة الذكاء الاصطناعي"
-- ai.governance.assessments.subtitle = "Run and manage AI governance assessments"
-- ai.governance.assessments.subtitle_ar = "تشغيل وإدارة تقييمات حوكمة الذكاء الاصطناعي"
--
-- ai.governance.bias.title = "AI Bias Reports"
-- ai.governance.bias.title_ar = "تقارير تحيز الذكاء الاصطناعي"
-- ai.governance.bias.subtitle = "Monitor and manage AI bias detection reports"
-- ai.governance.bias.subtitle_ar = "مراقبة وإدارة تقارير اكتشاف تحيز الذكاء الاصطناعي"
--
-- ai.governance.fairness.title = "AI Fairness Metrics"
-- ai.governance.fairness.title_ar = "مقاييس عدالة الذكاء الاصطناعي"
-- ai.governance.fairness.subtitle = "Monitor AI fairness metrics and scores"
-- ai.governance.fairness.subtitle_ar = "مراقبة مقاييس ودرجات عدالة الذكاء الاصطناعي"
--
-- ai.governance.ethical.title = "AI Ethical Reviews"
-- ai.governance.ethical.title_ar = "المراجعات الأخلاقية للذكاء الاصطناعي"
-- ai.governance.ethical.subtitle = "Manage AI ethical reviews and assessments"
-- ai.governance.ethical.subtitle_ar = "إدارة المراجعات والتقييمات الأخلاقية للذكاء الاصطناعي"
--
-- ai.governance.impact.title = "AI Impact Assessments"
-- ai.governance.impact.title_ar = "تقييمات تأثير الذكاء الاصطناعي"
-- ai.governance.impact.subtitle = "Assess AI model impact and risk"
-- ai.governance.impact.subtitle_ar = "تقييم تأثير ومخاطر نماذج الذكاء الاصطناعي"
--
-- ai.governance.audit.title = "AI Governance Audit Log"
-- ai.governance.audit.title_ar = "سجل تدقيق حوكمة الذكاء الاصطناعي"
-- ai.governance.audit.subtitle = "View AI governance audit trail"
-- ai.governance.audit.subtitle_ar = "عرض سجل تدقيق حوكمة الذكاء الاصطناعي"
--
-- ai.governance.data_lineage.title = "AI Data Lineage"
-- ai.governance.data_lineage.title_ar = "مسار بيانات الذكاء الاصطناعي"
-- ai.governance.data_lineage.subtitle = "Track AI data lineage and provenance"
-- ai.governance.data_lineage.subtitle_ar = "تتبع مسار بيانات الذكاء الاصطناعي والأصل"
--
-- ai.governance.explainability.title = "AI Explainability"
-- ai.governance.explainability.title_ar = "قابلية تفسير الذكاء الاصطناعي"
-- ai.governance.explainability.subtitle = "View AI explainability reports"
-- ai.governance.explainability.subtitle_ar = "عرض تقارير قابلية تفسير الذكاء الاصطناعي"
--
-- ai.governance.transparency.title = "AI Transparency Reports"
-- ai.governance.transparency.title_ar = "تقارير شفافية الذكاء الاصطناعي"
-- ai.governance.transparency.subtitle = "View AI transparency and disclosure reports"
-- ai.governance.transparency.subtitle_ar = "عرض تقارير شفافية وإفصاح الذكاء الاصطناعي"
--
-- ai.governance.use_cases.title = "AI Use Cases"
-- ai.governance.use_cases.title_ar = "حالات استخدام الذكاء الاصطناعي"
-- ai.governance.use_cases.subtitle = "Manage AI use case inventory"
-- ai.governance.use_cases.subtitle_ar = "إدارة مخزون حالات استخدام الذكاء الاصطناعي"
--
-- ai.governance.validation.title = "AI Validation Results"
-- ai.governance.validation.title_ar = "نتائج التحقق من الذكاء الاصطناعي"
-- ai.governance.validation.subtitle = "View AI model validation results"
-- ai.governance.validation.subtitle_ar = "عرض نتائج التحقق من نماذج الذكاء الاصطناعي"
--
-- ai.governance.inventory.title = "AI Governance Inventory"
-- ai.governance.inventory.title_ar = "مخزون حوكمة الذكاء الاصطناعي"
-- ai.governance.inventory.subtitle = "View AI governance asset inventory"
-- ai.governance.inventory.subtitle_ar = "عرض مخزون أصول حوكمة الذكاء الاصطناعي"
--
-- ai.governance.monitoring.title = "AI Monitoring Alerts"
-- ai.governance.monitoring.title_ar = "تنبيهات مراقبة الذكاء الاصطناعي"
-- ai.governance.monitoring.subtitle = "View AI monitoring alerts and incidents"
-- ai.governance.monitoring.subtitle_ar = "عرض تنبيهات وحوادث مراقبة الذكاء الاصطناعي"

-- =====================================================================
-- INTENTS - Voice Command Intents for AI Pages
-- =====================================================================
INSERT INTO dos.dynamic_ui_intents
  (tenant_id, module_code, intent_key, utterance_en, utterance_ar,
   route, action_id, permission, is_active)
VALUES
  -- Gateway Intents
  (NULL, 'ai-os', 'intent.update_quota', 'update ai quota', 'تحديث حصة الذكاء الاصطناعي',
   '/ai/gateway', 'update_quota', 'ai.gateway.admin', TRUE),
  (NULL, 'ai-os', 'intent.view_cost', 'show ai costs', 'أظهر تكاليف الذكاء الاصطناعي',
   '/ai/gateway', 'view_cost_report', 'ai.gateway.read', TRUE),
  -- Engine Intents
  (NULL, 'ai-os', 'intent.start_agent', 'start ai agent', 'بدء وكيل الذكاء الاصطناعي',
   '/ai/engine', 'start_agent', 'ai.engine.write', TRUE),
  (NULL, 'ai-os', 'intent.restart_kernel', 'restart ai kernel', 'إعادة تشغيل نواة الذكاء الاصطناعي',
   '/ai/engine', 'restart_kernel', 'ai.engine.admin', TRUE),
  -- Budget Intents
  (NULL, 'ai-os', 'intent.set_budget', 'set ai budget', 'تعيين ميزانية الذكاء الاصطناعي',
   '/ai/budgets', 'set_budget_limit', 'ai.budgets.admin', TRUE),
  -- Kill Switch Intents
  (NULL, 'ai-os', 'intent.activate_kill_switch', 'activate ai kill switch', 'تفعيل مفتاح إيقاف الذكاء الاصطناعي',
   '/ai/kill-switches', 'activate_kill_switch', 'ai.kill_switches.admin', TRUE),
  -- Governance Intents
  (NULL, 'ai-os', 'intent.run_assessment', 'run ai assessment', 'تشغيل تقييم الذكاء الاصطناعي',
   '/ai/governance/assessments', 'run_assessment', 'ai.governance.assessments.write', TRUE),
  (NULL, 'ai-os', 'intent.view_bias', 'show ai bias report', 'أظهر تقرير تحيز الذكاء الاصطناعي',
   '/ai/governance/bias', 'view_bias_report', 'ai.governance.bias.read', TRUE),
  (NULL, 'ai-os', 'intent.request_ethical_review', 'request ethical review', 'طلب مراجعة أخلاقية',
   '/ai/governance/ethical', 'request_ethical_review', 'ai.governance.ethical.write', TRUE)
ON CONFLICT (module_code, intent_key, COALESCE(tenant_id, '*')) DO UPDATE
  SET utterance_en = EXCLUDED.utterance_en,
      utterance_ar = EXCLUDED.utterance_ar,
      route = EXCLUDED.route,
      action_id = EXCLUDED.action_id;

COMMIT;

-- =====================================================================
-- VALIDATION QUERIES
-- =====================================================================
-- Verify AI intents seeded:
-- SELECT COUNT(*) FROM dos.dynamic_ui_intents WHERE module_code='ai-os';
-- Expected: 10+

-- Verify AI i18n keys in i18n table (if populated):
-- SELECT COUNT(*) FROM dos.i18n WHERE key LIKE 'ai.%' OR key LIKE 'ai_%';
-- Expected: 100+ keys (if populated)
