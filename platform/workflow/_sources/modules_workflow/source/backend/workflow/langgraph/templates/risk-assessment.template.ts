// ============================================
// LangGraph Risk Assessment Template
// Template for automated risk assessment and scoring
// ============================================

import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';

import { LANGGRAPH_CONFIG as _LANGGRAPH_CONFIG, createTracingCallbacks, createMetricsCallback } from '../config/langgraph.config';
import { getCheckpointSaver } from '../adapters/checkpoint-factory';
import { getChatModelForAgent } from '../adapters/model-adapter';
import { query as _query, safeQuery, tenantSchema } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { getFirstRow } from '../../utils/db-utils';

// ── Template State Annotation ─────────────────────────────────────

const RiskAssessmentStateAnnotation = Annotation.Root({
  tenantId: Annotation<string>,
  riskId: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  riskDescription: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  context: Annotation<Record<string, unknown>>({
    reducer: (_a, b) => ({ ...b }),
    default: () => ({}),
  }),
  assessment: Annotation<{
    likelihood: number;
    impact: number;
    inherentScore: number;
    residualScore?: number;
    recommendations: string[];
  }>({
    reducer: (_a, b) => b,
    default: () => ({
      likelihood: 0,
      impact: 0,
      inherentScore: 0,
      recommendations: [],
    }),
  }),
  error: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
});

type RiskAssessmentState = typeof RiskAssessmentStateAnnotation.State;

// ── Node Implementations ──────────────────────────────────────────

/**
 * loadRiskContext — loads risk details and related controls/evidence
 */
async function loadRiskContext(state: RiskAssessmentState): Promise<Partial<RiskAssessmentState>> {
  try {
    const schema = tenantSchema(state.tenantId);
    
    // Load risk details
    const riskResult = await safeQuery(
      `SELECT
         risk_id,
         title,
         description,
         category,
         business_unit,
         current_likelihood,
         current_impact,
         inherent_score,
         residual_score
       FROM "${schema}".risks
       WHERE risk_id = $1`,
      [state.riskId],
    );
    
    if (riskResult.rows.length === 0) {
      return { error: `Risk ${state.riskId} not found` };
    }
    
    const risk = getFirstRow(riskResult)!;
    
    // Load related controls
    const controlsResult = await safeQuery(
      `SELECT
         c.control_id,
         c.title_en,
         c.control_code,
         tc.status as implementation_status
       FROM "${schema}".tenant_controls tc
       JOIN "${schema}".controls c ON c.control_id = tc.control_id
       WHERE tc.risk_id = $1
         AND tc.status IN ('implemented', 'partial', 'planned')`,
      [state.riskId],
    );
    
    // Load related evidence
    const evidenceResult = await safeQuery(
      `SELECT
         evidence_id,
         title,
         artifact_type,
         collected_at,
         status
       FROM "${schema}".evidence
       WHERE risk_id = $1
         AND status = 'approved'
       ORDER BY collected_at DESC
       LIMIT 10`,
      [state.riskId],
    );
    
    return {
      riskDescription: risk.description || risk.title,
      context: {
        risk: {
          title: risk.title,
          description: risk.description,
          category: risk.category,
          businessUnit: risk.business_unit,
          currentLikelihood: risk.current_likelihood,
          currentImpact: risk.current_impact,
          currentInherentScore: risk.inherent_score,
          currentResidualScore: risk.residual_score,
        },
        controls: controlsResult.rows,
        evidence: evidenceResult.rows,
      },
    };
  } catch (err: unknown) {
    return { error: `Context loading failed: ${toErrorMessage(err)}` };
  }
}

/**
 * assessRisk — uses LLM to assess risk likelihood, impact, and generate recommendations
 */
async function assessRisk(state: RiskAssessmentState): Promise<Partial<RiskAssessmentState>> {
  try {
    const model = getChatModelForAgent('A02'); // Use risk agent model
    
    const contextText = JSON.stringify(state.context, null, 2);
    const prompt = `You are a risk assessment expert. Analyze the following risk and provide a structured assessment.

Risk Description: ${state.riskDescription}

Context:
${contextText}

Provide a JSON response with:
{
  "likelihood": <1-5 scale>,
  "impact": <1-5 scale>,
  "inherentScore": <calculated from likelihood * impact>,
  "recommendations": ["recommendation1", "recommendation2", ...]
}

Consider:
- Current controls and their implementation status
- Available evidence
- Industry best practices
- Regulatory requirements`;

    const messages: BaseMessage[] = [
      new HumanMessage(prompt),
    ];
    
    const response = await model.invoke(messages);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    // Parse JSON response
    let assessment;
    try {
      assessment = JSON.parse(content);
    } catch {
      // Fallback: extract JSON from markdown code blocks if needed
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        assessment = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Could not parse assessment JSON');
      }
    }
    
    // Calculate inherent score if not provided
    if (!assessment.inherentScore) {
      assessment.inherentScore = assessment.likelihood * assessment.impact;
    }
    
    return { assessment };
  } catch (err: unknown) {
    return { error: `Risk assessment failed: ${toErrorMessage(err)}` };
  }
}

/**
 * persistAssessment — saves assessment results to database
 */
async function persistAssessment(state: RiskAssessmentState): Promise<Partial<RiskAssessmentState>> {
  try {
    const schema = tenantSchema(state.tenantId);
    
    await safeQuery(
      `UPDATE "${schema}".risks
       SET
         likelihood = $1,
         impact = $2,
         inherent_score = $3,
         residual_score = COALESCE($4, inherent_score),
         updated_at = NOW()
       WHERE risk_id = $5`,
      [
        state.assessment.likelihood,
        state.assessment.impact,
        state.assessment.inherentScore,
        state.assessment.residualScore,
        state.riskId,
      ],
    );
    
    // Store recommendations as risk notes or actions
    if (state.assessment.recommendations.length > 0) {
      const notesText = `AI Assessment Recommendations:\n${state.assessment.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
      await safeQuery(
        `INSERT INTO "${schema}".risk_notes (risk_id, note_text, created_by, created_at)
         VALUES ($1, $2, 'system', NOW())`,
        [state.riskId, notesText],
      );
    }
    
    return {};
  } catch (err: unknown) {
    return { error: `Persistence failed: ${toErrorMessage(err)}` };
  }
}

// ── Graph Factory ──────────────────────────────────────────────────

/**
 * Creates the risk assessment template graph
 */
export function createRiskAssessmentTemplate() {
  const graph = new StateGraph(RiskAssessmentStateAnnotation)
    .addNode('loadRiskContext', loadRiskContext)
    .addNode('assessRisk', assessRisk)
    .addNode('persistAssessment', persistAssessment)
    .addEdge(START, 'loadRiskContext')
    .addEdge('loadRiskContext', 'assessRisk')
    .addEdge('assessRisk', 'persistAssessment')
    .addEdge('persistAssessment', END);

  try {
    return graph.compile({ checkpointer: getCheckpointSaver() });
  } catch {
    return graph.compile();
  }
}

/**
 * Run the risk assessment template
 */
export async function runRiskAssessment(
  tenantId: string,
  riskId: string,
  config?: RunnableConfig,
): Promise<{
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore?: number;
  recommendations: string[];
}> {
  const initialState: Partial<RiskAssessmentState> = {
    tenantId,
    riskId,
    riskDescription: '',
    context: {},
    assessment: {
      likelihood: 0,
      impact: 0,
      inherentScore: 0,
      recommendations: [],
    },
    error: '',
  };

  const runId = `${tenantId}:risk-assessment:${riskId}:${Date.now().toString(36)}`;
  const compiledGraph = createRiskAssessmentTemplate();
  const tracingCallbacks = createTracingCallbacks();
  const metricsCallback = createMetricsCallback(
    runId,
    'TEMPLATE',
    tenantId,
    'template',
    {
      templateType: 'risk-assessment',
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
      riskId,
      templateType: 'risk-assessment',
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
      if (result.assessment.recommendations && result.assessment.recommendations.length > 0) {
        metricsCallback.recordProposedAction();
        metricsCallback.recordExecutedAction();
      }
      await metricsCallback.finalize(status);
    }
    
    return result.assessment;
  } catch (err) {
    status = 'error';
    if (metricsCallback) {
      await metricsCallback.finalize(status);
    }
    throw err;
  }
}
