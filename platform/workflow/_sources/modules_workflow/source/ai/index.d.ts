/**
 * Orphan DAuth barrel — canonical DAuth lives in `@dos/auth` and
 * `services/auth-service/src/`. This file's re-exports had zero
 * importers across the workspace; replacing with a marker to
 * preserve the path while pointing consumers at the canonical.
 *
 * If you are consuming DAuth from within the workflow module, import
 * directly from `@dos/auth`, `@dos/auth/middleware`, `@dos/auth/access`,
 * `@dos/contracts/auth`, etc.
 */
export {};
