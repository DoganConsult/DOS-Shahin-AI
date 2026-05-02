// ============================================
// Questionnaire Branching Engine
// Sub-module of questionnaire-intelligence:
// Adaptive branching rules that skip irrelevant questions
// based on org profile answers
// ============================================

import { getFirstRow } from '@dos/db';
import { safeQuery } from "@dos/db";

// ─── Types ──────────────────────────────────────

export interface BranchingRule {
  /** question_id that triggers the rule */
  trigger_question: string;
  /** expected answer value(s) that activate the rule */
  trigger_values: unknown[];
  /** question_ids to SKIP when rule fires */
  skip_questions: string[];
  /** question_ids to ADD when rule fires (bonus deep-dive) */
  add_questions?: string[];
}

// ─── Adaptive Branching Engine ──────────────────

/**
 * Returns the branching rules that determine which questions to skip
 * based on org_profile answers. This dramatically reduces the question count
 * for smaller or less complex organizations.
 */
export function getBranchingRules(): BranchingRule[] {
  return [
    // If employee count < 50, skip advanced governance committee questions
    {
      trigger_question: 'Q0003', // employee count
      trigger_values: ['1-50'],
      skip_questions: ['Q0076', 'Q0077', 'Q0078', 'Q0095', 'Q0093'],
    },
    // If no cloud infrastructure, skip cloud-specific questions
    {
      trigger_question: 'Q0014', // cloud infrastructure
      trigger_values: [['On-premises only']],
      skip_questions: ['Q0455', 'Q0468', 'Q0469', 'Q0470', 'Q0482', 'Q0489', 'Q0497'],
    },
    // If no subsidiaries, skip multi-entity governance
    {
      trigger_question: 'Q0013', // subsidiaries
      trigger_values: [false],
      skip_questions: ['Q0044'],
    },
    // If not regulated by SAMA, skip SAMA-specific compliance
    {
      trigger_question: 'Q0006', // sector
      trigger_values: [['Technology', 'Manufacturing', 'Retail', 'Construction', 'Education', 'Other']],
      skip_questions: ['Q0154', 'Q0166'],
    },
    // If no payment card processing, skip PCI questions
    {
      trigger_question: 'Q0035', // PCI DSS scope
      trigger_values: [false],
      skip_questions: [],  // No dedicated PCI questions currently
    },
    // If no international operations (GDPR), skip cross-border privacy
    {
      trigger_question: 'Q0032', // GDPR applicable
      trigger_values: [false],
      skip_questions: ['Q0407', 'Q0423', 'Q0434'],
    },
    // If no vendors, skip entire vendor category deep-dive
    {
      trigger_question: 'Q0302', // vendor count
      trigger_values: ['1-10'],
      skip_questions: [
        'Q0308', 'Q0315', 'Q0316', 'Q0317', 'Q0318',
        'Q0322', 'Q0329', 'Q0330', 'Q0331', 'Q0336', 'Q0337', 'Q0338',
      ],
    },
    // If no GRC program exists, skip advanced maturity questions
    {
      trigger_question: 'Q0016', // GRC program exists
      trigger_values: ['No program exists', 'Ad-hoc processes'],
      skip_questions: [
        'Q0082', 'Q0087', 'Q0093', 'Q0094', 'Q0098', 'Q0099', 'Q0100',
        'Q0141', 'Q0142', 'Q0143', 'Q0144',
      ],
    },
    // If no BCP program, skip advanced BCP testing questions
    {
      trigger_question: 'Q0251', // BCM program
      trigger_values: [1], // scale 1 = not at all
      skip_questions: [
        'Q0263', 'Q0264', 'Q0275', 'Q0279', 'Q0286', 'Q0288',
      ],
    },
    // If no internal audit function, skip deep audit questions
    {
      trigger_question: 'Q0351', // internal audit function
      trigger_values: [false],
      skip_questions: [
        'Q0357', 'Q0358', 'Q0362', 'Q0368', 'Q0369',
        'Q0373', 'Q0378', 'Q0380', 'Q0383', 'Q0388',
      ],
    },
    // If not using AI/ML, skip AI governance questions
    {
      trigger_question: 'Q0043', // AI/ML in business
      trigger_values: [false],
      skip_questions: ['Q0488'],
    },
    // If not transferring data outside KSA, skip cross-border transfer deep-dive
    {
      trigger_question: 'Q0406', // transfer data outside KSA
      trigger_values: [false],
      skip_questions: ['Q0407', 'Q0423', 'Q0434'],
    },
  ];
}

/**
 * Given org_profile responses, compute which questions to skip.
 * Returns a Set of question_ids to exclude from the assessment.
 */
export function computeSkipSet(
  responses: { question_id: string; answer: unknown }[]
): Set<string> {
  const rules = getBranchingRules();
  const skipSet = new Set<string>();
  const answerMap = new Map<string, unknown>();

  for (const r of responses) {
    answerMap.set(r.question_id, r.answer);
  }

  for (const rule of rules) {
    const answer = answerMap.get(rule.trigger_question);
    if (answer === undefined) continue;

    for (const triggerVal of rule.trigger_values) {
      let matches = false;

      if (Array.isArray(triggerVal) && Array.isArray(answer)) {
        matches = answer.some((a: Record<string, unknown>) => triggerVal.includes(a));
      } else if (Array.isArray(triggerVal)) {
        matches = triggerVal.includes(answer);
      } else {
        matches = answer === triggerVal;
      }

      if (matches) {
        for (const qid of rule.skip_questions) {
          skipSet.add(qid);
        }
      }
    }
  }

  return skipSet;
}

/**
 * Org-profile-aware skip set: pre-populates branching from tenant org profile
 * columns so questions already answered by the profile are skipped.
 * Falls back to standard computeSkipSet for questionnaire-only answers.
 */
export async function computeSkipSetFromOrgProfile(
  tenantId: string,
  responses: { question_id: string; answer: unknown }[]
): Promise<Set<string>> {
  const skipSet = computeSkipSet(responses);

  try {
    async function resolveOrgProfile(_tenantId?: string): Promise<{ regulators: unknown[] }> { return { regulators: [] }; }
    const { query: dbQuery } = await import('../../../config/database.js');

    const tenantResult = await dbQuery(
      `SELECT org_type, legal_form, employee_count, org_size, cloud_providers,
              cross_border_ops, cross_border_data_transfer, uses_ai_ml,
              processes_payment_cards, has_ot_scada, has_iot_devices,
              has_ciso, has_dpo, has_board_committee, has_risk_committee,
              has_audit_committee, critical_infrastructure, processes_personal_data
       FROM tenants WHERE tenant_id = $1`, [tenantId]
    );
    if (tenantResult.rows.length === 0) return skipSet;
    const t = getFirstRow(tenantResult)!;

    const empCount = t.employee_count || parseInt(t.org_size) || 50;

    if (empCount <= 50) {
      ['Q0076', 'Q0077', 'Q0078', 'Q0095', 'Q0093'].forEach(q => skipSet.add(q));
    }

    if (!t.cloud_providers || t.cloud_providers.length === 0) {
      ['Q0455', 'Q0468', 'Q0469', 'Q0470', 'Q0482', 'Q0489', 'Q0497'].forEach(q => skipSet.add(q));
    }

    if (!t.cross_border_ops && !t.cross_border_data_transfer) {
      ['Q0407', 'Q0423', 'Q0434'].forEach(q => skipSet.add(q));
    }

    if (!t.uses_ai_ml) {
      skipSet.add('Q0488');
    }

    if (!t.processes_payment_cards) {
      skipSet.add('Q0035');
    }

    if (!t.has_board_committee && !t.has_risk_committee && !t.has_audit_committee && empCount <= 50) {
      ['Q0076', 'Q0077', 'Q0078'].forEach(q => skipSet.add(q));
    }

    if (t.org_type === 'startup' || t.org_type === 'sme') {
      ['Q0082', 'Q0087', 'Q0093', 'Q0094', 'Q0098', 'Q0099', 'Q0100'].forEach(q => skipSet.add(q));
    }

    const _nonSamaTypes = ['technology', 'manufacturing', 'retail', 'construction', 'education'];
    if (t.org_type && !['government', 'semi_government'].includes(t.org_type)) {
      const resolution = await resolveOrgProfile(tenantId);

      const hasSama = resolution.regulators.some(r => r.regulatorId === 'REG-KSA-SAMA');
      if (!hasSama) {
        ['Q0154', 'Q0166'].forEach(q => skipSet.add(q));
      }
    }
  } catch { /* non-fatal: fall back to standard skip set */ }

  return skipSet;
}
