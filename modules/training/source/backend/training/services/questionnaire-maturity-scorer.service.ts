import { safeQuery } from "@dos/db";

// ============================================
// Questionnaire Maturity Scorer
// Sub-module of questionnaire-intelligence:
// CMMI maturity scoring (weighted 1-5) and gap analysis
// ============================================

// ─── Types ──────────────────────────────────────

export interface CategoryScore {
  category: string;
  label_en: string;
  label_ar: string;
  score: number;        // 0-100
  maturityLevel: number; // 1-5 CMMI
  maturityLabel: string; // Initial / Managed / Defined / Measured / Optimized
  answeredCount: number;
  totalQuestions: number;
  weightedScore: number;
  maxPossible: number;
}

export interface GapItem {
  category: string;
  domain: string;
  question_id: string;
  text_en: string;
  text_ar: string;
  current_score: number;
  target_score: number;
  gap: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation_en: string;
  recommendation_ar: string;
}

// ─── Category metadata ─────────────────────────

export const CATEGORY_META: Record<string, { label_en: string; label_ar: string }> = {
  org_profile:  { label_en: 'Organization Profile',     label_ar: 'الملف التنظيمي' },
  governance:   { label_en: 'Governance & Leadership',   label_ar: 'الحوكمة والقيادة' },
  risk:         { label_en: 'Risk Management',           label_ar: 'إدارة المخاطر' },
  compliance:   { label_en: 'Compliance & Regulatory',   label_ar: 'الامتثال والتنظيم' },
  security:     { label_en: 'Information Security',      label_ar: 'أمن المعلومات' },
  bcp:          { label_en: 'Business Continuity',       label_ar: 'استمرارية الأعمال' },
  vendor:       { label_en: 'Vendor & Third Party',      label_ar: 'الموردون والأطراف الثالثة' },
  audit:        { label_en: 'Audit & Assurance',         label_ar: 'التدقيق والتأكيد' },
  privacy:      { label_en: 'Privacy & Data Protection', label_ar: 'الخصوصية وحماية البيانات' },
  technology:   { label_en: 'Technology & Operations',   label_ar: 'التكنولوجيا والعمليات' },
};

// ─── Recommendation templates ───────────────────

export const RECOMMENDATION_TEMPLATES: Record<string, { en: string; ar: string }> = {
  governance_policy:    { en: 'Establish and document formal policies with defined ownership and review cycles', ar: 'أنشئ ووثق سياسات رسمية بملكية محددة ودورات مراجعة' },
  governance_board:     { en: 'Strengthen Board-level risk and compliance oversight with regular reporting', ar: 'عزز الرقابة على المخاطر والامتثال على مستوى مجلس الإدارة' },
  governance_training:  { en: 'Implement role-based GRC awareness training programs', ar: 'نفذ برامج تدريب توعوية للحوكمة والمخاطر والامتثال حسب الدور' },
  governance_leadership:{ en: 'Assign dedicated GRC leadership (CISO, DPO, CRO) with clear authority', ar: 'عيّن قيادة مخصصة للحوكمة والمخاطر والامتثال بصلاحيات واضحة' },
  governance_strategy:  { en: 'Develop a documented GRC strategy aligned with business objectives', ar: 'طور استراتيجية حوكمة موثقة متوافقة مع أهداف العمل' },
  governance_culture:   { en: 'Foster a compliance and risk culture through communication and incentives', ar: 'عزز ثقافة الامتثال والمخاطر من خلال التواصل والحوافز' },
  governance_ethics:    { en: 'Implement code of ethics, whistleblower mechanisms, and conflict of interest policies', ar: 'طبق مدونة أخلاقيات وآليات إبلاغ عن المخالفات وسياسات تضارب المصالح' },
  governance_reporting: { en: 'Establish regular GRC dashboards and KPI reporting to management', ar: 'أنشئ لوحات تحكم ومؤشرات أداء للحوكمة والمخاطر والامتثال بتقارير منتظمة للإدارة' },
  risk_framework:       { en: 'Adopt a formal risk management framework (ISO 31000 or COSO ERM)', ar: 'تبنَّ إطار إدارة مخاطر رسمي (ISO 31000 أو COSO ERM)' },
  risk_register:        { en: 'Establish and maintain a comprehensive risk register with regular updates', ar: 'أنشئ وحافظ على سجل مخاطر شامل بتحديثات منتظمة' },
  risk_assessment:      { en: 'Implement regular risk assessments with quantitative scoring', ar: 'نفذ تقييمات مخاطر منتظمة بتقييم كمي' },
  risk_appetite:        { en: 'Define and document a formal risk appetite statement approved by the Board', ar: 'حدد ووثق بيان شهية مخاطر رسمي معتمد من مجلس الإدارة' },
  risk_treatment:       { en: 'Develop formal risk treatment plans with assigned owners and timelines', ar: 'طور خطط معالجة مخاطر رسمية بمسؤولين ومواعيد محددة' },
  risk_kri:             { en: 'Establish Key Risk Indicators (KRIs) with automated monitoring and alerting', ar: 'أنشئ مؤشرات مخاطر رئيسية مع مراقبة وتنبيه تلقائي' },
  risk_cyber:           { en: 'Implement cyber risk quantification and threat intelligence capabilities', ar: 'نفذ قياس كمي للمخاطر السيبرانية وقدرات استخبارات التهديدات' },
  compliance_program:   { en: 'Establish a dedicated compliance management program with charter and budget', ar: 'أنشئ برنامج إدارة امتثال مخصص بميثاق وميزانية' },
  compliance_nca:       { en: 'Implement NCA Essential Cybersecurity Controls (ECC) — mandatory for all Saudi entities', ar: 'طبق الضوابط الأساسية للأمن السيبراني (ECC) — إلزامية لجميع الكيانات السعودية' },
  compliance_pdpl:      { en: 'Achieve PDPL compliance: data inventory, consent management, breach notification', ar: 'حقق الامتثال لـ PDPL: جرد البيانات وإدارة الموافقة وإشعار الخرق' },
  compliance_mapping:   { en: 'Map controls across regulatory frameworks to reduce duplication (unified control framework)', ar: 'اربط الضوابط عبر الأطر التنظيمية لتقليل التكرار (إطار ضوابط موحد)' },
  compliance_evidence:  { en: 'Implement automated evidence collection with centralized repository', ar: 'نفذ جمع أدلة مؤتمت مع مستودع مركزي' },
  security_program:     { en: 'Establish a formal information security program with approved policy', ar: 'أنشئ برنامج أمن معلومات رسمي بسياسة معتمدة' },
  security_access:      { en: 'Implement MFA, PAM, least privilege, and regular access reviews', ar: 'طبق المصادقة متعددة العوامل وإدارة الحسابات المميزة والحد الأدنى من الصلاحيات' },
  security_incident:    { en: 'Develop documented incident response plan with CSIRT and regular exercises', ar: 'طور خطة استجابة للحوادث موثقة مع فريق CSIRT وتمارين منتظمة' },
  security_vulnerability:{ en: 'Implement continuous vulnerability scanning and patch management', ar: 'نفذ فحص ثغرات مستمر وإدارة تحديثات أمنية' },
  security_soc:         { en: 'Establish SOC capabilities with SIEM and 24/7 monitoring', ar: 'أنشئ مركز عمليات أمنية مع SIEM ومراقبة على مدار الساعة' },
  bcp_program:          { en: 'Establish BCM program with BIA, documented plans, and regular testing', ar: 'أنشئ برنامج إدارة استمرارية أعمال مع تحليل أثر وخطط موثقة واختبارات منتظمة' },
  bcp_dr:               { en: 'Implement disaster recovery with secondary site and tested failover', ar: 'نفذ خطة تعافي من الكوارث مع موقع ثانوي وتجاوز مختبر' },
  bcp_backup:           { en: 'Implement immutable backups with offsite storage and regular restore testing', ar: 'نفذ نسخ احتياطية غير قابلة للتعديل مع تخزين خارجي واختبار استعادة منتظم' },
  vendor_program:       { en: 'Establish a formal TPRM program with risk tiering and lifecycle management', ar: 'أنشئ برنامج إدارة مخاطر الأطراف الثالثة بتصنيف المخاطر وإدارة دورة الحياة' },
  vendor_assessment:    { en: 'Implement standardized vendor risk assessments with on-site reviews for critical vendors', ar: 'نفذ تقييمات مخاطر موردين موحدة مع مراجعات ميدانية للموردين الحرجين' },
  vendor_contracts:     { en: 'Include security, data protection, audit rights, and exit clauses in all vendor contracts', ar: 'أدرج بنود الأمن وحماية البيانات وحق التدقيق والخروج في جميع عقود الموردين' },
  audit_program:        { en: 'Establish independent internal audit with risk-based planning and Board reporting', ar: 'أنشئ تدقيق داخلي مستقل بتخطيط قائم على المخاطر وتقارير لمجلس الإدارة' },
  audit_testing:        { en: 'Implement regular control testing with automated tools and data analytics', ar: 'نفذ اختبار ضوابط منتظم بأدوات آلية وتحليلات بيانات' },
  audit_findings:       { en: 'Track findings with severity ratings, SLAs, and root cause analysis', ar: 'تتبع النتائج بتصنيفات خطورة واتفاقيات مستوى خدمة وتحليل سبب جذري' },
  privacy_program:      { en: 'Establish data privacy program with DPO, policies, and training', ar: 'أنشئ برنامج خصوصية بيانات مع مسؤول حماية بيانات وسياسات وتدريب' },
  privacy_pdpl:         { en: 'Implement PDPL requirements: consent, DSAR handling, breach notification to SDAIA', ar: 'طبق متطلبات PDPL: الموافقة والتعامل مع طلبات أصحاب البيانات وإشعار SDAIA بالخروقات' },
  privacy_inventory:    { en: 'Conduct comprehensive data inventory and maintain ROPA', ar: 'أجرِ جردًا شاملاً للبيانات وحافظ على سجل أنشطة المعالجة' },
  technology_change:    { en: 'Implement formal change management with CAB and security impact analysis', ar: 'نفذ إدارة تغيير رسمية مع مجلس استشاري وتحليل أثر أمني' },
  technology_patch:     { en: 'Establish patch management with critical patches deployed within 7 days', ar: 'أنشئ إدارة تحديثات بنشر التحديثات الحرجة خلال 7 أيام' },
  technology_cloud:     { en: 'Implement cloud governance with CSPM, data residency controls, and IaC scanning', ar: 'نفذ حوكمة سحابية مع CSPM وضوابط إقامة البيانات ومسح IaC' },
  technology_monitoring:{ en: 'Deploy centralized SIEM with 12-month log retention per NCA requirements', ar: 'انشر SIEM مركزي مع احتفاظ بالسجلات 12 شهرًا وفق متطلبات الهيئة الوطنية' },
};

// ─── Industry benchmarks ────────────────────────

export const INDUSTRY_BENCHMARKS: Record<string, number> = {
  org_profile: 65,
  governance: 52,
  risk: 48,
  compliance: 45,
  security: 50,
  bcp: 40,
  vendor: 38,
  audit: 42,
  privacy: 35,
  technology: 47,
};

// ─── Internal helpers ───────────────────────────

export function scoreToMaturity(score: number): { level: number; label: string } {
  if (score >= 90) return { level: 5, label: 'Optimized' };
  if (score >= 75) return { level: 4, label: 'Measured' };
  if (score >= 60) return { level: 3, label: 'Defined' };
  if (score >= 40) return { level: 2, label: 'Managed' };
  return { level: 1, label: 'Initial' };
}

export function getCategoryScore(scores: CategoryScore[], category: string): number {
  return scores.find(s => s.category === category)?.score ?? 0;
}

// ─── CMMI Maturity Scoring Engine ───────────────

/**
 * Compute category-level and overall maturity scores from responses.
 * Uses weighted scoring: each question's score (0-5 for scale, 0/5 for boolean)
 * is multiplied by its weight, then normalized to 0-100.
 */
export function computeMaturityScores(
  responses: { question_id: string; answer: unknown; score: number; category: string; weight: number }[]
): { categoryScores: CategoryScore[]; overallScore: number; overallMaturity: number; overallLabel: string } {
  const catMap: Record<string, { weightedScore: number; maxPossible: number; count: number; total: number }> = {};

  for (const r of responses) {
    if (!catMap[r.category]) {
      catMap[r.category] = { weightedScore: 0, maxPossible: 0, count: 0, total: 0 };
    }
    catMap[r.category].weightedScore += r.score * r.weight;
    catMap[r.category].maxPossible += 5 * r.weight; // max score per question = 5
    catMap[r.category].count++;
  }

  // Get total question counts per category from metadata
  const categoryScores: CategoryScore[] = [];
  let totalWeighted = 0;
  let totalMax = 0;

  for (const [cat, data] of Object.entries(catMap)) {
    const score = data.maxPossible > 0
      ? Math.round((data.weightedScore / data.maxPossible) * 100)
      : 0;
    const { level, label } = scoreToMaturity(score);
    const meta = CATEGORY_META[cat] || { label_en: cat, label_ar: cat };

    categoryScores.push({
      category: cat,
      label_en: meta.label_en,
      label_ar: meta.label_ar,
      score,
      maturityLevel: level,
      maturityLabel: label,
      answeredCount: data.count,
      totalQuestions: data.total || data.count,
      weightedScore: data.weightedScore,
      maxPossible: data.maxPossible,
    });

    // org_profile doesn't contribute to overall maturity (it's descriptive)
    if (cat !== 'org_profile') {
      totalWeighted += data.weightedScore;
      totalMax += data.maxPossible;
    }
  }

  const overallScore = totalMax > 0 ? Math.round((totalWeighted / totalMax) * 100) : 0;
  const { level: overallMaturity, label: overallLabel } = scoreToMaturity(overallScore);

  return { categoryScores, overallScore, overallMaturity, overallLabel };
}

// ─── Gap Analysis + Recommendations ────────────

/**
 * Generate gap analysis from assessment responses.
 * Identifies questions scoring below target (3/5) weighted by importance.
 */
export function generateGapAnalysis(
  responses: { question_id: string; answer: unknown; score: number; category: string; domain: string; weight: number; text_en: string; text_ar: string }[],
  targetScore: number = 3
): GapItem[] {
  const gaps: GapItem[] = [];

  for (const r of responses) {
    if (r.category === 'org_profile') continue; // org_profile is descriptive, not scored
    if (r.score >= targetScore) continue;

    const gap = targetScore - r.score;
    const priority = r.weight >= 5 && gap >= 2 ? 'critical'
      : r.weight >= 4 && gap >= 2 ? 'high'
      : r.weight >= 3 ? 'medium'
      : 'low';

    // Find matching recommendation
    const recKey = `${r.category}_${r.domain}`;
    const rec = RECOMMENDATION_TEMPLATES[recKey]
      || { en: `Improve ${r.category} — ${r.domain} capabilities to meet target maturity`, ar: `حسّن قدرات ${r.category} — ${r.domain} لتحقيق النضج المستهدف` };

    gaps.push({
      category: r.category,
      domain: r.domain,
      question_id: r.question_id,
      text_en: r.text_en,
      text_ar: r.text_ar,
      current_score: r.score,
      target_score: targetScore,
      gap,
      priority,
      recommendation_en: rec.en,
      recommendation_ar: rec.ar,
    });
  }

  // Sort: critical first, then by gap size descending
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.gap - a.gap);

  return gaps;
}
