/**
 * DAuth Contracts — access snapshot shape per §O.3.
 * GET /api/auth/access returns this structure.
 *
 * @deprecated Use FullAccessSnapshot from ./access-snapshot.contract instead.
 * This alias is kept for backward compatibility during migration.
 * Consumers should import FullAccessSnapshot directly.
 * Removal target: Phase 2 DAuth access core rollout.
 */
export type { FullAccessSnapshot as AccessSnapshot } from './access-snapshot.contract';
