import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

export type ReflectionType = 'process' | 'outcome' | 'decision' | 'learning' | 'pattern'
  | 'low_effectiveness' | 'stalled_milestone' | 'repeat_ownership_gap' | 'pattern_detected';

export interface ReflectionNote {
  id?: string;
  tenantId: string;
  moduleCode?: string;
  reflectionType: ReflectionType;
  title?: string;
  body?: string;
  createdAt?: string;
  reflectionId?: string;
  scope?: Record<string, unknown>;
  patternSummary?: string;
  evidenceCases?: string[];
  confidence?: number;
  sampleSize?: number;
  generatedAt?: string;
  reviewedAt?: string;
}

export interface LessonCandidate {
  reflectionId?: string;
  title?: string;
  lessonText?: string;
  confidence: number;
  sourceModule?: string;
  candidateId?: string;
  tenantId?: string;
  situation?: string;
  whatHappened?: string;
  rootCausePattern?: string;
  bestActionNextTime?: string;
  sampleSize?: number;
  scope?: Record<string, unknown>;
  supportingCases?: string[];
  proposedAdaptiveChanges?: Record<string, unknown>;
  needsApproval?: boolean;
  status?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatternSignal {
  patternType: string;
  moduleCode?: string;
  description?: string;
  frequency?: number;
  confidence: number;
  signalId?: string;
  tenantId?: string;
  patternKey?: string;
  occurrenceCount?: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  supportingCases?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export async function getReflections(tenantId: string, moduleCode?: string): Promise<ReflectionNote[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT id, module_code, reflection_type, title, body, created_at FROM "${schema}".governance_os_reflections`;
  const params: string[] = [];
  if (moduleCode) {
    sql += ` WHERE module_code = $1`;
    params.push(moduleCode);
  }
  sql += ` ORDER BY created_at DESC`;
  const { rows } = await safeQuery(sql, params);
  return rows.map((r: GenericRow) => ({
    id: r.id, tenantId, moduleCode: r.module_code,
    reflectionType: r.reflection_type, title: r.title,
    body: r.body, createdAt: r.created_at,
  }));
}

export async function createReflection(tenantId: string, input: Partial<ReflectionNote>): Promise<ReflectionNote> {
  const schema = tenantSchema(tenantId);
  const id = crypto.randomUUID?.() ?? `ref-${Date.now()}`;
  await safeQuery(
    `INSERT INTO "${schema}".governance_os_reflections (id, module_code, reflection_type, title, body, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [id, input.moduleCode ?? 'general', input.reflectionType ?? 'learning', input.title ?? '', input.body ?? ''],
  );
  return {
    id, tenantId, moduleCode: input.moduleCode ?? 'general',
    reflectionType: (input.reflectionType ?? 'learning') as ReflectionType,
    title: input.title ?? '', body: input.body ?? '',
    createdAt: new Date().toISOString(),
  };
}

export async function getLessonCandidates(_tenantId: string): Promise<LessonCandidate[]> {
  return [];
}

export async function detectPatterns(_tenantId: string): Promise<PatternSignal[]> {
  return [];
}
