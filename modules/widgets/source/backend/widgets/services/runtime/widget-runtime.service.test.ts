/**
 * Widget Runtime Service — Unit Tests
 *
 * Verifies widget rendering dispatch (insight vs structural), duration logging,
 * error handling, and delegation to WidgetRuntimeRepository.
 *
 * @owner widgets
 * @since 2026-03-31
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ── Hoisted mocks (vi.hoisted runs before vi.mock factories) ─────────────────

const mocks = vi.hoisted(() => {
  return {
    // WidgetRuntimeRepository methods
    resolveTenantSchema: vi.fn(),
    logWidgetRender: vi.fn(),
    getPublishedWidgets: vi.fn(),
    getPublishedBundles: vi.fn(),
    getRenderStats: vi.fn(),

    // Insight fetchers (29 keys)
    zombieControls: vi.fn(),
    yearInGrc: vi.fn(),
    untestedAssumptions: vi.fn(),
    silentControls: vi.fn(),
    rootCauseVsPatch: vi.fn(),
    riskGravity: vi.fn(),
    riskDenial: vi.fn(),
    reputationImpact: vi.fn(),
    regulatorLens: vi.fn(),
    orgAmnesia: vi.fn(),
    oneSentenceTruth: vi.fn(),
    momentumIndicator: vi.fn(),
    lifecycleBottleneck: vi.fn(),
    knowledgeInPeople: vi.fn(),
    improvementIllusion: vi.fn(),
    ifNothingChanges: vi.fn(),
    maturityGap: vi.fn(),
    futureYou: vi.fn(),
    grcTimeLoop: vi.fn(),
    falseComfort: vi.fn(),
    evidenceRot: vi.fn(),
    decisionTrace: vi.fn(),
    culturalDrift: vi.fn(),
    controlAging: vi.fn(),
    changeLeverage: vi.fn(),
    breakingTheCycle: vi.fn(),
    boardReality: vi.fn(),
    auditDejavu: vi.fn(),
    assessmentHonesty: vi.fn(),

    // Database query
    query: vi.fn(),
  };
});

// ── Mock: WidgetRuntimeRepository ────────────────────────────────────────────

vi.mock('../../repositories/widget-runtime.repo', () => {
  const MockRepo = vi.fn(function (this: Record<string, unknown>) {
    this.resolveTenantSchema = mocks.resolveTenantSchema;
    this.logWidgetRender = mocks.logWidgetRender;
    this.getPublishedWidgets = mocks.getPublishedWidgets;
    this.getPublishedBundles = mocks.getPublishedBundles;
    this.getRenderStats = mocks.getRenderStats;
  });
  return { WidgetRuntimeRepository: MockRepo };
});

// ── Mock: insight-widgets.service ────────────────────────────────────────────

vi.mock('../insight/insight-widgets.service', () => ({
  zombieControls: mocks.zombieControls,
  yearInGrc: mocks.yearInGrc,
  untestedAssumptions: mocks.untestedAssumptions,
  silentControls: mocks.silentControls,
  rootCauseVsPatch: mocks.rootCauseVsPatch,
  riskGravity: mocks.riskGravity,
  riskDenial: mocks.riskDenial,
  reputationImpact: mocks.reputationImpact,
  regulatorLens: mocks.regulatorLens,
  orgAmnesia: mocks.orgAmnesia,
  oneSentenceTruth: mocks.oneSentenceTruth,
  momentumIndicator: mocks.momentumIndicator,
  lifecycleBottleneck: mocks.lifecycleBottleneck,
  knowledgeInPeople: mocks.knowledgeInPeople,
  improvementIllusion: mocks.improvementIllusion,
  ifNothingChanges: mocks.ifNothingChanges,
  maturityGap: mocks.maturityGap,
  futureYou: mocks.futureYou,
  grcTimeLoop: mocks.grcTimeLoop,
  falseComfort: mocks.falseComfort,
  evidenceRot: mocks.evidenceRot,
  decisionTrace: mocks.decisionTrace,
  culturalDrift: mocks.culturalDrift,
  controlAging: mocks.controlAging,
  changeLeverage: mocks.changeLeverage,
  breakingTheCycle: mocks.breakingTheCycle,
  boardReality: mocks.boardReality,
  auditDejavu: mocks.auditDejavu,
  assessmentHonesty: mocks.assessmentHonesty,
}));

// ── Mock: database query + emptyResult ───────────────────────────────────────

vi.mock('../../../../config/database', () => ({
  query: (...args: unknown[]) => mocks.query(...args),
  emptyResult: (rows: Record<string, unknown>[] = []) => ({
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  }),
}));

// ── Mock: resilient-catch (swallowDefault passes through or returns fallback) ─

vi.mock('../../../../utils/resilient-catch', () => ({
  EC: { FALLBACK_QUERY: 'FALLBACK_QUERY' },
  swallowDefault: (_cat: string, fallback: unknown, promise: Promise<unknown>) =>
    promise.catch(() => fallback),
}));

// ── Import service under test (after mocks) ─────────────────────────────────

import { WidgetRuntimeService } from './widget-runtime.service';

// ── Test suite ───────────────────────────────────────────────────────────────

describe('WidgetRuntimeService', () => {
  const TENANT_ID = 'tenant-001';
  const USER_ID = 'user-abc';
  let service: WidgetRuntimeService;

  beforeEach(() => {
    vi.clearAllMocks();
    // logWidgetRender resolves by default so the finally block completes cleanly
    mocks.logWidgetRender.mockResolvedValue(undefined);
    service = new WidgetRuntimeService(TENANT_ID);
  });

  // ─── renderWidget: insight widgets ───────────────────────────────────────

  describe('renderWidget — insight widget', () => {
    it('should dispatch to the matching insight fetcher and return an envelope', async () => {
      const insightPayload = { controls: [{ title: 'SOX-1', daysSince: 90 }] };
      mocks.zombieControls.mockResolvedValue(insightPayload);

      const result = await service.renderWidget({
        tenantId: TENANT_ID,
        userId: USER_ID,
        widgetKey: 'zombie-controls',
      });

      expect(mocks.zombieControls).toHaveBeenCalledWith(TENANT_ID);
      expect(result.widgetKey).toBe('zombie-controls');
      expect(result.title).toBe('zombie-controls');
      expect(result.payload).toEqual(insightPayload);
      expect(result.fetchedAt).toBeDefined();
      // Should not resolve tenant schema for insight widgets
      expect(mocks.resolveTenantSchema).not.toHaveBeenCalled();
    });

    it('should work for representative insight widget keys by dispatching to the correct fetcher', async () => {
      const cases: Array<{ key: string; mock: Mock; payload: unknown }> = [
        { key: 'year-in-grc', mock: mocks.yearInGrc, payload: { summary: 'ok' } },
        { key: 'risk-gravity', mock: mocks.riskGravity, payload: { level: 'high' } },
        { key: 'evidence-rot', mock: mocks.evidenceRot, payload: { stale: 5 } },
        { key: 'board-reality', mock: mocks.boardReality, payload: { gap: 'large' } },
        { key: 'assessment-honesty', mock: mocks.assessmentHonesty, payload: { score: 72 } },
      ];

      for (const { key, mock, payload } of cases) {
        mock.mockResolvedValue(payload);
        const result = await service.renderWidget({
          tenantId: TENANT_ID,
          userId: USER_ID,
          widgetKey: key,
        });
        expect(mock).toHaveBeenCalledWith(TENANT_ID);
        expect(result.widgetKey).toBe(key);
        expect(result.payload).toEqual(payload);
      }
    });
  });

  // ─── renderWidget: structural widgets ────────────────────────────────────

  describe('renderWidget — structural widget', () => {
    it('should resolve tenant schema and return a full envelope for executive-summary', async () => {
      mocks.resolveTenantSchema.mockResolvedValue('tenant_001');
      mocks.query
        .mockResolvedValueOnce({ rows: [{ cnt: 12 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 3 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 7 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.renderWidget({
        tenantId: TENANT_ID,
        userId: USER_ID,
        widgetKey: 'executive-summary',
      });

      expect(mocks.resolveTenantSchema).toHaveBeenCalledWith(TENANT_ID);
      expect(result.widgetKey).toBe('executive-summary');
      expect(result.title).toBe('Executive Summary');
      expect(result.payload).toEqual({
        totalRisks: 12,
        openFindings: 3,
        openActions: 7,
      });
      expect(result.fetchedAt).toBeDefined();
    });

    it('should render risk-heatmap structural widget', async () => {
      mocks.resolveTenantSchema.mockResolvedValue('tenant_001');
      mocks.query
        .mockResolvedValueOnce({
          rows: [{ likelihood: 3, impact: 4, count: 2 }],
          rowCount: 1, command: 'SELECT', oid: 0, fields: [],
        })
        .mockResolvedValueOnce({
          rows: [{ cnt: 10 }],
          rowCount: 1, command: 'SELECT', oid: 0, fields: [],
        });

      const result = await service.renderWidget({
        tenantId: TENANT_ID,
        userId: USER_ID,
        widgetKey: 'risk-heatmap',
      });

      expect(result.widgetKey).toBe('risk-heatmap');
      expect(result.title).toBe('Risk Heatmap');
      expect(result.payload).toEqual({
        cells: [{ likelihood: 3, impact: 4, count: 2 }],
        totalRisks: 10,
      });
    });

    it('should render overdue-actions structural widget', async () => {
      mocks.resolveTenantSchema.mockResolvedValue('tenant_001');
      const overdueRow = {
        id: 'act-1', title: 'Fix firewall', dueDate: '2026-01-01',
        status: 'open', owner: 'alice', sourceType: 'audit',
      };
      mocks.query.mockResolvedValueOnce({
        rows: [overdueRow],
        rowCount: 1, command: 'SELECT', oid: 0, fields: [],
      });

      const result = await service.renderWidget({
        tenantId: TENANT_ID,
        userId: USER_ID,
        widgetKey: 'overdue-actions',
      });

      expect(result.widgetKey).toBe('overdue-actions');
      expect(result.title).toBe('Overdue Actions');
      expect(result.payload).toEqual([overdueRow]);
    });
  });

  // ─── renderWidget: unknown key ───────────────────────────────────────────

  describe('renderWidget — unknown widget key', () => {
    it('should throw an error for an unsupported widget key', async () => {
      mocks.resolveTenantSchema.mockResolvedValue('tenant_001');

      await expect(
        service.renderWidget({
          tenantId: TENANT_ID,
          userId: USER_ID,
          widgetKey: 'nonexistent-widget',
        }),
      ).rejects.toThrow('Unsupported widget key: nonexistent-widget');
    });
  });

  // ─── renderWidget: duration logging ──────────────────────────────────────

  describe('renderWidget — duration logging', () => {
    it('should log render duration with success=true on successful render', async () => {
      mocks.zombieControls.mockResolvedValue({ data: 'ok' });

      await service.renderWidget({
        tenantId: TENANT_ID,
        userId: USER_ID,
        widgetKey: 'zombie-controls',
      });

      expect(mocks.logWidgetRender).toHaveBeenCalledTimes(1);
      const [widgetKey, userId, duration, success] = mocks.logWidgetRender.mock.calls[0];
      expect(widgetKey).toBe('zombie-controls');
      expect(userId).toBe(USER_ID);
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(success).toBe(true);
    });

    it('should log render duration with success=false when the fetcher throws', async () => {
      mocks.zombieControls.mockRejectedValue(new Error('DB unavailable'));

      await expect(
        service.renderWidget({
          tenantId: TENANT_ID,
          userId: USER_ID,
          widgetKey: 'zombie-controls',
        }),
      ).rejects.toThrow('DB unavailable');

      expect(mocks.logWidgetRender).toHaveBeenCalledTimes(1);
      const [widgetKey, userId, duration, success] = mocks.logWidgetRender.mock.calls[0];
      expect(widgetKey).toBe('zombie-controls');
      expect(userId).toBe(USER_ID);
      expect(typeof duration).toBe('number');
      expect(success).toBe(false);
    });

    it('should log render failure for structural widget errors', async () => {
      mocks.resolveTenantSchema.mockRejectedValue(new Error('Tenant schema not found'));

      await expect(
        service.renderWidget({
          tenantId: TENANT_ID,
          userId: USER_ID,
          widgetKey: 'executive-summary',
        }),
      ).rejects.toThrow('Tenant schema not found');

      expect(mocks.logWidgetRender).toHaveBeenCalledTimes(1);
      const [, , , success] = mocks.logWidgetRender.mock.calls[0];
      expect(success).toBe(false);
    });

    it('should not propagate errors from logWidgetRender itself', async () => {
      mocks.logWidgetRender.mockRejectedValue(new Error('logging failed'));
      mocks.zombieControls.mockResolvedValue({ data: 'ok' });

      // The render should still succeed even if logging fails
      const result = await service.renderWidget({
        tenantId: TENANT_ID,
        userId: USER_ID,
        widgetKey: 'zombie-controls',
      });

      expect(result.widgetKey).toBe('zombie-controls');
    });
  });

  // ─── getPublishedCatalog ─────────────────────────────────────────────────

  describe('getPublishedCatalog', () => {
    it('should delegate to runtimeRepo.getPublishedWidgets', async () => {
      const widgets = [
        { widget_id: 'w1', widget_key: 'executive-summary', name_en: 'Executive Summary' },
        { widget_id: 'w2', widget_key: 'risk-heatmap', name_en: 'Risk Heatmap' },
      ];
      mocks.getPublishedWidgets.mockResolvedValue(widgets);

      const result = await service.getPublishedCatalog();

      expect(mocks.getPublishedWidgets).toHaveBeenCalledTimes(1);
      expect(result).toEqual(widgets);
    });

    it('should return an empty array when no published widgets exist', async () => {
      mocks.getPublishedWidgets.mockResolvedValue([]);

      const result = await service.getPublishedCatalog();

      expect(result).toEqual([]);
    });
  });

  // ─── getPublishedBundles ─────────────────────────────────────────────────

  describe('getPublishedBundles', () => {
    it('should delegate to runtimeRepo.getPublishedBundles', async () => {
      const bundles = [
        { bundle_id: 'b1', name_en: 'Executive Pack', widget_ids: ['w1', 'w2'] },
      ];
      mocks.getPublishedBundles.mockResolvedValue(bundles);

      const result = await service.getPublishedBundles();

      expect(mocks.getPublishedBundles).toHaveBeenCalledTimes(1);
      expect(result).toEqual(bundles);
    });

    it('should return an empty array when no bundles exist', async () => {
      mocks.getPublishedBundles.mockResolvedValue([]);

      const result = await service.getPublishedBundles();

      expect(result).toEqual([]);
    });
  });

  // ─── getRenderStats ──────────────────────────────────────────────────────

  describe('getRenderStats', () => {
    it('should delegate to runtimeRepo.getRenderStats with a widget key', async () => {
      const stats = [
        { widget_key: 'risk-heatmap', render_count: 42, avg_duration_ms: 120, error_count: 1 },
      ];
      mocks.getRenderStats.mockResolvedValue(stats);

      const result = await service.getRenderStats('risk-heatmap');

      expect(mocks.getRenderStats).toHaveBeenCalledWith('risk-heatmap');
      expect(result).toEqual(stats);
    });

    it('should delegate to runtimeRepo.getRenderStats without a widget key', async () => {
      const stats = [
        { widget_key: 'risk-heatmap', render_count: 42, avg_duration_ms: 120, error_count: 1 },
        { widget_key: 'executive-summary', render_count: 10, avg_duration_ms: 80, error_count: 0 },
      ];
      mocks.getRenderStats.mockResolvedValue(stats);

      const result = await service.getRenderStats();

      expect(mocks.getRenderStats).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(stats);
    });
  });

  // ─── isInsightWidget ─────────────────────────────────────────────────────

  describe('isInsightWidget', () => {
    it('should return true for known insight widget keys', () => {
      const insightKeys = [
        'zombie-controls', 'year-in-grc', 'untested-assumptions',
        'silent-controls', 'risk-gravity', 'evidence-rot',
        'board-reality', 'assessment-honesty', 'cultural-drift',
        'momentum-indicator', 'false-comfort', 'grc-time-loop',
      ];
      for (const key of insightKeys) {
        expect(service.isInsightWidget(key)).toBe(true);
      }
    });

    it('should return false for structural widget keys', () => {
      const structuralKeys = [
        'executive-summary', 'risk-heatmap', 'overdue-actions',
        'audit-exposure', 'privacy-incidents', 'maturity-score',
        'assessment-progress', 'recommendations', 'evidence-coverage',
        'kri-status',
      ];
      for (const key of structuralKeys) {
        expect(service.isInsightWidget(key)).toBe(false);
      }
    });

    it('should return false for completely unknown keys', () => {
      expect(service.isInsightWidget('does-not-exist')).toBe(false);
      expect(service.isInsightWidget('')).toBe(false);
      expect(service.isInsightWidget('executive-summary-v2')).toBe(false);
    });
  });

  // ─── constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create a WidgetRuntimeRepository with the provided tenantId', async () => {
      const { WidgetRuntimeRepository: MockedRepo } = vi.mocked(
        await import('../../repositories/widget-runtime.repo'),
      );
      // Clear call history from the beforeEach construction
      MockedRepo.mockClear();

      const _svc = new WidgetRuntimeService('tenant-xyz');
      expect(MockedRepo).toHaveBeenCalledWith('tenant-xyz');
    });
  });
});
