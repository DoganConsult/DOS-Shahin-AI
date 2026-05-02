"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_ERRORS = void 0;
exports.buildAuthError = buildAuthError;
/**
 * DAuth Contracts — canonical auth error codes per §O.2.
 */
const uuid_1 = require("uuid");
exports.AUTH_ERRORS = {
    UNAUTHENTICATED: { code: 'UNAUTHENTICATED', status: 401, message: 'Not authenticated', message_ar: 'غير مصادق' },
    INVALID_TOKEN: { code: 'INVALID_TOKEN', status: 401, message: 'Invalid token', message_ar: 'رمز غير صالح' },
    EXPIRED_TOKEN: { code: 'EXPIRED_TOKEN', status: 401, message: 'Token expired', message_ar: 'انتهت صلاحية الرمز' },
    SESSION_REVOKED: { code: 'SESSION_REVOKED', status: 401, message: 'Session revoked', message_ar: 'تم إلغاء الجلسة' },
    FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Access denied', message_ar: 'تم رفض الوصول' },
    TENANT_MEMBERSHIP_MISSING: { code: 'TENANT_MEMBERSHIP_MISSING', status: 403, message: 'No active tenant membership', message_ar: 'لا توجد عضوية مستأجر نشطة' },
    TENANT_INACTIVE: { code: 'TENANT_INACTIVE', status: 403, message: 'Tenant not active', message_ar: 'المستأجر غير نشط' },
    USER_INACTIVE: { code: 'USER_INACTIVE', status: 403, message: 'User account inactive', message_ar: 'حساب المستخدم غير نشط' },
    SOD_BLOCKED: { code: 'SOD_BLOCKED', status: 403, message: 'SoD conflict blocks this action', message_ar: 'تعارض فصل المهام يمنع هذا الإجراء' },
    SELF_APPROVAL_BLOCKED: { code: 'SELF_APPROVAL_BLOCKED', status: 403, message: 'Self-approval not permitted', message_ar: 'الموافقة الذاتية غير مسموح بها' },
    LIFECYCLE_DENIED: { code: 'LIFECYCLE_DENIED', status: 403, message: 'Lifecycle transition denied', message_ar: 'تم رفض انتقال دورة الحياة' },
    AUTHORITY_INSUFFICIENT: { code: 'AUTHORITY_INSUFFICIENT', status: 403, message: 'Insufficient authority level', message_ar: 'مستوى الصلاحية غير كافٍ' },
    DELEGATION_INVALID: { code: 'DELEGATION_INVALID', status: 403, message: 'Delegation invalid or expired', message_ar: 'التفويض غير صالح أو منتهي الصلاحية' },
    CLEARANCE_DENIED: { code: 'CLEARANCE_DENIED', status: 403, message: 'Insufficient clearance level', message_ar: 'مستوى التصريح غير كافٍ' },
    MODULE_NOT_LICENSED: { code: 'MODULE_NOT_LICENSED', status: 403, message: 'Module not licensed', message_ar: 'الوحدة غير مرخصة' },
    AUTH_ERROR: { code: 'AUTH_ERROR', status: 500, message: 'Authorization service unavailable', message_ar: 'خدمة التفويض غير متاحة' },
};
/**
 * Build a canonical AuthErrorBase-conformant response body.
 * Pass `correlationId` from request context when available.
 */
function buildAuthError(code, correlationId, detail, locale) {
    const entry = exports.AUTH_ERRORS[code];
    const message = locale === 'ar' ? entry.message_ar : entry.message;
    return {
        code,
        status: entry.status,
        message,
        timestamp: new Date().toISOString(),
        correlationId: correlationId ?? (0, uuid_1.v4)(),
        ...(detail ? { detail } : {}),
    };
}
//# sourceMappingURL=auth-errors.js.map