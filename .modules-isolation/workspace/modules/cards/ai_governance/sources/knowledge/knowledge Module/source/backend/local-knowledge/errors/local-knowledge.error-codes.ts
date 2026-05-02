import type { ModuleErrorCode } from '../../../shared/error-catalog.types';

export const LOCAL_KNOWLEDGE_ERROR_CODES = {

  UNAUTHORIZED: { code: 'LOCAL_KNOWLEDGE.UNAUTHORIZED', httpStatus: 403, messageEn: 'Insufficient permissions for local-knowledge operation', messageAr: 'صلاحيات غير كافية لعملية local-knowledge' },
  INVALID_STATE_TRANSITION: { code: 'LOCAL_KNOWLEDGE.INVALID_STATE_TRANSITION', httpStatus: 422, messageEn: 'Invalid state transition', messageAr: 'انتقال حالة غير صالح' },
  DEPENDENCY_CONFLICT: { code: 'LOCAL_KNOWLEDGE.DEPENDENCY_CONFLICT', httpStatus: 409, messageEn: 'Cannot modify due to dependent records', messageAr: 'لا يمكن التعديل بسبب سجلات تابعة' },
  BULK_OPERATION_PARTIAL: { code: 'LOCAL_KNOWLEDGE.BULK_OPERATION_PARTIAL', httpStatus: 207, messageEn: 'Bulk operation completed with partial failures', messageAr: 'اكتملت العملية المجمعة مع إخفاقات جزئية' },
  EXPORT_FAILED: { code: 'LOCAL_KNOWLEDGE.EXPORT_FAILED', httpStatus: 500, messageEn: 'Export operation failed', messageAr: 'فشلت عملية التصدير' },
  IMPORT_VALIDATION_FAILED: { code: 'LOCAL_KNOWLEDGE.IMPORT_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Import data validation failed', messageAr: 'فشل التحقق من بيانات الاستيراد' },
} as const satisfies Record<string, ModuleErrorCode>;

export type LocalKnowledgeErrorCode = keyof typeof LOCAL_KNOWLEDGE_ERROR_CODES;
