/**
 * Phase 0.5 / Wave-1 build-compat shim.
 *
 * Re-exports @dos/module-sdk and @dos/platform-core/http helpers with loose,
 * backward-compatible signatures so the risk domain (not user-certified in
 * Wave 1) builds without rewriting every call site to the current strict
 * shapes. Wave 2 will re-migrate risk to the strict signatures and delete
 * this shim.
 *
 * Runtime behaviour is preserved — the shim forwards to the real helpers.
 */
import { z } from 'zod';
import { ok as _ok, paginated as _paginated, action as _action } from '@dos/module-sdk';
import { setAuditData as _setAuditData } from '@dos/platform-core/http';

// Generic permissive payload schema used by many risk routes. Originally
// declared in each route file with `let` below its first reference, causing
// TS2448 (used before declaration). Centralised here so route files can
// `import { genericPayloadSchema } from '../_wave1-compat'` without hoisting.
export const genericPayloadSchema = z.record(z.unknown());

export function ok<T>(data: T, req?: unknown): unknown {
  return _ok(data, (req ?? {}) as { correlationId?: string });
}

export function paginated<T>(
  data: T[],
  total: number,
  reqOrPage?: unknown,
  pageSizeOrReq?: unknown,
  req?: unknown,
): unknown {
  // Current 5-arg form: (data, total, page, pageSize, req)
  if (typeof reqOrPage === 'number' && typeof pageSizeOrReq === 'number') {
    return _paginated(data, total, reqOrPage, pageSizeOrReq, (req ?? {}) as { correlationId?: string });
  }
  // Legacy 3-arg form: (data, total, req.query) where query carries page + limit
  const query = (reqOrPage ?? {}) as Record<string, unknown>;
  const page = Number(query['page']) || 1;
  const pageSize = Number(query['limit'] ?? query['pageSize']) || 50;
  return _paginated(data, total, page, pageSize, query as { correlationId?: string });
}

export function action(message: string, req?: unknown): unknown {
  return _action(message, (req ?? {}) as { correlationId?: string });
}

type AnyReq = Record<string, unknown>;
type AuditPayload = Record<string, unknown>;

export function setAuditData(req: AnyReq, ...rest: unknown[]): void {
  // Current 2-arg form: setAuditData(req, { action, entityType, entityId, ... })
  if (rest.length === 1 && typeof rest[0] === 'object' && rest[0] !== null) {
    return _setAuditData(req as never, rest[0] as never);
  }
  // Legacy 4-arg form: setAuditData(req, 'action.code', 'entity', { entityId, severity, ... })
  const [actionCode, entityType, data] = rest as [string, string, AuditPayload | undefined];
  return _setAuditData(req as never, {
    action: actionCode,
    entityType,
    ...(data ?? {}),
  } as never);
}
