import type { ModuleErrorCode } from '../../../shared/error-catalog.types';

export const MCP_ERROR_CODES = {
  TOOL_NOT_FOUND: { code: 'MCP.TOOL_NOT_FOUND', httpStatus: 404, messageEn: 'MCP tool not found', messageAr: 'أداة MCP غير موجودة' },
  AGENT_NOT_FOUND: { code: 'MCP.AGENT_NOT_FOUND', httpStatus: 404, messageEn: 'MCP agent not found', messageAr: 'وكيل MCP غير موجود' },
  PROMPT_NOT_FOUND: { code: 'MCP.PROMPT_NOT_FOUND', httpStatus: 404, messageEn: 'MCP prompt not found', messageAr: 'موجه MCP غير موجود' },
  RESOURCE_NOT_FOUND: { code: 'MCP.RESOURCE_NOT_FOUND', httpStatus: 404, messageEn: 'MCP resource not found', messageAr: 'مورد MCP غير موجود' },
  TOOL_DISABLED: { code: 'MCP.TOOL_DISABLED', httpStatus: 403, messageEn: 'MCP tool is disabled', messageAr: 'أداة MCP معطلة' },
  TOOL_EXECUTION_FAILED: { code: 'MCP.TOOL_EXECUTION_FAILED', httpStatus: 500, messageEn: 'Tool execution failed', messageAr: 'فشل تنفيذ الأداة' },
  TOOL_EXECUTION_TIMEOUT: { code: 'MCP.TOOL_EXECUTION_TIMEOUT', httpStatus: 504, messageEn: 'Tool execution timed out', messageAr: 'انتهت مهلة تنفيذ الأداة' },
  TOOL_VALIDATION_FAILED: { code: 'MCP.TOOL_VALIDATION_FAILED', httpStatus: 400, messageEn: 'Tool input validation failed', messageAr: 'فشل التحقق من مدخلات الأداة' },
  PERMISSION_DENIED: { code: 'MCP.PERMISSION_DENIED', httpStatus: 403, messageEn: 'Insufficient permissions for MCP operation', messageAr: 'صلاحيات غير كافية لعملية MCP' },
  APPROVAL_REQUIRED: { code: 'MCP.APPROVAL_REQUIRED', httpStatus: 403, messageEn: 'Tool execution requires approval', messageAr: 'يتطلب تنفيذ الأداة موافقة' },
  APPROVAL_NOT_FOUND: { code: 'MCP.APPROVAL_NOT_FOUND', httpStatus: 404, messageEn: 'Approval request not found', messageAr: 'طلب الموافقة غير موجود' },
  APPROVAL_EXPIRED: { code: 'MCP.APPROVAL_EXPIRED', httpStatus: 410, messageEn: 'Approval request has expired', messageAr: 'انتهت صلاحية طلب الموافقة' },
  RATE_LIMIT_EXCEEDED: { code: 'MCP.RATE_LIMIT_EXCEEDED', httpStatus: 429, messageEn: 'Tool rate limit exceeded', messageAr: 'تم تجاوز حد معدل الأداة' },
  AUTONOMY_LEVEL_INVALID: { code: 'MCP.AUTONOMY_LEVEL_INVALID', httpStatus: 400, messageEn: 'Autonomy level out of allowed range', messageAr: 'مستوى الاستقلالية خارج النطاق المسموح' },
  ACTOR_TYPE_NOT_ALLOWED: { code: 'MCP.ACTOR_TYPE_NOT_ALLOWED', httpStatus: 403, messageEn: 'Actor type not allowed for this tool', messageAr: 'نوع الفاعل غير مسموح به لهذه الأداة' },
  SESSION_LIMIT_REACHED: { code: 'MCP.SESSION_LIMIT_REACHED', httpStatus: 503, messageEn: 'MCP session limit reached', messageAr: 'تم الوصول إلى حد جلسات MCP' },
  SESSION_NOT_FOUND: { code: 'MCP.SESSION_NOT_FOUND', httpStatus: 404, messageEn: 'MCP session not found or expired', messageAr: 'جلسة MCP غير موجودة أو منتهية' },
  SERVER_DISABLED: { code: 'MCP.SERVER_DISABLED', httpStatus: 503, messageEn: 'MCP server is disabled', messageAr: 'خادم MCP معطل' },
  SERVER_INIT_FAILED: { code: 'MCP.SERVER_INIT_FAILED', httpStatus: 500, messageEn: 'MCP server initialization failed', messageAr: 'فشل تهيئة خادم MCP' },
  AUTH_FAILED: { code: 'MCP.AUTH_FAILED', httpStatus: 401, messageEn: 'MCP authentication failed', messageAr: 'فشل مصادقة MCP' },
  TENANT_REQUIRED: { code: 'MCP.TENANT_REQUIRED', httpStatus: 400, messageEn: 'Tenant ID is required in dynamic mode', messageAr: 'معرف المستأجر مطلوب في الوضع الديناميكي' },
  REGISTRY_LOAD_FAILED: { code: 'MCP.REGISTRY_LOAD_FAILED', httpStatus: 500, messageEn: 'Failed to load MCP registry', messageAr: 'فشل تحميل سجل MCP' },
  OVERRIDE_CONFLICT: { code: 'MCP.OVERRIDE_CONFLICT', httpStatus: 409, messageEn: 'Tool override conflict', messageAr: 'تعارض تجاوز الأداة' },
  BULK_OPERATION_PARTIAL: { code: 'MCP.BULK_OPERATION_PARTIAL', httpStatus: 207, messageEn: 'Bulk operation completed with partial failures', messageAr: 'اكتملت العملية المجمعة مع إخفاقات جزئية' },
  STATS_UNAVAILABLE: { code: 'MCP.STATS_UNAVAILABLE', httpStatus: 503, messageEn: 'Execution statistics temporarily unavailable', messageAr: 'إحصائيات التنفيذ غير متاحة مؤقتاً' },
} as const satisfies Record<string, ModuleErrorCode>;

export type McpErrorCode = keyof typeof MCP_ERROR_CODES;
