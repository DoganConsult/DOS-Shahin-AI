export * from '@dos/module-auth';
export type { AuthenticatedUser } from '@dos/types/express';
export declare class NotFoundError extends Error {
    readonly statusCode = 404;
    constructor(entityType: string, id?: string);
}
export declare class ValidationError extends Error {
    readonly details?: unknown;
    readonly statusCode = 400;
    constructor(message: string, details?: unknown);
}
