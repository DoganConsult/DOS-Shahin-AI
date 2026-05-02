// Vendor utils/error — error helpers re-exported from @dos/types so the
// governance/services/misc/enforcement-gate.service can resolve a
// 4-up '../../../../utils/error' import after compile.
export class DomainError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  constructor(message: string, code: string = 'DOMAIN_ERROR', statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
export class NotFoundError extends DomainError {
  constructor(message: string, details?: unknown) { super(message, 'NOT_FOUND', 404, details); this.name = 'NotFoundError'; }
}
export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) { super(message, 'VALIDATION', 400, details); this.name = 'ValidationError'; }
}
export class ConflictError extends DomainError {
  constructor(message: string, details?: unknown) { super(message, 'CONFLICT', 409, details); this.name = 'ConflictError'; }
}
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}
