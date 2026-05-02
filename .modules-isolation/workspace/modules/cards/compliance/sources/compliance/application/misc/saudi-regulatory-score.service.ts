// ============================================
// AGRC-OS -- Saudi Regulatory Score Service
// Computes multi-framework compliance score
// for Saudi regulatory authorities (SAMA, NCA,
// PDPL, CITC, GFSA) with cross-mapping gap
// detection and bilingual Arabic policy generation
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

// === Types ===

export interface SaudiRegulatoryScore {
  tenant_id: string;
  computed_at: string;
  overall_score: number;
  frameworks: FrameworkScore[];
  cross_mapping_gaps: CrossMappingGap[];
}

export interface FrameworkScore {
  framework_code: string;
  framework_name_en: string;
  framework_name_ar: string;
  authority_en: string;
  authority_ar: string;
  total_controls: number;
  implemented: number;
  tested: number;
  effective: number;
  score: number;    // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface CrossMappingGap {
  control_id: string;
  control_code: string;
  mapped_to_frameworks: string[];
  missing_from_frameworks: string[];
  gap_severity: 'critical' | 'high' | 'medium';
}

// === Saudi Framework Definitions ===

/** Saudi regulatory frameworks with authority names and scoring weights */
const SAUDI_FRAMEWORKS: {
  code: string;
  name_en: string;
  name_ar: string;
  authority_en: string;
  authority_ar: string;
  weight: number;
}[] = [
  {
    code: 'SAMA-CSF',
    name_en: 'SAMA Cyber Security Framework',
    name_ar: 'إطار الأمن السيبراني لساما',
    authority_en: 'Saudi Central Bank (SAMA)',
    authority_ar: 'البنك المركزي السعودي (ساما)',
    weight: 0.30,
  },
  {
    code: 'NCA-ECC',
    name_en: 'NCA Essential Cybersecurity Controls',
    name_ar: 'الضوابط الأساسية للأمن السيبراني',
    authority_en: 'National Cybersecurity Authority (NCA)',
    authority_ar: 'الهيئة الوطنية للأمن السيبراني',
    weight: 0.30,
  },
  {
    code: 'PDPL',
    name_en: 'Personal Data Protection Law',
    name_ar: 'نظام حماية البيانات الشخصية',
    authority_en: 'Saudi Data & AI Authority (SDAIA)',
    authority_ar: 'الهيئة السعودية للبيانات والذكاء الاصطناعي',
    weight: 0.20,
  },
  {
    code: 'CITC',
    name_en: 'CITC Regulatory Framework',
    name_ar: 'الإطار التنظيمي لهيئة الاتصالات',
    authority_en: 'Communications, Space & Technology Commission (CITC)',
    authority_ar: 'هيئة الاتصالات والفضاء والتقنية',
    weight: 0.10,
  },
  {
    code: 'GFSA',
    name_en: 'GFSA Governance Standards',
    name_ar: 'معايير حوكمة الهيئة العامة للغذاء والدواء',
    authority_en: 'General Food & Safety Authority (GFSA)',
    authority_ar: 'الهيئة العامة للغذاء والدواء',
    weight: 0.10,
  },
];

// === Score Computation ===

/**
 * Compute Saudi regulatory compliance score across all major frameworks.
 *
 * For each framework, counts total/implemented/tested/effective controls
 * in the tenant's schema. Score formula:
 *   score = (effective/total * 50) + (tested/total * 30) + (implemented/total * 20)
 *
 * Overall = weighted average with SAMA 30%, NCA 30%, PDPL 20%, CITC 10%, GFSA 10%.
 */
export async function computeSaudiRegulatoryScore(
  tenantId: string,
): Promise<SaudiRegulatoryScore> {
  const schema = tenantSchema(tenantId);
  const computedAt = new Date().toISOString();

  // Query all tenant controls with their framework and status info
  const controlsResult = await safeQuery(
    `SELECT
       c.control_id,
       c.control_code,
       c.framework_id,
       COALESCE(c.status, 'not_implemented') AS status,
       COALESCE(c.testing_status, 'not_tested') AS testing_status,
       COALESCE(c.effectiveness, 'not_assessed') AS effectiveness,
       f.framework_code
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".frameworks f ON f.framework_id = c.framework_id
     ORDER BY c.control_code`,
  );

  const controls = controlsResult.rows;

  // Also try control_framework_map if available (for cross-mapped controls)
  const crossMapResult = await safeQuery(
    `SELECT control_id, framework_code
     FROM "${schema}".control_framework_map`,
  );
  const crossMapRows = crossMapResult.rows;

  // Build per-framework scoring
  const frameworkScores: FrameworkScore[] = [];

  for (const fw of SAUDI_FRAMEWORKS) {
    // Match controls by framework_code (case-insensitive prefix match)
    const fwControls = controls.filter(
      (c: Record<string, unknown>) => matchFrameworkCode((c as any).framework_code, fw.code) || matchFrameworkCode((c as any).control_code, fw.code),
    );

    const total = fwControls.length;
    const implemented = fwControls.filter(
      (c: Record<string, unknown>) => c.status === 'implemented' || c.status === 'active',
    ).length;
    const tested = fwControls.filter(
      (c: Record<string, unknown>) => c.testing_status === 'passed' || c.testing_status === 'tested',
    ).length;
    const effective = fwControls.filter(
      (c: Record<string, unknown>) => c.effectiveness === 'effective' || c.effectiveness === 'fully_effective',
    ).length;

    const score = total > 0
      ? Math.round(
          (effective / total) * 50 + (tested / total) * 30 + (implemented / total) * 20,
        )
      : 0;

    const grade = computeGrade(score);

    frameworkScores.push({
      framework_code: fw.code,
      framework_name_en: fw.name_en,
      framework_name_ar: fw.name_ar,
      authority_en: fw.authority_en,
      authority_ar: fw.authority_ar,
      total_controls: total,
      implemented,
      tested,
      effective,
      score,
      grade,
    });
  }

  // Compute overall weighted score
  let overallScore = 0;
  let totalWeight = 0;

  for (const fw of SAUDI_FRAMEWORKS) {
    const fwScore = frameworkScores.find((f) => f.framework_code === fw.code);
    if (fwScore && fwScore.total_controls > 0) {
      overallScore += fwScore.score * fw.weight;
      totalWeight += fw.weight;
    }
  }

  overallScore = totalWeight > 0 ? Math.round(overallScore / totalWeight) : 0;

  // Cross-mapping gap detection
  const crossMappingGaps = detectCrossMappingGaps(controls, crossMapRows);

  return {
    tenant_id: tenantId,
    computed_at: computedAt,
    overall_score: overallScore,
    frameworks: frameworkScores,
    cross_mapping_gaps: crossMappingGaps,
  };
}

// === Arabic Policy Draft Generation ===

/** Arabic policy section templates for bilingual policy documents */
const AR_SECTION_TEMPLATES = {
  scope: {
    title_ar: 'النطاق',
    title_en: 'Scope',
    template_ar: (controlTitle: string, _frameworkCode: string) =>
      `تنطبق هذه السياسة على جميع الأنظمة والعمليات والموظفين المرتبطين بـ "${controlTitle}". يشمل نطاق هذه السياسة جميع الإدارات والأقسام التي تتعامل مع الأصول والبيانات ذات الصلة، وتطبق على جميع المتعاقدين والأطراف الثالثة المعنية.`,
    template_en: (controlTitle: string, _frameworkCode: string) =>
      `This policy applies to all systems, processes, and personnel associated with "${controlTitle}". The scope includes all departments and divisions handling related assets and data, and extends to all contractors and relevant third parties.`,
  },
  purpose: {
    title_ar: 'الغرض',
    title_en: 'Purpose',
    template_ar: (controlTitle: string, frameworkCode: string) =>
      `الغرض من هذه السياسة هو تحديد المتطلبات والإجراءات اللازمة لتنفيذ ضابط "${controlTitle}" وفقاً لمتطلبات إطار ${frameworkCode}. تهدف هذه السياسة إلى ضمان الامتثال التنظيمي وحماية أصول المنظمة ومعلوماتها.`,
    template_en: (controlTitle: string, frameworkCode: string) =>
      `The purpose of this policy is to define the requirements and procedures necessary for implementing the "${controlTitle}" control in accordance with ${frameworkCode} framework requirements. This policy aims to ensure regulatory compliance and protect the organization's assets and information.`,
  },
  responsibilities: {
    title_ar: 'المسؤوليات',
    title_en: 'Responsibilities',
    template_ar: (_controlTitle: string, _frameworkCode: string) =>
      `- الإدارة العليا: مسؤولة عن اعتماد السياسة وتوفير الموارد اللازمة لتنفيذها.\n- إدارة الامتثال: مسؤولة عن مراقبة الالتزام بالسياسة وإجراء المراجعات الدورية.\n- إدارة تقنية المعلومات: مسؤولة عن التنفيذ التقني والصيانة المستمرة.\n- جميع الموظفين: ملتزمون بالامتثال لمتطلبات هذه السياسة والإبلاغ عن أي مخالفات.`,
    template_en: (_controlTitle: string, _frameworkCode: string) =>
      `- Senior Management: Responsible for approving the policy and providing necessary resources for implementation.\n- Compliance Department: Responsible for monitoring policy adherence and conducting periodic reviews.\n- IT Department: Responsible for technical implementation and ongoing maintenance.\n- All Employees: Obligated to comply with this policy's requirements and report any violations.`,
  },
  procedures: {
    title_ar: 'الإجراءات',
    title_en: 'Procedures',
    template_ar: (controlTitle: string, _frameworkCode: string) =>
      `يجب اتباع الإجراءات التالية لتنفيذ "${controlTitle}":\n1. تقييم الوضع الحالي وتحديد الفجوات.\n2. وضع خطة التنفيذ مع جدول زمني محدد.\n3. تخصيص الموارد والمسؤوليات لكل مرحلة.\n4. تنفيذ الضوابط التقنية والإدارية المطلوبة.\n5. إجراء اختبارات التحقق من فعالية الضوابط.\n6. توثيق النتائج وإعداد تقارير الامتثال.\n7. المراجعة الدورية وتحديث الإجراءات حسب الحاجة.`,
    template_en: (controlTitle: string, _frameworkCode: string) =>
      `The following procedures must be followed for implementing "${controlTitle}":\n1. Assess current state and identify gaps.\n2. Develop an implementation plan with a defined timeline.\n3. Allocate resources and responsibilities for each phase.\n4. Implement required technical and administrative controls.\n5. Conduct verification tests for control effectiveness.\n6. Document results and prepare compliance reports.\n7. Perform periodic reviews and update procedures as needed.`,
  },
  references: {
    title_ar: 'المراجع',
    title_en: 'References',
    template_ar: (_controlTitle: string, frameworkCode: string) =>
      `- إطار ${frameworkCode} والضوابط ذات الصلة.\n- سياسات المنظمة الداخلية المتعلقة بأمن المعلومات.\n- المعايير الدولية ذات الصلة (ISO 27001, NIST CSF).\n- الأنظمة واللوائح الصادرة عن الجهة التنظيمية.\n- أفضل الممارسات في مجال الحوكمة والامتثال.`,
    template_en: (_controlTitle: string, frameworkCode: string) =>
      `- ${frameworkCode} framework and related controls.\n- Internal organizational information security policies.\n- Relevant international standards (ISO 27001, NIST CSF).\n- Regulations and directives issued by the regulatory authority.\n- Best practices in governance and compliance.`,
  },
};

/**
 * Generate a structured bilingual (AR/EN) policy draft based on a control
 * and its parent framework.
 *
 * Looks up the control's Arabic title and description from the
 * regulatory_controls public table, then fills policy section templates
 * with domain-appropriate Arabic legal/governance language.
 */
export async function generateArabicPolicyDraft(
  tenantId: string,
  opts: {
    control_code: string;
    framework_code: string;
    policy_type: string;
  },
): Promise<{
  title_ar: string;
  body_ar: string;
  title_en: string;
  body_en: string;
}> {
  const { control_code, framework_code, policy_type } = opts;

  // Look up control details from public regulatory_controls
  const controlResult = await safeQuery(
    `SELECT
       control_code,
       COALESCE(control_title_ar, control_title_en) AS control_title_ar,
       control_title_en,
       COALESCE(control_description_ar, control_description_en) AS control_description_ar,
       control_description_en
     FROM public.regulatory_controls
     WHERE control_code = $1
     LIMIT 1`,
    [control_code],
  );

  // Fallback: try tenant schema controls table
  let controlTitle_ar = control_code;
  let controlTitle_en = control_code;
  let controlDesc_ar = '';
  let controlDesc_en = '';

  if (controlResult.rows.length > 0) {
    const row = controlResult.rows[0];
    controlTitle_ar = row.control_title_ar || control_code;
    controlTitle_en = row.control_title_en || control_code;
    controlDesc_ar = row.control_description_ar || '';
    controlDesc_en = row.control_description_en || '';
  } else {
    // Try tenant schema
    const schema = tenantSchema(tenantId);
    const tenantResult = await safeQuery(
      `SELECT control_code, control_title, description
       FROM "${schema}".controls
       WHERE control_code = $1
       LIMIT 1`,
      [control_code],
    );
    if (tenantResult.rows.length > 0) {
      const row = tenantResult.rows[0];
      controlTitle_en = row.control_title || control_code;
      controlTitle_ar = row.control_title || control_code;
      controlDesc_en = row.description || '';
      controlDesc_ar = row.description || '';
    }
  }

  // Build policy title
  const title_ar = `سياسة ${controlTitle_ar}`;
  const title_en = `${controlTitle_en} Policy`;

  // Build Arabic policy body
  const arSections: string[] = [];
  const enSections: string[] = [];

  // Add policy type header
  const policyTypeAr = getPolicyTypeAr(policy_type);
  arSections.push(`# ${title_ar}\n`);
  arSections.push(`**نوع السياسة:** ${policyTypeAr}\n`);
  arSections.push(`**الإطار التنظيمي:** ${framework_code}\n`);
  arSections.push(`**رمز الضابط:** ${control_code}\n`);

  enSections.push(`# ${title_en}\n`);
  enSections.push(`**Policy Type:** ${policy_type}\n`);
  enSections.push(`**Regulatory Framework:** ${framework_code}\n`);
  enSections.push(`**Control Code:** ${control_code}\n`);

  // Add control description if available
  if (controlDesc_ar) {
    arSections.push(`\n## وصف الضابط\n${controlDesc_ar}\n`);
  }
  if (controlDesc_en) {
    enSections.push(`\n## Control Description\n${controlDesc_en}\n`);
  }

  // Build each section from templates
  for (const section of Object.values(AR_SECTION_TEMPLATES)) {
    arSections.push(`\n## ${section.title_ar}\n${section.template_ar(controlTitle_ar, framework_code)}\n`);
    enSections.push(`\n## ${section.title_en}\n${section.template_en(controlTitle_en, framework_code)}\n`);
  }

  // Add approval block
  arSections.push(`\n---\n**تاريخ الإعداد:** ${new Date().toISOString().slice(0, 10)}\n**حالة الوثيقة:** مسودة\n**يتطلب اعتماد:** الإدارة العليا\n`);
  enSections.push(`\n---\n**Preparation Date:** ${new Date().toISOString().slice(0, 10)}\n**Document Status:** Draft\n**Requires Approval:** Senior Management\n`);

  return {
    title_ar,
    body_ar: arSections.join(''),
    title_en,
    body_en: enSections.join(''),
  };
}

// === Helper Functions ===

/** Match a control's framework_code to a Saudi framework definition code */
function matchFrameworkCode(controlFwCode: string | null, saudiFwCode: string): boolean {
  if (!controlFwCode) return false;
  const normalized = controlFwCode.toUpperCase().replace(/[-_\s]/g, '');
  const target = saudiFwCode.toUpperCase().replace(/[-_\s]/g, '');
  return normalized.startsWith(target) || normalized.includes(target);
}

/** Compute letter grade from numeric score */
function computeGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/** Detect controls mapped to some Saudi frameworks but missing from others */
function detectCrossMappingGaps(
  controls: unknown[],
  crossMapRows: unknown[],
): CrossMappingGap[] {
  const saudiCodes = SAUDI_FRAMEWORKS.map((f) => f.code);
  const gaps: CrossMappingGap[] = [];

  // Build map: control_id -> set of framework codes it is mapped to
  const controlFwMap = new Map<string, Set<string>>();

  for (const c of controls) {

    if (!c.framework_code) continue;

    const matchedFws = saudiCodes.filter((code) => matchFrameworkCode(c.framework_code, code));
    if (matchedFws.length > 0) {

      if (!controlFwMap.has(c.control_id)) {

        controlFwMap.set(c.control_id, new Set());
      }

      const s = controlFwMap.get(c.control_id)!;
      for (const fw of matchedFws) s.add(fw);
    }
  }

  // Also include cross-map entries
  for (const row of crossMapRows) {

    const matchedFws = saudiCodes.filter((code) => matchFrameworkCode(row.framework_code, code));
    if (matchedFws.length > 0) {

      if (!controlFwMap.has(row.control_id)) {

        controlFwMap.set(row.control_id, new Set());
      }

      const s = controlFwMap.get(row.control_id)!;
      for (const fw of matchedFws) s.add(fw);
    }
  }

  // Find controls mapped to >= 2 Saudi frameworks but not all applicable ones
  for (const [controlId, mappedFws] of controlFwMap) {
    if (mappedFws.size >= 2 && mappedFws.size < saudiCodes.length) {
      const missing = saudiCodes.filter((code) => !mappedFws.has(code));
      const control = controls.find((c: GenericRow) => c.control_id === controlId);

      const controlCode = control?.control_code || controlId;

      // Determine gap severity based on missing count
      let severity: 'critical' | 'high' | 'medium' = 'medium';
      if (missing.length >= 3) severity = 'critical';
      else if (missing.length >= 2) severity = 'high';

      gaps.push({
        control_id: controlId,
        control_code: controlCode,
        mapped_to_frameworks: Array.from(mappedFws),
        missing_from_frameworks: missing,
        gap_severity: severity,
      });
    }
  }

  return gaps;
}

/** Translate policy type to Arabic */
function getPolicyTypeAr(policyType: string): string {
  const typeMap: Record<string, string> = {
    security: 'سياسة أمنية',
    privacy: 'سياسة خصوصية',
    compliance: 'سياسة امتثال',
    governance: 'سياسة حوكمة',
    operational: 'سياسة تشغيلية',
    technical: 'سياسة تقنية',
    risk: 'سياسة إدارة المخاطر',
    data: 'سياسة إدارة البيانات',
  };
  return typeMap[policyType.toLowerCase()] || `سياسة ${policyType}`;
}
