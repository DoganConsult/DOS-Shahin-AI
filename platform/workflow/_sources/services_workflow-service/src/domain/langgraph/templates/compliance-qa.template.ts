// @ts-nocheck
// ============================================
// LangGraph Compliance Q&A Template
// Template for compliance document question-answering
// Uses RAG (Retrieval-Augmented Generation) with vector search
// ============================================

import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage, AIMessage as _AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';

import { LANGGRAPH_CONFIG as _LANGGRAPH_CONFIG, createTracingCallbacks, createMetricsCallback } from '../config/langgraph.config';
import { getCheckpointSaver } from '../adapters/checkpoint-factory';
import { getChatModelForAgent } from '../adapters/model-adapter';
import { query as _query, safeQuery, tenantSchema } from '@dos/db';
import { embedText } from '../../../adapters/memory-store.adapter';
import { toErrorMessage } from '@dos/platform-core/resilience';

// ── Template State Annotation ─────────────────────────────────────

const ComplianceQAStateAnnotation = Annotation.Root({
  tenantId: Annotation<string>,
  question: Annotation<string>,
  context: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  answer: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  sources: Annotation<Array<{ type: string; id: string; title: string; relevance: number }>>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  error: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
});

type ComplianceQAState = typeof ComplianceQAStateAnnotation.State;

// ── Node Implementations ──────────────────────────────────────────

/**
 * retrieveContext — retrieves relevant compliance documents, policies, and controls
 * using vector similarity search
 */
async function retrieveContext(state: ComplianceQAState): Promise<Partial<ComplianceQAState>> {
  try {
    const schema = tenantSchema(state.tenantId);
    
    // Generate embedding for the question
    const queryEmbedding = await embedText(state.question);
    const vectorSql = `[${queryEmbedding.join(',')}]`;
    
    // Search policies, controls, and regulatory content
    const policiesResult = await safeQuery(
      `SELECT
         policy_id as id,
         title_en as title,
         content_en as content,
         1 - (embedding <=> $1::vector) as relevance
       FROM "${schema}".policies
       WHERE status = 'active'
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [vectorSql],
    );
    
    const controlsResult = await safeQuery(
      `SELECT
         control_id as id,
         title_en as title,
         requirement_text_en as content,
         1 - (embedding <=> $1::vector) as relevance
       FROM "${schema}".controls
       WHERE status = 'active'
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [vectorSql],
    );
    
    // Fallback to text search if embeddings don't exist
    if (policiesResult.rows.length === 0 && controlsResult.rows.length === 0) {
      const _textQuery = state.question.toLowerCase();
      const fallbackPolicies = await safeQuery(
        `SELECT
           policy_id as id,
           title_en as title,
           content_en as content,
           ts_rank(search_vector, plainto_tsquery('english', $1)) as relevance
         FROM "${schema}".policies
         WHERE status = 'active'
           AND search_vector @@ plainto_tsquery('english', $1)
         ORDER BY relevance DESC
         LIMIT 5`,
        [state.question],
      );
      
      const fallbackControls = await safeQuery(
        `SELECT
           control_id as id,
           title_en as title,
           requirement_text_en as content,
           ts_rank(search_vector, plainto_tsquery('english', $1)) as relevance
         FROM "${schema}".controls
         WHERE status = 'active'
           AND search_vector @@ plainto_tsquery('english', $1)
         ORDER BY relevance DESC
         LIMIT 5`,
        [state.question],
      );
      
      policiesResult.rows.push(...fallbackPolicies.rows);
      controlsResult.rows.push(...fallbackControls.rows);
    }
    
    const context: string[] = [];
    const sources: Array<{ type: string; id: string; title: string; relevance: number }> = [];
    
    for (const row of policiesResult.rows) {
      if (parseFloat(row.relevance || '0') >= 0.7) {
        context.push(`Policy: ${row.title}\n${row.content}`);
        sources.push({
          type: 'policy',
          id: row.id,
          title: row.title,
          relevance: parseFloat(row.relevance || '0'),
        });
      }
    }
    
    for (const row of controlsResult.rows) {
      if (parseFloat(row.relevance || '0') >= 0.7) {
        context.push(`Control: ${row.title}\n${row.content}`);
        sources.push({
          type: 'control',
          id: row.id,
          title: row.title,
          relevance: parseFloat(row.relevance || '0'),
        });
      }
    }
    
    return { context, sources };
  } catch (err: unknown) {
    return { error: `Context retrieval failed: ${toErrorMessage(err)}` };
  }
}

/**
 * generateAnswer — uses LLM to generate answer based on retrieved context
 */
async function generateAnswer(state: ComplianceQAState): Promise<Partial<ComplianceQAState>> {
  try {
    const model = getChatModelForAgent('A01'); // Use compliance agent model
    
    const contextText = state.context.join('\n\n---\n\n');
    const prompt = `You are a compliance expert assistant. Answer the following question based on the provided compliance context.

Context:
${contextText}

Question: ${state.question}

Provide a clear, accurate answer based on the context. If the context doesn't contain enough information, say so. Include references to specific policies or controls when relevant.`;

    const messages: BaseMessage[] = [
      new HumanMessage(prompt),
    ];
    
    const response = await model.invoke(messages);
    const answer = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    return { answer };
  } catch (err: unknown) {
    return { error: `Answer generation failed: ${toErrorMessage(err)}` };
  }
}

// ── Graph Factory ──────────────────────────────────────────────────

/**
 * Creates the compliance Q&A template graph
 */
export function createComplianceQATemplate() {
  const graph = new StateGraph(ComplianceQAStateAnnotation)
    .addNode('retrieveContext', retrieveContext)
    .addNode('generateAnswer', generateAnswer)
    .addEdge(START, 'retrieveContext')
    .addEdge('retrieveContext', 'generateAnswer')
    .addEdge('generateAnswer', END);

  try {
    return graph.compile({ checkpointer: getCheckpointSaver() });
  } catch {
    return graph.compile();
  }
}

/**
 * Run the compliance Q&A template
 */
export async function runComplianceQA(
  tenantId: string,
  question: string,
  config?: RunnableConfig,
): Promise<{ answer: string; sources: Array<{ type: string; id: string; title: string; relevance: number }> }> {
  const runId = `${tenantId}:compliance-qa:${Date.now().toString(36)}`;
  const initialState: Partial<ComplianceQAState> = {
    tenantId,
    question,
    context: [],
    answer: '',
    sources: [],
    error: '',
  };

  const compiledGraph = createComplianceQATemplate();
  const tracingCallbacks = createTracingCallbacks();
  const metricsCallback = createMetricsCallback(
    runId,
    'TEMPLATE',
    tenantId,
    'template',
    {
      templateType: 'compliance-qa',
      langsmithTraceId: config?.metadata?.langsmithTraceId as string | undefined,
      temporalWorkflowId: config?.metadata?.temporalWorkflowId as string | undefined,
    },
  );
  
  const allCallbacks = [
    ...tracingCallbacks,
    ...(metricsCallback ? [metricsCallback] : []),
  ];
  
  const runnableConfig: RunnableConfig = (config || {
    configurable: {
      thread_id: runId,
    },
    callbacks: allCallbacks.length > 0 ? allCallbacks : undefined,
    metadata: {
      tenantId,
      templateType: 'compliance-qa',
    },
  }) as RunnableConfig;

  let status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success';
  try {
    const result = await compiledGraph.invoke(initialState, runnableConfig);
    
    if (result.error) {
      status = 'error';
      throw new Error(result.error);
    }
    
    // Record discoveries and actions from result
    if (metricsCallback) {
      if (result.sources && result.sources.length > 0) {
        metricsCallback.recordDiscovery();
      }
      await metricsCallback.finalize(status);
    }
    
    return {
      answer: result.answer || '',
      sources: result.sources || [],
    };
  } catch (err) {
    status = 'error';
    if (metricsCallback) {
      await metricsCallback.finalize(status);
    }
    throw err;
  }
}
