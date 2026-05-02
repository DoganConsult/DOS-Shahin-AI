// ============================================
// Shahin — Framework Version Lifecycle Service
// Manages version transitions for regulatory
// frameworks (e.g., ISO 27001:2013 -> 2022).
// ============================================

import { safeQuery } from '../../../ports/database.port';

interface VersionTransition {
  transitionId: string;
  frameworkCode: string;
  fromVersion: string;
  toVersion: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

/** List active framework version transitions. */
export async function getActiveTransitions(): Promise<VersionTransition[]> {
  const result = await safeQuery(
    `SELECT * FROM public.framework_version_transitions WHERE status IN ('pending', 'in_progress') ORDER BY started_at DESC`,
  ).catch(() => ({ rows: [] }));
  return (result.rows ?? []) as VersionTransition[];
}

/** Register a new framework version for transition. */
export async function registerNewVersion(input: {
  frameworkCode: string;
  fromVersion: string;
  toVersion: string;
}): Promise<VersionTransition> {
  const result = await safeQuery(
    `INSERT INTO public.framework_version_transitions (framework_code, from_version, to_version, status, started_at)
     VALUES ($1, $2, $3, 'pending', NOW()) RETURNING *`,
    [input.frameworkCode, input.fromVersion, input.toVersion],
  ).catch(() => ({ rows: [{ transitionId: `vt-${Date.now()}`, ...input, status: 'pending', startedAt: new Date().toISOString() }] }));
  return (result.rows?.[0] ?? {}) as VersionTransition;
}
