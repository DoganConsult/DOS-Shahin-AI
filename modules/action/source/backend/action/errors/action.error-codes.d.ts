export declare const ACTION_ERROR_CODES: {
    readonly CONFIG_NOT_FOUND: {
        readonly code: "ACTION.CONFIG_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Config not found";
        readonly messageAr: "Config غير موجود";
    };
    readonly CONFIG_ALREADY_EXISTS: {
        readonly code: "ACTION.CONFIG_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Config already exists";
        readonly messageAr: "Config موجود بالفعل";
    };
    readonly CONFIG_VALIDATION_FAILED: {
        readonly code: "ACTION.CONFIG_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Config validation failed";
        readonly messageAr: "فشل التحقق من Config";
    };
    readonly RESEED_NOT_FOUND: {
        readonly code: "ACTION.RESEED_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Reseed not found";
        readonly messageAr: "Reseed غير موجود";
    };
    readonly RESEED_ALREADY_EXISTS: {
        readonly code: "ACTION.RESEED_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Reseed already exists";
        readonly messageAr: "Reseed موجود بالفعل";
    };
    readonly RESEED_VALIDATION_FAILED: {
        readonly code: "ACTION.RESEED_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Reseed validation failed";
        readonly messageAr: "فشل التحقق من Reseed";
    };
    readonly HEALTH_NOT_FOUND: {
        readonly code: "ACTION.HEALTH_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Health not found";
        readonly messageAr: "Health غير موجود";
    };
    readonly HEALTH_ALREADY_EXISTS: {
        readonly code: "ACTION.HEALTH_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Health already exists";
        readonly messageAr: "Health موجود بالفعل";
    };
    readonly HEALTH_VALIDATION_FAILED: {
        readonly code: "ACTION.HEALTH_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Health validation failed";
        readonly messageAr: "فشل التحقق من Health";
    };
    readonly OVERDUE_ANALYTICS_NOT_FOUND: {
        readonly code: "ACTION.OVERDUE_ANALYTICS_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Overdue Analytics not found";
        readonly messageAr: "Overdue Analytics غير موجود";
    };
    readonly OVERDUE_ANALYTICS_ALREADY_EXISTS: {
        readonly code: "ACTION.OVERDUE_ANALYTICS_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Overdue Analytics already exists";
        readonly messageAr: "Overdue Analytics موجود بالفعل";
    };
    readonly OVERDUE_ANALYTICS_VALIDATION_FAILED: {
        readonly code: "ACTION.OVERDUE_ANALYTICS_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Overdue Analytics validation failed";
        readonly messageAr: "فشل التحقق من Overdue Analytics";
    };
    readonly ASSIGNEE_WORKLOAD_NOT_FOUND: {
        readonly code: "ACTION.ASSIGNEE_WORKLOAD_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Assignee Workload not found";
        readonly messageAr: "Assignee Workload غير موجود";
    };
    readonly ASSIGNEE_WORKLOAD_ALREADY_EXISTS: {
        readonly code: "ACTION.ASSIGNEE_WORKLOAD_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Assignee Workload already exists";
        readonly messageAr: "Assignee Workload موجود بالفعل";
    };
    readonly ASSIGNEE_WORKLOAD_VALIDATION_FAILED: {
        readonly code: "ACTION.ASSIGNEE_WORKLOAD_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Assignee Workload validation failed";
        readonly messageAr: "فشل التحقق من Assignee Workload";
    };
    readonly REINDEX_NOT_FOUND: {
        readonly code: "ACTION.REINDEX_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Reindex not found";
        readonly messageAr: "Reindex غير موجود";
    };
    readonly REINDEX_ALREADY_EXISTS: {
        readonly code: "ACTION.REINDEX_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Reindex already exists";
        readonly messageAr: "Reindex موجود بالفعل";
    };
    readonly REINDEX_VALIDATION_FAILED: {
        readonly code: "ACTION.REINDEX_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Reindex validation failed";
        readonly messageAr: "فشل التحقق من Reindex";
    };
    readonly BACKFILL_NOT_FOUND: {
        readonly code: "ACTION.BACKFILL_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Backfill not found";
        readonly messageAr: "Backfill غير موجود";
    };
    readonly BACKFILL_ALREADY_EXISTS: {
        readonly code: "ACTION.BACKFILL_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Backfill already exists";
        readonly messageAr: "Backfill موجود بالفعل";
    };
    readonly BACKFILL_VALIDATION_FAILED: {
        readonly code: "ACTION.BACKFILL_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Backfill validation failed";
        readonly messageAr: "فشل التحقق من Backfill";
    };
    readonly DIAGNOSTICS_NOT_FOUND: {
        readonly code: "ACTION.DIAGNOSTICS_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Diagnostics not found";
        readonly messageAr: "Diagnostics غير موجود";
    };
    readonly DIAGNOSTICS_ALREADY_EXISTS: {
        readonly code: "ACTION.DIAGNOSTICS_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Diagnostics already exists";
        readonly messageAr: "Diagnostics موجود بالفعل";
    };
    readonly DIAGNOSTICS_VALIDATION_FAILED: {
        readonly code: "ACTION.DIAGNOSTICS_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Diagnostics validation failed";
        readonly messageAr: "فشل التحقق من Diagnostics";
    };
    readonly CONSOLIDATED_NOT_FOUND: {
        readonly code: "ACTION.CONSOLIDATED_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Consolidated not found";
        readonly messageAr: "Consolidated غير موجود";
    };
    readonly CONSOLIDATED_ALREADY_EXISTS: {
        readonly code: "ACTION.CONSOLIDATED_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Consolidated already exists";
        readonly messageAr: "Consolidated موجود بالفعل";
    };
    readonly CONSOLIDATED_VALIDATION_FAILED: {
        readonly code: "ACTION.CONSOLIDATED_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Consolidated validation failed";
        readonly messageAr: "فشل التحقق من Consolidated";
    };
    readonly DIGEST_NOT_FOUND: {
        readonly code: "ACTION.DIGEST_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Digest not found";
        readonly messageAr: "Digest غير موجود";
    };
    readonly DIGEST_ALREADY_EXISTS: {
        readonly code: "ACTION.DIGEST_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Digest already exists";
        readonly messageAr: "Digest موجود بالفعل";
    };
    readonly DIGEST_VALIDATION_FAILED: {
        readonly code: "ACTION.DIGEST_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Digest validation failed";
        readonly messageAr: "فشل التحقق من Digest";
    };
    readonly SEARCH_NOT_FOUND: {
        readonly code: "ACTION.SEARCH_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Search not found";
        readonly messageAr: "Search غير موجود";
    };
    readonly SEARCH_ALREADY_EXISTS: {
        readonly code: "ACTION.SEARCH_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Search already exists";
        readonly messageAr: "Search موجود بالفعل";
    };
    readonly SEARCH_VALIDATION_FAILED: {
        readonly code: "ACTION.SEARCH_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Search validation failed";
        readonly messageAr: "فشل التحقق من Search";
    };
    readonly DASHBOARD_NOT_FOUND: {
        readonly code: "ACTION.DASHBOARD_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Dashboard not found";
        readonly messageAr: "Dashboard غير موجود";
    };
    readonly DASHBOARD_ALREADY_EXISTS: {
        readonly code: "ACTION.DASHBOARD_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Dashboard already exists";
        readonly messageAr: "Dashboard موجود بالفعل";
    };
    readonly DASHBOARD_VALIDATION_FAILED: {
        readonly code: "ACTION.DASHBOARD_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Dashboard validation failed";
        readonly messageAr: "فشل التحقق من Dashboard";
    };
    readonly TRENDS_NOT_FOUND: {
        readonly code: "ACTION.TRENDS_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Trends not found";
        readonly messageAr: "Trends غير موجود";
    };
    readonly TRENDS_ALREADY_EXISTS: {
        readonly code: "ACTION.TRENDS_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Trends already exists";
        readonly messageAr: "Trends موجود بالفعل";
    };
    readonly TRENDS_VALIDATION_FAILED: {
        readonly code: "ACTION.TRENDS_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Trends validation failed";
        readonly messageAr: "فشل التحقق من Trends";
    };
    readonly CROSS_MODULE_NOT_FOUND: {
        readonly code: "ACTION.CROSS_MODULE_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Cross Module not found";
        readonly messageAr: "Cross Module غير موجود";
    };
    readonly CROSS_MODULE_ALREADY_EXISTS: {
        readonly code: "ACTION.CROSS_MODULE_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Cross Module already exists";
        readonly messageAr: "Cross Module موجود بالفعل";
    };
    readonly CROSS_MODULE_VALIDATION_FAILED: {
        readonly code: "ACTION.CROSS_MODULE_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Cross Module validation failed";
        readonly messageAr: "فشل التحقق من Cross Module";
    };
    readonly EXPORT_NOT_FOUND: {
        readonly code: "ACTION.EXPORT_NOT_FOUND";
        readonly httpStatus: 404;
        readonly messageEn: "Export not found";
        readonly messageAr: "Export غير موجود";
    };
    readonly EXPORT_ALREADY_EXISTS: {
        readonly code: "ACTION.EXPORT_ALREADY_EXISTS";
        readonly httpStatus: 409;
        readonly messageEn: "Export already exists";
        readonly messageAr: "Export موجود بالفعل";
    };
    readonly EXPORT_VALIDATION_FAILED: {
        readonly code: "ACTION.EXPORT_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Export validation failed";
        readonly messageAr: "فشل التحقق من Export";
    };
    readonly UNAUTHORIZED: {
        readonly code: "ACTION.UNAUTHORIZED";
        readonly httpStatus: 403;
        readonly messageEn: "Insufficient permissions for action operation";
        readonly messageAr: "صلاحيات غير كافية لعملية action";
    };
    readonly INVALID_STATE_TRANSITION: {
        readonly code: "ACTION.INVALID_STATE_TRANSITION";
        readonly httpStatus: 422;
        readonly messageEn: "Invalid state transition";
        readonly messageAr: "انتقال حالة غير صالح";
    };
    readonly DEPENDENCY_CONFLICT: {
        readonly code: "ACTION.DEPENDENCY_CONFLICT";
        readonly httpStatus: 409;
        readonly messageEn: "Cannot modify due to dependent records";
        readonly messageAr: "لا يمكن التعديل بسبب سجلات تابعة";
    };
    readonly BULK_OPERATION_PARTIAL: {
        readonly code: "ACTION.BULK_OPERATION_PARTIAL";
        readonly httpStatus: 207;
        readonly messageEn: "Bulk operation completed with partial failures";
        readonly messageAr: "اكتملت العملية المجمعة مع إخفاقات جزئية";
    };
    readonly EXPORT_FAILED: {
        readonly code: "ACTION.EXPORT_FAILED";
        readonly httpStatus: 500;
        readonly messageEn: "Export operation failed";
        readonly messageAr: "فشلت عملية التصدير";
    };
    readonly IMPORT_VALIDATION_FAILED: {
        readonly code: "ACTION.IMPORT_VALIDATION_FAILED";
        readonly httpStatus: 400;
        readonly messageEn: "Import data validation failed";
        readonly messageAr: "فشل التحقق من بيانات الاستيراد";
    };
};
export type ActionErrorCode = keyof typeof ACTION_ERROR_CODES;
