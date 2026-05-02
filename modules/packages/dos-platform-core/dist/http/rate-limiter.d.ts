import { Request, Response, NextFunction } from 'express';
export interface RateLimiterOptions {
    namespace?: string;
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (req: Request) => string;
}
export declare function createRateLimiter(options: RateLimiterOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimiter: typeof createRateLimiter;
export declare function authRateLimiter(overrides?: Partial<RateLimiterOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function moduleRateLimiter(moduleCode: string, overrides?: Partial<RateLimiterOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function tenantRateLimiter(overrides?: Partial<RateLimiterOptions>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
