import { describe, expect, it, vi, beforeEach } from 'vitest';

const safeQuery = vi.fn();
const tenantSchema = vi.fn(() => 'tenant_test');

const claudeJSON = vi.fn();

vi.mock('@dos/db', () => ({
  safeQuery,
  tenantSchema,
  emptyResult: (rows: unknown[] = []) => ({ rows }),
  toErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

vi.mock('../modules/compliance/source/backend/compliance/ports/database.port', () => ({
  safeQuery,
  tenantSchema,
  query: vi.fn(async () => ({ rows: [] })),
  safeQueryWithClient: vi.fn(async () => ({ rows: [] })),
  withTransaction: vi.fn(async (fn: any) => fn({})),
  emptyResult: (rows: unknown[] = []) => ({ rows }),
  assertTenantId: vi.fn(() => undefined),
}));

vi.mock('../modules/compliance/source/backend/ksa-regulatory/ports/database.port', () => ({
  safeQuery,
  tenantSchema,
  query: vi.fn(async () => ({ rows: [] })),
  safeQueryWithClient: vi.fn(async () => ({ rows: [] })),
  withTransaction: vi.fn(async (fn: any) => fn({})),
  emptyResult: (rows: unknown[] = []) => ({ rows }),
  assertTenantId: vi.fn(() => undefined),
}));

const eventBus = {
  publish: vi.fn(async () => undefined),
  subscribe: vi.fn(async () => undefined),
  onAfterPublish: vi.fn(async () => undefined),
};

vi.mock('../modules/compliance/source/backend/compliance/ports/events.port', () => ({
  eventBus,
  emitEvent: vi.fn(async () => undefined),
}));

vi.mock('../modules/compliance/source/backend/ksa-regulatory/ports/events.port', () => ({
  eventBus,
  emitEvent: vi.fn(async () => undefined),
}));

vi.mock('@dos/platform-core/resilience', () => ({
  EC: { FALLBACK_QUERY: 'FALLBACK_QUERY', EVENT_BUS: 'EVENT_BUS' },
  swallowDefault: async (_code: unknown, fallback: unknown, promise: Promise<unknown>) => {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  },
  catchHandler: () => () => undefined,
}));

vi.mock('@dos/module-sdk', () => ({
  toErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  getEventBus: () => ({
    publish: vi.fn(async () => undefined),
    subscribe: vi.fn(async () => undefined),
  }),
  publishEvent: vi.fn(async () => undefined),
}));

vi.mock('../modules/compliance/source/backend/compliance/ports/ai.port', () => ({
  claudeJSON,
  claudeComplete: vi.fn(async () => null),
  invokeAI: vi.fn(async () => ''),
}));

vi.mock('../modules/compliance/source/backend/ksa-regulatory/services/ksa-sector-maturity-dimensions', () => ({
  assessGovernanceMaturity: vi.fn(async () => ({ key: 'governance', name: 'Governance', score: 50, indicators: {} })),
  assessRiskMaturity: vi.fn(async () => ({ key: 'risk', name: 'Risk', score: 50, indicators: {} })),
  assessComplianceMaturity: vi.fn(async () => ({ key: 'compliance', name: 'Compliance', score: 50, indicators: {} })),
  assessTechnologyMaturity: vi.fn(async () => ({ key: 'technology', name: 'Technology', score: 50, indicators: {} })),
  assessPeopleMaturity: vi.fn(async () => ({ key: 'people', name: 'People', score: 50, indicators: {} })),
}));

const buildFallbackNarrative = vi.fn(() => 'fallback narrative');
const buildFallbackRoadmap = vi.fn(() => ([
  { phase: 1, title: 'Fallback', description: 'Fallback', dimension: 'compliance', impact: 'medium', effort: 'medium', estimatedWeeks: 4, dependencies: [] },
]));

vi.mock('../modules/compliance/source/backend/ksa-regulatory/services/ksa-sector-maturity-helpers', () => ({
  getTenantSector: vi.fn(async () => ({ sectorCode: 'finance', sectorName: 'Finance' })),
  persistMaturitySnapshot: vi.fn(async () => undefined),
  getIndustryBenchmarks: vi.fn(() => []),
  calculatePercentile: vi.fn(() => 50),
  buildFallbackNarrative,
  buildFallbackRoadmap,
  buildFallbackRoadmapResult: vi.fn(() => ({ roadmap: [] })),
}));

vi.mock('../modules/compliance/source/config/claude-client.ts', () => ({
  claudeJSON: vi.fn(async () => null),
  claudeComplete: vi.fn(async () => null),
  createChatCompletion: vi.fn(async () => null),
  getClaudeClient: vi.fn(() => null),
}));

vi.mock('../modules/compliance/source/config/claude-client.js', () => ({
  claudeJSON: vi.fn(async () => null),
}));

vi.mock('/root/DOS-AIO/modules/compliance/source/config/claude-client.ts', () => ({
  claudeJSON: vi.fn(async () => null),
  claudeComplete: vi.fn(async () => null),
  createChatCompletion: vi.fn(async () => null),
  getClaudeClient: vi.fn(() => null),
}));

vi.mock('/root/DOS-AIO/modules/compliance/source/config/claude-client.js', () => ({
  claudeJSON: vi.fn(async () => null),
}));

beforeEach(() => {
  vi.clearAllMocks();
  tenantSchema.mockReturnValue('tenant_test');
});

describe('Compliance KSA AI null-safety', () => {
  it('computeKsaComplianceScore falls back when claudeJSON returns null', async () => {
    safeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*) FILTER (WHERE c.status')) {
        return {
          rows: [
            {
              framework_code: 'NCA-ECC',
              total: 10,
              implemented: 5,
              partial: 2,
              not_implemented: 3,
              not_applicable: 0,
            },
          ],
        };
      }
      if (sql.includes('controls_with_evidence')) {
        return { rows: [{ framework_code: 'NCA-ECC', controls_with_evidence: 6 }] };
      }
      if (sql.includes('COUNT(*) FILTER (WHERE c.test_status')) {
        return { rows: [{ framework_code: 'NCA-ECC', passed: 2, failed: 1, tested: 3 }] };
      }
      if (sql.includes('FROM "tenant_test".frameworks')) {
        return { rows: [{ framework_id: 'NCA-ECC', name: 'NCA ECC' }] };
      }
      if (sql.includes('FROM "tenant_test".compliance_scores') && sql.includes('LIMIT 2')) {
        return { rows: [{ overall_score: '70' }, { overall_score: '60' }] };
      }
      return { rows: [] };
    });

    claudeJSON.mockResolvedValueOnce(null);

    const { computeKsaComplianceScore } = await import(
      '../modules/compliance/source/backend/ksa-regulatory/services/ksa-compliance-scoring.service'
    );

    const result = await computeKsaComplianceScore('t1');
    expect(result.frameworkScores.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('getSectorMaturityScore uses fallback narrative/roadmap when claudeJSON returns null', async () => {
    claudeJSON.mockResolvedValueOnce(null);

    const { getSectorMaturityScore } = await import(
      '../modules/compliance/source/backend/ksa-regulatory/services/ksa-sector-maturity.service'
    );

    const result = await getSectorMaturityScore('t1');
    expect(buildFallbackNarrative).toHaveBeenCalled();
    expect(buildFallbackRoadmap).toHaveBeenCalled();
    expect(result.narrative).toBe('fallback narrative');
    expect(result.roadmap.length).toBeGreaterThan(0);
  });

  it('assessChangeImpact falls back when claudeJSON returns null', async () => {
    safeQuery
      .mockResolvedValueOnce({
        rows: [
          {
            change_id: 'c1',
            title: 'Change',
            description: 'Desc',
            source_regulator: 'REG',
            change_type: 'update',
            impact_level: 'high',
            affected_frameworks: JSON.stringify(['NCA-ECC']),
            affected_controls: JSON.stringify([]),
            affected_policies: JSON.stringify([]),
            effective_date: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            control_id: 'ctrl-1',
            control_code: 'C-1',
            control_title: 'Title',
            framework_id: 'NCA-ECC',
            implementation_status: 'not_started',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ implemented: 10, total: 20 }] })
      .mockResolvedValueOnce({ rows: [] });

    const { assessChangeImpact } = await import(
      '../modules/compliance/source/backend/ksa-regulatory/services/ksa-regulatory-change-tracking.service'
    );

    const result = await assessChangeImpact('t1', 'c1');
    expect(safeQuery).toHaveBeenCalled();
    expect(result.aiReportEn.length).toBeGreaterThan(0);
    expect(result.remediationPlan.length).toBeGreaterThan(0);
  });
});
