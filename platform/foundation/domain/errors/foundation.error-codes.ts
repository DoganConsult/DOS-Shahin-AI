import type { ModuleErrorCode } from './error-catalog.types';

export const FOUNDATION_ERROR_CODES = {
  INITIATE_NOT_FOUND: { code: 'FOUNDATION.INITIATE_NOT_FOUND', httpStatus: 404, messageEn: 'Initiate not found', messageAr: 'Initiate غير موجود' },
  INITIATE_ALREADY_EXISTS: { code: 'FOUNDATION.INITIATE_ALREADY_EXISTS', httpStatus: 409, messageEn: 'Initiate already exists', messageAr: 'Initiate موجود بالفعل' },
  INITIATE_VALIDATION_FAILED: { code: 'FOUNDATION.INITIATE_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Initiate validation failed', messageAr: 'فشل التحقق من Initiate' },
  DELEGATIONS_NOT_FOUND: { code: 'FOUNDATION.DELEGATIONS_NOT_FOUND', httpStatus: 404, messageEn: 'Delegations not found', messageAr: 'Delegations غير موجود' },
  DELEGATIONS_ALREADY_EXISTS: { code: 'FOUNDATION.DELEGATIONS_ALREADY_EXISTS', httpStatus: 409, messageEn: 'Delegations already exists', messageAr: 'Delegations موجود بالفعل' },
  DELEGATIONS_VALIDATION_FAILED: { code: 'FOUNDATION.DELEGATIONS_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Delegations validation failed', messageAr: 'فشل التحقق من Delegations' },
  RECERTIFICATION_NOT_FOUND: { code: 'FOUNDATION.RECERTIFICATION_NOT_FOUND', httpStatus: 404, messageEn: 'Recertification not found', messageAr: 'Recertification غير موجود' },
  RECERTIFICATION_ALREADY_EXISTS: { code: 'FOUNDATION.RECERTIFICATION_ALREADY_EXISTS', httpStatus: 409, messageEn: 'Recertification already exists', messageAr: 'Recertification موجود بالفعل' },
  RECERTIFICATION_VALIDATION_FAILED: { code: 'FOUNDATION.RECERTIFICATION_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Recertification validation failed', messageAr: 'فشل التحقق من Recertification' },
  HEALTH_NOT_FOUND: { code: 'FOUNDATION.HEALTH_NOT_FOUND', httpStatus: 404, messageEn: 'Health not found', messageAr: 'Health غير موجود' },
  HEALTH_ALREADY_EXISTS: { code: 'FOUNDATION.HEALTH_ALREADY_EXISTS', httpStatus: 409, messageEn: 'Health already exists', messageAr: 'Health موجود بالفعل' },
  HEALTH_VALIDATION_FAILED: { code: 'FOUNDATION.HEALTH_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Health validation failed', messageAr: 'فشل التحقق من Health' },
  TREE_NOT_FOUND: { code: 'FOUNDATION.TREE_NOT_FOUND', httpStatus: 404, messageEn: 'Tree not found', messageAr: 'Tree غير موجود' },
  TREE_ALREADY_EXISTS: { code: 'FOUNDATION.TREE_ALREADY_EXISTS', httpStatus: 409, messageEn: 'Tree already exists', messageAr: 'Tree موجود بالفعل' },
  TREE_VALIDATION_FAILED: { code: 'FOUNDATION.TREE_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Tree validation failed', messageAr: 'فشل التحقق من Tree' },
  SCAN_NOT_FOUND: { code: 'FOUNDATION.SCAN_NOT_FOUND', httpStatus: 404, messageEn: 'Scan not found', messageAr: 'Scan غير موجود' },
  SCAN_ALREADY_EXISTS: { code: 'FOUNDATION.SCAN_ALREADY_EXISTS', httpStatus: 409, messageEn: 'Scan already exists', messageAr: 'Scan موجود بالفعل' },
  SCAN_VALIDATION_FAILED: { code: 'FOUNDATION.SCAN_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Scan validation failed', messageAr: 'فشل التحقق من Scan' },

  UNAUTHORIZED: { code: 'FOUNDATION.UNAUTHORIZED', httpStatus: 403, messageEn: 'Insufficient permissions for foundation operation', messageAr: 'صلاحيات غير كافية لعملية foundation' },
  INVALID_STATE_TRANSITION: { code: 'FOUNDATION.INVALID_STATE_TRANSITION', httpStatus: 422, messageEn: 'Invalid state transition', messageAr: 'انتقال حالة غير صالح' },
  DEPENDENCY_CONFLICT: { code: 'FOUNDATION.DEPENDENCY_CONFLICT', httpStatus: 409, messageEn: 'Cannot modify due to dependent records', messageAr: 'لا يمكن التعديل بسبب سجلات تابعة' },
  BULK_OPERATION_PARTIAL: { code: 'FOUNDATION.BULK_OPERATION_PARTIAL', httpStatus: 207, messageEn: 'Bulk operation completed with partial failures', messageAr: 'اكتملت العملية المجمعة مع إخفاقات جزئية' },
  EXPORT_FAILED: { code: 'FOUNDATION.EXPORT_FAILED', httpStatus: 500, messageEn: 'Export operation failed', messageAr: 'فشلت عملية التصدير' },
  IMPORT_VALIDATION_FAILED: { code: 'FOUNDATION.IMPORT_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Import data validation failed', messageAr: 'فشل التحقق من بيانات الاستيراد' },
} as const satisfies Record<string, ModuleErrorCode>;

export type FoundationErrorCode = keyof typeof FOUNDATION_ERROR_CODES;
