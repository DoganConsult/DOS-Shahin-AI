import { Request, Response, NextFunction } from 'express';
import { isSensitiveField, classifyFieldSensitivity } from './sensitive-fields';
import { logFieldDenial, logSuperAdminFieldAccess } from './field-denial-audit';

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

    const tenantId = (req as any).tenantId;
    const userId = user.userId || user.id || 'unknown';
    const moduleCode = config?.module || 'unknown';
    const requestPath = req.originalUrl || req.url || '';
    const requestId = (req.headers['x-request-id'] as string) || undefined;

    // Super-admin: allow but audit sensitive field access
    if (user.is_super_admin === true) {
      const originalJson = res.json.bind(res);
      res.json = function (body: Record<string, any>) {
        if (body && typeof body === 'object') {
          const sensitiveAccessed = collectSensitiveFields(body, restricted, moduleCode);
          if (sensitiveAccessed.length > 0) {
            const sensitivityLevels: Record<string, string> = {};
            for (const f of sensitiveAccessed) {
              const cls = classifyFieldSensitivity(f, moduleCode);
              if (cls) sensitivityLevels[f] = cls.level;
            }
            logSuperAdminFieldAccess({
              actor: userId,
              tenantId: tenantId || 'unknown',
              module: moduleCode,
              action: 'read',
              fieldsAccessed: sensitiveAccessed,
              sensitivityLevels,
              requestPath,
              requestId,
              timestamp: new Date().toISOString(),
            });
          }
        }
        return originalJson(body);
      };
      next();
      return;
    }

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
        [userId],
      );
      hasElevatedAccess = profile.rows.length > 0;
    } catch { /* allow through on error */ }

    if (hasElevatedAccess) { next(); return; }

    const originalJson = res.json.bind(res);
    res.json = function (body: Record<string, any>) {
      if (body && typeof body === 'object') {
        const strippedFields = stripFields(body, restricted, moduleCode);
        if (strippedFields.length > 0) {
          const sensitivityLevels: Record<string, string> = {};
          for (const f of strippedFields) {
            const cls = classifyFieldSensitivity(f, moduleCode);
            if (cls) sensitivityLevels[f] = cls.level;
          }
          logFieldDenial({
            actor: userId,
            tenantId,
            module: moduleCode,
            action: 'read',
            fieldsRedacted: strippedFields,
            fieldsDenied: [],
            sensitivityLevels,
            requestPath,
            requestId,
            timestamp: new Date().toISOString(),
          });
        }
      }
      return originalJson(body);
    };
    next();
  };
}

function stripFields(obj: any, restricted: Set<string>, moduleCode?: string): string[] {
  const stripped: string[] = [];
  _stripFieldsInner(obj, restricted, moduleCode, stripped);
  return [...new Set(stripped)];
}

function _stripFieldsInner(obj: any, restricted: Set<string>, moduleCode: string | undefined, stripped: string[]): void {
  if (Array.isArray(obj)) {
    for (const item of obj) _stripFieldsInner(item, restricted, moduleCode, stripped);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (restricted.has(key) || isSensitiveField(key, moduleCode)) {
        stripped.push(key);
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        _stripFieldsInner(obj[key], restricted, moduleCode, stripped);
      }
    }
  }
}

function collectSensitiveFields(obj: any, restricted: Set<string>, moduleCode: string): string[] {
  const found: string[] = [];
  _collectSensitiveInner(obj, restricted, moduleCode, found);
  return [...new Set(found)];
}

function _collectSensitiveInner(obj: any, restricted: Set<string>, moduleCode: string, found: string[]): void {
  if (Array.isArray(obj)) {
    for (const item of obj) _collectSensitiveInner(item, restricted, moduleCode, found);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (restricted.has(key) || isSensitiveField(key, moduleCode)) {
        found.push(key);
      }
      if (typeof obj[key] === 'object') {
        _collectSensitiveInner(obj[key], restricted, moduleCode, found);
      }
    }
  }
}

export function fieldRbacFilter(moduleCode?: string): (req: Request, res: Response, next: NextFunction) => void {
  return fieldRbac({ module: moduleCode });
}
