import type { ModuleErrorCode } from '../../../shared/error-catalog.types';

export const KSA_REGULATORY_ERROR_CODES = {

  UNAUTHORIZED: { code: 'KSA_REGULATORY.UNAUTHORIZED', httpStatus: 403, messageEn: 'Insufficient permissions for ksa-regulatory operation', messageAr: 'صلاحيات غير كافية لعملية ksa-regulatory' },
  INVALID_STATE_TRANSITION: { code: 'KSA_REGULATORY.INVALID_STATE_TRANSITION', httpStatus: 422, messageEn: 'Invalid state transition', messageAr: 'انتقال حالة غير صالح' },
  DEPENDENCY_CONFLICT: { code: 'KSA_REGULATORY.DEPENDENCY_CONFLICT', httpStatus: 409, messageEn: 'Cannot modify due to dependent records', messageAr: 'لا يمكن التعديل بسبب سجلات تابعة' },
  BULK_OPERATION_PARTIAL: { code: 'KSA_REGULATORY.BULK_OPERATION_PARTIAL', httpStatus: 207, messageEn: 'Bulk operation completed with partial failures', messageAr: 'اكتملت العملية المجمعة مع إخفاقات جزئية' },
  EXPORT_FAILED: { code: 'KSA_REGULATORY.EXPORT_FAILED', httpStatus: 500, messageEn: 'Export operation failed', messageAr: 'فشلت عملية التصدير' },
  IMPORT_VALIDATION_FAILED: { code: 'KSA_REGULATORY.IMPORT_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Import data validation failed', messageAr: 'فشل التحقق من بيانات الاستيراد' },
} as const satisfies Record<string, ModuleErrorCode>;

export type KsaRegulatoryErrorCode = keyof typeof KSA_REGULATORY_ERROR_CODES;
