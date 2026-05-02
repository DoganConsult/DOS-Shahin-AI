import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { chatCompletion, type LLMMessage } from '../../gateway/llm.service';
import { storeMemory, type MemoryType } from '../../memory/memory-store.service';
import type { GenericRow } from '../../../ports/platform.port';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience/resilient-catch';

export interface SelfReflection {
  agentId: string;
  tenantId: string;
  strengths: string[];
  weaknesses: string[];
  adjustments: string[];
  overallScore: number;
}

export async function reflectOnPerformance(
  tenantId: string,
  agentId: string,
): Promise<SelfReflection | null> {
  const schema = tenantSchema(tenantId);

  try {
    const recentRuns = await safeQuery(
      `SELECT run_id, status, summary, actions_proposed, actions_executed, duration_ms, created_at
       FROM "${schema}".agent_runs
       WHERE agent_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC LIMIT 10`,
      [agentId, tenantId],
    );

    if (recentRuns.rows.length === 0) return null;

    const recentEvals = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT eval_type, score, reasoning FROM "${schema}".agent_eval_scores
       WHERE agent_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC LIMIT 15`,
      [agentId, tenantId],
    ), { tenantId: tenantId, operation: 'query agent_eval_scores' });

    const runsContext = recentRuns.rows.map((r: GenericRow) =>
      `Run ${r.run_id}: status=${r.status}, proposed=${r.actions_proposed}, executed=${r.actions_executed}, duration=${r.duration_ms}ms, summary: ${(r.summary || '').slice(0, 200)}`,
    ).join('\n');

    const evalContext = recentEvals.rows.map((e: GenericRow) =>
      `Eval [${e.eval_type}]: score=${e.score}, reasoning: ${(e.reasoning || '').slice(0, 150)}`,
    ).join('\n');

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an AI agent performance analyst. Analyze the recent performance of agent ${agentId} and provide a structured self-reflection. Return ONLY a JSON object with: {"strengths": ["..."], "weaknesses": ["..."], "adjustments": ["..."], "overallScore": 0.X}`,
      },
      {
        role: 'user',
        content: `RECENT RUNS:\n${runsContext}\n\nEVAL SCORES:\n${evalContext || 'No evaluations yet'}`,
      },
    ];

    const result = await chatCompletion(messages);

    let reflection: SelfReflection = {
      agentId, tenantId, strengths: [], weaknesses: [], adjustments: [], overallScore: 0.5,
    };

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        reflection = {
          agentId, tenantId,
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          adjustments: parsed.adjustments || [],
          overallScore: Math.max(0, Math.min(1, parsed.overallScore || 0.5)),
        };
      }
    } catch { /* parse failure */ }

    await storeMemory({
      tenantId,
      agentId,
      memoryType: 'tool' as MemoryType,
      content: `Self-reflection: strengths=[${reflection.strengths.join('; ')}], weaknesses=[${reflection.weaknesses.join('; ')}], adjustments=[${reflection.adjustments.join('; ')}], score=${reflection.overallScore}`,
      metadata: { type: 'self_reflection', ...reflection },
      importanceScore: 0.9,
    }).catch(catchHandler(EC.AGENT_ACTION, {}));

    return reflection;
  } catch {
    return null;
  }
}

export async function applyLearnings(
  tenantId: string,
  agentId: string,
): Promise<{ applied: number; learnings: string[] }> {
  const schema = tenantSchema(tenantId);
  const learnings: string[] = [];

  try {
    const toolMemories = await safeQuery(
      `SELECT content, metadata FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND agent_id = $2 AND memory_type = 'tool'
         AND is_deleted = FALSE AND metadata->>'type' = 'self_reflection'
       ORDER BY created_at DESC LIMIT 3`,
      [tenantId, agentId],
    );

    for (const mem of toolMemories.rows) {
      const meta = typeof mem.metadata === 'string' ? JSON.parse(mem.metadata) : mem.metadata;
      if (meta.adjustments) {
        learnings.push(...meta.adjustments);
      }
    }
  } catch { /* non-fatal */ }

  return { applied: learnings.length, learnings: learnings.slice(0, 10) };
}

export async function runSelfImprovementCycle(
  tenantId: string,
): Promise<{ agents: string[]; reflections: number }> {
  const AGENT_IDS = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11'];
  const agents: string[] = [];
  let reflections = 0;

  for (const agentId of AGENT_IDS) {
    const reflection = await reflectOnPerformance(tenantId, agentId);
    if (reflection) {
      agents.push(agentId);
      reflections++;
    }
  }

  return { agents, reflections };
}
