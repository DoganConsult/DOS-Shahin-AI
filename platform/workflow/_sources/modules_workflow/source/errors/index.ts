export * from '@dos/module-auth';
export type { AuthenticatedUser } from '@dos/types/express';

// Canonical domain error classes used by workflow services (template CRUD,
// versioning, comparison). Defined locally to avoid pulling the full
// @dos/module-sdk barrel into the workflow runtime — the SDK transitively
// depends on @dos/contracts dist which is not always present in the
// unit-test sandbox. Shape mirrors @dos/module-sdk/errors 1:1 so consumers
// that check `err.code === 'VALIDATION_ERROR'` etc. behave identically.

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly messageAr?: string;
  public readonly details?: unknown[];

  constructor(statusCode: number, message: string, code: string, details?: unknown[], messageAr?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.messageAr = messageAr;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(404, `${entity} with id '${id}' not found`, 'NOT_FOUND', undefined, `${entity} بالمعرف '${id}' غير موجود`);
  }
}

export class ValidationError extends AppError {
  constructor(details: Array<{ path: string; message: string; expected?: string }>) {
    super(400, 'Validation failed', 'VALIDATION_ERROR', details, 'فشل التحقق من الصحة');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message, 'FORBIDDEN', undefined, 'تم رفض الوصول');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT', undefined, 'تعارض في البيانات');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED', undefined, 'المصادقة مطلوبة');
  }
}

export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
