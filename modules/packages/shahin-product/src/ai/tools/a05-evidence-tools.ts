// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A05 — Evidence Collection & Validation
// Tools: find expired/missing evidence, check evidence freshness, request evidence
// ================================================================

import { tenantSchema } from '@dos/db';
import { AgentToolDefinition } from '@dos/module-sdk';
import { createProcessTask } from '@dos/platform-core/workflows';
import { safeRows } from '@dos/module-sdk';

export function buildA05Tools(): AgentToolDefinition[] {
  return [
    {
      name: 'detect_evidence_gaps',
      description: 'Find controls without linked evidence and expired evidence items.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const expired = await safeRows(`SELECT evidence_id, title, linked_entity_type, linked_entity_id, expires_at FROM "${schema}".evidence WHERE expires_at < NOW() AND status != 'archived' ORDER BY expires_at LIMIT 30`);
        const noEvidence = await safeRows(
          `SELECT c.control_id, c.code, c.title FROM "${schema}".ucf_controls c
           WHERE NOT EXISTS (SELECT 1 FROM "${schema}".evidence e WHERE e.linked_entity_id = c.control_id AND e.status = 'active')
           LIMIT 30`
        );
        return { expiredEvidence: expired, controlsWithoutEvidence: noEvidence, expiredCount: expired.length, gapCount: noEvidence.length };
      },
    },
    {
      name: 'check_evidence_freshness',
      description: 'Check evidence freshness across the tenant — how many are current, stale, or expired.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const stats = await safeRows(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))::int AS current,
             COUNT(*) FILTER (WHERE status = 'active' AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS expiring_soon,
             COUNT(*) FILTER (WHERE expires_at < NOW() AND status != 'archived')::int AS expired
           FROM "${schema}".evidence`
        );
        return stats[0] || { total: 0, current: 0, expiring_soon: 0, expired: 0 };
      },
    },
    {
      name: 'request_evidence_collection',
      description: 'Create a task requesting evidence collection for a specific control or entity.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          controlId: { type: 'string', description: 'Control ID that needs evidence' },
          dueInDays: { type: 'number', description: 'Days until due' },
        },
        required: ['title', 'description'],
      },
      handler: async (tenantId, input) => {
        const task = await createProcessTask(tenantId, {
          title: `[A05] ${input.title}`,
          description: input.description,
          taskType: 'evidence_request',
          priority: 'medium',
          entityType: 'evidence',
          entityId: input.controlId,
          dueInHours: input.dueInDays ? input.dueInDays * 24 : undefined,
          triggerSource: 'agent_A05',
          createdBy: 'agent-A05',
        });
        return { created: true, taskId: task.taskId };
      },
    },
  ];
}
