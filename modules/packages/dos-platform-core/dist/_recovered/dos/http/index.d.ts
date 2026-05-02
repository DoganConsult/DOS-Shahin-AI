export { asyncHandler, validate } from '@dos/platform-core/http';
import type { Request, Response, NextFunction } from 'express';
export declare function scopeContext(_req: Request, _res: Response, next: NextFunction): void;
