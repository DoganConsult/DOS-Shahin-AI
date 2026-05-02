import type { ModuleErrorCode } from '../../../shared/error-catalog.types';

export const PROACTIVE_LEADERSHIP_ERROR_CODES = {

  UNAUTHORIZED: { code: 'PROACTIVE_LEADERSHIP.UNAUTHORIZED', httpStatus: 403, messageEn: 'Insufficient permissions for proactive-leadership operation', messageAr: 'صلاحيات غير كافية لعملية proactive-leadership' },
  INVALID_STATE_TRANSITION: { code: 'PROACTIVE_LEADERSHIP.INVALID_STATE_TRANSITION', httpStatus: 422, messageEn: 'Invalid state transition', messageAr: 'انتقال حالة غير صالح' },
  DEPENDENCY_CONFLICT: { code: 'PROACTIVE_LEADERSHIP.DEPENDENCY_CONFLICT', httpStatus: 409, messageEn: 'Cannot modify due to dependent records', messageAr: 'لا يمكن التعديل بسبب سجلات تابعة' },
  BULK_OPERATION_PARTIAL: { code: 'PROACTIVE_LEADERSHIP.BULK_OPERATION_PARTIAL', httpStatus: 207, messageEn: 'Bulk operation completed with partial failures', messageAr: 'اكتملت العملية المجمعة مع إخفاقات جزئية' },
  EXPORT_FAILED: { code: 'PROACTIVE_LEADERSHIP.EXPORT_FAILED', httpStatus: 500, messageEn: 'Export operation failed', messageAr: 'فشلت عملية التصدير' },
  IMPORT_VALIDATION_FAILED: { code: 'PROACTIVE_LEADERSHIP.IMPORT_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Import data validation failed', messageAr: 'فشل التحقق من بيانات الاستيراد' },
} as const satisfies Record<string, ModuleErrorCode>;

export type ProactiveLeadershipErrorCode = keyof typeof PROACTIVE_LEADERSHIP_ERROR_CODES;
