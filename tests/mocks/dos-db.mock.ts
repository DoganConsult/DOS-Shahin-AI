import { vi } from 'vitest';

export const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
export const safeQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
export const tenantSchema = vi.fn((id: string) => `tenant_${id}`);
export const withTransaction = vi.fn().mockImplementation(async (cb: any) => cb({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  safeQuery: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
}));
export const getDbLogger = vi.fn().mockReturnValue({ info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() });
