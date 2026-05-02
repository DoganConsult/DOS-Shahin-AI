import type { Request, Response, NextFunction } from 'express';

export function rate_limitMiddleware(_req: Request, _res: Response, next: NextFunction): void { next(); }
export default rate_limitMiddleware;
