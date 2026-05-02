import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export interface IngestionInput {
  title: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  sourceId?: string;
  languageCode?: string;
  tags?: string[];
  content?: string;
}

export interface IngestionResult {
  documentId: string;
  status: string;
  chunkCount: number;
  message: string;
}

export async function ingest(tenantId: string, body: IngestionInput, userId?: string): Promise<IngestionResult> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".local_knowledge_documents
       (title, file_name, mime_type, file_size_bytes, source_id, language_code, tags,
        status, chunk_count, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, $8, NOW(), NOW())
     RETURNING document_id, status, chunk_count`,
    [
      body.title,
      body.fileName ?? null,
      body.mimeType ?? null,
      body.fileSizeBytes ?? null,
      body.sourceId ?? null,
      body.languageCode ?? null,
      body.tags ?? [],
      userId ?? SYSTEM_JOB_ACTOR,
    ],
  );

  const doc = rows[0] as GenericRow;
  const documentId = doc.document_id as string;

  if (body.content) {
    const chunks = splitContent(body.content);
    for (let i = 0; i < chunks.length; i++) {
      await safeQuery(
        `INSERT INTO "${schema}".local_knowledge_chunks
           (document_id, chunk_index, content, token_count, start_offset, end_offset, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [documentId, i, chunks[i].text, chunks[i].tokenCount, chunks[i].startOffset, chunks[i].endOffset],
      ).catch(e => logger.warn(`[local-knowledge] chunk insert failed: ${e}`));
    }

    await safeQuery(
      `UPDATE "${schema}".local_knowledge_documents SET status = 'chunked', chunk_count = $2, ingested_at = NOW(), updated_at = NOW() WHERE document_id = $1`,
      [documentId, chunks.length],
    );

    return { documentId, status: 'chunked', chunkCount: chunks.length, message: `Ingested ${chunks.length} chunks.` };
  }

  return { documentId, status: 'pending', chunkCount: 0, message: 'Document created. Content processing pending.' };
}

function splitContent(content: string, maxChunkSize = 1000): Array<{ text: string; tokenCount: number; startOffset: number; endOffset: number }> {
  const chunks: Array<{ text: string; tokenCount: number; startOffset: number; endOffset: number }> = [];
  let offset = 0;
  while (offset < content.length) {
    const end = Math.min(offset + maxChunkSize, content.length);
    const text = content.slice(offset, end);
    chunks.push({
      text,
      tokenCount: Math.ceil(text.length / 4),
      startOffset: offset,
      endOffset: end,
    });
    offset = end;
  }
  return chunks;
}
