import { Request, Response, NextFunction } from 'express';

const SENSITIVE_FIELDS = new Set([
  'internal_notes', 'risk_score_raw', 'audit_findings_internal',
  'salary', 'ssn', 'personal_id', 'bank_account',
  'security_clearance', 'classification_level',
]);

export function fieldRbac(config?: { module?: string; sensitiveFields?: string[] }) {
  const restricted = config?.sensitiveFields
    ? new Set(config.sensitiveFields)
    : SENSITIVE_FIELDS;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    if (!user) { next(); return; }
    if (user.is_super_admin === true) { next(); return; }

    const tenantId = (req as any).tenantId;
    if (!tenantId) { next(); return; }

    let hasElevatedAccess = false;
    try {
      const db = require('@dos/db');
      const schema = db.tenantSchema(tenantId);
      const profile = await db.safeQuery(
        `SELECT ap.code FROM "${schema}".user_access_profiles uap
         JOIN "${schema}".access_profiles ap ON ap.code = uap.access_profile_code
         WHERE uap.user_id = $1 AND uap.is_active = TRUE
         AND ap.code IN ('platform_super_admin', 'tenant_admin', 'module_admin')
         LIMIT 1`,
        [user.userId || user.id],
      );
      hasElevatedAccess = profile.rows.length > 0;
    } catch { /* allow through on error */ }

    if (hasElevatedAccess) { next(); return; }

    const originalJson = res.json.bind(res);
    res.json = function (body: Record<string, any>) {
      if (body && typeof body === 'object') {
        stripFields(body, restricted);
      }
      return originalJson(body);
    };
    next();
  };
}

function stripFields(obj: any, restricted: Set<string>): void {
  if (Array.isArray(obj)) {
    for (const item of obj) stripFields(item, restricted);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (restricted.has(key)) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        stripFields(obj[key], restricted);
      }
    }
  }
}

export function fieldRbacFilter(..._args: unknown[]): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}
