// ============================================
// Agent Activity Feed Service
// Provides real-time feed of agent actions and
// performance statistics for dashboard display.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '../../ports/platform.port';

// ── Agent name map ──────────────────────────────────────────────────────────

const AGENT_NAMES: Record<string, { en: string; ar: string }> = {
  'A01': { en: 'Governance Intelligence', ar: 'ذكاء الحوكمة' },
  'A02': { en: 'Risk Assessment', ar: 'تقييم المخاطر' },
  'A03': { en: 'Compliance Auditor', ar: 'مدقق الامتثال' },
  'A04': { en: 'Evidence Collector', ar: 'جامع الأدلة' },
  'A05': { en: 'Control Optimizer', ar: 'محسن الضوابط' },
  'A06': { en: 'Policy Enforcer', ar: 'منفذ السياسات' },
  'A07': { en: 'Incident Response', ar: 'الاستجابة للحوادث' },
  'A08': { en: 'Vendor Risk Manager', ar: 'مدير مخاطر الموردين' },
  'A09': { en: 'Data Privacy Officer', ar: 'مسؤول خصوصية البيانات' },
  'A10': { en: 'IT Auditor', ar: 'مدقق تقنية المعلومات' },
  'A11': { en: 'Strategy Advisor', ar: 'مستشار الاستراتيجية' },
  'A12': { en: 'Change Manager', ar: 'مدير التغيير' },
};

/** All 12 agent IDs */
const ALL_AGENT_IDS = Object.keys(AGENT_NAMES);

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface AgentActivityItem {
  activity_id: string;
  agent_id: string;
  agent_name: string;
  action_type: 'create_task' | 'send_notification' | 'publish_event' | 'flag_risk' | 'request_evidence';
  entity_type: string;
  entity_id: string;
  summary_en: string;
  summary_ar: string;
  confidence_score: number | null;
  was_overridden: boolean;
  created_at: string;
}

export interface AgentPerformanceStats {
  agent_id: string;
  agent_name: string;
  total_actions: number;
  actions_last_24h: number;
  actions_last_7d: number;
  accuracy_rate: number;
  avg_confidence: number;
  top_action_type: string;
  tasks_auto_resolved: number;
  tasks_escalated_to_human: number;
}

export interface CooperationEvent {
  cooperation_id: string;
  trigger_agent_id: string;
  trigger_agent_name: string;
  trigger_action_type: string;
  responder_agent_id: string;
  responder_agent_name: string;
  responder_action_type: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

// ── Feed Options ────────────────────────────────────────────────────────────

export interface ActivityFeedOptions {
  limit?: number;
  agentId?: string;
  actionType?: string;
  since?: string;
}

// ── Helper: resolve agent name ──────────────────────────────────────────────

function agentName(agentId: string, lang: 'en' | 'ar' = 'en'): string {
  return AGENT_NAMES[agentId]?.[lang] ?? agentId;
}

/**
 * Extract agent ID from event source_service or payload.
 * Convention: source_service like "agent-runner:A01" or payload.agent_id = "A01"
 */
function extractAgentId(row: Record<string, unknown>): string | null {
  // Check source_service pattern "agent-runner:A0X" or "agent:A0X"
  const src = (row.source_service as string | undefined) || '';

  const srcMatch = src.match(/\b(A\d{2})\b/);
  if (srcMatch) return srcMatch[1];

  // Check payload for agent_id
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
  if (payload.agent_id && /^A\d{2}$/.test(payload.agent_id)) return payload.agent_id;
  if (payload.agentId && /^A\d{2}$/.test(payload.agentId)) return payload.agentId;

  return null;
}

/**
 * Extract action type from event_type string.
 * Maps event patterns to the 5 canonical action types.
 */
function extractActionType(eventType: string): AgentActivityItem['action_type'] {
  if (eventType.includes('task') || eventType.includes('create_task')) return 'create_task';
  if (eventType.includes('notification') || eventType.includes('send_notification')) return 'send_notification';
  if (eventType.includes('risk') || eventType.includes('flag_risk')) return 'flag_risk';
  if (eventType.includes('evidence') || eventType.includes('request_evidence')) return 'request_evidence';
  return 'publish_event';
}

// ── Service Functions ───────────────────────────────────────────────────────

/**
 * Retrieve the agent activity feed for a tenant.
 * Queries agrc_event_log where source matches agent patterns.
 */
export async function getActivityFeed(
  tenantId: string,
  opts?: ActivityFeedOptions,
): Promise<AgentActivityItem[]> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(opts?.limit ?? 50, 200);
  const conditions: string[] = [
    `(source_service LIKE 'agent%' OR source_service LIKE '%agent-runner%' OR event_type LIKE 'agent.%' OR event_type LIKE 'process_task.%')`,
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (opts?.agentId) {
    conditions.push(`(source_service LIKE $${paramIdx} OR payload::text LIKE $${paramIdx + 1})`);
    params.push(`%${opts.agentId}%`, `%"${opts.agentId}"%`);
    paramIdx += 2;
  }

  if (opts?.actionType) {
    conditions.push(`event_type LIKE $${paramIdx}`);
    params.push(`%${opts.actionType}%`);
    paramIdx += 1;
  }

  if (opts?.since) {
    conditions.push(`created_at >= $${paramIdx}`);
    params.push(opts.since);
    paramIdx += 1;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await safeQuery(
    `SELECT event_id, event_type, source_service, entity_type, entity_id, severity, payload, created_at
     FROM "${schema}".agrc_event_log
     ${where}
     ORDER BY created_at DESC
     LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`,
    params,
  );

  return result.rows.map((row: GenericRow) => {
    const agentId = extractAgentId(row) || 'any';
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
    const actionType = extractActionType(row.event_type);

    return {
      activity_id: row.event_id,
      agent_id: agentId,
      agent_name: agentName(agentId),
      action_type: actionType,
      entity_type: row.entity_type || payload.entityType || '',
      entity_id: row.entity_id || payload.entityId || '',
      summary_en: payload.summary_en || payload.summary || payload.description || row.event_type,
      summary_ar: payload.summary_ar || payload.summary || row.event_type,
      confidence_score: payload.confidence_score ?? payload.confidence ?? null,
      was_overridden: payload.was_overridden === true || payload.overridden === true,
      created_at: row.created_at,
    };
  });
}

/**
 * Compute performance statistics for all 12 agents.
 * Aggregates from agrc_event_log and process_tasks tables.
 */
export async function getAgentPerformanceStats(
  tenantId: string,
): Promise<AgentPerformanceStats[]> {
  const schema = tenantSchema(tenantId);

  // Fetch all agent-related events in one query
  const eventsResult = await safeQuery(
    `SELECT event_type, source_service, payload, created_at
     FROM "${schema}".agrc_event_log
     WHERE source_service LIKE 'agent%'
        OR source_service LIKE '%agent-runner%'
        OR event_type LIKE 'agent.%'
        OR event_type LIKE 'process_task.%'
     ORDER BY created_at DESC`,
  );

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Aggregate per agent
  const agentStats: Record<string, {
    total: number;
    last24h: number;
    last7d: number;
    overridden: number;
    confidenceSum: number;
    confidenceCount: number;
    actionTypes: Record<string, number>;
  }> = {};

  // Initialize all agents
  for (const id of ALL_AGENT_IDS) {
    agentStats[id] = {
      total: 0, last24h: 0, last7d: 0, overridden: 0,
      confidenceSum: 0, confidenceCount: 0, actionTypes: {},
    };
  }

  for (const row of eventsResult.rows) {
    const agId = extractAgentId(row);
    if (!agId || !agentStats[agId]) continue;

    const stats = agentStats[agId];
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
    const createdAt = new Date(row.created_at);

    stats.total++;
    if (createdAt >= oneDayAgo) stats.last24h++;
    if (createdAt >= sevenDaysAgo) stats.last7d++;
    if (payload.was_overridden === true || payload.overridden === true) stats.overridden++;

    const conf = payload.confidence_score ?? payload.confidence;
    if (typeof conf === 'number') {
      stats.confidenceSum += conf;
      stats.confidenceCount++;
    }

    const actionType = extractActionType(row.event_type);
    stats.actionTypes[actionType] = (stats.actionTypes[actionType] || 0) + 1;
  }

  // Fetch process_tasks resolution stats per agent
  const taskStatsResult = await safeQuery(
    `SELECT
       COALESCE(payload->>'agent_id', payload->>'agentId', 'any') AS agent_id,
       COUNT(*) FILTER (WHERE status = 'completed' AND assignee_type = 'agent') AS auto_resolved,
       COUNT(*) FILTER (WHERE status = 'escalated' OR assignee_type = 'human') AS escalated
     FROM "${schema}".process_tasks
     WHERE (payload->>'agent_id' IS NOT NULL OR payload->>'agentId' IS NOT NULL)
     GROUP BY COALESCE(payload->>'agent_id', payload->>'agentId', 'any')`,
  );

  const taskMap: Record<string, { autoResolved: number; escalated: number }> = {};
  for (const row of taskStatsResult.rows) {
    taskMap[row.agent_id] = {
      autoResolved: parseInt(row.auto_resolved) || 0,
      escalated: parseInt(row.escalated) || 0,
    };
  }

  return ALL_AGENT_IDS.map(agId => {
    const stats = agentStats[agId];
    const tasks = taskMap[agId] || { autoResolved: 0, escalated: 0 };

    // Find top action type
    let topActionType = 'publish_event';
    let topCount = 0;
    for (const [type, count] of Object.entries(stats.actionTypes)) {
      if (count > topCount) {
        topActionType = type;
        topCount = count;
      }
    }

    return {
      agent_id: agId,
      agent_name: agentName(agId),
      total_actions: stats.total,
      actions_last_24h: stats.last24h,
      actions_last_7d: stats.last7d,
      accuracy_rate: stats.total > 0
        ? Math.round(((stats.total - stats.overridden) / stats.total) * 100 * 100) / 100
        : 100,
      avg_confidence: stats.confidenceCount > 0
        ? Math.round((stats.confidenceSum / stats.confidenceCount) * 100) / 100
        : 0,
      top_action_type: topActionType,
      tasks_auto_resolved: tasks.autoResolved,
      tasks_escalated_to_human: tasks.escalated,
    };
  });
}

/**
 * Find cooperation chains where one agent's action triggers another agent's
 * action on the same entity. Example: A02 flags risk -> A04 requests evidence
 * for that risk -> A05 suggests control.
 */
export async function getAgentCooperationTimeline(
  tenantId: string,
  limit: number = 30,
): Promise<CooperationEvent[]> {
  const schema = tenantSchema(tenantId);
  const safeLimit = Math.min(limit, 100);

  // Find pairs of agent events on the same entity_id within a 24h window
  const result = await safeQuery(
    `SELECT
       e1.event_id AS trigger_event_id,
       e1.event_type AS trigger_event_type,
       e1.source_service AS trigger_source,
       e1.payload AS trigger_payload,
       e2.event_id AS responder_event_id,
       e2.event_type AS responder_event_type,
       e2.source_service AS responder_source,
       e2.payload AS responder_payload,
       e1.entity_type,
       e1.entity_id,
       e2.created_at
     FROM "${schema}".agrc_event_log e1
     JOIN "${schema}".agrc_event_log e2
       ON e1.entity_id = e2.entity_id
       AND e1.entity_id IS NOT NULL
       AND e1.entity_id != ''
       AND e2.created_at > e1.created_at
       AND e2.created_at <= e1.created_at + INTERVAL '24 hours'
       AND e1.event_id != e2.event_id
       AND e1.source_service != e2.source_service
     WHERE (e1.source_service LIKE 'agent%' OR e1.source_service LIKE '%agent-runner%')
       AND (e2.source_service LIKE 'agent%' OR e2.source_service LIKE '%agent-runner%')
     ORDER BY e2.created_at DESC
     LIMIT ${Math.min(500, Math.max(1, parseInt(String(safeLimit)) || 50))}`,
  );

  return result.rows.map((row: GenericRow) => {
    const triggerAgentId = extractAgentId({
      source_service: row.trigger_source,
      payload: row.trigger_payload,
    }) || 'any';

    const responderAgentId = extractAgentId({
      source_service: row.responder_source,
      payload: row.responder_payload,
    }) || 'any';

    return {
      cooperation_id: `${row.trigger_event_id}_${row.responder_event_id}`,
      trigger_agent_id: triggerAgentId,
      trigger_agent_name: agentName(triggerAgentId),
      trigger_action_type: extractActionType(row.trigger_event_type),
      responder_agent_id: responderAgentId,
      responder_agent_name: agentName(responderAgentId),
      responder_action_type: extractActionType(row.responder_event_type),
      entity_type: row.entity_type || '',
      entity_id: row.entity_id || '',
      created_at: row.created_at,
    };
  });
}
