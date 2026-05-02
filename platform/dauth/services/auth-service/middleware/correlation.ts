import type { Request, Response, NextFunction } from 'express';

export function correlationMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as any).correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
  next();
}

export default correlationMiddleware;
