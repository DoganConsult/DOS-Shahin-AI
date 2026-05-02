/**
 * ai-engine-service canonical error codes. Shape mirrors user-service/auth-service
 * contracts so downstream clients get a consistent envelope.
 */
import { randomUUID } from 'node:crypto';

export const AI_ENGINE_ERRORS = {
  TASK_NOT_FOUND:        { code: 'TASK_NOT_FOUND',        status: 404, message: 'Task not found' },
  INVALID_TRANSITION:    { code: 'INVALID_TRANSITION',    status: 400, message: 'Invalid task status transition' },

  ROADMAP_NOT_FOUND:     { code: 'ROADMAP_NOT_FOUND',     status: 404, message: 'Roadmap not found' },
  PHASE_NOT_FOUND:       { code: 'PHASE_NOT_FOUND',       status: 404, message: 'Phase not found' },

  JOURNEY_INIT_FAILED:   { code: 'JOURNEY_INIT_FAILED',   status: 500, message: 'Failed to initialize guided journey' },
  AUTOMATION_FAILED:     { code: 'AUTOMATION_FAILED',     status: 500, message: 'Workflow automation execution failed' },

  VALIDATION_FAILED:     { code: 'VALIDATION_FAILED',     status: 400, message: 'Validation failed' },
  TENANT_CONTEXT_MISSING:{ code: 'TENANT_CONTEXT_MISSING',status: 400, message: 'Tenant context required' },
  INTERNAL_ERROR:        { code: 'INTERNAL_ERROR',        status: 500, message: 'Internal error' },
} as const;

export type AIEngineErrorCode = keyof typeof AI_ENGINE_ERRORS;

export interface AIEngineErrorBody {
  code: AIEngineErrorCode;
  status: number;
  message: string;
  timestamp: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}

export class AIEngineServiceError extends Error {
  public readonly code: AIEngineErrorCode;
  public readonly status: number;
  public readonly detail?: Record<string, unknown>;
  public readonly correlationId: string;
  public readonly timestamp: string;

  constructor(code: AIEngineErrorCode, correlationId?: string, detail?: Record<string, unknown>) {
    const entry = AI_ENGINE_ERRORS[code];
    super(entry.message);
    this.name = 'AIEngineServiceError';
    this.code = code;
    this.status = entry.status;
    this.detail = detail;
    this.correlationId = correlationId ?? randomUUID();
    this.timestamp = new Date().toISOString();
  }

  toJSON(): AIEngineErrorBody {
    return {
      code: this.code,
      status: this.status,
      message: this.message,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      ...(this.detail ? { detail: this.detail } : {}),
    };
  }
}

export function buildAIEngineError(
  code: AIEngineErrorCode,
  correlationId?: string,
  detail?: Record<string, unknown>,
): AIEngineErrorBody {
  return new AIEngineServiceError(code, correlationId, detail).toJSON();
}

export function throwAIEngineError(
  code: AIEngineErrorCode,
  correlationId?: string,
  detail?: Record<string, unknown>,
): never {
  throw new AIEngineServiceError(code, correlationId, detail);
}
