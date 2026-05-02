import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

const HEADER = 'x-correlation-id';

export interface RequestContext {
  correlationId: string;
  tenantId?: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req.headers[HEADER] as string) || randomUUID();
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const userId = (req as any).user?.userId || (req as any).user?.id;

    res.setHeader(HEADER, correlationId);
    (req as any).correlationId = correlationId;

    requestContext.run({ correlationId, tenantId, userId }, () => {
      next();
    });
  };
}

export function getCorrelationId(): string | undefined {
  return requestContext.getStore()?.correlationId;
}
