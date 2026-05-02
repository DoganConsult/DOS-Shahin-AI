import { describe, expect, it } from 'vitest';
import type { ModuleErrorCode } from './error-catalog.types';
import { createModuleError } from './error-catalog';

describe('error-catalog', () => {
  it('creates a ServiceError with locale-aware message', () => {
    const entry: ModuleErrorCode = {
      code: 'AI.CONFIG_NOT_FOUND',
      httpStatus: 404,
      messageEn: 'Config not found',
      messageAr: 'التهيئة غير موجودة',
    };

    const err = createModuleError(entry, { locale: 'ar', details: { x: 1 } });
    expect(err.status).toBe(404);
    expect(err.code).toBe('AI.CONFIG_NOT_FOUND');
    expect(err.message).toBe('التهيئة غير موجودة');
    expect(err.details).toEqual({ x: 1 });
  });
});

