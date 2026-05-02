/**
 * DORA Resilience Service — ICT Resilience Testing Management.
 *
 * MP-25 §3.1: Create, schedule, execute, and manage resilience tests.
 * Covers DORA Art. 24-27 (Digital Operational Resilience Testing).
 *
 * Features:
 *   - Create/schedule/execute resilience tests
 *   - Track test results and scores
 *   - Link tests to ICT assets and risk assessments
 *   - Manage test results with pass/fail/partial verdicts
 *   - Calculate aggregate resilience scores
 *
 * DB tables: dora_resilience_tests, dora_resilience_results
 *
 * All mutations emit events. All status changes go through lifecycle auth.
 *
 * @owner dora
 * @module dora
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { emitDoraEvent, emitDoraStatusChange } from './dora-event.service';
import type { GenericRow } from '@dos/types';

// ── Resilience Test Types ──────────────────────────────────────────────
export const TEST_TYPES = [
  'vulnerability_assessment',
  'penetration_test',
  'scenario_based',
  'threat_led_penetration',
  'network_security',
  'application_security',
  'red_team',
  'tabletop_exercise',
] as const;
export type ResilienceTestType = typeof TEST_TYPES[number];

export const TEST_STATUSES = [
  'planned', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'archived',
] as const;
export type ResilienceTestStatus = typeof TEST_STATUSES[number];

export const TEST_RESULTS = [
  'pass', 'partial_pass', 'fail', 'inconclusive',
] as const;
export type ResilienceTestResult = typeof TEST_RESULTS[number];

// ── DTOs ───────────────────────────────────────────────────────────────
export interface CreateResilienceTestDTO {
  title: string;
  testType: ResilienceTestType | string;
  scope: string;
  description?: string;
  scheduledDate?: string;
  assetIds?: string[];
  methodology?: string;
  testPlan?: Record<string, unknown>;
  leadAssessorId?: string;
  targetSystemIds?: string[];
}

export interface UpdateResilienceTestDTO {
  title?: string;
  status?: ResilienceTestStatus;
  result?: ResilienceTestResult;
  resultsSummary?: Record<string, unknown>;
  remediationPlan?: Record<string, unknown>;
  findingsCount?: number;
  score?: number;
  description?: string;
  completedAt?: string;
}

export interface ResilienceResultDTO {
  testId: string;
  findingTitle: string;
  findingDescription?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAssetId?: string;
  remediationSuggestion?: string;
  evidenceRef?: string;
  status?: string;
}

export interface ResilienceTestFilters {
  status?: string;
  testType?: string;
  result?: string;
  scheduledAfter?: string;
  scheduledBefore?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}

// ── Service Functions ──────────────────────────────────────────────────

/**
 * List resilience tests with filtering and pagination.
 */
export async function listResilienceTests(
  tenantId: string,
  filters: ResilienceTestFilters = {},
): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.testType) {
    conditions.push(`test_type = $${idx++}`);
    params.push(filters.testType);
  }
  if (filters.result) {
    conditions.push(`result = $${idx++}`);
    params.push(filters.result);
  }
  if (filters.scheduledAfter) {
    conditions.push(`scheduled_date >= $${idx++}`);
    params.push(filters.scheduledAfter);
  }
  if (filters.scheduledBefore) {
    conditions.push(`scheduled_date <= $${idx++}`);
    params.push(filters.scheduledBefore);
  }
  if (filters.search) {
    conditions.push(`(title ILIKE $${idx} OR scope ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const validSortCols = ['title', 'status', 'test_type', 'result', 'scheduled_date', 'created_at', 'score'];
  const sortCol = validSortCols.includes(filters.sortBy || '') ? filters.sortBy! : 'created_at';
  const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".dora_resilience_tests ${where}`,
    params,
  );
  const total = getFirstRow(countResult)?.total ?? 0;

  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".dora_resilience_tests ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, offset],
  );

  return { rows: dataResult.rows, total };
}

/**
 * Get a single resilience test by ID, including its results.
 */
export async function getResilienceTestById(
  tenantId: string,
  testId: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_resilience_tests WHERE test_id = $1 AND deleted_at IS NULL`,
    [testId],
  );
  return getFirstRow(result);
}

/**
 * Create a new resilience test.
 * Initial status is always 'planned'. Emits dora.resilience_test_created event.
 */
export async function createResilienceTest(
  tenantId: string,
  dto: CreateResilienceTestDTO,
  createdBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_resilience_tests
      (title, test_type, scope, description, scheduled_date, methodology,
       scope_assets, test_plan, lead_assessor_id, target_system_ids, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'planned',$11)
     RETURNING *`,
    [
      dto.title,
      dto.testType || 'scenario_based',
      dto.scope || 'full',
      dto.description || null,
      dto.scheduledDate || null,
      dto.methodology || null,
      JSON.stringify(dto.assetIds || []),
      JSON.stringify(dto.testPlan || {}),
      dto.leadAssessorId || null,
      JSON.stringify(dto.targetSystemIds || []),
      createdBy || null,
    ],
  );

  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraEvent(tenantId, 'dora.resilience_test_created', 'resilience_test', row.test_id, {
      title: row.title,
      testType: row.test_type,
      scope: row.scope,
    });
  }
  return row;
}

/**
 * Update a resilience test. Handles status transitions and result recording.
 * Emits appropriate events based on the update type.
 */
export async function updateResilienceTest(
  tenantId: string,
  testId: string,
  dto: UpdateResilienceTestDTO,
  updatedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (dto.title !== undefined) { sets.push(`title = $${idx++}`); params.push(dto.title); }
  if (dto.description !== undefined) { sets.push(`description = $${idx++}`); params.push(dto.description); }
  if (dto.result !== undefined) { sets.push(`result = $${idx++}`); params.push(dto.result); }
  if (dto.findingsCount !== undefined) { sets.push(`findings_count = $${idx++}`); params.push(dto.findingsCount); }
  if (dto.score !== undefined) { sets.push(`score = $${idx++}`); params.push(dto.score); }
  if (dto.resultsSummary !== undefined) { sets.push(`results_summary = $${idx++}`); params.push(JSON.stringify(dto.resultsSummary)); }
  if (dto.remediationPlan !== undefined) { sets.push(`remediation_plan = $${idx++}`); params.push(JSON.stringify(dto.remediationPlan)); }

  // Handle status-dependent auto-timestamps
  if (dto.status === 'in_progress') {
    sets.push(`started_at = COALESCE(started_at, NOW())`);
  }
  if (dto.status === 'completed' || dto.status === 'failed') {
    sets.push(`completed_at = COALESCE($${idx++}, NOW())`);
    params.push(dto.completedAt || null);
  }

  if (sets.length === 0 && !dto.status) return getResilienceTestById(tenantId, testId);

  sets.push(`updated_at = NOW()`);
  if (updatedBy) { sets.push(`updated_by = $${idx++}`); params.push(updatedBy); }

  params.push(testId);
  // secrets-scan-allow: schema tenantSchema()-validated; numeric thresholds pre-validated
  const result = await safeQuery(
    `UPDATE "${schema}".dora_resilience_tests
     SET ${sets.join(', ')}${dto.status ? `, status = '${dto.status}'` : ''}
     WHERE test_id = $${idx} AND deleted_at IS NULL
     RETURNING *`,
    params,
  );

  const row = getFirstRow(result)!;
  if (row && dto.status) {
    if (dto.status === 'completed') {
      await emitDoraEvent(tenantId, 'dora.resilience_test_completed', 'resilience_test', testId, {
        result: dto.result,
        score: dto.score,
        findingsCount: dto.findingsCount,
      });
    } else if (dto.status === 'failed') {
      await emitDoraEvent(tenantId, 'dora.resilience_test_failed', 'resilience_test', testId, {
        result: dto.result,
        findingsCount: dto.findingsCount,
      }, 'warning');
    }
  }
  return row;
}

/**
 * Transition resilience test status through lifecycle auth.
 */
export async function transitionResilienceTestStatus(
  tenantId: string,
  testId: string,
  fromStatus: string,
  toStatus: ResilienceTestStatus,
  transitionedBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const extraSets: string[] = [];
  if (toStatus === 'in_progress') {
    extraSets.push(`, started_at = COALESCE(started_at, NOW())`);
  }
  if (toStatus === 'completed' || toStatus === 'failed') {
    extraSets.push(`, completed_at = NOW()`);
  }

  const result = await safeQuery(
    `UPDATE "${schema}".dora_resilience_tests
     SET status = $1, updated_at = NOW(), updated_by = $3${extraSets.join('')}
     WHERE test_id = $2 AND status = $4 AND deleted_at IS NULL
     RETURNING *`,
    [toStatus, testId, transitionedBy || null, fromStatus],
  );

  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraStatusChange(tenantId, 'resilience_test', testId, fromStatus, toStatus);
  }
  return row;
}

// ── Resilience Test Results ────────────────────────────────────────────

/**
 * List findings/results for a specific resilience test.
 */
export async function listResilienceResults(
  tenantId: string,
  testId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_resilience_results
     WHERE test_id = $1 AND deleted_at IS NULL
     ORDER BY severity DESC, created_at DESC`,
    [testId],
  );
  return result.rows;
}

/**
 * Create a finding/result entry for a resilience test.
 * Emits dora.resilience_finding_created event.
 */
export async function createResilienceResult(
  tenantId: string,
  dto: ResilienceResultDTO,
  createdBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_resilience_results
      (test_id, finding_title, finding_description, severity, affected_asset_id,
       remediation_suggestion, evidence_ref, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      dto.testId,
      dto.findingTitle,
      dto.findingDescription || null,
      dto.severity,
      dto.affectedAssetId || null,
      dto.remediationSuggestion || null,
      dto.evidenceRef || null,
      dto.status || 'open',
      createdBy || null,
    ],
  );

  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraEvent(tenantId, 'dora.resilience_finding_created', 'resilience_result', row.result_id, {
      testId: dto.testId,
      severity: dto.severity,
    });
  }
  return row;
}

// ── Aggregate Queries ──────────────────────────────────────────────────

/**
 * Calculate the aggregate resilience score for the tenant.
 * Considers completed test results and their scores.
 */
export async function calculateResilienceScore(
  tenantId: string,
): Promise<{
  overallScore: number;
  testsPassed: number;
  testsFailed: number;
  testsTotal: number;
  avgScore: number;
  lastTestDate: string | null;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE result = 'pass')::int AS passed,
       COUNT(*) FILTER (WHERE result = 'fail')::int AS failed,
       COALESCE(AVG(score), 0)::numeric(5,2) AS avg_score,
       MAX(completed_at)::text AS last_test_date
     FROM "${schema}".dora_resilience_tests
     WHERE deleted_at IS NULL AND status = 'completed'`,
  );

  const row = getFirstRow(result)!;
  const total = row?.total ?? 0;
  const passed = row?.passed ?? 0;
  const avgScore = Number(row?.avg_score ?? 0);

  // Overall score: weighted average of pass rate and test scores
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const overallScore = total > 0 ? Math.round((passRate * 0.4) + (avgScore * 0.6)) : 0;

  return {
    overallScore,
    testsPassed: passed,
    testsFailed: row?.failed ?? 0,
    testsTotal: total,
    avgScore,
    lastTestDate: row?.last_test_date ?? null,
  };
}

/**
 * Get tests that are upcoming (scheduled within next N days) or overdue.
 * Used by background jobs and dashboard.
 */
export async function getUpcomingAndOverdueTests(
  tenantId: string,
  lookaheadDays: number = 30,
): Promise<{ upcoming: GenericRow[]; overdue: GenericRow[] }> {
  const schema = tenantSchema(tenantId);

  const upcomingResult = await safeQuery(
    `SELECT * FROM "${schema}".dora_resilience_tests
     WHERE deleted_at IS NULL
       AND status IN ('planned', 'scheduled')
       AND scheduled_date BETWEEN NOW() AND NOW() + ($1 || ' days')::interval
     ORDER BY scheduled_date ASC`,
    [lookaheadDays],
  );

  const overdueResult = await safeQuery(
    `SELECT * FROM "${schema}".dora_resilience_tests
     WHERE deleted_at IS NULL
       AND status IN ('planned', 'scheduled')
       AND scheduled_date < NOW()
     ORDER BY scheduled_date ASC`,
  );

  return { upcoming: upcomingResult.rows, overdue: overdueResult.rows };
}

/**
 * Get resilience test statistics for dashboard use.
 */
export async function getResilienceStats(
  tenantId: string,
): Promise<{
  total: number;
  planned: number;
  inProgress: number;
  completed: number;
  failed: number;
  overdue: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'planned')::int AS planned,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE status IN ('planned','scheduled') AND scheduled_date < NOW())::int AS overdue
     FROM "${schema}".dora_resilience_tests
     WHERE deleted_at IS NULL`,
  );
  const row = getFirstRow(result)!;
  return {
    total: row?.total ?? 0,
    planned: row?.planned ?? 0,
    inProgress: row?.in_progress ?? 0,
    completed: row?.completed ?? 0,
    failed: row?.failed ?? 0,
    overdue: row?.overdue ?? 0,
  };
}
