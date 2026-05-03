
export { notReadyTenants } from '@dos/platform-core';
export { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

// onboarding/workspace-lifecycle.service is not present in this engine — provide a
// safe no-op so callers compile and degrade gracefully until canonical onboarding ships.
export async function getLatestAnswers(_tenantId: string): Promise<{ answers: Record<string, unknown> } | null> {
  return null;
}
