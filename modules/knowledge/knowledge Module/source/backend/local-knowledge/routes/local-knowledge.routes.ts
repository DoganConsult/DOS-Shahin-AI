import { Request, Response, Router } from 'express';
import { z } from "zod";

import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
/**
 * Local Knowledge Routes — AGRC-OS
 *
 * Exposes document management, hybrid search, and source registry endpoints
 * for the local knowledge base. All endpoints require DAuth authentication
 * and permission checks.
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';

import {
  listDocuments,
  getDocument,
  createDocument,
} from '../services/local/local-knowledge-documents.service';
import { ingestDocument } from '../services/local/local-knowledge-ingestion.service';
import { search } from '../services/misc/hybrid-search.service';
import { createDocumentsBody, createSearchBody, createSourcesBody } from '../schemas/local-knowledge.schemas';
import {
  listSources,
  registerSource,
  type SourceFilters,
} from '../services/local/local-knowledge-source-registry.service';

const router = Router();
router.use(moduleStack('local_knowledge'));
router.use(auditMiddleware('local_knowledge'));

// POST /documents — Create and ingest a new document
router.post(
  '/documents',
  authenticate,
  requirePermission('local_knowledge.document.create'),
  validate({ body: createDocumentsBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    const data = { ...req.body, createdBy: userId };
    const doc = await createDocument(tenantId, data);
    // Trigger async ingestion after creation
    swallow(EC.AGENT_ACTION, ingestDocument(tenantId, doc.id), {
      operation: 'ingest local knowledge document after creation',
      tenantId,
    });
    res.status(201).json(doc);
  }),
);

// GET /documents — List documents with optional filters
router.get(
  '/documents',
  authenticate,
  requirePermission('local_knowledge.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    const filters = {
      documentType: req.query.documentType as string | undefined,
      searchQuery: req.query.q as string | undefined,
    };
    const pagination = {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
    };
    const accessControl = {
      userId: userId || 'unknown',
      userRole: req.user?.role || 'viewer',
    };
    const result = await listDocuments(tenantId, filters, accessControl, pagination);
    res.json(result);
  }),
);

// GET /documents/:id — Get a single document by ID
router.get(
  '/documents/:id',
  authenticate,
  requirePermission('local_knowledge.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const doc = await getDocument(tenantId, req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(doc);
  }),
);

// POST /search — Execute hybrid search across the knowledge base
router.post(
  '/search',
  authenticate,
  requirePermission('local_knowledge.search.read'),
  validate({ body: createSearchBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { query, ...options } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'query field is required' });
      return;
    }
    const results = await search(tenantId, query, options);
    res.json(results);
  }),
);

// GET /sources — List registered knowledge sources
router.get(
  '/sources',
  authenticate,
  requirePermission('local_knowledge.source.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters: SourceFilters = {
      type: req.query.type as SourceFilters['type'],
      status: req.query.status as SourceFilters['status'],
    };
    const result = await listSources(tenantId, filters);
    res.json(result);
  }),
);

// POST /sources — Register a new knowledge source
router.post(
  '/sources',
  authenticate,
  requirePermission('local_knowledge.source.create'),
  validate({ body: createSourcesBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const source = await registerSource(tenantId, req.body);
    res.status(201).json(source);
  }),
);

export default router;

