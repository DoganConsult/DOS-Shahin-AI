// ============================================
// LangGraph Evidence Classification Template
// Template for automated evidence classification and tagging
// ============================================

import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';

import { LANGGRAPH_CONFIG as _LANGGRAPH_CONFIG, createTracingCallbacks, createMetricsCallback } from '../config/langgraph.config';
import { getCheckpointSaver } from '../adapters/checkpoint-factory';
import { getChatModelForAgent } from '../adapters/model-adapter';
import { query as _query, safeQuery, tenantSchema } from '@dos/db';
import { embedText } from '../../../adapters/memory-store.adapter';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { getFirstRow } from '../../utils/db-utils';

// ── Template State Annotation ─────────────────────────────────────

const EvidenceClassificationStateAnnotation = Annotation.Root({
  tenantId: Annotation<string>,
  evidenceId: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  evidenceContent: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  classification: Annotation<{
    category: string;
    artifactType: string;
    qualityTier: 'A' | 'B' | 'C';
    tags: string[];
    suggestedControls: string[];
    confidence: number;
  }>({
    reducer: (_a, b) => b,
    default: () => ({
      category: '',
      artifactType: '',
      qualityTier: 'C',
      tags: [],
      suggestedControls: [],
      confidence: 0,
    }),
  }),
  error: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
});

type EvidenceClassificationState = typeof EvidenceClassificationStateAnnotation.State;

// ── Node Implementations ──────────────────────────────────────────

/**
 * loadEvidence — loads evidence metadata and content
 */
async function loadEvidence(state: EvidenceClassificationState): Promise<Partial<EvidenceClassificationState>> {
  try {
    const schema = tenantSchema(state.tenantId);
    
    const result = await safeQuery(
      `SELECT
         evidence_id,
         title,
         description,
         artifact_type,
         file_path,
         file_size,
         mime_type,
         collected_at,
         control_id
       FROM "${schema}".evidence
       WHERE evidence_id = $1`,
      [state.evidenceId],
    );
    
    if (result.rows.length === 0) {
      return { error: `Evidence ${state.evidenceId} not found` };
    }
    
    const evidence = getFirstRow(result)!;
    
    // For text-based evidence, we can read content
    // For binary files, we use metadata only
    let content = '';
    if (evidence.mime_type?.startsWith('text/') || evidence.mime_type === 'application/pdf') {
      // In a real implementation, you'd extract text from the file
      content = `${evidence.title}\n${evidence.description || ''}`;
    } else {
      content = `${evidence.title}\n${evidence.description || ''}\nType: ${evidence.artifact_type}\nMIME: ${evidence.mime_type}`;
    }
    
    return { evidenceContent: content };
  } catch (err: unknown) {
    return { error: `Evidence loading failed: ${toErrorMessage(err)}` };
  }
}

/**
 * classifyEvidence — uses LLM to classify evidence and suggest controls
 */
async function classifyEvidence(state: EvidenceClassificationState): Promise<Partial<EvidenceClassificationState>> {
  try {
    const model = getChatModelForAgent('A05'); // Use evidence agent model
    
    // Find similar controls using vector search
    const queryEmbedding = await embedText(state.evidenceContent);
    const vectorSql = `[${queryEmbedding.join(',')}]`;
    const schema = tenantSchema(state.tenantId);
    
    const similarControls = await safeQuery(
      `SELECT
         control_id,
         control_code,
         title_en,
         1 - (embedding <=> $1::vector) as similarity
       FROM "${schema}".controls
       WHERE status = 'active'
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [vectorSql],
    );
    
    const controlsContext = similarControls.rows
      .filter((r) => parseFloat(r.similarity || '0') >= 0.7)
      .map((r) => `${r.control_code}: ${r.title_en}`)
      .join('\n');
    
    const prompt = `You are an evidence classification expert. Classify the following evidence item and provide structured metadata.

Evidence Content:
${state.evidenceContent}

Similar Controls Found:
${controlsContext || 'None found'}

Provide a JSON response with:
{
  "category": "<policy|technical|log|training|vendor|other>",
  "artifactType": "<PDF|screenshot|log|config|attestation|other>",
  "qualityTier": "<A|B|C>",
  "tags": ["tag1", "tag2", ...],
  "suggestedControls": ["control_id1", "control_id2", ...],
  "confidence": <0.0-1.0>
}

Quality Tier Guidelines:
- A: System-generated, tamper-evident, automated collection
- B: Exported system report/log, structured format
- C: Human-authored document, manual upload

Category Guidelines:
- policy: Policy documents, standards, procedures
- technical: Configuration files, system settings, code
- log: System logs, audit trails, monitoring data
- training: Training records, certificates, completion records
- vendor: Vendor attestations, contracts, SLAs
- other: Other evidence types`;

    const messages: BaseMessage[] = [
      new HumanMessage(prompt),
    ];
    
    const response = await model.invoke(messages);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    // Parse JSON response
    let classification;
    try {
      classification = JSON.parse(content);
    } catch {
      // Fallback: extract JSON from markdown code blocks if needed
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Could not parse classification JSON');
      }
    }
    
    // Use similar controls if suggestedControls is empty
    if (classification.suggestedControls.length === 0 && similarControls.rows.length > 0) {
      classification.suggestedControls = similarControls.rows
        .slice(0, 3)
        .map((r) => r.control_id);
    }
    
    return { classification };
  } catch (err: unknown) {
    return { error: `Classification failed: ${toErrorMessage(err)}` };
  }
}

/**
 * persistClassification — saves classification results to database
 */
async function persistClassification(state: EvidenceClassificationState): Promise<Partial<EvidenceClassificationState>> {
  try {
    const schema = tenantSchema(state.tenantId);
    
    // Update evidence with classification
    await safeQuery(
      `UPDATE "${schema}".evidence
       SET
         artifact_type = COALESCE($1, artifact_type),
         category = $2,
         quality_tier = $3,
         tags = $4,
         updated_at = NOW()
       WHERE evidence_id = $5`,
      [
        state.classification.artifactType || null,
        state.classification.category,
        state.classification.qualityTier,
        state.classification.tags,
        state.evidenceId,
      ],
    );
    
    // Link to suggested controls if not already linked
    for (const controlId of state.classification.suggestedControls) {
      await safeQuery(
        `INSERT INTO "${schema}".evidence_control_mappings (evidence_id, control_id, mapping_type, confidence, created_at)
         VALUES ($1, $2, 'ai_suggested', $3, NOW())
         ON CONFLICT (evidence_id, control_id) DO NOTHING`,
        [state.evidenceId, controlId, state.classification.confidence],
      );
    }
    
    return {};
  } catch (err: unknown) {
    return { error: `Persistence failed: ${toErrorMessage(err)}` };
  }
}

// ── Graph Factory ──────────────────────────────────────────────────

/**
 * Creates the evidence classification template graph
 */
export function createEvidenceClassificationTemplate() {
  const graph = new StateGraph(EvidenceClassificationStateAnnotation)
    .addNode('loadEvidence', loadEvidence)
    .addNode('classifyEvidence', classifyEvidence)
    .addNode('persistClassification', persistClassification)
    .addEdge(START, 'loadEvidence')
    .addEdge('loadEvidence', 'classifyEvidence')
    .addEdge('classifyEvidence', 'persistClassification')
    .addEdge('persistClassification', END);

  try {
    return graph.compile({ checkpointer: getCheckpointSaver() });
  } catch {
    return graph.compile();
  }
}

/**
 * Run the evidence classification template
 */
export async function runEvidenceClassification(
  tenantId: string,
  evidenceId: string,
  config?: RunnableConfig,
): Promise<{
  category: string;
  artifactType: string;
  qualityTier: 'A' | 'B' | 'C';
  tags: string[];
  suggestedControls: string[];
  confidence: number;
}> {
  const initialState: Partial<EvidenceClassificationState> = {
    tenantId,
    evidenceId,
    evidenceContent: '',
    classification: {
      category: '',
      artifactType: '',
      qualityTier: 'C',
      tags: [],
      suggestedControls: [],
      confidence: 0,
    },
    error: '',
  };

  const runId = `${tenantId}:evidence-classification:${evidenceId}:${Date.now().toString(36)}`;
  const compiledGraph = createEvidenceClassificationTemplate();
  const tracingCallbacks = createTracingCallbacks();
  const metricsCallback = createMetricsCallback(
    runId,
    'TEMPLATE',
    tenantId,
    'template',
    {
      templateType: 'evidence-classification',
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
      evidenceId,
      templateType: 'evidence-classification',
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
      if (result.classification.suggestedControls && result.classification.suggestedControls.length > 0) {
        metricsCallback.recordDiscovery();
      }
      await metricsCallback.finalize(status);
    }
    
    return result.classification;
  } catch (err) {
    status = 'error';
    if (metricsCallback) {
      await metricsCallback.finalize(status);
    }
    throw err;
  }
}
