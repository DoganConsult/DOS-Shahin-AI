-- Wave R2 — AI i18n real seed (replaces phase 12 comment-only doc).
-- Publisher-locked rows in dos.workspace_shell_i18n. Idempotent via
-- ON CONFLICT (key, locale) DO UPDATE SET value=EXCLUDED.value.
-- Doctrine: AGENTS.md "If runtime needs it, UI-OS resolves it from DB."

BEGIN;

SET LOCAL dos.publisher_session = 'contract-publisher@v1';

INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value, module_code) VALUES
  -- Gateway
  ('ai', 'ai.gateway.title',                      'en', 'AI Gateway',                                                          'ai-os'),
  ('ai', 'ai.gateway.title',                      'ar', 'بوابة الذكاء الاصطناعي',                                                'ai-os'),
  ('ai', 'ai.gateway.subtitle',                   'en', 'Manage AI gateway, quotas, costs, and rate limiting',                 'ai-os'),
  ('ai', 'ai.gateway.subtitle',                   'ar', 'إدارة بوابة الذكاء الاصطناعي والحصص والتكاليف وحدود المعدل',             'ai-os'),
  -- Engine
  ('ai', 'ai.engine.title',                       'en', 'AI Engine',                                                           'ai-os'),
  ('ai', 'ai.engine.title',                       'ar', 'محرك الذكاء الاصطناعي',                                                'ai-os'),
  ('ai', 'ai.engine.subtitle',                    'en', 'Manage AI engine, agents, kernel, and workflows',                     'ai-os'),
  ('ai', 'ai.engine.subtitle',                    'ar', 'إدارة محرك الذكاء الاصطناعي والوكلاء والنواة وسير العمل',                  'ai-os'),
  -- Kernel
  ('ai', 'ai.kernel.title',                       'en', 'AI Kernel',                                                           'ai-os'),
  ('ai', 'ai.kernel.title',                       'ar', 'نواة الذكاء الاصطناعي',                                                'ai-os'),
  ('ai', 'ai.kernel.subtitle',                    'en', 'AI-OS Kernel status, process table, and IPC',                          'ai-os'),
  ('ai', 'ai.kernel.subtitle',                    'ar', 'حالة نواة الذكاء الاصطناعي وجدول العمليات والاتصال بين العمليات',           'ai-os'),
  -- Budgets
  ('ai', 'ai.budgets.title',                      'en', 'AI Budgets',                                                          'ai-os'),
  ('ai', 'ai.budgets.title',                      'ar', 'ميزانيات الذكاء الاصطناعي',                                             'ai-os'),
  ('ai', 'ai.budgets.subtitle',                   'en', 'Manage AI budgets, allocations, and cost projections',                'ai-os'),
  ('ai', 'ai.budgets.subtitle',                   'ar', 'إدارة ميزانيات الذكاء الاصطناعي والتخصيصات وتوقعات التكاليف',              'ai-os'),
  -- Kill switches
  ('ai', 'ai.kill_switches.title',                'en', 'AI Kill Switches',                                                    'ai-os'),
  ('ai', 'ai.kill_switches.title',                'ar', 'مفاتيح إيقاف الذكاء الاصطناعي',                                          'ai-os'),
  ('ai', 'ai.kill_switches.subtitle',             'en', 'Manage AI kill switches and circuit breakers',                        'ai-os'),
  ('ai', 'ai.kill_switches.subtitle',             'ar', 'إدارة مفاتيح إيقاف الذكاء الاصطناعي وقواطع الدائرة',                      'ai-os'),
  -- Prompts
  ('ai', 'ai.prompts.title',                      'en', 'AI Prompts',                                                          'ai-os'),
  ('ai', 'ai.prompts.title',                      'ar', 'موجهات الذكاء الاصطناعي',                                              'ai-os'),
  ('ai', 'ai.prompts.subtitle',                   'en', 'Manage AI prompt templates and configurations',                        'ai-os'),
  ('ai', 'ai.prompts.subtitle',                   'ar', 'إدارة قوالب موجهات الذكاء الاصطناعي والتكوينات',                          'ai-os'),
  -- Context sources
  ('ai', 'ai.context_sources.title',              'en', 'AI Context Sources',                                                  'ai-os'),
  ('ai', 'ai.context_sources.title',              'ar', 'مصادر سياق الذكاء الاصطناعي',                                          'ai-os'),
  ('ai', 'ai.context_sources.subtitle',           'en', 'Manage AI context sources and data connections',                       'ai-os'),
  ('ai', 'ai.context_sources.subtitle',           'ar', 'إدارة مصادر سياق الذكاء الاصطناعي واتصالات البيانات',                     'ai-os'),
  -- Delegations
  ('ai', 'ai.delegations.title',                  'en', 'AI Delegations',                                                      'ai-os'),
  ('ai', 'ai.delegations.title',                  'ar', 'تفويضات الذكاء الاصطناعي',                                              'ai-os'),
  ('ai', 'ai.delegations.subtitle',               'en', 'Manage AI agent delegations and authority chains',                     'ai-os'),
  ('ai', 'ai.delegations.subtitle',               'ar', 'إدارة تفويضات وكلاء الذكاء الاصطناعي وسلاسل السلطة',                      'ai-os'),
  -- HITL
  ('ai', 'ai.hitl.title',                         'en', 'AI HITL',                                                             'ai-os'),
  ('ai', 'ai.hitl.title',                         'ar', 'التدخل البشري في الذكاء الاصطناعي',                                     'ai-os'),
  ('ai', 'ai.hitl.subtitle',                      'en', 'Manage Human-in-the-Loop states and approvals',                        'ai-os'),
  ('ai', 'ai.hitl.subtitle',                      'ar', 'إدارة حالات التدخل البشري والموافقات',                                    'ai-os'),
  -- Code search
  ('ai', 'ai.code_search.title',                  'en', 'AI Code Search',                                                      'ai-os'),
  ('ai', 'ai.code_search.title',                  'ar', 'البحث في الكود بالذكاء الاصطناعي',                                       'ai-os'),
  ('ai', 'ai.code_search.subtitle',               'en', 'Manage AI code search engines and indexed surfaces',                   'ai-os'),
  ('ai', 'ai.code_search.subtitle',               'ar', 'إدارة محركات البحث في الكود بالذكاء الاصطناعي والأسطح المفهرسة',           'ai-os'),
  -- Governance — policies
  ('ai', 'ai.governance.policies.title',          'en', 'AI Governance Policies',                                              'ai-os'),
  ('ai', 'ai.governance.policies.title',          'ar', 'سياسات حوكمة الذكاء الاصطناعي',                                         'ai-os'),
  ('ai', 'ai.governance.policies.subtitle',       'en', 'Manage AI governance policies and rules',                              'ai-os'),
  ('ai', 'ai.governance.policies.subtitle',       'ar', 'إدارة سياسات وقواعد حوكمة الذكاء الاصطناعي',                              'ai-os'),
  -- Governance — models
  ('ai', 'ai.governance.models.title',            'en', 'AI Model Registry',                                                   'ai-os'),
  ('ai', 'ai.governance.models.title',            'ar', 'سجل نماذج الذكاء الاصطناعي',                                            'ai-os'),
  ('ai', 'ai.governance.models.subtitle',         'en', 'Manage AI models and model cards',                                     'ai-os'),
  ('ai', 'ai.governance.models.subtitle',         'ar', 'إدارة نماذج الذكاء الاصطناعي وبطاقات النماذج',                            'ai-os'),
  -- Governance — assessments
  ('ai', 'ai.governance.assessments.title',       'en', 'AI Governance Assessments',                                           'ai-os'),
  ('ai', 'ai.governance.assessments.title',       'ar', 'تقييمات حوكمة الذكاء الاصطناعي',                                        'ai-os'),
  ('ai', 'ai.governance.assessments.subtitle',    'en', 'Run and manage AI governance assessments',                             'ai-os'),
  ('ai', 'ai.governance.assessments.subtitle',    'ar', 'تشغيل وإدارة تقييمات حوكمة الذكاء الاصطناعي',                            'ai-os'),
  -- Governance — bias
  ('ai', 'ai.governance.bias.title',              'en', 'AI Bias Reports',                                                     'ai-os'),
  ('ai', 'ai.governance.bias.title',              'ar', 'تقارير تحيز الذكاء الاصطناعي',                                          'ai-os'),
  ('ai', 'ai.governance.bias.subtitle',           'en', 'Monitor and manage AI bias detection reports',                         'ai-os'),
  ('ai', 'ai.governance.bias.subtitle',           'ar', 'مراقبة وإدارة تقارير اكتشاف تحيز الذكاء الاصطناعي',                       'ai-os'),
  -- Governance — fairness
  ('ai', 'ai.governance.fairness.title',          'en', 'AI Fairness Metrics',                                                 'ai-os'),
  ('ai', 'ai.governance.fairness.title',          'ar', 'مقاييس عدالة الذكاء الاصطناعي',                                          'ai-os'),
  ('ai', 'ai.governance.fairness.subtitle',       'en', 'Monitor AI fairness metrics and scores',                               'ai-os'),
  ('ai', 'ai.governance.fairness.subtitle',       'ar', 'مراقبة مقاييس ودرجات عدالة الذكاء الاصطناعي',                             'ai-os'),
  -- Governance — ethical
  ('ai', 'ai.governance.ethical.title',           'en', 'AI Ethical Reviews',                                                  'ai-os'),
  ('ai', 'ai.governance.ethical.title',           'ar', 'المراجعات الأخلاقية للذكاء الاصطناعي',                                    'ai-os'),
  ('ai', 'ai.governance.ethical.subtitle',        'en', 'Manage AI ethical reviews and assessments',                            'ai-os'),
  ('ai', 'ai.governance.ethical.subtitle',        'ar', 'إدارة المراجعات والتقييمات الأخلاقية للذكاء الاصطناعي',                    'ai-os'),
  -- Governance — impact
  ('ai', 'ai.governance.impact.title',            'en', 'AI Impact Assessments',                                               'ai-os'),
  ('ai', 'ai.governance.impact.title',            'ar', 'تقييمات تأثير الذكاء الاصطناعي',                                        'ai-os'),
  ('ai', 'ai.governance.impact.subtitle',         'en', 'Assess AI model impact and risk',                                       'ai-os'),
  ('ai', 'ai.governance.impact.subtitle',         'ar', 'تقييم تأثير ومخاطر نماذج الذكاء الاصطناعي',                              'ai-os'),
  -- Governance — audit
  ('ai', 'ai.governance.audit.title',             'en', 'AI Governance Audit Log',                                             'ai-os'),
  ('ai', 'ai.governance.audit.title',             'ar', 'سجل تدقيق حوكمة الذكاء الاصطناعي',                                       'ai-os'),
  ('ai', 'ai.governance.audit.subtitle',          'en', 'View AI governance audit trail',                                       'ai-os'),
  ('ai', 'ai.governance.audit.subtitle',          'ar', 'عرض سجل تدقيق حوكمة الذكاء الاصطناعي',                                   'ai-os'),
  -- Governance — data lineage
  ('ai', 'ai.governance.data_lineage.title',      'en', 'AI Data Lineage',                                                     'ai-os'),
  ('ai', 'ai.governance.data_lineage.title',      'ar', 'مسار بيانات الذكاء الاصطناعي',                                          'ai-os'),
  ('ai', 'ai.governance.data_lineage.subtitle',   'en', 'Track AI data lineage and provenance',                                 'ai-os'),
  ('ai', 'ai.governance.data_lineage.subtitle',   'ar', 'تتبع مسار بيانات الذكاء الاصطناعي والأصل',                               'ai-os'),
  -- Governance — explainability
  ('ai', 'ai.governance.explainability.title',    'en', 'AI Explainability',                                                   'ai-os'),
  ('ai', 'ai.governance.explainability.title',    'ar', 'قابلية تفسير الذكاء الاصطناعي',                                          'ai-os'),
  ('ai', 'ai.governance.explainability.subtitle', 'en', 'View AI explainability reports',                                       'ai-os'),
  ('ai', 'ai.governance.explainability.subtitle', 'ar', 'عرض تقارير قابلية تفسير الذكاء الاصطناعي',                                'ai-os'),
  -- Governance — transparency
  ('ai', 'ai.governance.transparency.title',      'en', 'AI Transparency Reports',                                             'ai-os'),
  ('ai', 'ai.governance.transparency.title',      'ar', 'تقارير شفافية الذكاء الاصطناعي',                                         'ai-os'),
  ('ai', 'ai.governance.transparency.subtitle',   'en', 'View AI transparency and disclosure reports',                          'ai-os'),
  ('ai', 'ai.governance.transparency.subtitle',   'ar', 'عرض تقارير شفافية وإفصاح الذكاء الاصطناعي',                              'ai-os'),
  -- Governance — use cases
  ('ai', 'ai.governance.use_cases.title',         'en', 'AI Use Cases',                                                        'ai-os'),
  ('ai', 'ai.governance.use_cases.title',         'ar', 'حالات استخدام الذكاء الاصطناعي',                                         'ai-os'),
  ('ai', 'ai.governance.use_cases.subtitle',      'en', 'Manage AI use case inventory',                                         'ai-os'),
  ('ai', 'ai.governance.use_cases.subtitle',      'ar', 'إدارة مخزون حالات استخدام الذكاء الاصطناعي',                              'ai-os'),
  -- Governance — validation
  ('ai', 'ai.governance.validation.title',        'en', 'AI Validation Results',                                               'ai-os'),
  ('ai', 'ai.governance.validation.title',        'ar', 'نتائج التحقق من الذكاء الاصطناعي',                                       'ai-os'),
  ('ai', 'ai.governance.validation.subtitle',     'en', 'View AI model validation results',                                     'ai-os'),
  ('ai', 'ai.governance.validation.subtitle',     'ar', 'عرض نتائج التحقق من نماذج الذكاء الاصطناعي',                              'ai-os'),
  -- Governance — inventory
  ('ai', 'ai.governance.inventory.title',         'en', 'AI Governance Inventory',                                             'ai-os'),
  ('ai', 'ai.governance.inventory.title',         'ar', 'مخزون حوكمة الذكاء الاصطناعي',                                          'ai-os'),
  ('ai', 'ai.governance.inventory.subtitle',      'en', 'View AI governance asset inventory',                                   'ai-os'),
  ('ai', 'ai.governance.inventory.subtitle',      'ar', 'عرض مخزون أصول حوكمة الذكاء الاصطناعي',                                  'ai-os'),
  -- Governance — monitoring
  ('ai', 'ai.governance.monitoring.title',        'en', 'AI Monitoring Alerts',                                                'ai-os'),
  ('ai', 'ai.governance.monitoring.title',        'ar', 'تنبيهات مراقبة الذكاء الاصطناعي',                                        'ai-os'),
  ('ai', 'ai.governance.monitoring.subtitle',     'en', 'View AI monitoring alerts and incidents',                              'ai-os'),
  ('ai', 'ai.governance.monitoring.subtitle',     'ar', 'عرض تنبيهات وحوادث مراقبة الذكاء الاصطناعي',                              'ai-os'),
  -- Governance — risk
  ('ai', 'ai.governance.risk.title',              'en', 'AI Risk Assessments',                                                 'ai-os'),
  ('ai', 'ai.governance.risk.title',              'ar', 'تقييمات مخاطر الذكاء الاصطناعي',                                         'ai-os'),
  ('ai', 'ai.governance.risk.subtitle',           'en', 'Manage AI risk assessments',                                           'ai-os'),
  ('ai', 'ai.governance.risk.subtitle',           'ar', 'إدارة تقييمات مخاطر الذكاء الاصطناعي',                                    'ai-os')
ON CONFLICT (key, locale) DO UPDATE
  SET value = EXCLUDED.value,
      ns    = EXCLUDED.ns;

DO $$
DECLARE c_titles INT; c_subs INT;
BEGIN
  SELECT COUNT(*) INTO c_titles FROM dos.workspace_shell_i18n
   WHERE key LIKE 'ai.%.title' AND module_code='ai-os';
  SELECT COUNT(*) INTO c_subs   FROM dos.workspace_shell_i18n
   WHERE key LIKE 'ai.%.subtitle' AND module_code='ai-os';
  -- 26 distinct AI title keys (10 core + 16 governance) × 2 locales = 52 rows each
  IF c_titles < 52 THEN
    RAISE EXCEPTION 'AI title i18n incomplete: % rows, expected >= 52', c_titles;
  END IF;
  IF c_subs < 52 THEN
    RAISE EXCEPTION 'AI subtitle i18n incomplete: % rows, expected >= 52', c_subs;
  END IF;
END$$;

COMMIT;
