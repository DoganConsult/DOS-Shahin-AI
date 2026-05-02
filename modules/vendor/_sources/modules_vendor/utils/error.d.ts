export declare class DomainError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: unknown;
    constructor(message: string, code?: string, statusCode?: number, details?: unknown);
}
export declare class NotFoundError extends DomainError {
    constructor(message: string, details?: unknown);
}
export declare class ValidationError extends DomainError {
    constructor(message: string, details?: unknown);
}
export declare class ConflictError extends DomainError {
    constructor(message: string, details?: unknown);
}
export declare function toErrorMessage(err: unknown): string;
