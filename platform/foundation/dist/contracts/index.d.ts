/**
 * @dos/module-foundation/contracts
 *
 * Public typed boundary for the Foundation module. Peer modules MUST consume
 * Foundation through this barrel — never via relative paths into module
 * internals (`source/backend/...`) or runtime imports of services.
 *
 * Contents:
 *  - Domain types (FoundationEntityType, FoundationStatus, FoundationNode, …)
 *  - Request/response DTOs (FoundationNodeCreateDTO, FoundationTreeResponseDTO, …)
 *  - Event-name constants and unions (FOUNDATION_EVENT_NAMES, …)
 *  - Permission-code constants and unions (FOUNDATION_PERMISSION_CODES, …)
 *  - Error-code constants (FOUNDATION_ERROR_CODES, …)
 *
 * This file is pure TypeScript with zero runtime side-effects beyond the
 * frozen const objects. Safe to import from any tier (frontend, backend,
 * other modules, services, tests).
 */
export * from './foundation.types';
export * from './foundation.dto';
export * from './foundation.events';
export * from './foundation.event-payloads';
export * from './foundation.permissions';
export * from './foundation.errors';
