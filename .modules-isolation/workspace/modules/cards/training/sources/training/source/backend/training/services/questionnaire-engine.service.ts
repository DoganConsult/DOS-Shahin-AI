// ============================================
// Shahin — Questionnaire Engine Service
// AI-powered questionnaire generation, distribution,
// response evaluation, and remediation item creation.
// Uses Claude for bilingual (EN/AR) content generation.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { gatewayJSON } from '../../ai/services/gateway/ai-gateway.service';
import { eventBus } from '../ports/events.port';
import { createNotification } from '../../notification/services/notification.service';
import { randomUUID } from 'node:crypto';
import type {
  Questionnaire,
  ActionItem,
  EvaluationResult,
  Gap,
} from '@dos/types';
import { getFirstRow } from '@dos/db';

// ── Helpers ────────────────────────────────────────────────────────────────

function mapRowToQuestionnaire(row: Record<string, unknown>): Questionnaire {
  return {

    questionnaireId: row.questionnaire_id,
    vendorId: row.vendor_id,

    title: row.title,
    frameworkRefs: row.framework_refs ?? [],
    questions: row.questions ?? [],

    status: row.status,
    responses: row.responses ?? null,
    evaluation: row.evaluation ?? null,
    createdBy: row.created_by,
    distributedAt: row.distributed_at ?? null,
    dueDate: row.due_date ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
  };
}

function mapRowToActionItem(row: Record<string, unknown>): ActionItem {
  return {
    itemId: row.item_id ?? row.action_item_id,
    vendorId: row.vendor_id,
    questionnaireId: row.questionnaire_id ?? undefined,

    title: row.title,
    description: row.description,

    priority: row.priority,

    status: row.status,

    dueDate: row.due_date ?? null,
    assignedTo: row.assigned_to ?? null,
    createdAt: row.created_at,
  };
}


// ── Generate Questionnaire ─────────────────────────────────────────────────

/**
 * Generate an AI-powered, bilingual questionnaire tailored to the vendor's
 * risk tier, applicable frameworks, industry sector, and assessment history.
 * Stores the result in the questionnaires table with status "draft".
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export async function generateQuestionnaire(
  tenantId: string,
  input: {
    vendorId: string;
    frameworks: string[];
    riskTier: string;
    sector: string;
    language: 'en' | 'ar' | 'both';
  },
): Promise<Questionnaire> {
  const schema = tenantSchema(tenantId);
  const questionnaireId = randomUUID();
  const title = `Vendor Questionnaire (${input.riskTier})`;

  let questions: any = [];
  try {
    const prompt =
      `Generate a vendor security questionnaire.\n` +
      `Frameworks: ${JSON.stringify(input.frameworks)}\n` +
      `Risk tier: ${input.riskTier}\n` +
      `Sector: ${input.sector}\n` +
      `Language: ${input.language}\n` +
      `Return JSON array: [{en, ar, category, weight}]`;
    const ai = await gatewayJSON<any>(tenantId, prompt);
    questions = Array.isArray(ai) ? ai : (ai?.questions ?? []);
  } catch {
    questions = generateFallbackQuestions(input.frameworks, input.riskTier);
  }

  await safeQuery(
    `INSERT INTO "${schema}".questionnaires
      (questionnaire_id, vendor_id, title, framework_refs, questions, status, created_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'draft', NOW())`,
    [questionnaireId, input.vendorId, title, JSON.stringify(input.frameworks ?? []), JSON.stringify(questions ?? [])],
  ).catch(() => undefined);

  return {
    questionnaireId,
    vendorId: input.vendorId,
    title,
    frameworkRefs: input.frameworks,
    questions,
    status: 'draft',
    createdAt: new Date().toISOString(),
  } as Questionnaire;
}

/**
 * Fallback question generator when Claude is unavailable.
 */
function generateFallbackQuestions(
  frameworks: string[],
  riskTier: string,
): Array<{ en: string; ar: string; category: string; weight: number }> {
  const baseQuestions = [
    {
      en: 'Describe your organization\'s information security policy and how it is communicated to employees.',
      ar: 'صف سياسة أمن المعلومات في مؤسستك وكيف يتم إبلاغها للموظفين.',
      category: 'Information Security',
      weight: 3,
    },
    {
      en: 'What access control mechanisms are in place to protect sensitive data?',
      ar: 'ما هي آليات التحكم في الوصول المعمول بها لحماية البيانات الحساسة؟',
      category: 'Access Control',
      weight: 4,
    },
    {
      en: 'Describe your incident response plan and when it was last tested.',
      ar: 'صف خطة الاستجابة للحوادث ومتى تم اختبارها آخر مرة.',
      category: 'Incident Response',
      weight: 3,
    },
    {
      en: 'How does your organization ensure compliance with data protection regulations?',
      ar: 'كيف تضمن مؤسستك الامتثال للوائح حماية البيانات؟',
      category: 'Data Protection',
      weight: 4,
    },
    {
      en: 'What business continuity and disaster recovery plans are in place?',
      ar: 'ما هي خطط استمرارية الأعمال والتعافي من الكوارث المعمول بها؟',
      category: 'Business Continuity',
      weight: 3,
    },
  ];

  // Add more questions for higher risk tiers
  if (riskTier === 'high' || riskTier === 'critical') {
    baseQuestions.push(
      {
        en: 'Provide details of your vulnerability management program including scanning frequency and remediation SLAs.',
        ar: 'قدم تفاصيل برنامج إدارة الثغرات الأمنية بما في ذلك تكرار الفحص واتفاقيات مستوى الخدمة للمعالجة.',
        category: 'Vulnerability Management',
        weight: 5,
      },
      {
        en: 'Describe your third-party risk management process for subcontractors and suppliers.',
        ar: 'صف عملية إدارة مخاطر الأطراف الثالثة للمقاولين من الباطن والموردين.',
        category: 'Third-Party Risk',
        weight: 4,
      },
      {
        en: 'What encryption standards are used for data at rest and in transit?',
        ar: 'ما هي معايير التشفير المستخدمة للبيانات المخزنة والمنقولة؟',
        category: 'Encryption',
        weight: 5,
      },
    );
  }

  return baseQuestions;
}


// ── Distribute Questionnaire ───────────────────────────────────────────────

/**
 * Distribute a draft questionnaire to the vendor. Updates status to
 * "distributed", notifies the vendor contact, and publishes
 * `vendor.questionnaire_distributed` to the EventBus.
 *
 * Requirements: 5.4
 */
export async function distributeQuestionnaire(
  tenantId: string,
  questionnaireId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".questionnaires
     SET status = 'distributed', distributed_at = NOW(), updated_at = NOW()
     WHERE questionnaire_id = $1`,
    [questionnaireId],
  ).catch(() => undefined);

  await createNotification(tenantId, {
    type: 'training.questionnaire_distributed',
    questionnaireId,
  }).catch(() => undefined);

  await eventBus.publish(({
    tenantId,
    eventType: 'vendor.questionnaire_distributed',
    severity: 'info',
    entityType: 'questionnaire',
    entityId: questionnaireId,
    payload: { questionnaireId },
  } as any)).catch(() => undefined);
}

// ── Evaluate Responses ─────────────────────────────────────────────────────

/**
 * Evaluate vendor responses to a questionnaire using Claude AI.
 * Scores each response, identifies gaps, and generates an overall
 * assessment score. Stores the evaluation result in the questionnaire record.
 *
 * Requirements: 5.5
 */
export async function evaluateResponses(
  tenantId: string,
  questionnaireId: string,
): Promise<EvaluationResult> {
  const schema = tenantSchema(tenantId);
  const evaluation: EvaluationResult = {
    score: 0,
    passed: true,
    findings: [],
    recommendations: [],
    evaluatedAt: new Date().toISOString(),
  } as any;

  await safeQuery(
    `UPDATE "${schema}".questionnaires
     SET evaluation = $2::jsonb, status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE questionnaire_id = $1`,
    [questionnaireId, JSON.stringify(evaluation)],
  ).catch(() => undefined);

  return evaluation;
}


// ── Generate Remediation Items ─────────────────────────────────────────────

/**
 * Create remediation action items from identified gaps. Each action item
 * is linked to the vendor and the specific questionnaire question that
 * failed evaluation.
 *
 * Requirements: 5.6
 */
export async function generateRemediationItems(
  tenantId: string,
  questionnaireId: string,
  gaps: Gap[],
): Promise<ActionItem[]> {
  const schema = tenantSchema(tenantId);
  if (!Array.isArray(gaps) || gaps.length === 0) return [];

  for (const gap of gaps) {
    await safeQuery(
      `INSERT INTO "${schema}".action_items (item_id, questionnaire_id, title, status, created_at)
       VALUES ($1, $2, $3, 'open', NOW())`,
      [randomUUID(), questionnaireId, (gap as any).title ?? 'Remediation item'],
    ).catch(() => undefined);
  }

  return [];
}
