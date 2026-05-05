/**
 * Shahin AI Employee Registry — HR-style decoration of the canonical
 * AGRC_AGENTS list. Treats each agent as a real employee in the customer's
 * organization, with a job title, manager, schedule, KPIs, and deliverables.
 *
 * This file is the authoritative source-of-truth for:
 *   • Per-agent shift seed in `dos.ai_workflow_triggers`
 *   • The /workspace/hr/ai-employees org-chart page
 *   • The performance-review engine and KPI roll-ups
 *
 * Operational metadata (governance, tools, escalation) remains in
 * agrc-agents.ts — that file is the runtime gate. This file is the HR view.
 *
 * Manager role codes match the canonical DAuth RBAC catalogue
 * (platform/dauth/packages/core/access/rbac/canonical-roles.ts — CANONICAL_ROLES)
 * so every agent reports to a real human role that can be granted in Keycloak.
 */

import type { AgentEmployeeRecord } from '@dos/types';

const HIRE_DATE_GA = '2026-04-28';

export const SHAHIN_AI_EMPLOYEES: Record<string, AgentEmployeeRecord> = {
  A01: {
    jobTitle: 'GRC Onboarding Specialist',
    jobTitleAr: 'أخصائي الإعداد للحوكمة والمخاطر والامتثال',
    managerRoleCode: 'compliance_officer',
    managerLabel: 'Chief Compliance Officer',
    managerLabelAr: 'رئيس قسم الامتثال',
    missionStatement: 'Land every new customer in a healthy, scoped GRC posture within 7 days of registration.',
    missionStatementAr: 'إيصال كل عميل جديد إلى حالة حوكمة ومخاطر وامتثال صحية ومحددة النطاق خلال 7 أيام من التسجيل.',
    responsibilities: [
      'Validate organizational profile and regulatory scope',
      'Recommend the right framework set for the customer\'s sector',
      'Monitor workspace health (modules enabled, seed data freshness)',
      'Open onboarding tasks for missing critical fields',
    ],
    outOfScope: [
      'Drafting controls or policies (escalates to A04 / A08)',
      'Provisioning users (escalates to A02)',
      'Risk scoring (escalates to A07)',
    ],
    deliverables: [
      { code: 'daily_workspace_health', title: 'Daily workspace health digest', titleAr: 'تقرير صحة مساحة العمل اليومي', cadence: 'daily', destination: 'manager_inbox' },
      { code: 'weekly_onboarding_status', title: 'Weekly onboarding status report', titleAr: 'تقرير حالة الإعداد الأسبوعي', cadence: 'weekly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'onboarding_velocity', label: 'Time to framework adoption', labelAr: 'الوقت حتى اعتماد الإطار', target: '≤ 7 days', source: 'tenant_db', direction: 'lower_is_better' },
      { code: 'profile_completeness', label: 'Tenant profile completeness', labelAr: 'اكتمال ملف المستأجر', target: '≥ 95%', source: 'tenant_db', direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'morning_health_scan', cron: '0 6 * * *',  localToTenant: true,  produces: 'daily_workspace_health',   perTenant: true },
      { code: 'weekly_status_report', cron: '0 8 * * 1', localToTenant: true,  produces: 'weekly_onboarding_status', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A02: {
    jobTitle: 'IAM & Access Governance Officer',
    jobTitleAr: 'مسؤول إدارة الهويات وحوكمة الوصول',
    managerRoleCode: 'security_admin',
    managerLabel: 'IT Security Manager',
    managerLabelAr: 'مدير أمن المعلومات',
    missionStatement: 'Maintain least-privilege access, detect anomalies, enforce MFA across the workforce.',
    missionStatementAr: 'الحفاظ على مبدأ أقل الصلاحيات، اكتشاف الشذوذ، فرض المصادقة الثنائية في أنحاء المؤسسة.',
    responsibilities: [
      'Provision new users into Keycloak and tenant tables',
      'Detect over-privileged or dormant accounts',
      'Enforce MFA on privileged roles',
      'Run periodic access reviews and certifications',
    ],
    outOfScope: [
      'Writing role definitions (HR + Compliance own role design)',
      'Approving access requests above approvalBoundary=high',
    ],
    deliverables: [
      { code: 'daily_mfa_drift', title: 'Daily MFA drift report', titleAr: 'تقرير انحراف المصادقة اليومي', cadence: 'daily', destination: 'manager_inbox' },
      { code: 'weekly_access_review', title: 'Weekly access review queue', titleAr: 'قائمة مراجعة الوصول الأسبوعية', cadence: 'weekly', destination: 'manager_inbox' },
      { code: 'monthly_dormant_audit', title: 'Monthly dormant-account audit', titleAr: 'تدقيق الحسابات الخاملة الشهري', cadence: 'monthly', destination: 'audit_trail' },
    ],
    kpis: [
      { code: 'mfa_coverage', label: 'MFA coverage on privileged roles', labelAr: 'تغطية المصادقة الثنائية', target: '100%', source: 'tenant_db', direction: 'higher_is_better' },
      { code: 'over_priv_count', label: 'Over-privileged accounts', labelAr: 'الحسابات ذات الصلاحيات المفرطة', target: '0', source: 'tenant_db', direction: 'lower_is_better' },
    ],
    schedule: [
      { code: 'mfa_morning_sweep',     cron: '30 6 * * *',  localToTenant: true, produces: 'daily_mfa_drift',         perTenant: true },
      { code: 'weekly_access_review',  cron: '0 9 * * 1',   localToTenant: true, produces: 'weekly_access_review',    perTenant: true },
      { code: 'monthly_dormant_audit', cron: '0 7 1 * *',   localToTenant: true, produces: 'monthly_dormant_audit',   perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A03: {
    jobTitle: 'Regulatory Frameworks Analyst',
    jobTitleAr: 'محلل الأطر التنظيمية',
    managerRoleCode: 'compliance_officer',
    managerLabel: 'Chief Compliance Officer',
    managerLabelAr: 'رئيس قسم الامتثال',
    missionStatement: 'Keep the framework catalogue mapped, harmonized, and current with regulatory change.',
    missionStatementAr: 'الحفاظ على كتالوج الأطر التنظيمية متوافقاً ومحدّثاً مع التغييرات التنظيمية.',
    responsibilities: [
      'Maintain cross-framework mappings (NCA-ECC ↔ SAMA-CSF ↔ ISO27001 ↔ etc.)',
      'Detect coverage gaps when a new framework is adopted',
      'Surface unmapped controls for human review',
    ],
    outOfScope: [
      'Authoring the controls themselves (A04)',
      'Evaluating control effectiveness (A05)',
    ],
    deliverables: [
      { code: 'weekly_coverage_report', title: 'Weekly framework coverage report', titleAr: 'تقرير تغطية الأطر الأسبوعي', cadence: 'weekly', destination: 'manager_inbox' },
      { code: 'monthly_regulatory_brief', title: 'Monthly regulatory-change brief', titleAr: 'موجز التغييرات التنظيمية الشهري', cadence: 'monthly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'framework_mapping_pct', label: 'Mapped controls / total', labelAr: 'الضوابط المربوطة / الإجمالي', target: '≥ 90%', source: 'tenant_db', direction: 'higher_is_better' },
      { code: 'unmapped_count',        label: 'Unmapped controls',      labelAr: 'الضوابط غير المربوطة',         target: '0',     source: 'tenant_db', direction: 'lower_is_better' },
    ],
    schedule: [
      { code: 'weekly_coverage', cron: '0 7 * * 2', localToTenant: true, produces: 'weekly_coverage_report',   perTenant: true },
      { code: 'monthly_brief',   cron: '0 8 1 * *', localToTenant: true, produces: 'monthly_regulatory_brief', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A04: {
    jobTitle: 'Controls Author',
    jobTitleAr: 'مؤلف الضوابط',
    managerRoleCode: 'compliance_officer',
    managerLabel: 'Compliance Programme Lead',
    managerLabelAr: 'قائد برنامج الامتثال',
    missionStatement: 'Draft, version, and document the control library so every control is implementable and testable.',
    missionStatementAr: 'صياغة وتوثيق مكتبة الضوابط بحيث تكون قابلة للتنفيذ والاختبار.',
    responsibilities: [
      'Draft control narratives, implementation guidance, and test procedures',
      'Maintain control versions when frameworks evolve',
      'Flag controls without test procedures for backfill',
    ],
    outOfScope: [
      'Approving control activation (Compliance Officer signs off)',
      'Performing control tests (A05 collects evidence)',
    ],
    deliverables: [
      { code: 'weekly_control_drafts', title: 'Weekly drafts pending review', titleAr: 'مسودات الضوابط الأسبوعية المعلقة للمراجعة', cadence: 'weekly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'controls_with_test_procedure', label: 'Controls with test procedures', labelAr: 'الضوابط ذات إجراءات الاختبار', target: '≥ 95%', source: 'tenant_db', direction: 'higher_is_better' },
      { code: 'avg_review_age_days',          label: 'Avg age of pending drafts',     labelAr: 'متوسط عمر المسودات المعلقة',    target: '≤ 5 days', source: 'tenant_db', direction: 'lower_is_better' },
    ],
    schedule: [
      { code: 'weekly_drafts_digest', cron: '0 8 * * 3', localToTenant: true, produces: 'weekly_control_drafts', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A05: {
    jobTitle: 'Evidence Officer',
    jobTitleAr: 'مسؤول الأدلة',
    managerRoleCode: 'compliance_officer',
    managerLabel: 'Compliance Programme Lead',
    managerLabelAr: 'قائد برنامج الامتثال',
    missionStatement: 'Keep every active control covered by fresh, verifiable evidence ahead of the audit.',
    missionStatementAr: 'الحفاظ على تغطية كل ضابط فعّال بأدلة محدثة قابلة للتحقق قبل التدقيق.',
    responsibilities: [
      'Sweep evidence freshness daily and flag stale artefacts',
      'Trigger collection workflows for missing evidence',
      'Link evidence to attestations and audit packs',
    ],
    outOfScope: [
      'Validating evidence authenticity (auditor signs off)',
      'Generating audit reports (A10)',
    ],
    deliverables: [
      { code: 'daily_evidence_freshness', title: 'Daily evidence freshness scan', titleAr: 'فحص حداثة الأدلة اليومي', cadence: 'daily', destination: 'manager_inbox' },
      { code: 'pre_audit_pack',           title: 'Pre-audit evidence pack',       titleAr: 'حزمة الأدلة قبل التدقيق', cadence: 'on_demand', destination: 'tenant_dashboard' },
    ],
    kpis: [
      { code: 'evidence_freshness_pct', label: 'Controls with fresh evidence', labelAr: 'الضوابط ذات الأدلة الحديثة', target: '≥ 90%', source: 'tenant_db', direction: 'higher_is_better' },
      { code: 'stale_evidence_count',   label: 'Stale evidence items',         labelAr: 'الأدلة القديمة',              target: '0',      source: 'tenant_db', direction: 'lower_is_better' },
    ],
    schedule: [
      { code: 'daily_evidence_sweep', cron: '0 6 * * *', localToTenant: true, produces: 'daily_evidence_freshness', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A06: {
    jobTitle: 'Remediation Roadmap Owner',
    jobTitleAr: 'مالك خارطة طريق المعالجة',
    managerRoleCode: 'compliance_officer',
    managerLabel: 'Compliance Programme Lead',
    managerLabelAr: 'قائد برنامج الامتثال',
    missionStatement: 'Convert detected gaps into a prioritized, owner-assigned, time-bound remediation plan.',
    missionStatementAr: 'تحويل الثغرات المكتشفة إلى خطة معالجة مرتبة بالأولوية ومحددة المالك والوقت.',
    responsibilities: [
      'Score gaps by risk × effort, assign owners and target dates',
      'Track roadmap progress weekly',
      'Escalate overdue items to the Compliance Manager',
    ],
    outOfScope: [
      'Executing remediation (asset/control owners do the work)',
      'Re-scoring risk (A07)',
    ],
    deliverables: [
      { code: 'weekly_roadmap_progress', title: 'Weekly remediation progress', titleAr: 'تقدم خطة المعالجة الأسبوعي', cadence: 'weekly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'overdue_gap_count', label: 'Overdue remediation items', labelAr: 'بنود المعالجة المتأخرة', target: '0', source: 'tenant_db', direction: 'lower_is_better' },
      { code: 'on_time_close_pct', label: 'Gaps closed on time',      labelAr: 'الثغرات المغلقة في الوقت', target: '≥ 80%', source: 'tenant_db', direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'weekly_roadmap_review', cron: '0 9 * * 4', localToTenant: true, produces: 'weekly_roadmap_progress', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A07: {
    jobTitle: 'Risk Register Analyst',
    jobTitleAr: 'محلل سجل المخاطر',
    managerRoleCode: 'risk_manager',
    managerLabel: 'Chief Risk Officer',
    managerLabelAr: 'رئيس قسم المخاطر',
    missionStatement: 'Maintain a living risk register where every material risk is identified, scored, treated, and monitored.',
    missionStatementAr: 'الحفاظ على سجل مخاطر حيّ يتم فيه تحديد وتقييم ومعالجة ومراقبة كل خطر جوهري.',
    responsibilities: [
      'Identify new risks from threat intel + control failures',
      'Score risks (inherent + residual) using the tenant\'s methodology',
      'Recommend treatment plans and monitor KRIs',
      'Surface risk-appetite breaches to the CRO',
    ],
    outOfScope: [
      'Executing risk treatments (control owners)',
      'Vendor-specific risk (A09)',
    ],
    deliverables: [
      { code: 'daily_kri_pulse',     title: 'Daily KRI pulse',         titleAr: 'النبض اليومي لمؤشرات المخاطر', cadence: 'daily',  destination: 'manager_inbox' },
      { code: 'weekly_risk_digest',  title: 'Weekly risk digest',      titleAr: 'موجز المخاطر الأسبوعي',          cadence: 'weekly', destination: 'manager_inbox' },
      { code: 'quarterly_risk_pack', title: 'Quarterly board risk pack', titleAr: 'حزمة المخاطر الفصلية للمجلس',  cadence: 'quarterly', destination: 'tenant_dashboard' },
    ],
    kpis: [
      { code: 'open_high_risks',        label: 'Open high/critical risks',     labelAr: 'المخاطر المرتفعة المفتوحة', target: '0',     source: 'tenant_db', direction: 'lower_is_better' },
      { code: 'risk_appetite_breaches', label: 'Risk appetite breaches (30d)', labelAr: 'تجاوزات شهية المخاطر',     target: '0',     source: 'tenant_db', direction: 'lower_is_better' },
      { code: 'kri_freshness_pct',      label: 'KRIs updated in last 7 days',  labelAr: 'المؤشرات المحدثة خلال 7 أيام', target: '≥ 90%', source: 'tenant_db', direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'daily_kri_pulse',    cron: '0 7 * * *',  localToTenant: true, produces: 'daily_kri_pulse',     perTenant: true },
      { code: 'weekly_risk_digest', cron: '0 9 * * 5',  localToTenant: true, produces: 'weekly_risk_digest',  perTenant: true },
      { code: 'quarterly_risk_pack', cron: '0 8 1 1,4,7,10 *', localToTenant: true, produces: 'quarterly_risk_pack', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A08: {
    jobTitle: 'Policy Lifecycle Manager',
    jobTitleAr: 'مدير دورة حياة السياسات',
    managerRoleCode: 'compliance_officer',
    managerLabel: 'Chief Compliance Officer',
    managerLabelAr: 'رئيس قسم الامتثال',
    missionStatement: 'Keep every policy current, approved, attested, and aligned with the live regulatory landscape.',
    missionStatementAr: 'الحفاظ على كل سياسة محدّثة ومعتمدة ومُقَرَّة ومتوافقة مع المشهد التنظيمي الحالي.',
    responsibilities: [
      'Track policy expiry and trigger review cycles',
      'Run regulatory-change impact analysis on policies',
      'Drive attestation campaigns; chase non-attesters',
    ],
    outOfScope: [
      'Authoring controls (A04) or evidence (A05)',
    ],
    deliverables: [
      { code: 'weekly_policy_health',     title: 'Weekly policy health digest',  titleAr: 'موجز صحة السياسات الأسبوعي', cadence: 'weekly',  destination: 'manager_inbox' },
      { code: 'monthly_attestation_status', title: 'Monthly attestation status', titleAr: 'حالة الإقرار الشهرية',         cadence: 'monthly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'expired_policy_count', label: 'Expired policies in force',  labelAr: 'السياسات المنتهية الصلاحية', target: '0',     source: 'tenant_db', direction: 'lower_is_better' },
      { code: 'attestation_rate',     label: 'Active-policy attestation rate', labelAr: 'معدل إقرار السياسات', target: '≥ 95%', source: 'tenant_db', direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'weekly_policy_health',     cron: '0 8 * * 4', localToTenant: true, produces: 'weekly_policy_health',     perTenant: true },
      { code: 'monthly_attestation_kick', cron: '0 9 1 * *', localToTenant: true, produces: 'monthly_attestation_status', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A09: {
    jobTitle: 'Third-Party Risk Officer',
    jobTitleAr: 'مسؤول مخاطر الأطراف الثالثة',
    managerRoleCode: 'vendor_manager',
    managerLabel: 'Vendor Risk Lead',
    managerLabelAr: 'قائد مخاطر الموردين',
    missionStatement: 'Treat every vendor as an extension of the customer\'s control surface — assess, monitor, and exit on time.',
    missionStatementAr: 'معاملة كل مورد كامتداد لسطح ضوابط العميل — تقييم ومراقبة وإنهاء في الوقت المحدد.',
    responsibilities: [
      'Run vendor due-diligence on new engagements',
      'Monitor vendor security posture between renewals',
      'Surface vendors with expiring SLAs / breaches',
    ],
    outOfScope: [
      'Negotiating contracts (Procurement)',
      'Assessing internal control failures (A07)',
    ],
    deliverables: [
      { code: 'weekly_vendor_queue',     title: 'Weekly vendor-review queue',   titleAr: 'قائمة مراجعة الموردين الأسبوعية', cadence: 'weekly',  destination: 'manager_inbox' },
      { code: 'monthly_vendor_breaches', title: 'Monthly vendor breach digest', titleAr: 'موجز خروقات الموردين الشهري',     cadence: 'monthly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'overdue_reviews',     label: 'Overdue vendor reviews', labelAr: 'مراجعات الموردين المتأخرة', target: '0', source: 'tenant_db', direction: 'lower_is_better' },
      { code: 'critical_vendor_pct', label: 'Critical vendors with current DDQ', labelAr: 'الموردون الحرجون بتقييم نشط', target: '100%', source: 'tenant_db', direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'weekly_vendor_queue', cron: '0 8 * * 2', localToTenant: true, produces: 'weekly_vendor_queue',     perTenant: true },
      { code: 'monthly_breach_scan', cron: '0 7 5 * *', localToTenant: true, produces: 'monthly_vendor_breaches', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A10: {
    jobTitle: 'Audit Reporting Specialist',
    jobTitleAr: 'أخصائي تقارير التدقيق',
    managerRoleCode: 'auditor',
    managerLabel: 'Head of Internal Audit',
    managerLabelAr: 'رئيس التدقيق الداخلي',
    missionStatement: 'Produce regulator-ready audit packs and executive dashboards that pass external scrutiny.',
    missionStatementAr: 'إنتاج حزم تدقيق جاهزة للجهات التنظيمية ولوحات تنفيذية تجتاز التدقيق الخارجي.',
    responsibilities: [
      'Compile monthly executive compliance dashboard',
      'Generate regulator submissions on the regulator\'s schedule',
      'Track audit-readiness score and surface gaps',
    ],
    outOfScope: [
      'Performing audit fieldwork (Internal Auditor)',
      'Drafting controls (A04) / evidence (A05)',
    ],
    deliverables: [
      { code: 'monthly_exec_dashboard',     title: 'Monthly executive dashboard pack', titleAr: 'حزمة اللوحة التنفيذية الشهرية', cadence: 'monthly',  destination: 'tenant_dashboard' },
      { code: 'quarterly_regulator_submission', title: 'Quarterly regulator submission', titleAr: 'تقديم الجهة التنظيمية الفصلي', cadence: 'quarterly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'audit_readiness_score', label: 'Audit-readiness score',          labelAr: 'درجة الاستعداد للتدقيق',  target: '≥ 85', source: 'derived',   direction: 'higher_is_better' },
      { code: 'submission_on_time',    label: 'Regulator submissions on time', labelAr: 'تقديم الجهة التنظيمية في الوقت', target: '100%', source: 'tenant_db', direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'monthly_exec_dashboard',  cron: '0 7 1 * *',  localToTenant: true, produces: 'monthly_exec_dashboard',         perTenant: true },
      { code: 'quarterly_submission',    cron: '0 8 5 1,4,7,10 *', localToTenant: true, produces: 'quarterly_regulator_submission', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A11: {
    jobTitle: 'Business Continuity Coordinator',
    jobTitleAr: 'منسق استمرارية الأعمال',
    managerRoleCode: 'workflow_admin',
    managerLabel: 'BCP Manager',
    managerLabelAr: 'مدير استمرارية الأعمال',
    missionStatement: 'Keep the organization\'s ability to recover ahead of its actual exposure to disruption.',
    missionStatementAr: 'الحفاظ على قدرة المؤسسة على التعافي قبل تعرضها الفعلي للاضطراب.',
    responsibilities: [
      'Track BCP exercise schedule and detect overdue tests',
      'Monitor RTO/RPO drift on critical processes',
      'Identify single points of failure in dependency map',
    ],
    outOfScope: [
      'Executing recovery (Crisis team)',
      'Patching IT systems (IT Ops)',
    ],
    deliverables: [
      { code: 'weekly_bcp_readiness', title: 'Weekly BCP readiness score', titleAr: 'درجة الجاهزية لاستمرارية الأعمال الأسبوعية', cadence: 'weekly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'overdue_exercises',        label: 'Overdue BCP exercises',  labelAr: 'تمارين BCP المتأخرة', target: '0', source: 'tenant_db', direction: 'lower_is_better' },
      { code: 'critical_processes_with_rto', label: 'Critical processes with valid RTO', labelAr: 'العمليات الحرجة بـRTO صالح', target: '100%', source: 'tenant_db', direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'weekly_bcp_readiness', cron: '0 8 * * 5', localToTenant: true, produces: 'weekly_bcp_readiness', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A12: {
    jobTitle: 'Security Awareness & Training Coordinator',
    jobTitleAr: 'منسق التوعية والتدريب الأمني',
    managerRoleCode: 'security_admin',
    managerLabel: 'HR Learning Manager',
    managerLabelAr: 'مدير التعلم في الموارد البشرية',
    missionStatement: 'Lift the workforce\'s security IQ on a measurable curve, programme by programme.',
    missionStatementAr: 'رفع الوعي الأمني للموظفين على منحنى قابل للقياس، برنامجاً تلو الآخر.',
    responsibilities: [
      'Launch awareness campaigns on cadence and ad-hoc',
      'Detect skill gaps and recommend programmes',
      'Drive completion via reminders and escalations',
    ],
    outOfScope: [
      'Disciplinary action for non-completion (HR)',
      'Authoring training content (Curriculum team)',
    ],
    deliverables: [
      { code: 'weekly_completion_digest', title: 'Weekly training-completion digest', titleAr: 'موجز إنجاز التدريب الأسبوعي', cadence: 'weekly',  destination: 'manager_inbox' },
      { code: 'monthly_awareness_report', title: 'Monthly awareness-campaign report', titleAr: 'تقرير حملة التوعية الشهري', cadence: 'monthly', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'mandatory_completion_pct', label: 'Mandatory training completion', labelAr: 'إنجاز التدريب الإلزامي', target: '≥ 95%', source: 'tenant_db', direction: 'higher_is_better' },
      { code: 'phishing_fail_pct',        label: 'Phishing simulation fail rate', labelAr: 'معدل الفشل في محاكاة التصيد',  target: '≤ 5%',  source: 'tenant_db', direction: 'lower_is_better' },
    ],
    schedule: [
      { code: 'weekly_completion_digest', cron: '0 9 * * 1', localToTenant: true, produces: 'weekly_completion_digest', perTenant: true },
      { code: 'monthly_awareness_report', cron: '0 8 7 * *', localToTenant: true, produces: 'monthly_awareness_report', perTenant: true },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'permanent',
  },

  A13: {
    jobTitle: 'Sales Development Representative (Public Copilot)',
    jobTitleAr: 'مندوب تطوير المبيعات (المساعد العام)',
    managerRoleCode: 'platform_super_admin',
    managerLabel: 'Marketing & Growth Lead',
    managerLabelAr: 'قائد التسويق والنمو',
    missionStatement: 'Convert anonymous landing-page visitors into qualified pipeline through informed product Q&A and demo bookings.',
    missionStatementAr: 'تحويل زوار الصفحة الرئيسية المجهولين إلى عملاء مؤهلين عبر إجابات منتجية مدروسة وحجز عروض توضيحية.',
    responsibilities: [
      'Answer public product questions accurately and on-brand',
      'Surface relevant docs and case studies',
      'Capture demo-booking intent and route to Sales',
    ],
    outOfScope: [
      'Any tenant-scoped action (no PII, no writes)',
      'Pricing negotiation (Sales)',
      'Custom roadmap commitments (Product)',
    ],
    deliverables: [
      { code: 'daily_lead_summary', title: 'Daily lead summary', titleAr: 'ملخص العملاء المحتملين اليومي', cadence: 'daily', destination: 'manager_inbox' },
    ],
    kpis: [
      { code: 'sessions_per_day',    label: 'Daily public sessions',     labelAr: 'الجلسات العامة اليومية',           target: 'N/A — track only', source: 'langfuse',   direction: 'higher_is_better' },
      { code: 'demo_intent_rate',    label: 'Demo-intent conversion',    labelAr: 'معدل التحويل لحجز عرض',            target: '≥ 5%',           source: 'derived',    direction: 'higher_is_better' },
    ],
    schedule: [
      { code: 'daily_lead_summary', cron: '0 6 * * *', localToTenant: false, produces: 'daily_lead_summary', perTenant: false },
    ],
    hireDate: HIRE_DATE_GA,
    employmentStatus: 'probation',
  },
};

/** Helper: get the AgentEmployeeRecord for a canonical agent ID. */
export function getEmployeeRecord(agentId: string): AgentEmployeeRecord | undefined {
  return SHAHIN_AI_EMPLOYEES[agentId];
}

/** Helper: list every (agentId, shift) tuple — used by the cron seeder. */
export function listAllShifts(): Array<{ agentId: string; shift: AgentEmployeeRecord['schedule'][number] }> {
  const out: Array<{ agentId: string; shift: AgentEmployeeRecord['schedule'][number] }> = [];
  for (const [agentId, record] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
    for (const shift of record.schedule) out.push({ agentId, shift });
  }
  return out;
}
