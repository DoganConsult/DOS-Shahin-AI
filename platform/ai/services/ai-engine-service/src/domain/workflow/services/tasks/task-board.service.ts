// ============================================
// Task Board Service — Kanban board logic with urgency, transitions, progress
// Ported from modules/workflow/source/backend/workflow/services/tasks/task-board.service.ts
// ============================================

import { withTenantClient, getFirstRow } from '@dos/db';

// === Types ===

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type UrgencyColor = 'green' | 'yellow' | 'red' | 'overdue';

export interface TaskBoardItem {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string;
  dueDate: string | null;
  entityType: string;
  entityId: string;
  urgency: UrgencyColor;
  createdAt: string;
}

export interface TaskBoardState {
  todo: TaskBoardItem[];
  in_progress: TaskBoardItem[];
  review: TaskBoardItem[];
  done: TaskBoardItem[];
}

// === Constants ===

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress'],
  in_progress: ['review', 'todo'],
  review: ['done', 'in_progress'],
  done: [],
};

// === Pure Functions ===

export function computeUrgency(dueDate: Date, now: Date): UrgencyColor {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'overdue';
  if (diffDays < 3) return 'red';
  if (diffDays <= 7) return 'yellow';
  return 'green';
}

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function computeProgress(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function groupTasksByStatus(tasks: TaskBoardItem[]): TaskBoardState {
  const board: TaskBoardState = { todo: [], in_progress: [], review: [], done: [] };
  for (const task of tasks) {
    if (task.status in board) board[task.status].push(task);
  }
  return board;
}

export function serializeTaskBoard(board: TaskBoardState): string {
  return JSON.stringify(board);
}

export function deserializeTaskBoard(json: string): TaskBoardState {
  const parsed = JSON.parse(json);
  return {
    todo: Array.isArray(parsed.todo) ? parsed.todo : [],
    in_progress: Array.isArray(parsed.in_progress) ? parsed.in_progress : [],
    review: Array.isArray(parsed.review) ? parsed.review : [],
    done: Array.isArray(parsed.done) ? parsed.done : [],
  };
}

// === Row Mapping ===

function mapRow(r: Record<string, unknown>): TaskBoardItem {
  const now = new Date();
  const rawDue = (r as { due_date?: unknown }).due_date;
  const dueDate = rawDue ? new Date(rawDue as string | number | Date) : null;
  const dueIso =
    rawDue && typeof (rawDue as { toISOString?: () => string }).toISOString === 'function'
      ? (rawDue as Date).toISOString()
      : (rawDue as string | null) ?? null;
  const createdRaw = (r as { created_at?: unknown }).created_at;
  const createdIso =
    createdRaw && typeof (createdRaw as { toISOString?: () => string }).toISOString === 'function'
      ? (createdRaw as Date).toISOString()
      : (createdRaw as string | undefined) ?? '';

  return {
    taskId: String(r.task_id ?? ''),
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    status: ((r.status as TaskStatus) ?? 'todo'),
    assignedTo: String(r.assigned_to ?? ''),
    dueDate: dueIso,
    entityType: String(r.linked_entity_type ?? ''),
    entityId: String(r.linked_entity_id ?? ''),
    urgency: dueDate ? computeUrgency(dueDate, now) : 'green',
    createdAt: createdIso,
  };
}

// === API Functions ===

export async function getKanbanBoard(tenantId: string): Promise<TaskBoardState> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT task_id, title, description, status, assigned_to, due_date,
              linked_entity_type, linked_entity_id, created_at
       FROM remediation_tasks
       ORDER BY due_date ASC NULLS LAST`,
    );
    const rows = [...result.rows];

    // Include RACI-routed process_tasks (map statuses to kanban columns).
    // Tolerate missing table — newly provisioned tenants may not have process_tasks yet.
    try {
      const ptResult = await client.query(
        `SELECT task_id, title, description,
                CASE status
                  WHEN 'pending' THEN 'todo'
                  WHEN 'assigned' THEN 'todo'
                  WHEN 'in_progress' THEN 'in_progress'
                  WHEN 'escalated' THEN 'in_progress'
                  WHEN 'completed' THEN 'done'
                  WHEN 'cancelled' THEN 'done'
                  ELSE 'todo'
                END AS status,
                assigned_user_id AS assigned_to,
                due_date, task_type AS linked_entity_type,
                trigger_source AS linked_entity_id, created_at
         FROM process_tasks
         ORDER BY due_date ASC NULLS LAST`,
      );
      rows.push(...ptResult.rows);
    } catch {
      // process_tasks table may not exist
    }

    const tasks = rows.map(mapRow);
    return groupTasksByStatus(tasks);
  });
}

export async function createTask(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    assignedTo?: string;
    dueDate?: string;
    entityType?: string;
    entityId?: string;
  },
): Promise<TaskBoardItem> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `INSERT INTO remediation_tasks
         (title, description, assigned_to, due_date, linked_entity_type, linked_entity_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'todo')
       RETURNING *`,
      [
        data.title,
        data.description || '',
        data.assignedTo || null,
        data.dueDate || null,
        data.entityType || null,
        data.entityId || null,
      ],
    );
    return mapRow(getFirstRow(result));
  });
}

export async function updateTaskStatus(
  tenantId: string,
  taskId: string,
  newStatus: TaskStatus,
): Promise<TaskBoardItem> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `UPDATE remediation_tasks
         SET status = $1, updated_at = NOW()
       WHERE task_id = $2
       RETURNING *`,
      [newStatus, taskId],
    );
    const row = getFirstRow(result);
    if (!row) throw new Error('Task not found');
    return mapRow(row);
  });
}

export async function getTaskProgress(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<{ completed: number; total: number; percent: number }> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'done' OR status = 'completed') AS completed
       FROM remediation_tasks
       WHERE linked_entity_type = $1 AND linked_entity_id = $2`,
      [entityType, entityId],
    );
    const row = getFirstRow(result) as { total?: string; completed?: string } | undefined;
    const total = parseInt(row?.total ?? '0', 10);
    const completed = parseInt(row?.completed ?? '0', 10);
    return { completed, total, percent: computeProgress(completed, total) };
  });
}
