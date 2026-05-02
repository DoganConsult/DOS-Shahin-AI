import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok } from '@dos/module-sdk';

export async function searchKnowledge(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/local/semantic-search.service.js');

  const result = await svc.search(req.tenantId, req.query.q as string, req.query);
  res.json(ok(result, req));
}

export async function listDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/local/document-catalog.service.js');
  const result = await svc.listDocuments(req.tenantId!, req.query);
  res.json(ok(result, req));
}

export async function getDocumentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/local/document-catalog.service.js');
  const result = await svc.getDocument(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function ingestDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/local/document-ingestion.service.js');
  const result = await svc.ingest(req.tenantId!, req.body, req.user?.userId);
  res.status(201).json(ok(result, req));
}

export async function listSources(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/local/source-management.service.js');
  const result = await svc.listSources(req.tenantId!);
  res.json(ok(result, req));
}

export async function getEmbeddingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const svc = await import('../services/local/embedding-pipeline.service.js');
  const result = await svc.getPipelineStatus(req.tenantId!);
  res.json(ok(result, req));
}
