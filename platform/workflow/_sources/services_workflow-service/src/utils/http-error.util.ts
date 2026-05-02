/**
 * workflow-service / utils / http-error
 *
 * Thin re-export of the canonical error helpers from `@dos/types/errors`.
 * Kept as a local shim so legacy call sites (`../../../../utils/http-error.util`
 * and `../../utils/http-error.util.js` from the langgraph layer) keep working
 * without touching the canonical package contract.
 */

export { toErrorMessage } from '@dos/types/errors';
