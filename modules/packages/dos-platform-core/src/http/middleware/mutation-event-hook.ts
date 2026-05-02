import { Request, Response, NextFunction } from 'express';
import { catchHandler, EC } from '../../resilience/resilience';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
};

type EventPublisher = (event: Record<string, unknown>) => Promise<void>;
let _publisher: EventPublisher | null = null;
export function setMutationEventPublisher(fn: EventPublisher): void { _publisher = fn; }

function getPublisher(): EventPublisher | null {
  if (_publisher) return _publisher;
  try {
    const sdk = require('@dos/module-sdk');
    _publisher = sdk.publishEvent;
    return _publisher;
  } catch { return null; }
}

export function mutationEventHook(moduleCode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATION_METHODS.has(req.method)) { next(); return; }

    const originalJson = res.json.bind(res);
    res.json = function (body: Record<string, any>) {
      if (res.statusCode < 400 && body?.success !== false) {
        const tenantId = (req as any).tenantId;
        const user = (req as any).user;
        if (tenantId) {
          const action = METHOD_TO_ACTION[req.method] || 'updated';
          const entityId = body?.data?.id || req.params?.id || null;
          const pathParts = req.baseUrl?.split('/').filter(Boolean) || [];
          const entityType = pathParts[pathParts.length - 1] || moduleCode;

          const pub = getPublisher();
          if (pub) {
            pub({
              event: action,
              tenantId,
              userId: user?.userId || user?.id || 'system',
              module: moduleCode,
              entityType,
              entityId,
              data: { method: req.method, path: req.originalUrl, action },
            }).catch(catchHandler(EC.EVENT_BUS));
          }
        }
      }
      return originalJson(body);
    };
    next();
  };
}
