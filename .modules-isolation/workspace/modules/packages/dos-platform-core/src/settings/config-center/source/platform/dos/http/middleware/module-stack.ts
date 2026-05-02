import { Request, Response, NextFunction } from 'express';

export type SupportedLang = 'en' | 'ar';

export function moduleStack(moduleCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    (req as any).moduleCode = moduleCode;
    (req as any).module = moduleCode;
    next();
  };
}

type DbPort = { safeQuery: (sql: string, params?: unknown[]) => Promise<any> };
let _dbPort: DbPort | null = null;
export function setModuleStackDbPort(port: DbPort): void { _dbPort = port; }
function getDb(): DbPort | null {
  if (_dbPort) return _dbPort;
  try { _dbPort = require('@dos/db'); return _dbPort; } catch { return null; }
}

export function blockInHumanOnlyMode() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = (req as any).tenantId;
    if (!tenantId) { next(); return; }
    try {
      const db = getDb();
      if (!db) { next(); return; }
      const { rows } = await db.safeQuery(
        `SELECT setting_value FROM public.tenant_settings WHERE tenant_id = $1 AND setting_key = 'platform_mode' LIMIT 1`,
        [tenantId],
      );
      const mode = rows[0]?.setting_value ?? 'hybrid';
      if (mode === 'human') {
        res.status(403).json({ error: 'AI actions blocked: tenant is in human-only mode' });
        return;
      }
    } catch { /* allow through */ }
    next();
  };
}

export function requireHybridOrHigher() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = (req as any).tenantId;
    if (!tenantId) { next(); return; }
    try {
      const db = getDb();
      if (!db) { next(); return; }
      const { rows } = await db.safeQuery(
        `SELECT setting_value FROM public.tenant_settings WHERE tenant_id = $1 AND setting_key = 'platform_mode' LIMIT 1`,
        [tenantId],
      );
      const mode = rows[0]?.setting_value ?? 'hybrid';
      if (mode === 'human') {
        res.status(403).json({ error: 'Requires hybrid or higher AI mode — current: human-only' });
        return;
      }
    } catch { /* allow through */ }
    next();
  };
}

export function i18nMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const acceptLang = req.headers['accept-language'] || '';
    (req as any).lang = acceptLang.startsWith('ar') ? 'ar' : 'en';
    next();
  };
}

export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  next();
}
