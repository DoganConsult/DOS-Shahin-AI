import { withTenantClient } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

/**
 * Assessment Templates domain — backs the Shahin compliance vertical's
 * /api/assessment-templates surface. Reads/writes the per-tenant
 * `assessment_templates`, `assessments`, and `assessment_responses`
 * tables in the tenant_<id> schema (see migration/inventory/
 * table-schemas.extracted.json @24868, @25015, @24812).
 *
 * Tenant isolation: every call goes through withTenantClient(tenantId)
 * which sets `search_path TO "tenant_<id>", public`. The tenantId is
 * regex-validated by tenantSchema() before any SQL is constructed
 * (packages/dos-db/src/tenant.ts:40).
 *
 * AI guide / AI summary are resolved from columns that already exist
 * in the live schema (`assessment_templates.ai_guidance jsonb` and
 * each `question_bank[i].aiGuide` jsonb), so no new schema is added.
 */

export interface TemplateListItem {
  id: string;
  template_id: string;
  name_en: string;
  name_ar: string;
  framework_id: string | null;
  scoring_methodology: string;
  category: string | null;
  industry: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  description_en: string | null;
  description_ar: string | null;
  applicable_sectors: unknown;
  tags: unknown;
  is_system: boolean | null;
  enabled: boolean | null;
  questionCount: number;
}

export interface TemplateDetail extends TemplateListItem {
  weights: Record<string, unknown>;
  question_bank: unknown[];
  ai_guidance: Record<string, unknown>;
  pack_id: string | null;
  created_at: string | null;
}

export interface UpsertTemplateInput {
  template_id?: string;
  name_en: string;
  name_ar?: string;
  framework_id?: string;
  scoring_methodology?: string;
  weights?: Record<string, unknown>;
  question_bank?: unknown[];
  pack_id?: string;
  category?: string;
  industry?: string;
  difficulty?: string;
  estimated_minutes?: number;
  description_en?: string;
  description_ar?: string;
  applicable_sectors?: string[];
  tags?: string[];
  is_system?: boolean;
  enabled?: boolean;
  ai_guidance?: Record<string, unknown>;
}

const ID_RE = /^[A-Za-z0-9_.:-]{1,100}$/;
function safeTemplateId(id: string): string {
  if (!ID_RE.test(id)) {
    throw Object.assign(new Error('Invalid template id'), { statusCode: 400, code: 'INVALID_TEMPLATE_ID' });
  }
  return id;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rowToList(row: any): TemplateListItem {
  const qb = Array.isArray(row.question_bank) ? row.question_bank : [];
  return {
    id: row.template_id,
    template_id: row.template_id,
    name_en: row.name_en,
    name_ar: row.name_ar,
    framework_id: row.framework_id,
    scoring_methodology: row.scoring_methodology,
    category: row.category,
    industry: row.industry,
    difficulty: row.difficulty,
    estimated_minutes: row.estimated_minutes,
    description_en: row.description_en,
    description_ar: row.description_ar,
    applicable_sectors: row.applicable_sectors,
    tags: row.tags,
    is_system: row.is_system,
    enabled: row.enabled,
    questionCount: qb.length,
  };
}

export async function listTemplates(
  tenantId: string,
  filters: { category?: string; industry?: string; difficulty?: string; search?: string; sector?: string },
): Promise<TemplateListItem[]> {
  return withTenantClient(tenantId, async (client) => {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.category) { conditions.push(`category = $${idx++}`); params.push(filters.category); }
    if (filters.industry) { conditions.push(`industry = $${idx++}`); params.push(filters.industry); }
    if (filters.difficulty) { conditions.push(`difficulty = $${idx++}`); params.push(filters.difficulty); }
    if (filters.sector && filters.sector !== 'all') {
      conditions.push(`(applicable_sectors @> to_jsonb(ARRAY[$${idx}]::text[]) OR applicable_sectors @> '["all"]'::jsonb)`);
      params.push(filters.sector);
      idx++;
    }
    if (filters.search) {
      conditions.push(`(name_en ILIKE $${idx} OR name_ar ILIKE $${idx} OR description_en ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }
    try {
      const r = await client.query(
        `SELECT template_id, name_en, name_ar, framework_id, scoring_methodology, weights, question_bank,
                pack_id, category, industry, difficulty, estimated_minutes, description_en, description_ar,
                applicable_sectors, tags, is_system, enabled
         FROM assessment_templates
         WHERE ${conditions.join(' AND ')}
         ORDER BY name_en ASC
         LIMIT 1000`,
        params,
      );
      return r.rows.map(rowToList);
    } catch (err) {
      logger.error('[compliance-controls-service] Failed to list assessment templates', { tenantId, error: toErrorMessage(err) });
      throw err;
    }
  });
}

export async function listCategories(tenantId: string): Promise<Array<{ id: string; nameEn: string; nameAr: string; key: string; label: string; questionCount: number }>> {
  return withTenantClient(tenantId, async (client) => {
    try {
      const r = await client.query(
        `SELECT category AS key,
                COUNT(*)::int AS template_count,
                COALESCE(SUM(jsonb_array_length(COALESCE(question_bank, '[]'::jsonb))), 0)::int AS question_count
         FROM assessment_templates
         WHERE category IS NOT NULL
         GROUP BY category
         ORDER BY category ASC`,
      );
      return r.rows.map((row: any) => ({
        id: row.key,
        key: row.key,
        nameEn: row.key,
        nameAr: row.key,
        label: row.key,
        questionCount: row.question_count,
      }));
    } catch (err) {
      logger.error('[compliance-controls-service] Failed to list template categories', { tenantId, error: toErrorMessage(err) });
      throw err;
    }
  });
}

export async function getTemplateById(tenantId: string, id: string): Promise<TemplateListItem | null> {
  const tid = safeTemplateId(id);
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(
      `SELECT template_id, name_en, name_ar, framework_id, scoring_methodology, weights, question_bank,
              pack_id, category, industry, difficulty, estimated_minutes, description_en, description_ar,
              applicable_sectors, tags, is_system, enabled
       FROM assessment_templates WHERE template_id = $1`,
      [tid],
    );
    return r.rows[0] ? rowToList(r.rows[0]) : null;
  });
}

export async function getTemplateDetail(tenantId: string, id: string): Promise<TemplateDetail | null> {
  const tid = safeTemplateId(id);
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(
      `SELECT template_id, name_en, name_ar, framework_id, scoring_methodology, weights, question_bank,
              pack_id, category, industry, difficulty, estimated_minutes, description_en, description_ar,
              applicable_sectors, tags, is_system, enabled, ai_guidance, created_at
       FROM assessment_templates WHERE template_id = $1`,
      [tid],
    );
    const row = r.rows[0];
    if (!row) return null;
    const base = rowToList(row);
    return {
      ...base,
      weights: row.weights || {},
      question_bank: Array.isArray(row.question_bank) ? row.question_bank : [],
      ai_guidance: row.ai_guidance || {},
      pack_id: row.pack_id,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    };
  });
}

export async function getTemplateQuestions(tenantId: string, id: string): Promise<unknown[] | null> {
  const tid = safeTemplateId(id);
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(`SELECT question_bank FROM assessment_templates WHERE template_id = $1`, [tid]);
    if (r.rows.length === 0) return null;
    return Array.isArray(r.rows[0].question_bank) ? r.rows[0].question_bank : [];
  });
}

export async function getQuestionAIGuide(
  tenantId: string,
  templateId: string,
  questionId: string,
): Promise<{ what_en?: string; what_ar?: string; how_en?: string; how_ar?: string; scoring_en?: string; scoring_ar?: string; references?: string[] } | null> {
  const tid = safeTemplateId(templateId);
  const qid = safeTemplateId(questionId);
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(
      `SELECT question_bank, ai_guidance FROM assessment_templates WHERE template_id = $1`,
      [tid],
    );
    if (r.rows.length === 0) return null;
    const qb: any[] = Array.isArray(r.rows[0].question_bank) ? r.rows[0].question_bank : [];
    const aiTop: Record<string, any> = (r.rows[0].ai_guidance && typeof r.rows[0].ai_guidance === 'object') ? r.rows[0].ai_guidance : {};
    const q = qb.find((x: any) => x && (x.qid === qid || x.id === qid || x.question_id === qid));
    const fromQuestion = q?.aiGuide || q?.ai_guide || null;
    const fromTemplate = aiTop?.questions?.[qid] || aiTop?.[qid] || null;
    const guide = fromQuestion || fromTemplate;
    if (!guide || typeof guide !== 'object') return null;
    return guide;
  });
}

export async function getTenantConfig(tenantId: string): Promise<Array<{ templateId: string; enabled: boolean }>> {
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(`SELECT template_id, enabled FROM assessment_templates ORDER BY template_id ASC`);
    return r.rows.map((row: any) => ({ templateId: row.template_id, enabled: row.enabled !== false }));
  });
}

export async function updateTenantConfig(
  tenantId: string,
  configs: Array<{ templateId: string; enabled: boolean }>,
): Promise<number> {
  return withTenantClient(tenantId, async (client) => {
    let count = 0;
    await client.query('BEGIN');
    try {
      for (const c of configs) {
        const tid = safeTemplateId(c.templateId);
        const r = await client.query(`UPDATE assessment_templates SET enabled = $2 WHERE template_id = $1`, [tid, c.enabled]);
        count += r.rowCount || 0;
      }
      await client.query('COMMIT');
      return count;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}

export async function createTemplate(tenantId: string, input: UpsertTemplateInput): Promise<TemplateListItem> {
  const tid = safeTemplateId(input.template_id || `tpl_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(
      `INSERT INTO assessment_templates
        (template_id, name_en, name_ar, framework_id, scoring_methodology, weights, question_bank, pack_id,
         category, industry, difficulty, estimated_minutes, description_en, description_ar, applicable_sectors,
         tags, is_system, enabled, ai_guidance)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18,$19::jsonb)
       RETURNING template_id, name_en, name_ar, framework_id, scoring_methodology, weights, question_bank,
                 pack_id, category, industry, difficulty, estimated_minutes, description_en, description_ar,
                 applicable_sectors, tags, is_system, enabled`,
      [
        tid,
        input.name_en,
        input.name_ar ?? input.name_en,
        input.framework_id ?? null,
        input.scoring_methodology ?? 'maturity_1_5',
        JSON.stringify(input.weights ?? {}),
        JSON.stringify(input.question_bank ?? []),
        input.pack_id ?? null,
        input.category ?? 'general',
        input.industry ?? 'all',
        input.difficulty ?? 'intermediate',
        input.estimated_minutes ?? 60,
        input.description_en ?? '',
        input.description_ar ?? '',
        JSON.stringify(input.applicable_sectors ?? ['all']),
        JSON.stringify(input.tags ?? []),
        input.is_system ?? false,
        input.enabled ?? true,
        JSON.stringify(input.ai_guidance ?? {}),
      ],
    );
    return rowToList(r.rows[0]);
  });
}

export async function updateTemplate(
  tenantId: string,
  id: string,
  patch: Partial<UpsertTemplateInput>,
): Promise<TemplateListItem | null> {
  const tid = safeTemplateId(id);
  const allowed: Record<string, 'jsonb' | 'text' | 'int' | 'bool'> = {
    name_en: 'text', name_ar: 'text', framework_id: 'text', scoring_methodology: 'text',
    weights: 'jsonb', question_bank: 'jsonb', pack_id: 'text', category: 'text', industry: 'text',
    difficulty: 'text', estimated_minutes: 'int', description_en: 'text', description_ar: 'text',
    applicable_sectors: 'jsonb', tags: 'jsonb', is_system: 'bool', enabled: 'bool', ai_guidance: 'jsonb',
  };
  const sets: string[] = [];
  const params: unknown[] = [tid];
  let idx = 2;
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in allowed) || v === undefined) continue;
    const cast = allowed[k];
    if (cast === 'jsonb') {
      sets.push(`${k} = $${idx}::jsonb`);
      params.push(JSON.stringify(v));
    } else {
      sets.push(`${k} = $${idx}`);
      params.push(v);
    }
    idx++;
  }
  if (sets.length === 0) return getTemplateById(tenantId, id);
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(
      `UPDATE assessment_templates SET ${sets.join(', ')} WHERE template_id = $1
       RETURNING template_id, name_en, name_ar, framework_id, scoring_methodology, weights, question_bank,
                 pack_id, category, industry, difficulty, estimated_minutes, description_en, description_ar,
                 applicable_sectors, tags, is_system, enabled`,
      params,
    );
    return r.rows[0] ? rowToList(r.rows[0]) : null;
  });
}

export async function deleteTemplate(tenantId: string, id: string): Promise<boolean> {
  const tid = safeTemplateId(id);
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(`DELETE FROM assessment_templates WHERE template_id = $1`, [tid]);
    return (r.rowCount || 0) > 0;
  });
}

// ── Assessments derived from templates ─────────────────────────────────

export interface StartedAssessment {
  id: string;
  assessment_id: string;
  title: string;
  status: string;
  templateId: string;
  framework_id: string | null;
  createdAt: string;
}

export async function startAssessmentFromTemplate(
  tenantId: string,
  templateId: string,
  userId: string | undefined,
  title?: string,
): Promise<StartedAssessment | null> {
  const tid = safeTemplateId(templateId);
  return withTenantClient(tenantId, async (client) => {
    const t = await client.query(
      `SELECT template_id, name_en, framework_id FROM assessment_templates WHERE template_id = $1`,
      [tid],
    );
    if (t.rows.length === 0) return null;
    const tpl = t.rows[0];
    const finalTitle = (title && title.trim()) || `${tpl.name_en} — ${new Date().toISOString().slice(0, 10)}`;
    const r = await client.query(
      `INSERT INTO assessments
         (framework_id, title, status, score, created_by, assessment_type, tenant_id, assessor_id, assessed_at)
       VALUES ($1, $2, 'in_progress', 0, $3, 'framework_assessment', $4, $3, NOW())
       RETURNING assessment_id, framework_id, title, status, score, created_at`,
      [tpl.framework_id ?? 'unspecified', finalTitle, userId ?? 'system', tenantId],
    );
    const row = r.rows[0];
    return {
      id: row.assessment_id,
      assessment_id: row.assessment_id,
      title: row.title,
      status: row.status,
      templateId: tid,
      framework_id: row.framework_id,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  });
}

export async function assessmentExists(tenantId: string, assessmentId: string): Promise<boolean> {
  if (!UUID_RE.test(assessmentId)) return false;
  return withTenantClient(tenantId, async (client) => {
    const r = await client.query(`SELECT 1 FROM assessments WHERE assessment_id = $1 LIMIT 1`, [assessmentId]);
    return r.rows.length > 0;
  });
}

export async function upsertResponse(
  tenantId: string,
  assessmentId: string,
  questionId: string,
  answer: unknown,
  score: number,
  userId: string | undefined,
): Promise<void> {
  if (!UUID_RE.test(assessmentId)) {
    throw Object.assign(new Error('Invalid assessment id'), { statusCode: 400, code: 'INVALID_ASSESSMENT_ID' });
  }
  const qid = safeTemplateId(questionId);
  await withTenantClient(tenantId, async (client) => {
    await client.query(
      `INSERT INTO assessment_responses (assessment_id, question_id, answer, score, responded_by)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (assessment_id, question_id) DO UPDATE
         SET answer = EXCLUDED.answer,
             score = EXCLUDED.score,
             responded_by = EXCLUDED.responded_by,
             created_at = NOW()`,
      [assessmentId, qid, JSON.stringify(answer ?? null), score, userId ?? 'system'],
    ).catch(async (err) => {
      // Some deployments lack the unique (assessment_id, question_id) index;
      // fall back to manual upsert in that case so the FE round-trip still works.
      if (/no unique or exclusion constraint/i.test(String(err?.message))) {
        const upd = await client.query(
          `UPDATE assessment_responses SET answer = $3::jsonb, score = $4, responded_by = $5, created_at = NOW()
           WHERE assessment_id = $1 AND question_id = $2`,
          [assessmentId, qid, JSON.stringify(answer ?? null), score, userId ?? 'system'],
        );
        if ((upd.rowCount || 0) === 0) {
          await client.query(
            `INSERT INTO assessment_responses (assessment_id, question_id, answer, score, responded_by)
             VALUES ($1, $2, $3::jsonb, $4, $5)`,
            [assessmentId, qid, JSON.stringify(answer ?? null), score, userId ?? 'system'],
          );
        }
      } else {
        throw err;
      }
    });
  });
}

export interface ProgressReport {
  assessmentId: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercent: number;
  score: number;
}

async function findTemplateForAssessment(client: any, assessmentId: string): Promise<{ template_id: string; questions: any[]; ai_guidance: any; framework_id: string | null } | null> {
  // Assessments don't link directly to a template_id column; resolve by
  // framework_id of the assessment matching the template's framework_id.
  const a = await client.query(`SELECT framework_id FROM assessments WHERE assessment_id = $1`, [assessmentId]);
  if (a.rows.length === 0) return null;
  const fwId = a.rows[0].framework_id;
  const t = await client.query(
    `SELECT template_id, question_bank, ai_guidance, framework_id
     FROM assessment_templates
     WHERE framework_id = $1
     ORDER BY is_system DESC, created_at DESC NULLS LAST
     LIMIT 1`,
    [fwId],
  );
  if (t.rows.length === 0) return null;
  return {
    template_id: t.rows[0].template_id,
    questions: Array.isArray(t.rows[0].question_bank) ? t.rows[0].question_bank : [],
    ai_guidance: t.rows[0].ai_guidance || {},
    framework_id: t.rows[0].framework_id,
  };
}

export async function getAssessmentProgress(tenantId: string, assessmentId: string): Promise<ProgressReport | null> {
  if (!UUID_RE.test(assessmentId)) return null;
  return withTenantClient(tenantId, async (client) => {
    const tpl = await findTemplateForAssessment(client, assessmentId);
    if (!tpl) return null;
    const total = tpl.questions.length || 0;
    const r = await client.query(
      `SELECT COUNT(*)::int AS answered, COALESCE(AVG(NULLIF(score, 0)), 0)::numeric AS avg_score
       FROM assessment_responses WHERE assessment_id = $1`,
      [assessmentId],
    );
    const answered = r.rows[0]?.answered || 0;
    const score = Number(r.rows[0]?.avg_score || 0);
    return {
      assessmentId,
      totalQuestions: total,
      answeredQuestions: answered,
      completionPercent: total > 0 ? Math.round((answered / total) * 1000) / 10 : 0,
      score,
    };
  });
}

export interface AISummary {
  assessmentId: string;
  summary: string;
  recommendations: string[];
  score: number;
  signals: Array<{ questionId: string; score: number; guide?: Record<string, unknown> }>;
}

export async function getAssessmentAISummary(tenantId: string, assessmentId: string): Promise<AISummary | null> {
  if (!UUID_RE.test(assessmentId)) return null;
  return withTenantClient(tenantId, async (client) => {
    const tpl = await findTemplateForAssessment(client, assessmentId);
    if (!tpl) return null;
    const responses = await client.query(
      `SELECT question_id, score FROM assessment_responses WHERE assessment_id = $1`,
      [assessmentId],
    );
    const aiTop: Record<string, any> = (tpl.ai_guidance && typeof tpl.ai_guidance === 'object') ? tpl.ai_guidance : {};
    const byId = new Map<string, any>();
    for (const q of tpl.questions) {
      if (q && (q.qid || q.id || q.question_id)) {
        byId.set(String(q.qid || q.id || q.question_id), q);
      }
    }
    const signals: AISummary['signals'] = [];
    let totalScore = 0;
    let scored = 0;
    for (const row of responses.rows) {
      const q = byId.get(row.question_id);
      const guide = q?.aiGuide || q?.ai_guide || aiTop?.questions?.[row.question_id] || aiTop?.[row.question_id] || undefined;
      signals.push({ questionId: row.question_id, score: Number(row.score || 0), guide });
      totalScore += Number(row.score || 0);
      scored += 1;
    }
    const avg = scored > 0 ? totalScore / scored : 0;
    const recommendations: string[] = [];
    for (const s of signals) {
      if (s.score < 3) {
        const rec = (s.guide && typeof s.guide === 'object'
          ? (s.guide as any).how_en || (s.guide as any).scoring_en
          : null) as string | null;
        if (rec) recommendations.push(`${s.questionId}: ${rec}`);
      }
    }
    const summarySource = (aiTop?.summary && typeof aiTop.summary === 'string') ? aiTop.summary : null;
    const summary = summarySource
      || `Assessment ${assessmentId.slice(0, 8)}: ${signals.length} answered question(s); avg score ${avg.toFixed(2)}.`;
    return {
      assessmentId,
      summary,
      recommendations,
      score: Math.round(avg * 100) / 100,
      signals,
    };
  });
}
