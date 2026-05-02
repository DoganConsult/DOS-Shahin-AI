// ============================================
// Shahin-Ai — Local Knowledge Orchestrator Service (Module)
// RAG (Retrieval-Augmented Generation) pipeline for tenant knowledge.
// Combines full-text search, vector similarity, Claude AI generation,
// and source citation for GRC-domain question answering.
// ============================================

import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';

import { claudeJSON } from '../../ai/ports/ai.port';
import { logger } from '../../action/ports/logger.port';
import {
  similaritySearch,
  type SimilaritySearchOptions,
  type SimilarityResult,
} from './local-knowledge-embedding.service';
import {
  searchChunks,
  getChunkContext,
  type ChunkSearchResult,
} from './local-knowledge-chunks.service';
import { SYSTEM_JOB_ACTOR } from '../../action/ports/platform.port';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

// ─── Types ───────────────────────────────────────────────────

export interface RAGQueryOptions {
  /** Maximum number of chunks to retrieve. Default 5 */
  topK?: number;
  /** Minimum similarity threshold for vector search. Default 0.6 */
  threshold?: number;
  /** Filter to specific document types */
  documentType?: string;
  /** Filter to a specific document */
  documentId?: string;
  /** Filter by date range */
  dateFrom?: Date;
  dateTo?: Date;
  /** Include surrounding chunk context for each retrieved chunk. Default true */
  includeContext?: boolean;
  /** Maximum tokens for Claude response. Default 1024 */
  maxResponseTokens?: number;
  /** User ID for access logging */
  userId?: string;
}

export interface RAGSource {
  /** Chunk ID for traceability */
  chunkId: string;
  /** Document ID */
  documentId: string;
  /** Document title */
  documentTitle?: string;
  /** Document type */
  documentType?: string;
  /** Chunk position within document */
  chunkIndex: number;
  /** Relevance score (0-1) */
  relevance: number;
  /** Excerpt from the chunk (truncated for display) */
  excerpt: string;
}

export interface RAGResponse {
  /** AI-generated answer grounded in retrieved knowledge */
  answer: string;
  /** Source citations used to generate the answer */
  sources: RAGSource[];
  /** Confidence score (0-1) based on source quality and coverage */
  confidence: number;
  /** Approximate tokens used for the request */
  tokensUsed: number;
  /** Time taken in milliseconds */
  durationMs: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EntityContext {
  entityType: string;
  entityId: string;
  entityTitle?: string;
  relatedChunks: Array<{
    chunkId: string;
    documentTitle?: string;
    excerpt: string;
    relevance: number;
  }>;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Full RAG pipeline: query enhancement -> retrieval -> generation -> citation.
 *
 * 1. Parse and enhance the query with GRC context via Claude
 * 2. Hybrid search: full-text + vector similarity
 * 3. Retrieve top-K chunks with document metadata
 * 4. Build context window and call Claude for answer generation
 * 5. Extract source citations and confidence score
 * 6. Log query in access log
 *
 * @returns AI-generated answer with sources, confidence, and token usage
 */
export async function query(
  tenantId: string,
  userQuery: string,
  options?: RAGQueryOptions,
): Promise<RAGResponse> {
  const startTime = Date.now();
  const topK = options?.topK ?? 5;
  const threshold = options?.threshold ?? 0.6;
  const maxResponseTokens = options?.maxResponseTokens ?? 1024;

  try {
    // Step 1: Enhance the query with GRC context
    const enhancedQuery = await enhanceQuery(tenantId, userQuery);

    // Step 2: Hybrid retrieval — combine text search and vector similarity
    const retrievedChunks = await hybridRetrieval(
      tenantId,
      enhancedQuery,
      topK,
      threshold,
      options,
    );

    // Step 3: If context enrichment is requested, expand chunks with surrounding context
    let contextChunks = retrievedChunks;
    if (options?.includeContext !== false && retrievedChunks.length > 0) {
      contextChunks = await expandWithContext(tenantId, retrievedChunks);
    }

    // Step 4: Build context window and generate answer
    const contextWindow = buildContextWindow(contextChunks);
    const sources = buildSources(retrievedChunks);

    let answer: string;
    let confidence: number;
    let tokensUsed: number;

    if (contextChunks.length === 0) {
      answer = 'No relevant knowledge was found in the organization\'s knowledge base for this query. '
        + 'Please try rephrasing your question or check that relevant documents have been ingested.';
      confidence = 0;
      tokensUsed = 0;
    } else {
      const generation = await generateAnswer(
        tenantId,
        userQuery,
        contextWindow,
        sources,
        maxResponseTokens,
      );
      answer = generation.answer;
      confidence = generation.confidence;
      tokensUsed = generation.tokensUsed;
    }

    // Step 5: Log the query for audit trail
    await logQuery(tenantId, userQuery, sources.length, confidence, options?.userId);

    const durationMs = Date.now() - startTime;

    logger.info('[LocalKnowledgeOrchestrator:module] RAG query completed', {
      tenantId,
      queryLength: userQuery.length,
      chunksRetrieved: retrievedChunks.length,
      sourcesUsed: sources.length,
      confidence,
      durationMs,
    });

    return { answer, sources, confidence, tokensUsed, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error('[LocalKnowledgeOrchestrator:module] RAG query failed', {
      tenantId,
      query: userQuery.slice(0, 200),
      error: (err as Error).message,
      durationMs,
    });

    return {
      answer: 'An error occurred while processing your query. Please try again.',
      sources: [],
      confidence: 0,
      tokensUsed: 0,
      durationMs,
    };
  }
}

/**
 * RAG query with conversation history for multi-turn interactions.
 * Injects previous conversation context into the prompt for continuity.
 */
export async function queryWithHistory(
  tenantId: string,
  userQuery: string,
  conversationHistory: ConversationMessage[],
  options?: RAGQueryOptions,
): Promise<RAGResponse> {
  const startTime = Date.now();
  const topK = options?.topK ?? 5;
  const threshold = options?.threshold ?? 0.6;
  const maxResponseTokens = options?.maxResponseTokens ?? 1024;

  try {
    // Build a contextualized query that incorporates conversation history
    const contextualizedQuery = await contextualizeQuery(
      tenantId,
      userQuery,
      conversationHistory,
    );

    // Retrieve relevant chunks using the contextualized query
    const retrievedChunks = await hybridRetrieval(
      tenantId,
      contextualizedQuery,
      topK,
      threshold,
      options,
    );

    let contextChunks = retrievedChunks;
    if (options?.includeContext !== false && retrievedChunks.length > 0) {
      contextChunks = await expandWithContext(tenantId, retrievedChunks);
    }

    const contextWindow = buildContextWindow(contextChunks);
    const sources = buildSources(retrievedChunks);

    let answer: string;
    let confidence: number;
    let tokensUsed: number;

    if (contextChunks.length === 0) {
      answer = 'No relevant knowledge was found for your follow-up question. '
        + 'Try asking about a different topic or providing more specific details.';
      confidence = 0;
      tokensUsed = 0;
    } else {
      const generation = await generateAnswerWithHistory(
        tenantId,
        userQuery,
        conversationHistory,
        contextWindow,
        sources,
        maxResponseTokens,
      );
      answer = generation.answer;
      confidence = generation.confidence;
      tokensUsed = generation.tokensUsed;
    }

    await logQuery(tenantId, userQuery, sources.length, confidence, options?.userId);

    const durationMs = Date.now() - startTime;

    return { answer, sources, confidence, tokensUsed, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error('[LocalKnowledgeOrchestrator:module] RAG query with history failed', {
      tenantId,
      error: (err as Error).message,
    });

    return {
      answer: 'An error occurred while processing your query. Please try again.',
      sources: [],
      confidence: 0,
      tokensUsed: 0,
      durationMs,
    };
  }
}

/**
 * Get relevant knowledge context for a specific GRC entity.
 * Searches knowledge base for chunks related to a control, risk, or policy.
 * Useful for auto-populating entity detail views with relevant organizational knowledge.
 */
export async function getRelevantContext(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<EntityContext> {
  const schema = tenantSchema(tenantId);

  try {
    // Resolve entity title and description for search query construction
    const entityInfo = await resolveEntityInfo(tenantId, schema, entityType, entityId);
    if (!entityInfo) {
      return { entityType, entityId, relatedChunks: [] };
    }

    // Build a search query from entity attributes
    const searchQuery = [
      entityInfo.title,
      entityInfo.description?.slice(0, 300),
      entityType,
    ].filter(Boolean).join(' ');

    // Run hybrid retrieval
    const results = await hybridRetrieval(tenantId, searchQuery, 5, 0.5);

    const relatedChunks = results.map((r) => ({
      chunkId: r.chunkId,
      documentTitle: r.documentTitle || undefined,
      excerpt: r.chunkText.slice(0, 300),
      relevance: r.similarity ?? r.rank ?? 0,
    }));

    return {
      entityType,
      entityId,
      entityTitle: entityInfo.title,
      relatedChunks,
    };
  } catch (err) {
    logger.error('[LocalKnowledgeOrchestrator:module] getRelevantContext failed', {
      tenantId,
      entityType,
      entityId,
      error: (err as Error).message,
    });
    return { entityType, entityId, relatedChunks: [] };
  }
}

// ─── Private: Query Enhancement ──────────────────────────────

/**
 * Enhance a raw user query by expanding abbreviations and adding GRC context.
 * Uses Claude for intelligent query reformulation.
 */
async function enhanceQuery(tenantId: string, rawQuery: string): Promise<string> {
  try {
    const result = await claudeJSON<{ enhanced_query: string }>({
      systemPrompt:
        'You are a GRC (Governance, Risk, Compliance) query enhancer. '
        + 'Given a user query, expand abbreviations (e.g., SAMA=Saudi Arabian Monetary Authority, '
        + 'NCA=National Cybersecurity Authority, ECC=Essential Cybersecurity Controls, '
        + 'PDPL=Personal Data Protection Law, ISO=International Organization for Standardization). '
        + 'Add relevant GRC context terms. Keep the query concise. '
        + 'Respond with JSON: {"enhanced_query": "..."}',
      userMessage: rawQuery,
      maxTokens: 256,
      temperature: 0.1,
      tenantId,
      agentId: 'knowledge-rag',
      decisionType: 'query_enhancement',
    });

    return result.enhanced_query || rawQuery;
  } catch {
    // If query enhancement fails, use the original query
    return rawQuery;
  }
}

/**
 * Contextualize a follow-up query using conversation history.
 * Resolves pronouns and implicit references from prior turns.
 */
async function contextualizeQuery(
  tenantId: string,
  userQuery: string,
  history: ConversationMessage[],
): Promise<string> {
  if (history.length === 0) {
    return enhanceQuery(tenantId, userQuery);
  }

  try {
    // Take last 4 messages for context (to stay within token limits)
    const recentHistory = history.slice(-4);
    const historyText = recentHistory
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n');

    const result = await claudeJSON<{ standalone_query: string }>({
      systemPrompt:
        'Given a conversation history and a follow-up question, rewrite the follow-up '
        + 'into a standalone search query. Resolve pronouns, expand abbreviations, '
        + 'and include necessary context from the conversation. '
        + 'Respond with JSON: {"standalone_query": "..."}',
      userMessage: `Conversation:\n${historyText}\n\nFollow-up: ${userQuery}`,
      maxTokens: 256,
      temperature: 0.1,
      tenantId,
      agentId: 'knowledge-rag',
      decisionType: 'query_contextualization',
    });

    return result.standalone_query || userQuery;
  } catch {
    return userQuery;
  }
}

// ─── Private: Retrieval ──────────────────────────────────────

/** Unified retrieval result with both text-search and vector fields */
interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  documentTitle?: string;
  documentType?: string;
  metadata?: Record<string, unknown>;
  /** Cosine similarity from vector search (0-1) */
  similarity?: number;
  /** Full-text rank from ts_rank (0-1 normalized) */
  rank?: number;
  /** Combined score used for final ranking */
  combinedScore: number;
}

/**
 * Hybrid retrieval: runs both full-text search and vector similarity search
 * in parallel, then merges and deduplicates by combined score.
 */
async function hybridRetrieval(
  tenantId: string,
  query: string,
  topK: number,
  threshold: number,
  options?: RAGQueryOptions,
): Promise<RetrievedChunk[]> {
  const similarityOpts: SimilaritySearchOptions = {
    topK: topK * 2, // Over-fetch for better merging
    threshold,
    documentType: options?.documentType,
    documentId: options?.documentId,
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  };

  // Run both search strategies in parallel
  const [vectorResults, textResults] = await Promise.all([
    similaritySearch(tenantId, query, similarityOpts).catch((): SimilarityResult[] => []),
    searchChunks(tenantId, query, {
      documentId: options?.documentId,
      documentType: options?.documentType,
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
      limit: topK * 2,
      includeContext: false,
    }).catch((): ChunkSearchResult[] => []),
  ]);

  // Merge results with weighted scoring
  const VECTOR_WEIGHT = 0.6;
  const TEXT_WEIGHT = 0.4;

  const chunkMap = new Map<string, RetrievedChunk>();

  for (const vr of vectorResults) {
    chunkMap.set(vr.chunkId, {
      chunkId: vr.chunkId,
      documentId: vr.documentId,
      chunkText: vr.chunkText,
      chunkIndex: vr.chunkIndex,
      documentTitle: vr.documentTitle,
      documentType: vr.documentType,
      metadata: vr.metadata,
      similarity: vr.similarity,
      combinedScore: vr.similarity * VECTOR_WEIGHT,
    });
  }

  for (const tr of textResults) {
    const existing = chunkMap.get(tr.chunkId);
    if (existing) {
      // Chunk found by both methods — combine scores
      existing.rank = tr.rank;
      existing.combinedScore = (existing.similarity ?? 0) * VECTOR_WEIGHT + tr.rank * TEXT_WEIGHT;
    } else {
      chunkMap.set(tr.chunkId, {
        chunkId: tr.chunkId,
        documentId: tr.documentId,
        chunkText: tr.chunkText,
        chunkIndex: tr.chunkIndex,
        documentTitle: tr.documentTitle,
        documentType: tr.documentType,
        metadata: tr.metadata,
        rank: tr.rank,
        combinedScore: tr.rank * TEXT_WEIGHT,
      });
    }
  }

  // Sort by combined score descending and take top-K
  return [...chunkMap.values()]
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, topK);
}

/**
 * Expand retrieved chunks with surrounding context via getChunkContext.
 */
async function expandWithContext(
  tenantId: string,
  chunks: RetrievedChunk[],
): Promise<RetrievedChunk[]> {
  const expanded: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    try {
      const contextChunks = await getChunkContext(tenantId, chunk.chunkId, 1);
      // Merge context text into the chunk for a richer context window
      const contextTexts = contextChunks
        .filter((c) => c.chunkId !== chunk.chunkId)
        .map((c) => c.chunkText);

      const expandedText = contextTexts.length > 0
        ? `[...] ${contextTexts[0] || ''}\n\n${chunk.chunkText}\n\n${contextTexts[1] || ''} [...]`
        : chunk.chunkText;

      expanded.push({ ...chunk, chunkText: expandedText });
    } catch {
      expanded.push(chunk);
    }
  }

  return expanded;
}

// ─── Private: Generation ─────────────────────────────────────

/**
 * Build the context window string from retrieved chunks for the LLM prompt.
 */
function buildContextWindow(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';

  return chunks
    .map((chunk, idx) => {
      const header = [
        `[Source ${idx + 1}]`,
        chunk.documentTitle ? `Document: ${chunk.documentTitle}` : null,
        chunk.documentType ? `Type: ${chunk.documentType}` : null,
        `Position: chunk ${chunk.chunkIndex}`,
      ]
        .filter(Boolean)
        .join(' | ');

      return `${header}\n${chunk.chunkText}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Build source citation objects from retrieved chunks.
 */
function buildSources(chunks: RetrievedChunk[]): RAGSource[] {
  return chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    documentType: chunk.documentType,
    chunkIndex: chunk.chunkIndex,
    relevance: chunk.combinedScore,
    excerpt: chunk.chunkText.slice(0, 250),
  }));
}

/**
 * Generate an answer using Claude with retrieved context.
 */
async function generateAnswer(
  tenantId: string,
  userQuery: string,
  contextWindow: string,
  sources: RAGSource[],
  maxTokens: number,
): Promise<{ answer: string; confidence: number; tokensUsed: number }> {
  const sourceCount = sources.length;
  const avgRelevance =
    sourceCount > 0
      ? sources.reduce((sum, s) => sum + s.relevance, 0) / sourceCount
      : 0;

  const result = await claudeJSON<{
    answer: string;
    confidence: number;
    sources_used: number[];
  }>({
    systemPrompt: RAG_SYSTEM_PROMPT,
    userMessage: buildRAGUserMessage(userQuery, contextWindow, sourceCount),
    maxTokens,
    temperature: 0.2,
    tenantId,
    agentId: 'knowledge-rag',
    decisionType: 'rag_generation',
  });

  // Derive confidence from AI self-assessment and source quality
  const aiConfidence = Math.max(0, Math.min(1, result.confidence ?? 0));
  const blendedConfidence = aiConfidence * 0.6 + avgRelevance * 0.4;

  // Approximate token count: prompt + response (~4 chars per token)
  const promptLength = contextWindow.length + userQuery.length + RAG_SYSTEM_PROMPT.length;
  const tokensUsed = Math.ceil(promptLength / 4) + Math.ceil((result.answer || '').length / 4);

  return {
    answer: result.answer || 'Unable to generate an answer from the available knowledge.',
    confidence: Math.round(blendedConfidence * 100) / 100,
    tokensUsed,
  };
}

/**
 * Generate an answer with conversation history context.
 */
async function generateAnswerWithHistory(
  tenantId: string,
  userQuery: string,
  history: ConversationMessage[],
  contextWindow: string,
  sources: RAGSource[],
  maxTokens: number,
): Promise<{ answer: string; confidence: number; tokensUsed: number }> {
  const sourceCount = sources.length;
  const avgRelevance =
    sourceCount > 0
      ? sources.reduce((sum, s) => sum + s.relevance, 0) / sourceCount
      : 0;

  // Include recent conversation turns in the prompt
  const recentHistory = history.slice(-6);
  const historyBlock = recentHistory
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 500)}`)
    .join('\n');

  const userMessage = [
    'CONVERSATION HISTORY:',
    historyBlock,
    '',
    buildRAGUserMessage(userQuery, contextWindow, sourceCount),
  ].join('\n');

  const result = await claudeJSON<{
    answer: string;
    confidence: number;
    sources_used: number[];
  }>({
    systemPrompt: RAG_SYSTEM_PROMPT,
    userMessage,
    maxTokens,
    temperature: 0.2,
    tenantId,
    agentId: 'knowledge-rag',
    decisionType: 'rag_generation_with_history',
  });

  const aiConfidence = Math.max(0, Math.min(1, result.confidence ?? 0));
  const blendedConfidence = aiConfidence * 0.6 + avgRelevance * 0.4;
  const promptLength = contextWindow.length + userMessage.length + RAG_SYSTEM_PROMPT.length;
  const tokensUsed = Math.ceil(promptLength / 4) + Math.ceil((result.answer || '').length / 4);

  return {
    answer: result.answer || 'Unable to generate an answer from the available knowledge.',
    confidence: Math.round(blendedConfidence * 100) / 100,
    tokensUsed,
  };
}

// ─── Private: Entity Resolution ──────────────────────────────

/**
 * Resolve title and description of a GRC entity for search query construction.
 * Supports controls, risks, policies, frameworks, and evidence tasks.
 */
async function resolveEntityInfo(
  tenantId: string,
  schema: string,
  entityType: string,
  entityId: string,
): Promise<{ title: string; description?: string } | null> {
  const entityQueries: Record<string, { table: string; titleCol: string; descCol?: string; idCol: string }> = {
    control: { table: 'controls', titleCol: 'control_title', descCol: 'control_description', idCol: 'control_id' },
    risk: { table: 'risks', titleCol: 'risk_title', descCol: 'risk_description', idCol: 'risk_id' },
    policy: { table: 'policies', titleCol: 'policy_title', descCol: 'policy_description', idCol: 'policy_id' },
    framework: { table: 'frameworks', titleCol: 'framework_name', descCol: 'description', idCol: 'framework_id' },
    evidence_task: { table: 'evidence_tasks', titleCol: 'task_title', descCol: 'task_description', idCol: 'task_id' },
  };

  const config = entityQueries[entityType];
  if (!config) {
    return null;
  }

  try {
    const _descSelect = config.descCol ? `, ${config.descCol} AS description` : '';
    const res = await LocalKnowledgeAutoRepo.query123(tenantSchema(tenantId), [entityId]);

    if (res.rows.length === 0) return null;
    return {
      title: res.rows[0].title,
      description: res.rows[0].description || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Private: Access Logging ─────────────────────────────────

/**
 * Log a RAG query in the access log for audit trail.
 * Uses the local_knowledge_access_log table with access_type = 'read'.
 */
async function logQuery(
  tenantId: string,
  queryText: string,
  sourcesUsed: number,
  confidence: number,
  userId?: string,
): Promise<void> {
  const _schema = tenantSchema(tenantId);

  try {
    await LocalKnowledgeAutoRepo.query122(tenantSchema(tenantId), [
            tenantId,
            userId || SYSTEM_JOB_ACTOR,
            JSON.stringify({
              type: 'rag_query',
              query: queryText.slice(0, 500),
              sources_used: sourcesUsed,
              confidence,
            }),
          ]);
  } catch {
    // Access logging is non-critical; do not fail the query
  }
}

// ─── Constants ───────────────────────────────────────────────

const RAG_SYSTEM_PROMPT = `You are a Governance, Risk, and Compliance (GRC) knowledge assistant for an organization.
Your role is to answer questions using ONLY the provided knowledge context. Follow these rules strictly:

1. BASE YOUR ANSWER ONLY on the provided source documents. Do not hallucinate or add information not in the context.
2. If the context does not contain enough information to fully answer the question, say so explicitly.
3. Reference sources by their [Source N] numbers when making claims.
4. Be precise, professional, and concise. Use bullet points for structured answers.
5. For regulatory questions, cite the specific regulation/framework mentioned in the sources.
6. If multiple sources conflict, note the discrepancy.

Respond with JSON:
{
  "answer": "Your detailed answer with [Source N] citations...",
  "confidence": 0.0-1.0 (how confident you are based on source quality and coverage),
  "sources_used": [1, 2, 3] (which source numbers you referenced)
}`;

function buildRAGUserMessage(
  query: string,
  contextWindow: string,
  sourceCount: number,
): string {
  return [
    `KNOWLEDGE CONTEXT (${sourceCount} sources):`,
    contextWindow,
    '',
    `USER QUESTION: ${query}`,
  ].join('\n');
}
