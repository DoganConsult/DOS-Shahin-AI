/**
 * workflow-service / domain / observability / logger.service
 *
 * Thin re-export onto the canonical module-local logger at `./logger`.
 * Legacy call sites import `./logger.service` from the event-emitter; this
 * alias keeps them working without forking the implementation.
 */

export * from './logger';
export { logger as default } from './logger';
