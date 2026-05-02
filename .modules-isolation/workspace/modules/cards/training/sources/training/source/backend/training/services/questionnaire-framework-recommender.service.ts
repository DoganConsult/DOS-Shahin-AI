// ============================================
// Questionnaire Framework Recommender
// Sub-module of questionnaire-intelligence:
// DB-driven framework auto-recommendation based on
// sector, regulators, and maturity scores
// ============================================

import { safeQuery } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { getCategoryScore, CATEGORY_META, type CategoryScore } from './questionnaire-maturity-scorer.service';
import type { GenericRow as _GenericRow } from '@dos/types';

// ─── Types ──────────────────────────────────────

export interface FrameworkRecommendation {
  instrument_id: string;  // real ID from instruments table
  framework_id: string;   // alias
  name: string;
  name_ar: string;
  regulator: string;      // regulator name from regulators table
  regulator_ar: string;
  priority: 'mandatory' | 'recommended' | 'optional';
  reason_en: string;
  reason_ar: string;
  relevanceScore: number; // 0-100
  controlCount: number;   // real count from instrument_structure
  estimatedEffort: 'low' | 'medium' | 'high';
  mandatory: boolean;     // from instruments.mandatory column
}

// ─── Sector-to-regulator mapping ────────────────

const SECTOR_REGULATOR_MAP: Record<string, string[]> = {
  'Financial services': ['SAMA', 'CMA'],
  'Banking': ['SAMA'],
  'Banking & Finance': ['SAMA', 'CMA'],
  'Insurance': ['SAMA', 'CCHI'],
  'Healthcare': ['MOH', 'SFDA', 'CBAHI'],
  'Telecommunications': ['CST'],
  'Telecom': ['CST'],
  'Energy': ['ECRA'],
  'Energy & Utilities': ['ECRA', 'MEIM'],
  'Government': ['NCA', 'SDAIA', 'DGA', 'NDMO'],
  'Education': ['MOE'],
  'Retail': ['MC', 'ZATCA'],
  'Technology': ['CST', 'MCIT'],
  'Manufacturing': ['NCA', 'MIM', 'SASO'],
  'Transportation': ['TGA', 'GACA'],
  'Real Estate': ['REGA', 'MOMRAH'],
  'Media': ['GME', 'CST'],
  'Tourism': ['MoT', 'ZATCA'],
  'Mining': ['MIM'],
  'Water': ['SWCC', 'NWC'],
  'Construction': ['MOMRAH'],
  'Other': [],
};

// ─── Internal helper ────────────────────────────

export async function resolveSectorRegulators(sectorInput: string | string[]): Promise<{ regulatorAcronyms: string[]; frameworkIds: string[] }> {
  const sectorArray = Array.isArray(sectorInput) ? sectorInput : [sectorInput];
  const allRegAcronyms = new Set<string>(['NCA', 'SDAIA']);
  const allFrameworkIds = new Set<string>();

  for (const s of sectorArray) {
    const localRegs = SECTOR_REGULATOR_MAP[s];
    if (localRegs) localRegs.forEach(r => allRegAcronyms.add(r));
  }

  try {
    const sectorRows = await safeQuery(
      `SELECT sector_id, applicable_regulators, applicable_frameworks FROM sectors`
    );
    for (const row of sectorRows.rows) {
      const nameMatch = sectorArray.some(s => {
        const lower = s.toLowerCase();
        return (row.sector_id as string).toLowerCase().includes(lower.replace(/[^a-z]/g, '')) ||
          lower.includes('bank') && (row.sector_id as string).includes('FIN-BANK') ||
          lower.includes('insurance') && (row.sector_id as string).includes('FIN-INS') ||
          lower.includes('fintech') && (row.sector_id as string).includes('FIN-FINTECH') ||
          lower.includes('capital') && (row.sector_id as string).includes('FIN-CAPITAL') ||
          lower.includes('healthcare') && (row.sector_id as string).includes('HEALTH') ||
          lower.includes('hospital') && (row.sector_id as string).includes('HEALTH-HOSP') ||
          lower.includes('pharma') && (row.sector_id as string).includes('HEALTH-PHARMA') ||
          lower.includes('telecom') && (row.sector_id as string).includes('TEL') ||
          lower.includes('energy') && (row.sector_id as string).includes('ENERGY') ||
          lower.includes('oil') && (row.sector_id as string).includes('ENERGY-OG') ||
          lower.includes('government') && (row.sector_id as string).includes('GOV') ||
          lower.includes('education') && (row.sector_id as string).includes('EDU') ||
          lower.includes('retail') && (row.sector_id as string).includes('RETAIL') ||
          lower.includes('manufacturing') && (row.sector_id as string).includes('INDUSTRY') ||
          lower.includes('technology') && (row.sector_id as string).includes('DIGITAL') ||
          lower.includes('transport') && (row.sector_id as string).includes('TRANS') ||
          lower.includes('real estate') && (row.sector_id as string).includes('CONST') ||
          lower.includes('mining') && (row.sector_id as string).includes('MINING') ||
          (row.sector_id as string) === s;
      });
      if (nameMatch) {
        const regs: string[] = row.applicable_regulators || [];
        for (const r of regs) {
          const acronym = r.replace('REG-KSA-', '');
          allRegAcronyms.add(acronym);
        }
        const fws: string[] = row.applicable_frameworks || [];
        for (const fw of fws) allFrameworkIds.add(fw);
      }
    }
  } catch {
    // DB not available, fall back to static map only
  }

  return { regulatorAcronyms: [...allRegAcronyms], frameworkIds: [...allFrameworkIds] };
}

// ─── Public API ─────────────────────────────────

export async function getSectorFrameworkBreakdown(sectorId: string): Promise<{
  sectorId: string;
  sectorNameEn: string;
  sectorNameAr: string;
  mandatory: { instrumentId: string; nameEn: string; nameAr: string; type: string; regulator: string; controlCount: number }[];
  recommended: { instrumentId: string; nameEn: string; nameAr: string; type: string; regulator: string; controlCount: number }[];
  valueAdded: { instrumentId: string; nameEn: string; nameAr: string; type: string; regulator: string; controlCount: number }[];
}> {
  const sectorResult = await safeQuery(
    `SELECT sector_id, name_en, name_ar, applicable_regulators, applicable_frameworks FROM sectors WHERE sector_id = $1`,
    [sectorId]
  );
  if (sectorResult.rows.length === 0) {
    return { sectorId, sectorNameEn: '', sectorNameAr: '', mandatory: [], recommended: [], valueAdded: [] };
  }
  const sector = getFirstRow(sectorResult)!;
  const applicableFwIds: string[] = sector.applicable_frameworks || [];
  const applicableRegIds: string[] = sector.applicable_regulators || [];

  const allInstruments = await safeQuery(
    `SELECT i.instrument_id, i.name_en, i.name_ar, i.type, i.mandatory, i.sectors,
            r.name_en AS reg_name, r.acronym AS reg_acronym, r.regulator_id,
            COALESCE(c.cnt, 0) AS control_count
     FROM instruments i
     JOIN regulators r ON r.regulator_id = i.regulator_id
     LEFT JOIN (SELECT instrument_id, COUNT(*)::int AS cnt FROM instrument_structure WHERE level >= 2 GROUP BY instrument_id) c
       ON c.instrument_id = i.instrument_id
     WHERE i.status = 'active'
     ORDER BY i.mandatory DESC, i.name_en`
  );

  const mandatory: unknown[] = [];
  const recommended: unknown[] = [];
  const valueAdded: unknown[] = [];

  for (const inst of allInstruments.rows) {
    const entry = {
      instrumentId: inst.instrument_id,
      nameEn: inst.name_en,
      nameAr: inst.name_ar,
      type: inst.type,
      regulator: `${inst.reg_name} (${inst.reg_acronym})`,
      controlCount: Number(inst.control_count),
    };

    const isDirectlyApplicable = applicableFwIds.includes(inst.instrument_id);
    const regMatchesSector = applicableRegIds.includes(inst.regulator_id);

    if (isDirectlyApplicable && inst.mandatory) {
      mandatory.push(entry);
    } else if (isDirectlyApplicable && !inst.mandatory) {
      recommended.push(entry);
    } else if (regMatchesSector && inst.mandatory) {
      recommended.push(entry);
    } else if (inst.instrument_id.startsWith('INST-INTL-')) {
      valueAdded.push(entry);
    }
  }

  return {
    sectorId: sector.sector_id,
    sectorNameEn: sector.name_en,
    sectorNameAr: sector.name_ar,

    mandatory,

    recommended,

    valueAdded,
  };
}

/**
 * Query the REAL regulatory registry (136 regulators, 61 instruments, 4008+ controls)
 * to recommend applicable frameworks based on org_profile answers.
 */
export async function recommendFrameworks(
  orgAnswers: { question_id: string; answer: unknown }[],
  categoryScores: CategoryScore[]
): Promise<FrameworkRecommendation[]> {
  const answerMap = new Map<string, unknown>();
  for (const a of orgAnswers) answerMap.set(a.question_id, a.answer);

  // Step 1: Get all instruments with regulator info and control counts from DB
  const instrumentsResult = await safeQuery(
    `SELECT i.instrument_id, i.name_en, i.name_ar, i.type, i.mandatory,
            i.sectors, i.tags, i.summary_en, i.summary_ar, i.status,
            r.regulator_id, r.name_en AS reg_name_en, r.name_ar AS reg_name_ar,
            r.acronym AS reg_acronym, r.category AS reg_category, r.sectors AS reg_sectors,
            COALESCE(ctrl.control_count, 0) AS control_count
     FROM instruments i
     JOIN regulators r ON r.regulator_id = i.regulator_id
     LEFT JOIN (
       SELECT instrument_id, COUNT(*)::int AS control_count
       FROM instrument_structure
       WHERE level >= 2
       GROUP BY instrument_id
     ) ctrl ON ctrl.instrument_id = i.instrument_id
     WHERE i.status = 'active'
     ORDER BY i.mandatory DESC, ctrl.control_count DESC`
  );

  if (instrumentsResult.rows.length === 0) {
    // Fallback: DB not seeded yet
    return [];
  }

  // Step 2: Determine org context from answers

  const sectors: string[] = answerMap.get('Q0006') || [];  // selected sectors

  const certPlans: string[] = answerMap.get('Q0048') || []; // certification plans

  const cloudInfra: string[] = answerMap.get('Q0014') || []; // cloud infrastructure
  const _hasIntlOps = answerMap.get('Q0032') === true;        // GDPR applicable
  const _processesPCI = answerMap.get('Q0035') === true;      // PCI DSS scope

  const sectorArray = Array.isArray(sectors) ? sectors : [sectors];
  const resolved = await resolveSectorRegulators(sectorArray.length > 0 ? sectorArray : ['Other']);
  const applicableRegulators = new Set<string>(resolved.regulatorAcronyms);
  const sectorFrameworkIds = new Set<string>(resolved.frameworkIds);

  // Step 3: Score each instrument for relevance
  const recommendations: FrameworkRecommendation[] = [];

  for (const inst of instrumentsResult.rows) {
    let relevanceScore = 0;
    let priority: FrameworkRecommendation['priority'] = 'optional';
    let reason_en = '';
    let reason_ar = '';

    const regAcronym = inst.reg_acronym || '';
    const isMandatory = inst.mandatory === true;
    const controlCount = Number(inst.control_count);
    const instSectors: string[] = inst.sectors || [];
    const regSectors: string[] = inst.reg_sectors || [];

    // Rule 0: Direct sector->framework match from DB sectors table
    if (sectorFrameworkIds.has(inst.instrument_id)) {
      if (isMandatory) {
        relevanceScore = 100;
        priority = 'mandatory';
        reason_en = `Mandatory for your sector per ${inst.reg_name_en} regulation`;
        reason_ar = `إلزامي لقطاعك وفق تنظيم ${inst.reg_name_ar}`;
      } else {
        relevanceScore = Math.max(relevanceScore, 90);
        priority = 'recommended';
        reason_en = `Recommended for your sector per ${inst.reg_name_en}`;
        reason_ar = `موصى به لقطاعك وفق ${inst.reg_name_ar}`;
      }
    }

    // Rule 1: Mandatory instruments from applicable regulators
    if (isMandatory && applicableRegulators.has(regAcronym)) {
      relevanceScore = 100;
      priority = 'mandatory';
      if (!reason_en) {
        reason_en = `Mandatory compliance requirement issued by ${inst.reg_name_en}`;
        reason_ar = `متطلب امتثال إلزامي صادر من ${inst.reg_name_ar}`;
      }
    }

    // Rule 2: Regulator match with org sector
    if (applicableRegulators.has(regAcronym)) {
      relevanceScore = Math.max(relevanceScore, isMandatory ? 100 : 85);
      if (!reason_en) {
        priority = isMandatory ? 'mandatory' : 'recommended';
        reason_en = `Your sector is regulated by ${inst.reg_name_en} (${regAcronym})`;
        reason_ar = `قطاعك خاضع لتنظيم ${inst.reg_name_ar} (${regAcronym})`;
      }
    }

    // Rule 3: Sector overlap between instrument and org
    const sectorOverlap = sectorArray.some(s =>
      instSectors.some(is => is.toLowerCase().includes(s.toLowerCase())) ||
      regSectors.some(rs => rs.toLowerCase().includes(s.toLowerCase()))
    );
    if (sectorOverlap && relevanceScore < 80) {
      relevanceScore = Math.max(relevanceScore, 75);
      if (!reason_en) {
        priority = 'recommended';
        reason_en = `Applicable to your sector per ${inst.reg_name_en} requirements`;
        reason_ar = `ينطبق على قطاعك وفق متطلبات ${inst.reg_name_ar}`;
      }
    }

    // Rule 4: Cloud-specific instruments
    const isCloudFramework = (inst.name_en || '').toLowerCase().includes('cloud') ||
      (inst.tags || []).some((t: string) => t.includes('cloud'));
    const usesCloud = Array.isArray(cloudInfra) && !cloudInfra.includes('On-premises only') && cloudInfra.length > 0;
    if (isCloudFramework && usesCloud) {
      relevanceScore = Math.max(relevanceScore, 88);
      if (priority === 'optional') priority = 'recommended';
      if (!reason_en) {
        reason_en = `Your organization uses cloud infrastructure — cloud security controls apply`;
        reason_ar = `مؤسستك تستخدم بنية سحابية — ضوابط الأمن السحابية تنطبق`;
      }
    }

    // Rule 5: Certification plan match
    const nameKey = (inst.name_en || '').toLowerCase();
    const certMatch = certPlans.some((c: string) =>
      nameKey.includes(c.toLowerCase()) || c.toLowerCase().includes(nameKey.slice(0, 8))
    );
    if (certMatch) {
      relevanceScore = Math.max(relevanceScore, 92);
      if (priority === 'optional') priority = 'recommended';
      reason_en = `Aligned with your planned certification: ${inst.name_en}`;
      reason_ar = `متوافق مع شهادتك المخططة: ${inst.name_ar}`;
    }

    // Rule 6: Privacy/PDPL instruments always relevant
    const isPrivacy = (inst.tags || []).some((t: string) => t.includes('privacy') || t.includes('pdpl')) ||
      nameKey.includes('data protection') || nameKey.includes('personal data') || nameKey.includes('pdpl');
    if (isPrivacy) {
      relevanceScore = Math.max(relevanceScore, 95);
      priority = 'mandatory';
      if (!reason_en) {
        reason_en = `Data protection compliance is mandatory under PDPL`;
        reason_ar = `الامتثال لحماية البيانات إلزامي بموجب نظام حماية البيانات الشخصية`;
      }
    }

    // Rule 7: Low category score -> higher relevance for related frameworks
    const catMapping: Record<string, string[]> = {
      security: ['cybersecurity', 'security', 'ecc', 'csf'],
      privacy: ['data protection', 'privacy', 'pdpl', 'personal data'],
      bcp: ['business continuity', 'resilience', 'disaster'],
      compliance: ['compliance', 'regulatory', 'governance'],
      audit: ['audit', 'assurance', 'assessment'],
      vendor: ['third party', 'outsourcing', 'vendor'],
    };
    for (const [cat, keywords] of Object.entries(catMapping)) {
      const catScore = getCategoryScore(categoryScores, cat);
      if (catScore < 50 && keywords.some(kw => nameKey.includes(kw))) {
        relevanceScore = Math.max(relevanceScore, 80);
        if (priority === 'optional') priority = 'recommended';
        const meta = CATEGORY_META[cat];
        if (!reason_en) {
          reason_en = `Your ${meta?.label_en || cat} maturity is low (${catScore}%) — this framework addresses the gap`;
          reason_ar = `نضج ${meta?.label_ar || cat} منخفض (${catScore}%) — هذا الإطار يعالج الفجوة`;
        }
      }
    }

    // Only include if relevance > 0 (skip completely irrelevant instruments)
    if (relevanceScore > 0) {
      const effort: FrameworkRecommendation['estimatedEffort'] =
        controlCount > 200 ? 'high' : controlCount > 50 ? 'medium' : 'low';

      recommendations.push({
        instrument_id: inst.instrument_id,
        framework_id: inst.instrument_id,
        name: inst.name_en,
        name_ar: inst.name_ar,
        regulator: `${inst.reg_name_en} (${regAcronym})`,
        regulator_ar: inst.reg_name_ar,
        priority,
        reason_en: reason_en || `Applicable regulatory instrument from ${inst.reg_name_en}`,
        reason_ar: reason_ar || `أداة تنظيمية منطبقة من ${inst.reg_name_ar}`,
        relevanceScore,
        controlCount,
        estimatedEffort: effort,
        mandatory: isMandatory,
      });
    }
  }

  // Sort: mandatory first, then by relevance score descending
  const priorityOrder = { mandatory: 0, recommended: 1, optional: 2 };
  recommendations.sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] || b.relevanceScore - a.relevanceScore
  );

  return recommendations;
}
