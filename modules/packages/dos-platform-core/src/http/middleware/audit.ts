import { Request, Response, NextFunction } from 'express';
import { catchHandler, EC } from '../../resilience/resilience';

type DbPort = {
  safeQuery: (sql: string, params?: unknown[]) => Promise<any>;
  tenantSchema: (tenantId: string) => string;
};

let _dbPort: DbPort | null = null;

export function setAuditDbPort(port: DbPort): void {
  _dbPort = port;
}

function getDb(): DbPort | null {
  if (_dbPort) return _dbPort;
  try {
    // Dynamic require used intentionally for optional lazy-load of @dos/db.
    // The package may not be present in all deployment targets.
     
    const db = require('@dos/db') as DbPort;
    _dbPort = db;
    return _dbPort;
  } catch { return null; }
}

export function auditMiddleware(actionCode?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }

    const originalJson = res.json.bind(res);
    res.json = function (body: Record<string, any>) {
      const user = (req as any).user;
      const tenantId = (req as any).tenantId;
      if (user && tenantId) {
        const db = getDb();
        if (db) {
          const schema = db.tenantSchema(tenantId);
          db.safeQuery(
            `INSERT INTO "${schema}".audit_trail
             (user_id, action, entity_type, entity_id, module, path, method, ip_address, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              user.userId || user.id,
              actionCode || `${req.method} ${req.baseUrl}`,
              req.params?.id ? 'record' : 'collection',
              req.params?.id || null,
              req.baseUrl?.split('/')[2] || null,
              req.originalUrl,
              req.method,
              req.ip || null,
              JSON.stringify({ statusCode: res.statusCode }),
            ],
          ).catch(catchHandler(EC.DB_CLEANUP));
        }
      }
      return originalJson(body);
    };
    next();
  };
}

export function setAuditData(
  res: Response,
  data: { action: string; entityType: string; entityId?: string; beforeState?: unknown; afterState?: unknown },
): void {
  (res as unknown as Record<string, unknown>).__auditData = data;
}

export function requestLogger(..._args: unknown[]): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, _res, next) => next();
}

export function localKnowledgeAccessLogMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
