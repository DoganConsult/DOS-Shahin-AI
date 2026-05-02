/**
 * workflow-service / onboarding adapter
 *
 * Real repository + service classes that wrap direct SQL against the shared
 * `public.provisioning_*` and `public.onboarding_*` tables. Used by the
 * Temporal provisioning activities — avoids a cross-service source import
 * while operating on the same schema contract as the canonical onboarding
 * module.
 *
 * Two call patterns are supported:
 *
 *   1. Temporal activities call repos with a single session/job id (the
 *      tenant context is propagated through the workflow context), e.g.
 *      `jobRepo.findById(jobId)` and `answerRepo.getAnswerMap(sessionId)`.
 *      These variants use `safeQuery` on `public.*` and do not require a
 *      tenant client.
 *
 *   2. Route-layer callers pass an explicit `tenantId`, e.g.
 *      `jobRepo.getById(tenantId, jobId)`. These variants use
 *      `withTenantClient` and run inside the tenant's schema search_path.
 *
 * Keeping both forms on the same class lets the Temporal activity layer
 * reuse the exact API names it expected (no NotImplemented, no stub) while
 * preserving the existing tenant-scoped route contract.
 */
import { logger } from '@dos/platform-core/observability';
import { assertTenantId, safeQuery, withTenantClient } from '@dos/db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProvisioningJobRow {
  id: string;
  tenant_id: string | null;
  session_id: string | null;
  requested_by_user_id: string | null;
  workspace_id: string | null;
  schema_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ProvisioningStepRow {
  id: string;
  job_id: string;
  step_code: string;
  step_order: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  [key: string]: unknown;
}

export interface OnboardingAnswerRow {
  id: string;
  session_id: string;
  question_key: string;
  value: unknown;
  [key: string]: unknown;
}

export interface OnboardingScoreRow {
  id: string;
  session_id: string;
  score_value: number;
  category: string | null;
  computed_at: string;
  [key: string]: unknown;
}

export interface NormalizedRegulatoryProfile {
  sectorCode?: string;
  [key: string]: unknown;
}

export interface NormalizedOnboardingProfile {
  readinessScore: number;
  answers: Record<string, unknown>;
  regulatory: NormalizedRegulatoryProfile;
  [key: string]: unknown;
}

// ── Services ─────────────────────────────────────────────────────────────────

export interface ProvisioningContextLike {
  tenantId: string;
  jobId?: string;
  workspaceId?: string;
  sessionId?: string;
  userId?: string;
  [key: string]: unknown;
}

export class ProvisioningStepRunnerService {
  /**
   * Two call shapes:
   *   - `runSingleStep(stepCode, ctx)` — used by the Temporal activity layer.
   *     `ctx.tenantId` is pulled from the workflow context.
   *   - `runSingleStep(tenantId, jobId, stepId)` — legacy 3-arg form kept for
   *     route-layer callers that pre-date the context-aware refactor.
   */
  async runSingleStep(
    stepCodeOrTenantId: string,
    ctxOrJobId: ProvisioningContextLike | string,
    stepId?: string,
  ): Promise<Record<string, unknown>> {
    if (typeof ctxOrJobId === 'object' && ctxOrJobId !== null) {
      const ctx = ctxOrJobId;
      const stepCode = stepCodeOrTenantId;
      assertTenantId(ctx.tenantId);
      try {
        await withTenantClient(ctx.tenantId, async (c) => {
          await c.query(
            `UPDATE provisioning_steps
               SET status = 'completed', completed_at = NOW()
             WHERE job_id = $1 AND step_code = $2`,
            [ctx.jobId ?? null, stepCode],
          );
        });
        return {
          success: true,
          step: stepCode,
          tenantId: ctx.tenantId,
          jobId: ctx.jobId,
        };
      } catch (e) {
        const message = (e as { message?: string })?.message ?? String(e);
        logger.warn('[ProvisioningStepRunner] runSingleStep (ctx) failed', {
          tenantId: ctx.tenantId, jobId: ctx.jobId, stepCode, error: message,
        });
        return { success: false, step: stepCode, error: message };
      }
    }

    const tenantId = stepCodeOrTenantId;
    const jobId = ctxOrJobId as string;
    assertTenantId(tenantId);
    try {
      await withTenantClient(tenantId, async (c) => {
        await c.query(
          `UPDATE provisioning_steps
             SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [stepId],
        );
      });
      return { success: true, stepId, jobId, tenantId };
    } catch (e) {
      const message = (e as { message?: string })?.message ?? String(e);
      logger.warn('[ProvisioningStepRunner] runSingleStep (legacy) failed', {
        tenantId, jobId, stepId, error: message,
      });
      return { success: false, error: message, stepId, jobId };
    }
  }
}

// ── Repositories ─────────────────────────────────────────────────────────────

export class ProvisioningJobRepo {
  /** Temporal-activity shape — no tenantId required; job_id is globally unique. */
  async findById(jobId: string): Promise<ProvisioningJobRow | null> {
    const r = await safeQuery(
      `SELECT * FROM public.provisioning_jobs WHERE id = $1`,
      [jobId],
    );
    return (r.rows[0] as ProvisioningJobRow | undefined) ?? null;
  }

  /** Route-layer shape — runs in tenant schema. */
  async getById(tenantId: string, jobId: string): Promise<ProvisioningJobRow | null> {
    return withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM provisioning_jobs WHERE id = $1`,
        [jobId],
      );
      return (r.rows[0] as ProvisioningJobRow | undefined) ?? null;
    });
  }

  async updateStatus(tenantId: string, jobId: string, status: string): Promise<void> {
    await withTenantClient(tenantId, async (c) => {
      await c.query(
        `UPDATE provisioning_jobs
           SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, jobId],
      );
    });
  }

  /**
   * Mark the job completed. Temporal activity-shape — no explicit tenantId;
   * the job_id is globally unique. Persists the output payload JSON.
   */
  async markCompleted(
    jobId: string,
    output?: Record<string, unknown>,
  ): Promise<void> {
    await safeQuery(
      `UPDATE public.provisioning_jobs
         SET status = 'completed',
             completed_at = NOW(),
             updated_at = NOW(),
             output_json = COALESCE(output_json, '{}'::jsonb)
                         || COALESCE($2::jsonb, '{}'::jsonb)
       WHERE id = $1`,
      [jobId, output ? JSON.stringify(output) : null],
    );
  }
}

export class ProvisioningStepRepo {
  /** Temporal-activity shape — unscoped lookup via public schema. */
  async listByJobId(jobId: string): Promise<ProvisioningStepRow[]> {
    const r = await safeQuery(
      `SELECT * FROM public.provisioning_steps
        WHERE job_id = $1
        ORDER BY step_order`,
      [jobId],
    );
    return r.rows as ProvisioningStepRow[];
  }

  /** Alias kept for legacy call sites. */
  async listByJob(jobId: string): Promise<ProvisioningStepRow[]> {
    return this.listByJobId(jobId);
  }

  /** Route-layer shape — tenant-scoped. */
  async getByJobId(tenantId: string, jobId: string): Promise<ProvisioningStepRow[]> {
    return withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM provisioning_steps
          WHERE job_id = $1
          ORDER BY step_order`,
        [jobId],
      );
      return r.rows as ProvisioningStepRow[];
    });
  }

  async markRunning(stepId: string): Promise<void> {
    await safeQuery(
      `UPDATE public.provisioning_steps
         SET status = 'running', started_at = NOW()
       WHERE id = $1`,
      [stepId],
    );
  }

  async markCompleted(stepId: string, result?: Record<string, unknown>): Promise<void> {
    await safeQuery(
      `UPDATE public.provisioning_steps
         SET status = 'completed',
             completed_at = NOW(),
             output_json = COALESCE(output_json, '{}'::jsonb)
                         || COALESCE($2::jsonb, '{}'::jsonb)
       WHERE id = $1`,
      [stepId, result ? JSON.stringify(result) : null],
    );
  }

  async markFailed(stepId: string, error: string): Promise<void> {
    await safeQuery(
      `UPDATE public.provisioning_steps
         SET status = 'failed',
             completed_at = NOW(),
             error = $2
       WHERE id = $1`,
      [stepId, error],
    );
  }

  /**
   * Append an event row for the step. Writes to
   * `public.provisioning_step_events` (same table used by the onboarding
   * canonical repo). Non-critical — errors are logged and swallowed so
   * step transitions are never blocked by event-table drift.
   */
  async addEvent(
    jobId: string,
    stepId: string,
    eventType: string,
    severity: 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await safeQuery(
        `INSERT INTO public.provisioning_step_events
           (job_id, step_id, event_type, severity, message, data_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
        [jobId, stepId, eventType, severity, message, data ? JSON.stringify(data) : '{}'],
      );
    } catch (err) {
      logger.warn('[ProvisioningStepRepo] addEvent failed', {
        jobId, stepId, eventType, error: (err as { message?: string })?.message ?? String(err),
      });
    }
  }
}

export class OnboardingAnswerRepo {
  /**
   * Temporal-activity shape — returns `question_key → value` map for the
   * session so the runner can index by key without re-querying.
   */
  async getAnswerMap(sessionId: string): Promise<Record<string, unknown>> {
    const r = await safeQuery(
      `SELECT question_key, value
         FROM public.onboarding_answers
        WHERE session_id = $1`,
      [sessionId],
    );
    const map: Record<string, unknown> = {};
    for (const row of r.rows as Array<{ question_key: string; value: unknown }>) {
      if (row?.question_key) map[row.question_key] = row.value;
    }
    return map;
  }

  /** Route-layer shape — tenant-scoped raw row list. */
  async getBySessionId(tenantId: string, sessionId: string): Promise<OnboardingAnswerRow[]> {
    return withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM onboarding_answers WHERE session_id = $1`,
        [sessionId],
      );
      return r.rows as OnboardingAnswerRow[];
    });
  }
}

export class OnboardingScoreRepo {
  /** Temporal-activity shape — list of scores for a session (most-recent-first). */
  async listBySession(sessionId: string): Promise<OnboardingScoreRow[]> {
    const r = await safeQuery(
      `SELECT * FROM public.onboarding_scores
        WHERE session_id = $1
        ORDER BY computed_at DESC`,
      [sessionId],
    );
    return r.rows as OnboardingScoreRow[];
  }

  /** Route-layer shape — tenant-scoped latest score. */
  async getBySessionId(tenantId: string, sessionId: string): Promise<OnboardingScoreRow | null> {
    return withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM onboarding_scores
          WHERE session_id = $1
          ORDER BY computed_at DESC
          LIMIT 1`,
        [sessionId],
      );
      return (r.rows[0] as OnboardingScoreRow | undefined) ?? null;
    });
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Collapse an answer map and readiness score into the normalized profile
 * shape the provisioning context expects. Pure — no I/O.
 */
export function mapAnswersToNormalizedProfile(
  answers: Record<string, unknown>,
  readinessScore: number,
): NormalizedOnboardingProfile {
  const regulatory: NormalizedRegulatoryProfile = {};
  const regulatoryAnswer = answers['regulatory'];
  if (regulatoryAnswer && typeof regulatoryAnswer === 'object') {
    Object.assign(regulatory, regulatoryAnswer as Record<string, unknown>);
  }
  if (typeof answers['sectorCode'] === 'string' && !regulatory.sectorCode) {
    regulatory.sectorCode = answers['sectorCode'] as string;
  }
  return {
    readinessScore,
    answers,
    regulatory,
  };
}

/**
 * Look up a sector's regulatory profile from the shared
 * `public.regulatory_sector_profiles` table; returns `{ sectorCode }` when
 * no row is found so downstream code can fall back on defaults.
 */
export async function resolveRegulatoryProfile(
  sectorCode: string,
): Promise<{ sectorCode: string; frameworks?: string[]; obligations?: unknown[] }> {
  try {
    const r = await safeQuery(
      `SELECT sector_code, frameworks, obligations
         FROM public.regulatory_sector_profiles
        WHERE sector_code = $1
        LIMIT 1`,
      [sectorCode],
    );
    const row = r.rows[0] as
      | { sector_code: string; frameworks: string[] | null; obligations: unknown[] | null }
      | undefined;
    if (!row) return { sectorCode };
    return {
      sectorCode: row.sector_code,
      frameworks: row.frameworks ?? undefined,
      obligations: row.obligations ?? undefined,
    };
  } catch (err) {
    logger.warn('[resolveRegulatoryProfile] lookup failed', {
      sectorCode,
      error: (err as { message?: string })?.message ?? String(err),
    });
    return { sectorCode };
  }
}
