
export { enforceStatusTransition } from '@dos/platform-core/lifecycle';

export { recordActivity } from '@dos/platform-core';
export { getFile, uploadFile, listFiles } from '@dos/platform-core/storage';
export type { FileRecord } from '@dos/platform-core/storage';
export { registerJob } from '@dos/platform-core/jobs';
export { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export { authenticateWebhook, verifyHmacSignature } from '@dos/platform-core/notifications';

// Rules-engine placeholder: canonical rules engine lives in
// packages/shahin-product/rules-engine (pending full extraction).
// No-op in-memory implementation satisfies module-side callers;
// matches services/risk-incident-service/src/domain/risk/ports/platform.port.ts.
export function registerRule(_rule: {
  code?: string;
  id?: string;
  name?: string;
  description?: string;
  condition?: unknown;
  action?: string;
  confidence?: number;
  evaluate?: (...args: unknown[]) => unknown;
  [k: string]: unknown;
}): void {
  return;
}
