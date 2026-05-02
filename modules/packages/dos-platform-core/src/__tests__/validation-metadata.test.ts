import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getValidationMetadata, validate } from '../http';

describe('validation metadata', () => {
  it('annotates single-source validation handlers', () => {
    const bodySchema = z.object({
      name: z.string(),
    });

    const handler = validate(bodySchema);
    const metadata = getValidationMetadata(handler);

    expect(metadata?.body).toBe(bodySchema);
    expect(metadata?.strict).toBe(false);
  });

  it('annotates multi-source validation handlers', () => {
    const bodySchema = z.object({
      title: z.string(),
    });
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
    });
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const handler = validate({
      body: bodySchema,
      query: querySchema,
      params: paramsSchema,
      strict: true,
    });
    const metadata = getValidationMetadata(handler);

    expect(metadata?.body).toBe(bodySchema);
    expect(metadata?.query).toBe(querySchema);
    expect(metadata?.params).toBe(paramsSchema);
    expect(metadata?.strict).toBe(true);
  });
});