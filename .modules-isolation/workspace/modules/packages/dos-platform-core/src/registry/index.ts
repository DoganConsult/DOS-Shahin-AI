/**
 * UPOR — Unified Platform Object Registry
 * Barrel export for platform/dos/registry
 *
 * Routes live in tenant-service (see services/tenant-service/src/domain/registry/upor.routes.ts).
 * This package only exposes service + types so any consumer can use the registry
 * without pulling in Express + auth middleware.
 */
export * from './upor.types';
export * as uporService from './upor.service';
