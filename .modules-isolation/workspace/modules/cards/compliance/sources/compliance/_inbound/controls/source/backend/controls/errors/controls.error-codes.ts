import type { ModuleErrorCode } from '../../../shared/error-catalog.types';

export const CONTROLS_ERROR_CODES = {
  DIAGNOSTICS_NOT_FOUND: { code: 'CONTROLS.DIAGNOSTICS_NOT_FOUND', httpStatus: 404, messageEn: 'Diagnostics not found', messageAr: 'Diagnostics غير موجود' },
  DIAGNOSTICS_ALREADY_EXISTS: { code: 'CONTROLS.DIAGNOSTICS_ALREADY_EXISTS', httpStatus: 409, messageEn: 'Diagnostics already exists', messageAr: 'Diagnostics موجود بالفعل' },
  DIAGNOSTICS_VALIDATION_FAILED: { code: 'CONTROLS.DIAGNOSTICS_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Diagnostics validation failed', messageAr: 'فشل التحقق من Diagnostics' },

  UNAUTHORIZED: { code: 'CONTROLS.UNAUTHORIZED', httpStatus: 403, messageEn: 'Insufficient permissions for controls operation', messageAr: 'صلاحيات غير كافية لعملية controls' },
  INVALID_STATE_TRANSITION: { code: 'CONTROLS.INVALID_STATE_TRANSITION', httpStatus: 422, messageEn: 'Invalid state transition', messageAr: 'انتقال حالة غير صالح' },
  DEPENDENCY_CONFLICT: { code: 'CONTROLS.DEPENDENCY_CONFLICT', httpStatus: 409, messageEn: 'Cannot modify due to dependent records', messageAr: 'لا يمكن التعديل بسبب سجلات تابعة' },
  BULK_OPERATION_PARTIAL: { code: 'CONTROLS.BULK_OPERATION_PARTIAL', httpStatus: 207, messageEn: 'Bulk operation completed with partial failures', messageAr: 'اكتملت العملية المجمعة مع إخفاقات جزئية' },
  EXPORT_FAILED: { code: 'CONTROLS.EXPORT_FAILED', httpStatus: 500, messageEn: 'Export operation failed', messageAr: 'فشلت عملية التصدير' },
  IMPORT_VALIDATION_FAILED: { code: 'CONTROLS.IMPORT_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Import data validation failed', messageAr: 'فشل التحقق من بيانات الاستيراد' },
} as const satisfies Record<string, ModuleErrorCode>;

export type ControlsErrorCode = keyof typeof CONTROLS_ERROR_CODES;
