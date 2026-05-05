// @ts-nocheck
import { logger } from '../../ports/logger.port';
import { safeQuery } from '../../ports/database.port';
import { searchCode, checkCodeSearchHealth } from '../../../../connectors/code-search.connector';
import { getCodeSearchConfig, getEnabledEngines } from '../../../../config/code-search';
import { emitModuleEvent } from '../emit-event';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
const EMPTY_ROWS = { rows: [] };
export async function executeCodeSearch(tenantId, userId, input) {
    const connectorInput = {
        query: input.query,
        engine: input.engine || 'zoekt',
        fileFilter: input.fileFilter,
        maxResults: input.maxResults || 50,
    };
    const results = await searchCode(connectorInput);
    await emitModuleEvent({
        tenantId,
        userId,
        module: 'ai',
        event: 'code_search.queried',
        entityType: 'code_search',
        entityId: connectorInput.engine || 'zoekt',
        metadata: { query: input.query, resultCount: results.length },
    });
    return {
        query: input.query,
        engine: connectorInput.engine || 'zoekt',
        resultCount: results.length,
        results: results.map(r => ({
            engine: r.engine,
            file: r.file,
            line: r.line,
            content: r.content.substring(0, 500),
            score: r.score,
        })),
    };
}
export async function getCodeSearchHealthStatus(tenantId, userId) {
    const health = await checkCodeSearchHealth();
    await emitModuleEvent({
        tenantId,
        userId,
        module: 'ai',
        event: 'code_search.engine_health_checked',
        entityType: 'code_search',
        entityId: 'suite',
        metadata: { engineCount: health.length },
    });
    return { engines: health, timestamp: new Date().toISOString() };
}
export function getConfiguredEngines() {
    return getEnabledEngines();
}
export function getFullConfig() {
    return getCodeSearchConfig();
}
export async function listEngineRegistry(_tenantId) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, EMPTY_ROWS, safeQuery(`SELECT * FROM public.code_search_engine_registry ORDER BY engine_code`, []));
    return (result?.rows ?? []);
}
export async function getEngineByCode(_tenantId, engineCode) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, EMPTY_ROWS, safeQuery(`SELECT * FROM public.code_search_engine_registry WHERE engine_code = $1`, [engineCode]));
    return (result?.rows?.[0] ?? null);
}
export async function registerEngine(tenantId, userId, dto) {
    const result = await safeQuery(`INSERT INTO public.code_search_engine_registry
      (engine_code, display_name, engine_type, runtime, base_url, port, health_endpoint, search_endpoint, indexed_surfaces, config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
     RETURNING *`, [
        dto.engine_code, dto.display_name, dto.engine_type, dto.runtime,
        dto.base_url, dto.port,
        dto.health_endpoint || '/', dto.search_endpoint || '/search',
        JSON.stringify(dto.indexed_surfaces || []),
        JSON.stringify(dto.config || {}),
    ]);
    logger.info(`[CodeSearch] Engine registered: ${dto.engine_code} by ${userId}`);
    await emitModuleEvent({
        tenantId, userId, module: 'ai',
        event: 'code_search.engine_registered',
        entityType: 'code_search_engine_registry',
        entityId: dto.engine_code,
    });
    return result.rows[0];
}
export async function updateEngine(tenantId, userId, engineCode, dto) {
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (dto.display_name !== undefined) {
        setClauses.push(`display_name = $${idx++}`);
        values.push(dto.display_name);
    }
    if (dto.base_url !== undefined) {
        setClauses.push(`base_url = $${idx++}`);
        values.push(dto.base_url);
    }
    if (dto.port !== undefined) {
        setClauses.push(`port = $${idx++}`);
        values.push(dto.port);
    }
    if (dto.health_endpoint !== undefined) {
        setClauses.push(`health_endpoint = $${idx++}`);
        values.push(dto.health_endpoint);
    }
    if (dto.search_endpoint !== undefined) {
        setClauses.push(`search_endpoint = $${idx++}`);
        values.push(dto.search_endpoint);
    }
    if (dto.status !== undefined) {
        setClauses.push(`status = $${idx++}`);
        values.push(dto.status);
    }
    if (dto.indexed_surfaces !== undefined) {
        setClauses.push(`indexed_surfaces = $${idx++}::jsonb`);
        values.push(JSON.stringify(dto.indexed_surfaces));
    }
    if (dto.config !== undefined) {
        setClauses.push(`config = $${idx++}::jsonb`);
        values.push(JSON.stringify(dto.config));
    }
    if (setClauses.length === 0)
        return getEngineByCode(tenantId, engineCode);
    setClauses.push(`updated_at = NOW()`);
    values.push(engineCode);
    const result = await safeQuery(`UPDATE public.code_search_engine_registry
     SET ${setClauses.join(', ')}
     WHERE engine_code = $${idx}
     RETURNING *`, values);
    logger.info(`[CodeSearch] Engine updated: ${engineCode} by ${userId}`);
    if (dto.status !== undefined) {
        await emitModuleEvent({
            tenantId, userId, module: 'ai',
            event: 'code_search.engine_status_changed',
            entityType: 'code_search_engine_registry',
            entityId: engineCode,
            metadata: { newStatus: dto.status },
        });
    }
    return (result?.rows?.[0] ?? null);
}
export async function listSurfaceRegistry(_tenantId) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, EMPTY_ROWS, safeQuery(`SELECT * FROM public.code_search_indexed_surface ORDER BY layer, surface_code`, []));
    return (result?.rows ?? []);
}
export async function registerSurface(tenantId, userId, dto) {
    const result = await safeQuery(`INSERT INTO public.code_search_indexed_surface
      (surface_code, display_name, source_path, layer, description)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (surface_code) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       source_path = EXCLUDED.source_path,
       layer = EXCLUDED.layer,
       description = EXCLUDED.description
     RETURNING *`, [dto.surface_code, dto.display_name, dto.source_path, dto.layer, dto.description || '']);
    logger.info(`[CodeSearch] Surface registered: ${dto.surface_code} by ${userId}`);
    await emitModuleEvent({
        tenantId, userId, module: 'ai',
        event: 'code_search.surface_indexed',
        entityType: 'code_search_indexed_surface',
        entityId: dto.surface_code,
    });
    return result.rows[0];
}
export async function getCodeSearchDashboard(tenantId, userId) {
    const [engines, surfaces, health] = await Promise.all([
        listEngineRegistry(tenantId),
        listSurfaceRegistry(tenantId),
        swallowDefault(EC.FALLBACK_QUERY, [], checkCodeSearchHealth()),
    ]);
    if (userId) {
        await emitModuleEvent({
            tenantId, userId, module: 'ai',
            event: 'code_search.engine_health_checked',
            entityType: 'code_search',
            entityId: 'dashboard',
            metadata: { engineCount: health.length },
        });
    }
    const configuredEngines = getEnabledEngines();
    return {
        registeredEngines: engines.length,
        enabledEngines: engines.filter(e => e.status === 'enabled').length,
        indexedSurfaces: surfaces.length,
        runtimeHealth: health,
        configuredEngines: configuredEngines.map(e => e.name),
        surfacesByLayer: surfaces.reduce((acc, s) => {
            acc[s.layer] = (acc[s.layer] || 0) + 1;
            return acc;
        }, {}),
    };
}
//# sourceMappingURL=code-search.service.js.map