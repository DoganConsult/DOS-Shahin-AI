import { ServiceError } from '../errors';
export function createModuleError(entry, opts) {
    const locale = opts?.locale ?? 'en';
    const message = opts?.messageOverride
        ?? (locale === 'ar' ? entry.messageAr : entry.messageEn)
        ?? entry.messageEn;
    return new ServiceError({
        message,
        status: entry.httpStatus,
        code: opts?.codeOverride ?? entry.code,
        details: opts?.details,
    });
}
//# sourceMappingURL=error-catalog.js.map