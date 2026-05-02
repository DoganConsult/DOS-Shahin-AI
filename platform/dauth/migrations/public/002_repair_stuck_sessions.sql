-- 002_repair_stuck_sessions.sql
-- One-shot data repair for the "stuck onboarding session" pattern:
--   • sessions with saved answers but progress_percent = 0
--   • per-stage progress rows that never advanced past 'not_started'
--   • completed onboarding without a queued provisioning job
-- Forward-only, idempotent, current-schema-correct (rewritten 2026-04-25 to
-- fix column drift; original referenced non-existent columns and tables).
--
-- The forward bug that produced these states was fixed by R3
-- (services/onboarding-service/src/routes/session-data.routes.ts +
-- session-lifecycle.routes.ts). This script remediates rows already stuck.
--
-- Live schema mapping (matches what is in shahin_grc as of 2026-04-25):
--   public.provisioning_jobs columns: id, session_id, requested_by_user_id,
--     job_status (NOT `status`), tenant_id, …
--   onb.session_stages (NOT `public.onboarding_stages`) holds per-stage state:
--     session_id, stage_code, status, percent_complete, updated_at
--   onb.session_stages.status CHECK: not_started | in_progress | completed
--                                   | skipped | blocked

-- ── Fix 1: invalid 'completed' status on draft/in-flight sessions ─────────
-- These rows can only exist if a pre-R3 build wrote 'completed' to a session
-- that never reached the FSM's terminal state. Reset them to 'in_progress'
-- (NOT 'active' — the original repair was wrong; 'active' is the post-
-- onboarding workspace state, not a session state).
UPDATE public.onboarding_sessions
SET    status      = 'in_progress',
       updated_at  = NOW()
WHERE  status = 'completed'
  AND  (completed_at IS NULL OR progress_percent < 100);

-- ── Fix 2: recalculate progress for sessions with answers but 0% ─────────
-- Idempotent: only touches rows where progress_percent = 0 AND there are
-- saved answers AND the recomputed value is > 0.
UPDATE public.onboarding_sessions os
SET    progress_percent = LEAST(95, sub.pct),
       status = CASE
         WHEN sub.pct >= 85 THEN 'review_ready'
         WHEN sub.pct >  0 THEN 'in_progress'
         ELSE                  os.status
       END,
       updated_at = NOW()
FROM (
  SELECT oa.session_id,
         ROUND(
           COUNT(DISTINCT oa.question_code)::numeric
           / GREATEST(1, (SELECT COUNT(*) FROM public.onboarding_question_bank WHERE is_active = TRUE))
           * 100,
           2
         ) AS pct
  FROM public.onboarding_answers oa
  GROUP BY oa.session_id
) sub
WHERE os.id = sub.session_id
  AND os.progress_percent = 0
  AND sub.pct > 0;

-- ── Fix 3: per-stage progress in onb.session_stages ──────────────────────
-- Original repair targeted public.onboarding_stages which does not exist.
-- The canonical per-stage table is onb.session_stages.
UPDATE onb.session_stages stg
SET    percent_complete = LEAST(100, sub.pct),
       status = CASE
         WHEN sub.pct >= 100 THEN 'completed'
         WHEN sub.pct >    0 THEN 'in_progress'
         ELSE                    'not_started'
       END,
       updated_at = NOW()
FROM (
  SELECT oa.session_id, qb.stage_code,
         ROUND(
           COUNT(DISTINCT oa.question_code)::numeric
           / GREATEST(1, (
               SELECT COUNT(*)
               FROM   public.onboarding_question_bank
               WHERE  stage_code = qb.stage_code
                 AND  is_active  = TRUE
             ))
           * 100,
           2
         ) AS pct
  FROM   public.onboarding_answers oa
  JOIN   public.onboarding_question_bank qb USING (question_code)
  GROUP  BY oa.session_id, qb.stage_code
) sub
WHERE  stg.session_id      = sub.session_id
  AND  stg.stage_code      = sub.stage_code
  AND  stg.percent_complete = 0;

-- ── Fix 4: provisioning_jobs for active sessions that lack a job ─────────
-- Uses live column names: job_status (not status), requested_by_user_id (not
-- requested_by). Idempotent via NOT EXISTS guard.
INSERT INTO public.provisioning_jobs
       (id, session_id, tenant_id, job_status, requested_by_user_id, created_at)
SELECT gen_random_uuid(), os.id, os.tenant_id, 'queued', u.user_id, NOW()
FROM   public.onboarding_sessions os
JOIN   public.tenants t ON t.tenant_id = os.tenant_id
JOIN   public.users   u ON u.tenant_id = os.tenant_id AND u.role = 'owner'
WHERE  t.status  IN ('active', 'onboarding_ready', 'provisioning')
  AND  os.status IN ('active', 'review_ready', 'approved_for_provisioning')
  AND  NOT EXISTS (
         SELECT 1 FROM public.provisioning_jobs pj WHERE pj.session_id = os.id
       )
ORDER BY os.created_at DESC;

-- ── Report ────────────────────────────────────────────────────────────────
SELECT 'Repair complete'                                                    AS result,
       (SELECT COUNT(*) FROM public.onboarding_sessions
          WHERE status IN ('in_progress', 'review_ready', 'active'))        AS sessions_progressing,
       (SELECT COUNT(*) FROM public.provisioning_jobs)                      AS total_provisioning_jobs;
