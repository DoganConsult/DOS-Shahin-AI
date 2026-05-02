export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

type RedactionKey = 'token' | 'authorization' | 'password' | 'secret' | 'apiKey' | 'clientSecret';

const REDACTION_KEYS = new Set<RedactionKey>([
  'token',
  'authorization',
  'password',
  'secret',
  'apiKey',
  'clientSecret',
]);

function redactValue(value: unknown, depth: number): unknown {
  if (depth <= 0) return '[redacted]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 2000 ? value.slice(0, 2000) : value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactValue(v, depth - 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACTION_KEYS.has(k as RedactionKey)) out[k] = '[redacted]';
    else out[k] = redactValue(v, depth - 1);
  }
  return out;
}

export class ServiceError extends Error implements AppError {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(opts: { message: string; status: number; code: string; details?: unknown }) {
    super(opts.message);
    this.name = 'ServiceError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details === undefined ? undefined : redactValue(opts.details, 4);
  }
}

export class NotFoundError extends ServiceError {
  constructor(entityType: string, entityId?: string) {
    super({
      message: `${entityType} not found`,
      status: 404,
      code: 'NOT_FOUND',
      details: { entityType, entityId },
    });
    this.name = 'NotFoundError';
  }
}

export type ValidationIssue = { path: string; message: string };

export class ValidationError extends ServiceError {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[] | string = 'Validation error') {
    const normalized = typeof issues === 'string'
      ? [{ path: '', message: issues }]
      : issues;

    super({
      message: 'Validation error',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { issues: normalized },
    });
    this.name = 'ValidationError';
    this.issues = normalized;
  }
}

export function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null && ('status' in err || 'code' in err);
}
