export declare const FOUNDATION_ERROR_CODES: {
    readonly INITIATE_NOT_FOUND: {
        readonly code: "FOUNDATION.INITIATE_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Initiate not found";
        readonly messageAr: "Initiate غير موجود";
    };
    readonly INITIATE_ALREADY_EXISTS: {
        readonly code: "FOUNDATION.INITIATE_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Initiate already exists";
        readonly messageAr: "Initiate موجود بالفعل";
    };
    readonly INITIATE_VALIDATION_FAILED: {
        readonly code: "FOUNDATION.INITIATE_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Initiate validation failed";
        readonly messageAr: "فشل التحقق من Initiate";
    };
    readonly DELEGATIONS_NOT_FOUND: {
        readonly code: "FOUNDATION.DELEGATIONS_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Delegations not found";
        readonly messageAr: "Delegations غير موجود";
    };
    readonly DELEGATIONS_ALREADY_EXISTS: {
        readonly code: "FOUNDATION.DELEGATIONS_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Delegations already exists";
        readonly messageAr: "Delegations موجود بالفعل";
    };
    readonly DELEGATIONS_VALIDATION_FAILED: {
        readonly code: "FOUNDATION.DELEGATIONS_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Delegations validation failed";
        readonly messageAr: "فشل التحقق من Delegations";
    };
    readonly RECERTIFICATION_NOT_FOUND: {
        readonly code: "FOUNDATION.RECERTIFICATION_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Recertification not found";
        readonly messageAr: "Recertification غير موجود";
    };
    readonly RECERTIFICATION_ALREADY_EXISTS: {
        readonly code: "FOUNDATION.RECERTIFICATION_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Recertification already exists";
        readonly messageAr: "Recertification موجود بالفعل";
    };
    readonly RECERTIFICATION_VALIDATION_FAILED: {
        readonly code: "FOUNDATION.RECERTIFICATION_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Recertification validation failed";
        readonly messageAr: "فشل التحقق من Recertification";
    };
    readonly HEALTH_NOT_FOUND: {
        readonly code: "FOUNDATION.HEALTH_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Health not found";
        readonly messageAr: "Health غير موجود";
    };
    readonly HEALTH_ALREADY_EXISTS: {
        readonly code: "FOUNDATION.HEALTH_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Health already exists";
        readonly messageAr: "Health موجود بالفعل";
    };
    readonly HEALTH_VALIDATION_FAILED: {
        readonly code: "FOUNDATION.HEALTH_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Health validation failed";
        readonly messageAr: "فشل التحقق من Health";
    };
    readonly TREE_NOT_FOUND: {
        readonly code: "FOUNDATION.TREE_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Tree not found";
        readonly messageAr: "Tree غير موجود";
    };
    readonly TREE_ALREADY_EXISTS: {
        readonly code: "FOUNDATION.TREE_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Tree already exists";
        readonly messageAr: "Tree موجود بالفعل";
    };
    readonly TREE_VALIDATION_FAILED: {
        readonly code: "FOUNDATION.TREE_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Tree validation failed";
        readonly messageAr: "فشل التحقق من Tree";
    };
    readonly SCAN_NOT_FOUND: {
        readonly code: "FOUNDATION.SCAN_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Scan not found";
        readonly messageAr: "Scan غير موجود";
    };
    readonly SCAN_ALREADY_EXISTS: {
        readonly code: "FOUNDATION.SCAN_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Scan already exists";
        readonly messageAr: "Scan موجود بالفعل";
    };
    readonly SCAN_VALIDATION_FAILED: {
        readonly code: "FOUNDATION.SCAN_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Scan validation failed";
        readonly messageAr: "فشل التحقق من Scan";
    };
    readonly UNAUTHORIZED: {
        readonly code: "FOUNDATION.UNAUTHORIZED";
        readonly httpStatus: 403;
        readonly messageEn: "Insufficient permissions for foundation operation";
        readonly messageAr: "صلاحيات غير كافية لعملية foundation";
    };
    readonly INVALID_STATE_TRANSITION: {
        readonly code: "FOUNDATION.INVALID_STATE_TRANSITION";
        readonly httpStatus: 422;
        readonly messageEn: "Invalid state transition";
        readonly messageAr: "انتقال حالة غير صالح";
    };
    readonly DEPENDENCY_CONFLICT: {
        readonly code: "FOUNDATION.DEPENDENCY_CONFLICT";
        readonly httpStatus: 409;
        readonly messageEn: "Cannot modify due to dependent records";
        readonly messageAr: "لا يمكن التعديل بسبب سجلات تابعة";
    };
    readonly BULK_OPERATION_PARTIAL: {
        readonly code: "FOUNDATION.BULK_OPERATION_PARTIAL";
        readonly httpStatus: 207;
        readonly messageEn: "Bulk operation completed with partial failures";
        readonly messageAr: "اكتملت العملية المجمعة مع إخفاقات جزئية";
    };
    readonly EXPORT_FAILED: {
        readonly code: "FOUNDATION.EXPORT_FAILED";
        readonly httpStatus: 500;
        readonly messageEn: "Export operation failed";
        readonly messageAr: "فشلت عملية التصدير";
    };
    readonly IMPORT_VALIDATION_FAILED: {
        readonly code: "FOUNDATION.IMPORT_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Import data validation failed";
        readonly messageAr: "فشل التحقق من بيانات الاستيراد";
    };
};
export type FoundationErrorCode = keyof typeof FOUNDATION_ERROR_CODES;
