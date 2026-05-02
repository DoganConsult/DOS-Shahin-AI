export * from '@dos/module-auth';
export type { AuthenticatedUser } from '@dos/types/express';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly messageAr?: string;
    readonly details?: unknown[];
    constructor(statusCode: number, message: string, code: string, details?: unknown[], messageAr?: string);
}
export declare class NotFoundError extends AppError {
    constructor(entity: string, id: string);
}
export declare class ValidationError extends AppError {
    constructor(details: Array<{
        path: string;
        message: string;
        expected?: string;
    }>);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare function toErrorMessage(err: unknown): string;
