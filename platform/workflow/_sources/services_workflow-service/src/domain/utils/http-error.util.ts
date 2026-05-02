/**
 * workflow-service / domain / utils / http-error
 *
 * Secondary re-export of the canonical error helpers for domain-layer
 * callers (langgraph graphs, etc.) that resolve this path. Single source
 * of truth remains `@dos/types/errors`.
 */

export { toErrorMessage } from '@dos/types/errors';
