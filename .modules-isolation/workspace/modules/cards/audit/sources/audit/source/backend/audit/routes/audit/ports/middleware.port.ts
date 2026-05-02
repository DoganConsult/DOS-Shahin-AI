// Routes-level middleware port barrel — re-export of canonical
// backend/<module>/ports/middleware.port.ts surface for routes/*
// files importing via `../ports/middleware.port`.
export { auditMiddleware, setAuditData } from '@dos/platform-core/http';
export { asyncHandler } from '@dos/platform-core/http';
export { moduleStack } from '@dos/platform-core/http';
export { validate } from '@dos/platform-core/http';
export { automationMiddleware } from '@dos/platform-core/http';
