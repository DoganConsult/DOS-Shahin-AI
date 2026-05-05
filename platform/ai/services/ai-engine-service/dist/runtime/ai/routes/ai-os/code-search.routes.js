// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { NotFoundError } from '../../../../errors';
import { aiReadLimiter, aiWriteLimiter, setCacheHeaders, setNoCacheHeaders } from './shared';
import { auditMiddleware, validate, asyncHandler, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { executeCodeSearch, getCodeSearchHealthStatus, getConfiguredEngines, getFullConfig, listEngineRegistry, getEngineByCode, registerEngine, updateEngine, listSurfaceRegistry, registerSurface, getCodeSearchDashboard, } from '../../services/code-search/code-search.service';
const codeSearchQueryBody = z.object({
    query: z.string().min(1).max(2000),
    engine: z.enum(['zoekt', 'hound', 'seagoat', 'all']).optional(),
    fileFilter: z.string().max(500).optional(),
    maxResults: z.number().int().min(1).max(200).optional(),
});
const codeSearchEngineCreateBody = z.object({
    engine_code: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/),
    display_name: z.string().min(1).max(255),
    engine_type: z.enum(['trigram', 'regex', 'semantic', 'enterprise', 'ui']),
    runtime: z.enum(['go', 'python', 'java', 'cpp']),
    base_url: z.string().min(1).max(500),
    port: z.number().int().min(0).max(65535),
    health_endpoint: z.string().max(255).optional(),
    search_endpoint: z.string().max(255).optional(),
    indexed_surfaces: z.array(z.string().max(100)).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
});
const codeSearchEngineUpdateBody = z.object({
    display_name: z.string().min(1).max(255).optional(),
    base_url: z.string().min(1).max(500).optional(),
    port: z.number().int().min(0).max(65535).optional(),
    health_endpoint: z.string().max(255).optional(),
    search_endpoint: z.string().max(255).optional(),
    status: z.enum(['enabled', 'disabled', 'maintenance']).optional(),
    indexed_surfaces: z.array(z.string().max(100)).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
});
const codeSearchSurfaceCreateBody = z.object({
    surface_code: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
    display_name: z.string().min(1).max(255),
    source_path: z.string().min(1).max(500),
    layer: z.enum(['env', 'config', 'db', 'platform', 'dauth', 'product', 'module', 'frontend', 'shared', 'devops', 'test', 'contract']),
    description: z.string().max(1000).optional(),
});
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
/** @swagger /api/ai-os/code-search/query: post: { summary: Execute code search query, tags: [AI OS - Code Search] } */
router.post('/ai-os/code-search/query', authenticate, aiReadLimiter, requirePermission('ai.code_search.query'), validate({ body: codeSearchQueryBody }), asyncHandler(async (req, res) => {
    const { query, engine, fileFilter, maxResults } = req.body;
    const result = await executeCodeSearch(req.tenantId, req.userId, { query, engine, fileFilter, maxResults });
    setNoCacheHeaders(res);
    res.ok(result);
}));
/** @swagger /api/ai-os/code-search/health: get: { summary: Code search engine health check, tags: [AI OS - Code Search] } */
router.get('/ai-os/code-search/health', authenticate, aiReadLimiter, requirePermission('ai.code_search.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const result = await getCodeSearchHealthStatus(req.tenantId, req.userId);
    setCacheHeaders(res, 15);
    res.ok(result);
}));
/** @swagger /api/ai-os/code-search/dashboard: get: { summary: Code search aggregated dashboard, tags: [AI OS - Code Search] } */
router.get('/ai-os/code-search/dashboard', authenticate, aiReadLimiter, requirePermission('ai.code_search.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const result = await getCodeSearchDashboard(req.tenantId, req.userId);
    setCacheHeaders(res, 30);
    res.ok(result);
}));
/** @swagger /api/ai-os/code-search/config: get: { summary: Code search runtime configuration, tags: [AI OS - Code Search] } */
router.get('/ai-os/code-search/config', authenticate, aiReadLimiter, requirePermission('ai.code_search.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const config = getFullConfig();
    const enabled = getConfiguredEngines();
    setCacheHeaders(res, 60);
    res.ok({ config, enabledCount: enabled.length, enabledEngines: enabled.map(e => e.name) });
}));
/** @swagger /api/ai-os/code-search/engines: get: { summary: List registered code search engines, tags: [AI OS - Code Search] } */
router.get('/ai-os/code-search/engines', authenticate, aiReadLimiter, requirePermission('ai.code_search.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const engines = await listEngineRegistry(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok({ engines, total: engines.length });
}));
/** @swagger /api/ai-os/code-search/engines/:engineCode: get: { summary: Get code search engine by code, tags: [AI OS - Code Search] } */
router.get('/ai-os/code-search/engines/:engineCode', authenticate, aiReadLimiter, requirePermission('ai.code_search.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const engine = await getEngineByCode(req.tenantId, req.params.engineCode);
    if (!engine)
        throw new NotFoundError('CodeSearchEngine', req.params.engineCode);
    setCacheHeaders(res, 30);
    res.ok(engine);
}));
/** @swagger /api/ai-os/code-search/engines: post: { summary: Register a new code search engine, tags: [AI OS - Code Search] } */
router.post('/ai-os/code-search/engines', authenticate, aiWriteLimiter, requirePermission('ai.code_search.manage'), validate({ body: codeSearchEngineCreateBody }), asyncHandler(async (req, res) => {
    const engine = await registerEngine(req.tenantId, req.userId, req.body);
    setNoCacheHeaders(res);
    res.status(201).json(engine);
}));
/** @swagger /api/ai-os/code-search/engines/:engineCode: patch: { summary: Update a code search engine, tags: [AI OS - Code Search] } */
router.patch('/ai-os/code-search/engines/:engineCode', authenticate, aiWriteLimiter, requirePermission('ai.code_search.manage'), validate({ body: codeSearchEngineUpdateBody }), asyncHandler(async (req, res) => {
    const engine = await updateEngine(req.tenantId, req.userId, req.params.engineCode, req.body);
    if (!engine)
        throw new NotFoundError('CodeSearchEngine', req.params.engineCode);
    setNoCacheHeaders(res);
    res.ok(engine);
}));
/** @swagger /api/ai-os/code-search/surfaces: get: { summary: List indexed codebase surfaces, tags: [AI OS - Code Search] } */
router.get('/ai-os/code-search/surfaces', authenticate, aiReadLimiter, requirePermission('ai.code_search.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const surfaces = await listSurfaceRegistry(req.tenantId);
    setCacheHeaders(res, 60);
    res.ok({ surfaces, total: surfaces.length });
}));
/** @swagger /api/ai-os/code-search/surfaces: post: { summary: Register an indexed codebase surface, tags: [AI OS - Code Search] } */
router.post('/ai-os/code-search/surfaces', authenticate, aiWriteLimiter, requirePermission('ai.code_search.manage'), validate({ body: codeSearchSurfaceCreateBody }), asyncHandler(async (req, res) => {
    const surface = await registerSurface(req.tenantId, req.userId, req.body);
    setNoCacheHeaders(res);
    res.status(201).json(surface);
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=code-search.routes.js.map