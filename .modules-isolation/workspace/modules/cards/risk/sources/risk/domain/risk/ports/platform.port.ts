export { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export { proposeCalibration, submitCalibration, acceptCalibration, getCalibration, listCalibrations } from '@dos/platform-core';

export { recordActivity } from '@dos/platform-core';

// Phase 0.5: registerRule was removed from @dos/platform-core during the
// rules-engine migration. Provide a local no-op that satisfies the signature
// used by risk-rules.service.ts. Risk is not user-certified in Wave 1; rules
// registered here are held in-memory only until Wave 2 reconnects to the
// canonical rules engine.
export function registerRule(_rule: {
  code?: string;
  name?: string;
  description?: string;
  evaluate?: (...args: unknown[]) => unknown;
  [k: string]: unknown;
}): void {
  return;
}
