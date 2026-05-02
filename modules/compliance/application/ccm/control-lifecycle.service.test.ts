import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import { checkStaleness } from './control-lifecycle.service';

describe('Control Lifecycle Service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should export checkStaleness function', () => {
    expect(typeof checkStaleness).toBe('function');
  });
});
