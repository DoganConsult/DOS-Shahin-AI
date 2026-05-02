import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
const mockQuery = vi.fn();
vi.mock('@dos/db', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('@dos/platform-core/events', () => ({
  publish: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@dos/platform-core/resilience', () => ({
  catchHandler: () => () => {},
  EC: { EVENT_BUS: 'EVENT_BUS', DB_CLEANUP: 'DB_CLEANUP' },
}));

import { listSecurityAttestations,createSecurityAttestation,getLatestSecurityPosture,createSecurityPostureSnapshot,listAuthPolicies,getAuthPolicy,upsertAuthPolicy,listConditionalAccessGrants } from './security-posture.service';

describe('security-posture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('listSecurityAttestations', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listSecurityAttestations('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listSecurityAttestations('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('createSecurityAttestation', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await createSecurityAttestation('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await createSecurityAttestation('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getLatestSecurityPosture', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getLatestSecurityPosture('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getLatestSecurityPosture('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('createSecurityPostureSnapshot', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await createSecurityPostureSnapshot('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await createSecurityPostureSnapshot('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('listAuthPolicies', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listAuthPolicies('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listAuthPolicies('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('getAuthPolicy', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await getAuthPolicy('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getAuthPolicy('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('upsertAuthPolicy', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await upsertAuthPolicy('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await upsertAuthPolicy('t-001' as never);
      expect(result).toBeDefined();
    });
  });

  describe('listConditionalAccessGrants', () => {
    it('executes without error with default mocks', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ id: '1', cnt: '0', total: 0 }], rowCount: 1 });
      const result = await listConditionalAccessGrants('t-001' as never);
      expect(result).toBeDefined();
    });

    it('handles empty query results gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await listConditionalAccessGrants('t-001' as never);
      expect(result).toBeDefined();
    });
  });

});
