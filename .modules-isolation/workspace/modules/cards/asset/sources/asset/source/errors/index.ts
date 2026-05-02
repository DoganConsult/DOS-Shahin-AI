export * from '@dos/module-auth';
export type { AuthenticatedUser } from '@dos/types/express';

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entityType: string, id?: string) {
    super(id ? `${entityType} '${id}' not found` : `${entityType} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}
