// @ts-nocheck
/**
 * RAG HTTP Routes.
 *
 * Exposes document indexing, search, and management via REST.
 * Mounted at /rag in ai-engine-service.
 */
import { Router } from 'express';
import { indexDocumentWithChunking, batchIndexDocuments, semanticSearch, hybridSearch, deleteDocument, getIndexStats } from './vector-store-adapter.js';
import { indexDocumentBody, indexBatchBody, searchBody, hybridSearchBody } from './rag.schemas.js';
import { authenticate, requirePermission } from '../../../../ports/auth.port.js';
import { traceSurfaceCall } from '../../../../domain/agrc-engine/observability/langfuse-bridge.js';
const router = Router();
router.use(authenticate);
// POST /index — Index a document with auto-chunking
router.post('/index', requirePermission('platform.agent.write'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId required' });
            return;
        }
        const parsed = indexDocumentBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.format() });
            return;
        }
        const { content, sourceType, sourceId, metadata, chunkOptions } = parsed.data;
        const result = await indexDocumentWithChunking(tenantId, content, sourceType, sourceId || '', metadata || {}, chunkOptions);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: 'Index failed', details: err.message });
    }
});
// POST /index-batch — Batch index multiple documents
router.post('/index-batch', requirePermission('platform.agent.write'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId required' });
            return;
        }
        const parsed = indexBatchBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.format() });
            return;
        }
        const results = await batchIndexDocuments(tenantId, parsed.data.documents, parsed.data.chunkOptions);
        res.status(201).json({ results, count: results.length });
    }
    catch (err) {
        res.status(500).json({ error: 'Batch index failed', details: err.message });
    }
});
// POST /search — Semantic search
router.post('/search', requirePermission('platform.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId required' });
            return;
        }
        const parsed = searchBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.format() });
            return;
        }
        const documents = await traceSurfaceCall({
            surface: 'rag-search',
            name: 'rag.semantic-search',
            tenantId,
            userId: req.user?.userId,
            input: { query: parsed.data.query?.slice(0, 512), topK: parsed.data.topK },
            metadata: { mode: 'semantic' },
        }, () => semanticSearch({ tenantId, ...parsed.data }));
        res.json({ documents, count: documents.length });
    }
    catch (err) {
        res.status(500).json({ error: 'Search failed', details: err.message });
    }
});
// POST /hybrid-search — Combined vector + keyword search
router.post('/hybrid-search', requirePermission('platform.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId required' });
            return;
        }
        const parsed = hybridSearchBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.format() });
            return;
        }
        const documents = await traceSurfaceCall({
            surface: 'rag-search',
            name: 'rag.hybrid-search',
            tenantId,
            userId: req.user?.userId,
            input: { query: parsed.data.query?.slice(0, 512), topK: parsed.data.topK },
            metadata: { mode: 'hybrid' },
        }, () => hybridSearch({ tenantId, ...parsed.data }));
        res.json({ documents, count: documents.length });
    }
    catch (err) {
        res.status(500).json({ error: 'Hybrid search failed', details: err.message });
    }
});
// GET /stats — Index statistics
router.get('/stats', requirePermission('platform.agent.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId required' });
            return;
        }
        const stats = await getIndexStats(tenantId);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: 'Stats failed', details: err.message });
    }
});
// DELETE /documents/:documentId — Delete document and chunks
router.delete('/documents/:documentId', requirePermission('platform.agent.write'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId required' });
            return;
        }
        const deleted = await deleteDocument(tenantId, req.params.documentId);
        res.json({ deleted });
    }
    catch (err) {
        res.status(500).json({ error: 'Delete failed', details: err.message });
    }
});
export default router;
//# sourceMappingURL=rag.routes.js.map