import type { ModuleErrorCode } from './error-catalog.types';
import { ServiceError } from '../errors';

export type Locale = 'en' | 'ar';

export function createModuleError(
  entry: ModuleErrorCode,
  opts?: { locale?: Locale; details?: unknown; messageOverride?: string; codeOverride?: string },
): ServiceError {
  const locale = opts?.locale ?? 'en';
  const message = opts?.messageOverride
    ?? (locale === 'ar' ? entry.messageAr : entry.messageEn)
    ?? entry.messageEn;

  return new ServiceError({
    message,
    status: entry.httpStatus,
    code: opts?.codeOverride ?? entry.code,
    details: opts?.details,
  });
}
