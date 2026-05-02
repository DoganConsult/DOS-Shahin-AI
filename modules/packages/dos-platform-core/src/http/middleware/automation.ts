import { Request, Response, NextFunction } from 'express';
import { catchHandler, EC } from '../../resilience/resilience';

type EventPublisher = (event: Record<string, unknown>) => Promise<void>;
let _publisher: EventPublisher | null = null;
export function setAutomationEventPublisher(fn: EventPublisher): void { _publisher = fn; }

function getPublisher(): EventPublisher | null {
  if (_publisher) return _publisher;
  try {
    const sdk = require('@dos/module-sdk');
    _publisher = sdk.publishEvent;
    return _publisher;
  } catch { return null; }
}

export function automationMiddleware(triggerCode?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = function (body: Record<string, any>) {
      const user = (req as any).user;
      const tenantId = (req as any).tenantId;
      const moduleCode = (req as any).moduleCode;
      if (user && tenantId && moduleCode) {
        const pub = getPublisher();
        if (pub) {
          pub({
            event: 'automation.trigger',
            tenantId,
            userId: user.userId || user.id,
            module: moduleCode,
            entityType: 'automation',
            entityId: null,
            data: {
              trigger: triggerCode || `${req.method.toLowerCase()}_${req.baseUrl?.split('/').pop()}`,
              method: req.method,
              path: req.originalUrl,
            },
          }).catch(catchHandler(EC.EVENT_BUS));
        }
      }
      return originalJson(body);
    };
    next();
  };
}
