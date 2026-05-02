import type { ModuleErrorCode } from '../../../shared/error-catalog.types';

export const GOVERNANCE_AI_ERROR_CODES = {

  UNAUTHORIZED: { code: 'GOVERNANCE_AI.UNAUTHORIZED', httpStatus: 403, messageEn: 'Insufficient permissions for governance-ai operation', messageAr: 'صلاحيات غير كافية لعملية governance-ai' },
  INVALID_STATE_TRANSITION: { code: 'GOVERNANCE_AI.INVALID_STATE_TRANSITION', httpStatus: 422, messageEn: 'Invalid state transition', messageAr: 'انتقال حالة غير صالح' },
  DEPENDENCY_CONFLICT: { code: 'GOVERNANCE_AI.DEPENDENCY_CONFLICT', httpStatus: 409, messageEn: 'Cannot modify due to dependent records', messageAr: 'لا يمكن التعديل بسبب سجلات تابعة' },
  BULK_OPERATION_PARTIAL: { code: 'GOVERNANCE_AI.BULK_OPERATION_PARTIAL', httpStatus: 207, messageEn: 'Bulk operation completed with partial failures', messageAr: 'اكتملت العملية المجمعة مع إخفاقات جزئية' },
  EXPORT_FAILED: { code: 'GOVERNANCE_AI.EXPORT_FAILED', httpStatus: 500, messageEn: 'Export operation failed', messageAr: 'فشلت عملية التصدير' },
  IMPORT_VALIDATION_FAILED: { code: 'GOVERNANCE_AI.IMPORT_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Import data validation failed', messageAr: 'فشل التحقق من بيانات الاستيراد' },
} as const satisfies Record<string, ModuleErrorCode>;

export type GovernanceAiErrorCode = keyof typeof GOVERNANCE_AI_ERROR_CODES;
