export declare const AUTH_ERRORS: {
    readonly UNAUTHENTICATED: {
        readonly code: "UNAUTHENTICATED";
        readonly status: 401;
        readonly message: "Not authenticated";
        readonly message_ar: "غير مصادق";
    };
    readonly INVALID_TOKEN: {
        readonly code: "INVALID_TOKEN";
        readonly status: 401;
        readonly message: "Invalid token";
        readonly message_ar: "رمز غير صالح";
    };
    readonly EXPIRED_TOKEN: {
        readonly code: "EXPIRED_TOKEN";
        readonly status: 401;
        readonly message: "Token expired";
        readonly message_ar: "انتهت صلاحية الرمز";
    };
    readonly SESSION_REVOKED: {
        readonly code: "SESSION_REVOKED";
        readonly status: 401;
        readonly message: "Session revoked";
        readonly message_ar: "تم إلغاء الجلسة";
    };
    readonly FORBIDDEN: {
        readonly code: "FORBIDDEN";
        readonly status: 403;
        readonly message: "Access denied";
        readonly message_ar: "تم رفض الوصول";
    };
    readonly TENANT_MEMBERSHIP_MISSING: {
        readonly code: "TENANT_MEMBERSHIP_MISSING";
        readonly status: 403;
        readonly message: "No active tenant membership";
        readonly message_ar: "لا توجد عضوية مستأجر نشطة";
    };
    readonly TENANT_INACTIVE: {
        readonly code: "TENANT_INACTIVE";
        readonly status: 403;
        readonly message: "Tenant not active";
        readonly message_ar: "المستأجر غير نشط";
    };
    readonly USER_INACTIVE: {
        readonly code: "USER_INACTIVE";
        readonly status: 403;
        readonly message: "User account inactive";
        readonly message_ar: "حساب المستخدم غير نشط";
    };
    readonly SOD_BLOCKED: {
        readonly code: "SOD_BLOCKED";
        readonly status: 403;
        readonly message: "SoD conflict blocks this action";
        readonly message_ar: "تعارض فصل المهام يمنع هذا الإجراء";
    };
    readonly SELF_APPROVAL_BLOCKED: {
        readonly code: "SELF_APPROVAL_BLOCKED";
        readonly status: 403;
        readonly message: "Self-approval not permitted";
        readonly message_ar: "الموافقة الذاتية غير مسموح بها";
    };
    readonly LIFECYCLE_DENIED: {
        readonly code: "LIFECYCLE_DENIED";
        readonly status: 403;
        readonly message: "Lifecycle transition denied";
        readonly message_ar: "تم رفض انتقال دورة الحياة";
    };
    readonly AUTHORITY_INSUFFICIENT: {
        readonly code: "AUTHORITY_INSUFFICIENT";
        readonly status: 403;
        readonly message: "Insufficient authority level";
        readonly message_ar: "مستوى الصلاحية غير كافٍ";
    };
    readonly DELEGATION_INVALID: {
        readonly code: "DELEGATION_INVALID";
        readonly status: 403;
        readonly message: "Delegation invalid or expired";
        readonly message_ar: "التفويض غير صالح أو منتهي الصلاحية";
    };
    readonly CLEARANCE_DENIED: {
        readonly code: "CLEARANCE_DENIED";
        readonly status: 403;
        readonly message: "Insufficient clearance level";
        readonly message_ar: "مستوى التصريح غير كافٍ";
    };
    readonly MODULE_NOT_LICENSED: {
        readonly code: "MODULE_NOT_LICENSED";
        readonly status: 403;
        readonly message: "Module not licensed";
        readonly message_ar: "الوحدة غير مرخصة";
    };
    readonly AUTH_ERROR: {
        readonly code: "AUTH_ERROR";
        readonly status: 500;
        readonly message: "Authorization service unavailable";
        readonly message_ar: "خدمة التفويض غير متاحة";
    };
};
export type AuthErrorCode = keyof typeof AUTH_ERRORS;
export interface AuthErrorBody {
    code: AuthErrorCode;
    status: number;
    message: string;
    timestamp: string;
    correlationId: string;
    detail?: Record<string, unknown>;
}
/**
 * Build a canonical AuthErrorBase-conformant response body.
 * Pass `correlationId` from request context when available.
 */
export declare function buildAuthError(code: AuthErrorCode, correlationId?: string, detail?: Record<string, unknown>, locale?: 'en' | 'ar'): AuthErrorBody;
