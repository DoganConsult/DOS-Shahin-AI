import type { Response, NextFunction, RequestHandler } from 'express';
export declare function asyncHandler(fn: (req: any, res: Response, next?: NextFunction) => Promise<void>): RequestHandler;
export interface ResponseHelpers {
    ok(data: unknown): void;
    created(data: unknown): void;
    deleted(message: string): void;
    paginated(data: unknown[], total: number, page: number, pageSize: number): void;
}
export declare function buildMeta(req?: {
    correlationId?: string;
} | null): {
    requestId: string;
    timestamp: string;
};
export declare function sendOk(res: Response, data: unknown, req: {
    correlationId?: string;
}): void;
export declare function sendCreated(res: Response, data: unknown, req: {
    correlationId?: string;
}): void;
export declare function sendAction(res: Response, message: string, req: {
    correlationId?: string;
}): void;
export declare function sendPaginated<T>(res: Response, data: T[], total: number, page: number, pageSize: number, req: {
    correlationId?: string;
}): void;
export declare function sendError(res: Response, err: unknown, fallbackStatus?: number, fallbackMessage?: string): void;
import type { ApiSuccessResponse, ApiPaginatedResponse, ApiActionResponse } from '@dos/types';
type PaginationQueryLike = {
    page?: unknown;
    pageSize?: unknown;
    limit?: unknown;
    offset?: unknown;
};
/**
 * Wrap data in the standard success envelope.
 */
export declare function ok<T>(data: T): ApiSuccessResponse<T>;
export declare function ok<T>(data: T, req: {
    correlationId?: string;
} | Record<string, unknown>): ApiSuccessResponse<T>;
/**
 * Wrap a list result in the paginated envelope.
 */
export declare function paginated<T>(data: T[], total: number, page: number, pageSize: number, req: {
    correlationId?: string;
} | Record<string, unknown>): ApiPaginatedResponse<T>;
export declare function paginated<T>(data: T[], total: number, query: PaginationQueryLike, req?: {
    correlationId?: string;
} | Record<string, unknown>): ApiPaginatedResponse<T>;
/**
 * Wrap an action result (create, update, delete) with a message.
 */
export declare function action(message: string): ApiActionResponse;
export declare function action(message: string, req: {
    correlationId?: string;
} | Record<string, unknown>): ApiActionResponse;
export {};
