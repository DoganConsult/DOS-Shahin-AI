import { Request, Response, NextFunction } from 'express';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;
type MiddlewareFactory<T = void> = (arg?: T) => Middleware;

export interface PlatformHttp {
  notifyDomainChange(tenantId: string, module: string, action: 'create' | 'update' | 'delete', entityId: string): void;
  scopeContext?: Middleware;
  lifecycleGate?: (configOrModule?: string | { blockedStates?: string[]; entityParam?: string; statusColumn?: string }) => Middleware;
  moduleStack?: (moduleCode: string) => Middleware;
  auditMiddleware?: (actionCode?: string) => Middleware;
  setAuditData?: (req: Request, data: Record<string, unknown>) => void;
  automationMiddleware?: (triggerCode?: string) => Middleware;
  requireOwnership?: (ownerField?: string) => Middleware;
  fieldRbac?: (config?: { module?: string; sensitiveFields?: string[] }) => Middleware;
  mandatoryFields?: (...fields: string[]) => Middleware;
  rateLimiter?: (options?: { limit?: number; window?: number }) => Middleware;
  enforceMandatoryFields?: (...fields: string[]) => Middleware;
  enforceStageGates?: (...stages: string[]) => Middleware;
}

let _http: PlatformHttp | null = null;

export function setPlatformHttp(impl: PlatformHttp): void {
  _http = impl;
}

function _failClosed(_req: Request, res: Response, _next: NextFunction): void {
  res.status(503).json({ error: 'Platform HTTP middleware not initialized', code: 'PLATFORM_HTTP_NOT_INITIALIZED' });
}

export function notifyD(tenantId: string, module: string, action: 'create' | 'update' | 'delete', entityId: string): void {
  if (_http) {
    _http.notifyDomainChange(tenantId, module, action, entityId);
  } else {
    console.warn('[PlatformHttp] notifyD called before initialization');
  }
}

export function scopeContext(req: Request, res: Response, next: NextFunction): void {
  if (_http?.scopeContext) {
    return _http.scopeContext(req, res, next);
  }
  _failClosed(req, res, next);
}

export function lifecycleGate(
  configOrModule?: string | { blockedStates?: string[]; entityParam?: string; statusColumn?: string },
): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.lifecycleGate) {
      const mw = _http.lifecycleGate(configOrModule);
      return mw(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function moduleStack(moduleCode: string): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.moduleStack) {
      return _http.moduleStack(moduleCode)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function auditMiddleware(actionCode?: string): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.auditMiddleware) {
      return _http.auditMiddleware(actionCode)(req, res, next);
    }
    next();
  };
}

export function setAuditData(req: Request, data: Record<string, unknown>): void {
  if (_http?.setAuditData) {
    _http.setAuditData(req, data);
  } else {
    console.warn('[PlatformHttp] setAuditData called before initialization');
  }
}

export function automationMiddleware(triggerCode?: string): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.automationMiddleware) {
      return _http.automationMiddleware(triggerCode)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function requireOwnership(ownerField?: string): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.requireOwnership) {
      return _http.requireOwnership(ownerField)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function fieldRbac(config?: { module?: string; sensitiveFields?: string[] }): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.fieldRbac) {
      return _http.fieldRbac(config)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function mandatoryFields(...fields: string[]): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.mandatoryFields) {
      return _http.mandatoryFields(...fields)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function rateLimiter(options?: { limit?: number; window?: number }): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.rateLimiter) {
      return _http.rateLimiter(options)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function enforceMandatoryFields(...fields: string[]): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.enforceMandatoryFields) {
      return _http.enforceMandatoryFields(...fields)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

export function enforceStageGates(...stages: string[]): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (_http?.enforceStageGates) {
      return _http.enforceStageGates(...stages)(req, res, next);
    }
    _failClosed(req, res, next);
  };
}

