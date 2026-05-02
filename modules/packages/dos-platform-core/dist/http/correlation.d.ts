import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
export interface RequestContext {
    correlationId: string;
    tenantId?: string;
    userId?: string;
}
export declare const requestContext: AsyncLocalStorage<RequestContext>;
export declare function correlationMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export declare function getCorrelationId(): string | undefined;
