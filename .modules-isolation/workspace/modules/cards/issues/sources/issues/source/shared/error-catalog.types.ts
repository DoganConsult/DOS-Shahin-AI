/**
 * Shared error catalog types for all ai-engine-service domains.
 */
export interface ModuleErrorCode {
  code: string;
  httpStatus: number;
  messageEn: string;
  messageAr?: string;
}
