import type { Request, Response, NextFunction } from 'express';

export function csrfMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

export default csrfMiddleware;
