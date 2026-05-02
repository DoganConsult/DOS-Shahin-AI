// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A12 — Training & Awareness
// Tools: list programs, assign training, check completion, identify gaps
// ================================================================

import { tenantSchema } from '@dos/db';
import { AgentToolDefinition } from '@dos/module-sdk';
import { recordAudit } from '@dos/platform-core/observability';
import { safeRows } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types/db';

export function buildA12Tools(): AgentToolDefinition[] {
  return [
    {
      name: 'list_training_programs',
      description: 'List all active training programs with completion stats.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const programs = await safeRows(
          `SELECT program_id, title, category, status, created_at
           FROM "${schema}".training_programs WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 30`
        );
        return { programs, count: programs.length };
      },
    },
    {
      name: 'assign_training',
      description: 'Assign a training program to a user.',
      input_schema: {
        type: 'object',
        properties: {
          programId: { type: 'string' },
          userId: { type: 'string' },
          dueDate: { type: 'string', description: 'ISO date string' },
        },
        required: ['programId', 'userId'],
      },
      handler: async (tenantId, input) => {
        const schema = tenantSchema(tenantId);
        const rows = await safeRows(
          `INSERT INTO "${schema}".training_assignments (program_id, user_id, status, due_date, assigned_at)
           VALUES ($1, $2, 'assigned', $3, NOW()) RETURNING assignment_id`,
          [input.programId, input.userId, input.dueDate || null]
        );
        if (rows.length === 0) return { assigned: false, reason: 'Insert failed' };
        await recordAudit({ tenantId, userId: 'agent-A12', module: 'training', action: 'create', entityType: 'training_assignment', entityId: String(rows[0].assignment_id), afterState: { programId: input.programId, userId: input.userId, dueDate: input.dueDate } });
        return { assigned: true, assignmentId: rows[0].assignment_id };
      },
    },
    {
      name: 'get_completion_status',
      description: 'Get training completion status across all programs.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const stats = await safeRows(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                  COUNT(*) FILTER (WHERE status = 'assigned' AND due_date < NOW())::int AS overdue,
                  ROUND(AVG(CASE WHEN status = 'completed' THEN 100 ELSE 0 END))::int AS completion_rate
           FROM "${schema}".training_assignments WHERE deleted_at IS NULL`
        );
        return stats[0] || { total: 0, completed: 0, overdue: 0, completion_rate: 0 };
      },
    },
    {
      name: 'create_awareness_campaign',
      description: 'Create a security awareness campaign.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          targetAudience: { type: 'string' },
        },
        required: ['title'],
      },
      handler: async (tenantId, input) => {
        const schema = tenantSchema(tenantId);
        const rows = await safeRows(
          `INSERT INTO "${schema}".training_programs (title, description, category, status, created_at)
           VALUES ($1, $2, 'awareness_campaign', 'draft', NOW()) RETURNING program_id`,
          [`[A12] ${input.title}`, input.description || '']
        );
        if (rows.length === 0) return { created: false, reason: 'Insert failed' };
        await recordAudit({ tenantId, userId: 'agent-A12', module: 'training', action: 'create', entityType: 'training_program', entityId: String(rows[0].program_id), afterState: { title: input.title, category: 'awareness_campaign' } });
        return { created: true, programId: rows[0].program_id };
      },
    },
    {
      name: 'get_training_gaps',
      description: 'Identify users with missing or overdue training.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const gaps = await safeRows(
          `SELECT u.user_id, u.email, u.full_name,
                  COUNT(ta.assignment_id) FILTER (WHERE ta.status = 'assigned' AND ta.due_date < NOW())::int AS overdue_count
           FROM users u
           LEFT JOIN "${schema}".training_assignments ta ON ta.user_id = u.user_id AND ta.deleted_at IS NULL
           WHERE u.tenant_id = $1
           GROUP BY u.user_id, u.email, u.full_name
           HAVING COUNT(ta.assignment_id) FILTER (WHERE ta.status = 'completed') = 0
              OR COUNT(ta.assignment_id) FILTER (WHERE ta.status = 'assigned' AND ta.due_date < NOW()) > 0
           LIMIT 50`,
          [tenantId]
        );
        return { usersWithGaps: gaps, count: gaps.length };
      },
    },
    {
      name: 'recommend_training',
      description: 'Recommend training programs based on role and compliance gaps.',
      input_schema: { type: 'object', properties: {}, required: [] },
      handler: async (tenantId) => {
        const schema = tenantSchema(tenantId);
        const [roles, programs] = await Promise.all([
          safeRows(`SELECT DISTINCT role FROM users WHERE tenant_id = $1 AND status = 'active'`, [tenantId]),
          safeRows(`SELECT program_id, title, category FROM "${schema}".training_programs WHERE status = 'published' AND deleted_at IS NULL`),
        ]);
        return { activeRoles: roles.map((r: GenericRow) => r.role), availablePrograms: programs, recommendation: 'Assign mandatory compliance training to all roles with access to sensitive data' };
      },
    },
  ];
}
