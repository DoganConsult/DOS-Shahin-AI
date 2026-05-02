import { Request, Response, NextFunction } from 'express';
export interface IdempotencyOptions {
    ttlMs?: number;
    headerName?: string;
    requiredForMethods?: string[];
    keyPrefix?: string;
}
export declare function idempotencyMiddleware(options?: IdempotencyOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
