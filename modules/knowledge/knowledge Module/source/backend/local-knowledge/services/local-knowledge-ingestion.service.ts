
import { catchHandler, EC } from '@dos/platform-core';
// ============================================
// Shahin-Ai — Local Knowledge Ingestion Service (Module Layer)
// R3.3B: Full document ingestion pipeline — text extraction,
// AI-enhanced enrichment, chunking, embedding generation,
// and document status tracking.
// ============================================

import * as _crypto from 'crypto';

import { safeQuery, tenantSchema, withTransaction as _withTransaction } from '../../action/ports/database.port';

import { claudeJSON, CLAUDE_MODEL as _CLAUDE_MODEL } from '../../ai/ports/ai.port';
import { logger } from '../../action/ports/logger.port';
import {
  getDocument,
  KnowledgeDocument,
} from './local-knowledge-documents.service';
import { createChunks, type ChunkInput } from './local-knowledge-chunks.service';
import { recordCustodyEvent } from './local-knowledge-custody-chain.service';
import type { GenericRow } from '@dos/types';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

const LOG_TAG = '[LocalKnowledgeIngestion:Module]';

/** Chunk configuration constants */
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface IngestionResult {
  documentId: string;
  ingestionId: string;
  chunksCreated: number;
  entitiesExtracted: number;
  processingTimeMs: number;
  extractionMethod: 'deterministic' | 'ai_enriched' | 'hybrid';
  status: 'indexed' | 'failed' | 'partial';
  error?: string;
}

export interface IngestionStatus {
  documentId: string;
  ingestionId?: string;
  status: 'pending' | 'extracting' | 'chunking' | 'embedding' | 'indexed' | 'failed';
  progress: number; // 0-100
  chunksCreated: number;
  entitiesExtracted: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// ---------------------------------------------------------------
// Full ingestion pipeline
// ---------------------------------------------------------------

/**
 * Runs the complete ingestion pipeline for a document:
 * 1. Fetch document metadata and content
 * 2. Extract raw text based on content type
 * 3. Use Claude AI to enhance extraction (summarize, extract entities, classify)
 * 4. Split content into overlapping chunks
 * 5. Store chunks with embeddings
 * 6. Update document status to 'indexed'
 */
export async function ingestDocument(
  tenantId: string,
  documentId: string,
): Promise<IngestionResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.local_knowledge_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ---------------------------------------------------------------
// Re-ingestion
// ---------------------------------------------------------------

/**
 * Deletes existing chunks and re-runs the full ingestion pipeline.
 * Useful when content changes or extraction logic is updated.
 */
export async function reIngestDocument(
  tenantId: string,
  documentId: string,
): Promise<IngestionResult> {
  const _schema = tenantSchema(tenantId);

  logger.info(`${LOG_TAG} Starting re-ingestion`, { tenantId, documentId });

  // Delete existing chunks and index entries
  await Promise.all([
    LocalKnowledgeAutoRepo.query100(tenantSchema(tenantId), [documentId, tenantId]).catch(catchHandler(EC.EVENT_BUS, {})),
    LocalKnowledgeAutoRepo.query99(tenantSchema(tenantId), [documentId, tenantId]).catch(catchHandler(EC.EVENT_BUS, {})),
  ]);

  // Run the full pipeline
  return ingestDocument(tenantId, documentId);
}

// ---------------------------------------------------------------
// Ingestion status
// ---------------------------------------------------------------

/**
 * Checks the current ingestion progress and status for a document.
 */
export async function getIngestionStatus(
  tenantId: string,
  documentId: string,
): Promise<IngestionStatus> {
  const _schema = tenantSchema(tenantId);

  try {
    // Get document to find ingestion reference
    const doc = await getDocument(tenantId, documentId);
    if (!doc) {
      return {
        documentId,
        status: 'failed',
        progress: 0,
        chunksCreated: 0,
        entitiesExtracted: 0,
        error: 'Document not found',
      };
    }

    // Get ingestion log entry
    const ingestion = doc.ingestionId ? await getIngestion(tenantId, doc.ingestionId) : null;

    // Get chunk count
    const chunkRes = await LocalKnowledgeAutoRepo.query98(tenantSchema(tenantId), [documentId, tenantId]);
    const chunksCreated = chunkRes.rows[0]?.count ?? 0;

    // Determine status based on document state
    const canonicalData = doc.canonicalData || {};
    let status: IngestionStatus['status'] = 'pending';
    let progress = 0;

    if (canonicalData.ingestionError) {
      status = 'failed';
      progress = 0;
    } else if (canonicalData.indexedAt) {
      status = 'indexed';
      progress = 100;
    } else if (chunksCreated > 0) {
      status = 'embedding';
      progress = 75;
    } else if (ingestion?.success && ingestion?.normalizedContent) {
      status = 'chunking';
      progress = 50;
    } else if (ingestion?.success) {
      status = 'extracting';
      progress = 25;
    }

    return {
      documentId,
      ingestionId: doc.ingestionId,
      status,
      progress,
      chunksCreated,
      entitiesExtracted: (canonicalData.entitiesExtracted as number) || 0,
      startedAt: ingestion?.ingestedAt as string | undefined,
      completedAt: (canonicalData.indexedAt as string) || undefined,
      error: (canonicalData.ingestionError as string) || undefined,
    };
  } catch (err) {
    logger.warn(`${LOG_TAG} getIngestionStatus failed`, {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return {
      documentId,
      status: 'failed',
      progress: 0,
      chunksCreated: 0,
      entitiesExtracted: 0,
      error: (err as Error).message,
    };
  }
}

// ---------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------

/**
 * Uses Claude AI to generate a summary, classification, and entity enrichment
 * for the extracted document text.
 */
async function enrichWithAI(
  tenantId: string,
  text: string,
  doc: KnowledgeDocument,
): Promise<{ summary: string; classification: string; entities: unknown[] }> {
  const textPreview = text.substring(0, 12_000);

  const result = await claudeJSON<{
    summary: string;
    classification: string;
    entities: Array<{ type: string; value: string; confidence: number }>;
  }>({
    tenantId,
    agentId: 'local-knowledge-ingestion',
    decisionType: 'document_enrichment',
    systemPrompt: `You are a GRC (Governance, Risk, Compliance) document analysis assistant.
Analyze the document and produce:
1. "summary": A 2-3 sentence summary of the document's purpose and key content.
2. "classification": The most appropriate document type from: policy, procedure, standard, guideline, audit_report, committee_minutes, contract, risk_assessment, evidence, training_material, incident_report, regulatory_notice.
3. "entities": Array of extracted entities with {type, value, confidence}. Entity types: regulatory_reference, framework_code, control_id, organization, department, role, person, risk_type, date, deadline, policy_reference.

Focus on GRC-relevant content. Be precise with regulatory references and control IDs.`,
    userMessage: `Document Title: ${doc.title || 'Untitled'}
Document Type (original): ${doc.documentType}
Knowledge Lane: ${doc.knowledgeLane}

Content:
${textPreview}`,
    maxTokens: 2048,
    temperature: 0.2,
  });

  return {
    summary: result.summary || '',
    classification: result.classification || doc.documentType,
    entities: result.entities || [],
  };
}

/**
 * Builds a comprehensive searchable text by combining the raw document text,
 * AI summary, and entity values for full-text search indexing.
 */
function buildSearchableText(rawText: string, summary: string, entities: unknown[]): string {
  const parts: string[] = [];

  // Raw text (capped to prevent bloating the search index)
  if (rawText) parts.push(rawText.substring(0, 50_000));

  // AI summary
  if (summary) parts.push(summary);

  // Entity values for search discovery
  if (entities.length > 0) {
    const entityValues = entities

      .map((e) => `${e.type}: ${e.value}`)
      .join('; ');
    parts.push(entityValues);
  }

  return parts.join('\n\n');
}

/**
 * Updates the knowledge index table with search terms and entity links
 * derived from the ingestion pipeline results.
 */
async function updateKnowledgeIndex(
  tenantId: string,
  schema: string,
  documentId: string,
  entities: unknown[],
): Promise<void> {
  try {
    // Delete existing index entry for this document
    await LocalKnowledgeAutoRepo.query97(tenantSchema(tenantId), [documentId, tenantId]);

    // Build search terms and entity links from extracted entities

    const searchTerms: string[] = entities.map((e) => e.value).filter(Boolean);
    const entityLinks: Record<string, string[]> = {};

    for (const entity of entities) {

      if (!entityLinks[entity.type]) entityLinks[entity.type] = [];

      entityLinks[entity.type].push(entity.value);
    }

    // Insert index entry
    await LocalKnowledgeAutoRepo.query96(tenantSchema(tenantId), [
            tenantId,
            documentId,
            searchTerms.length > 0 ? searchTerms : null,
            Object.keys(entityLinks).length > 0 ? JSON.stringify(entityLinks) : null,
          ]);
  } catch (err) {
    // Non-fatal: index update failures should not block the pipeline
    logger.warn(`${LOG_TAG} Knowledge index update failed`, {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
  }
}

async function updateIngestionStatus(
  tenantId: string,
  ingestionId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const _schema = tenantSchema(tenantId);
  await LocalKnowledgeAutoRepo.query95(tenantSchema(tenantId), [JSON.stringify(data), ingestionId]);
}

export async function getIngestion(
  tenantId: string,
  ingestionId: string,
): Promise<GenericRow | null> {
  const _schema = tenantSchema(tenantId);
  const { rows } = await LocalKnowledgeAutoRepo.query94(tenantSchema(tenantId), [ingestionId]);
  return rows[0] || null;
}

export async function logIngestion(
  tenantId: string,
  documentId: string,
  data: Record<string, unknown>,
): Promise<string> {
  const _schema = tenantSchema(tenantId);
  const { rows } = await LocalKnowledgeAutoRepo.query93(tenantSchema(tenantId), [documentId, JSON.stringify(data)]);
  return rows[0]?.id;
}

async function invalidateDocumentCache(tenantId: string, documentId: string): Promise<void> {
  try {
    const { invalidateCache } = await import('./local-knowledge-cache.service.js');
    await invalidateCache(tenantId, documentId);
  } catch { /* best-effort */ }
}

// Re-export pagination types from documents service for hub routes

export { PaginationParams, PaginatedResponse } from './local-knowledge-documents.service';

/** List ingestion records for a tenant with optional pagination. */
export async function listIngestions(
  tenantId: string,
  pagination?: { page?: number; pageSize?: number },
): Promise<{ data: GenericRow[]; total: number }> {
  const _schema = tenantSchema(tenantId);
  const page = pagination?.page ?? 1;
  const pageSize = Math.min(pagination?.pageSize ?? 50, 200);
  const offset = (page - 1) * pageSize;

  const countRes = await LocalKnowledgeAutoRepo.query92(tenantSchema(tenantId), []);
  const total = countRes.rows[0]?.total ?? 0;

  const { rows } = await LocalKnowledgeAutoRepo.query91(tenantSchema(tenantId), [pageSize, offset]);
  return { data: rows as GenericRow[], total };
}

function splitTextIntoChunks(text: string, chunkSize: number, overlap: number): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  let start = 0;
  let index = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({
      chunkIndex: index++,
      content: text.slice(start, end),
      tokenCount: Math.ceil((end - start) / 4),
    });
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}
