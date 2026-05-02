import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../ports/database.port', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
}));

const mockSearchCode = vi.fn().mockResolvedValue([]);
const mockCheckHealth = vi.fn().mockResolvedValue([]);
vi.mock('../../../../connectors/code-search.connector', () => ({
  searchCode: (...args: unknown[]) => mockSearchCode(...args),
  checkCodeSearchHealth: (...args: unknown[]) => mockCheckHealth(...args),
}));

vi.mock('../../../../config/code-search', () => ({
  getCodeSearchConfig: () => ({
    zoekt: { enabled: true, name: 'Zoekt', url: 'http://127.0.0.1:6070', type: 'trigram', searchEndpoint: '/search', healthEndpoint: '/' },
    hound: { enabled: false, name: 'Hound', url: '', type: 'regex', searchEndpoint: '', healthEndpoint: '' },
    seagoat: { enabled: false, name: 'SeaGOAT', url: '', type: 'semantic', searchEndpoint: '', healthEndpoint: '' },
    opengrok: { enabled: false, name: 'OpenGrok', url: '', type: 'enterprise', searchEndpoint: '', healthEndpoint: '' },
    codesearch: { enabled: false, name: 'Code-Search', url: '', type: 'ui', searchEndpoint: '', healthEndpoint: '' },
  }),
  getEnabledEngines: () => [{ enabled: true, name: 'Zoekt', url: 'http://127.0.0.1:6070', type: 'trigram', searchEndpoint: '/search', healthEndpoint: '/' }],
}));

const mockEmit = vi.fn().mockResolvedValue(undefined);
vi.mock('../emit-event', () => ({
  emitModuleEvent: (...args: unknown[]) => mockEmit(...args),
}));

vi.mock('@dos/platform-core/resilience', () => ({
  swallowDefault: (_code: unknown, fallback: unknown, promise: Promise<unknown>) => promise.catch(() => fallback),
  EC: { FALLBACK_QUERY: 'FALLBACK_QUERY' },
}));

vi.mock('../../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  executeCodeSearch,
  getCodeSearchHealthStatus,
  getConfiguredEngines,
  getFullConfig,
  listEngineRegistry,
  getEngineByCode,
  registerEngine,
  updateEngine,
  listSurfaceRegistry,
  registerSurface,
  getCodeSearchDashboard,
} from './code-search.service';

describe('CodeSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeCodeSearch', () => {
    it('calls connector and emits event', async () => {
      mockSearchCode.mockResolvedValueOnce([
        { engine: 'zoekt', file: 'src/main.ts', line: 10, content: 'hello', score: 1.0 },
      ]);

      const result = await executeCodeSearch('t-1', 'u-1', { query: 'hello' });

      expect(mockSearchCode).toHaveBeenCalledWith(expect.objectContaining({ query: 'hello', engine: 'zoekt' }));
      expect(result.resultCount).toBe(1);
      expect(result.results[0].file).toBe('src/main.ts');
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ event: 'code_search.queried' }));
    });

    it('returns empty results when connector returns empty', async () => {
      mockSearchCode.mockResolvedValueOnce([]);
      const result = await executeCodeSearch('t-1', 'u-1', { query: 'nonexistent' });
      expect(result.resultCount).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  describe('getCodeSearchHealthStatus', () => {
    it('returns health and emits event', async () => {
      mockCheckHealth.mockResolvedValueOnce([
        { engine: 'zoekt', status: 'healthy', responseTimeMs: 42 },
      ]);

      const result = await getCodeSearchHealthStatus('t-1', 'u-1');

      expect(result.engines).toHaveLength(1);
      expect(result.engines[0].status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ event: 'code_search.engine_health_checked' }));
    });
  });

  describe('getConfiguredEngines', () => {
    it('returns enabled engines from config', () => {
      const engines = getConfiguredEngines();
      expect(engines).toHaveLength(1);
      expect(engines[0].name).toBe('Zoekt');
    });
  });

  describe('getFullConfig', () => {
    it('returns full suite config', () => {
      const config = getFullConfig();
      expect(config.zoekt.enabled).toBe(true);
      expect(config.hound.enabled).toBe(false);
    });
  });

  describe('listEngineRegistry', () => {
    it('returns rows from DB', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ engine_code: 'zoekt', display_name: 'Zoekt' }] });
      const result = await listEngineRegistry('t-1');
      expect(result).toHaveLength(1);
      expect(result[0].engine_code).toBe('zoekt');
    });

    it('returns empty on DB failure (swallowDefault)', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('db down'));
      const result = await listEngineRegistry('t-1');
      expect(result).toEqual([]);
    });
  });

  describe('getEngineByCode', () => {
    it('returns engine when found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ engine_code: 'zoekt' }] });
      const result = await getEngineByCode('t-1', 'zoekt');
      expect(result?.engine_code).toBe('zoekt');
    });

    it('returns null when not found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      const result = await getEngineByCode('t-1', 'unknown');
      expect(result).toBeNull();
    });
  });

  describe('registerEngine', () => {
    it('inserts and emits event', async () => {
      const dto = {
        engine_code: 'test-engine',
        display_name: 'Test',
        engine_type: 'trigram' as const,
        runtime: 'go' as const,
        base_url: 'http://localhost:9999',
        port: 9999,
      };
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ ...dto, status: 'enabled' }] });

      const result = await registerEngine('t-1', 'u-1', dto);

      expect(result.engine_code).toBe('test-engine');
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ event: 'code_search.engine_registered' }));
    });
  });

  describe('updateEngine', () => {
    it('updates and emits status change event when status changes', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ engine_code: 'zoekt', status: 'disabled' }] });

      const result = await updateEngine('t-1', 'u-1', 'zoekt', { status: 'disabled' });

      expect(result?.status).toBe('disabled');
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ event: 'code_search.engine_status_changed' }));
    });

    it('returns existing engine when no fields to update', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ engine_code: 'zoekt' }] });

      const result = await updateEngine('t-1', 'u-1', 'zoekt', {});

      expect(result?.engine_code).toBe('zoekt');
    });
  });

  describe('listSurfaceRegistry', () => {
    it('returns surfaces from DB', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ surface_code: 'modules', layer: 'module' }] });
      const result = await listSurfaceRegistry('t-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('registerSurface', () => {
    it('upserts and emits event', async () => {
      const dto = {
        surface_code: 'test-surface',
        display_name: 'Test Surface',
        source_path: '/test/',
        layer: 'module' as const,
      };
      mockSafeQuery.mockResolvedValueOnce({ rows: [dto] });

      const result = await registerSurface('t-1', 'u-1', dto);

      expect(result.surface_code).toBe('test-surface');
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ event: 'code_search.surface_indexed' }));
    });
  });

  describe('getCodeSearchDashboard', () => {
    it('aggregates engines, surfaces, and health', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ engine_code: 'zoekt', status: 'enabled' }] })
        .mockResolvedValueOnce({ rows: [{ surface_code: 'modules', layer: 'module' }] });
      mockCheckHealth.mockResolvedValueOnce([{ engine: 'zoekt', status: 'healthy', responseTimeMs: 10 }]);

      const result = await getCodeSearchDashboard('t-1', 'u-1');

      expect(result.registeredEngines).toBe(1);
      expect(result.enabledEngines).toBe(1);
      expect(result.indexedSurfaces).toBe(1);
      expect(result.runtimeHealth).toHaveLength(1);
      expect(result.surfacesByLayer).toEqual({ module: 1 });
    });

    it('emits audit event when userId provided', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      mockCheckHealth.mockResolvedValueOnce([]);

      await getCodeSearchDashboard('t-1', 'u-1');

      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ event: 'code_search.engine_health_checked' }));
    });
  });
});
