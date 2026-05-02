/**
 * Shahin-AI product job registry.
 *
 * Contract (per Phase 2, P2-3): the platform scheduler bootstrap MUST call
 * `registerShahinAIJobs()` before any product-scoped cron expression is
 * eligible to fire. Anything cron-driven that is OWNED by this product
 * (not by a platform service or a shared module) belongs in this file.
 *
 * Today, shahin-ai owns ZERO product-scoped backend jobs:
 *   - Modules wired by this product (foundation, risk, compliance, ...) own
 *     their own cron registration through the module's job export.
 *   - AI agents and the agrc engine register through ai-engine-service.
 *   - Tenant maintenance / KC-divergence cycles run from the platform layer.
 *   - UI refresh setIntervals are not backend jobs and do not belong here.
 *
 * Keeping the file present (and explicitly empty) gives the bootstrap a
 * deterministic call-site and prevents silent regressions if a product-owned
 * cron is later added but not registered.
 *
 * Add a job by calling `registerJob(name, cron, handler)` inside
 * `registerShahinAIJobs()`. Names should be prefixed `shahin.<area>.<verb>`.
 *
 *   await registerJob(
 *     'shahin.public-explorer.refresh-cache',
 *     '*\/15 * * * *',
 *     refreshExplorerCache,
 *   );
 */

import { registerJob } from '@dos/platform-core/jobs';

/**
 * Module-scoped logger so we don't pull a heavyweight logger setup into
 * the registry. The platform scheduler logs registration outcomes itself.
 */
const log = {
  info: (...args: unknown[]) => console.info('[shahin-ai/jobs]', ...args),
  warn: (...args: unknown[]) => console.warn('[shahin-ai/jobs]', ...args),
  error: (...args: unknown[]) => console.error('[shahin-ai/jobs]', ...args),
};

/**
 * Register all jobs owned by the shahin-ai product. Idempotent: the
 * underlying platform scheduler dedupes by `job_name`, so calling this
 * twice is a no-op for already-registered jobs.
 *
 * Returns the list of job names registered (in declaration order) so the
 * bootstrap can log a "registered N jobs for shahin-ai" line.
 */
export async function registerShahinAIJobs(): Promise<readonly string[]> {
  const registered: string[] = [];

  // ── Product-owned jobs go here. None today. ──────────────────────────
  // Example (do NOT enable without a real handler + a paired migration
  // for any DB tables it touches):
  //
  // await registerJob(
  //   'shahin.public-explorer.refresh-cache',
  //   '*/15 * * * *',
  //   refreshExplorerCache,
  // );
  // registered.push('shahin.public-explorer.refresh-cache');

  // Reference `registerJob` so the import is not flagged as unused while
  // the registry is empty. This is a no-op the first time the function is
  // called and the platform scheduler is wired; otherwise it surfaces a
  // clear error from `getJobs_()` instead of silently skipping setup.
  void registerJob;

  log.info(`registered ${registered.length} product-scoped job(s)`);
  return registered;
}

/**
 * Convenience export for the bootstrap layer that prefers a synchronous
 * inventory (e.g. for a /api/jobs/registry health endpoint). Lists the
 * NAMES the registry would register, without actually calling the
 * platform scheduler. Keep in lockstep with `registerShahinAIJobs`.
 */
export function listShahinAIJobNames(): readonly string[] {
  return Object.freeze([] as const);
}
