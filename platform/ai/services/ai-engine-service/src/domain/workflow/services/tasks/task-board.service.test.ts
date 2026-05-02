import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({
  withTenantClient: vi.fn(),
  getFirstRow: vi.fn((r: { rows?: unknown[] } | undefined) => r?.rows?.[0]),
}));

import {
  computeUrgency,
  isValidTransition,
  computeProgress,
  groupTasksByStatus,
  serializeTaskBoard,
  deserializeTaskBoard,
  VALID_TRANSITIONS,
  getKanbanBoard,
  createTask,
  updateTaskStatus,
  getTaskProgress,
  TaskBoardItem,
} from './task-board.service';
import { withTenantClient } from '@dos/db';

const mockedWithTenantClient = withTenantClient as unknown as ReturnType<typeof vi.fn>;

function buildClient(queryImpl: (sql: string, params?: unknown[]) => unknown) {
  return {
    query: vi.fn((sql: string, params?: unknown[]) => Promise.resolve(queryImpl(sql, params))),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('task-board.service: pure functions', () => {
  describe('computeUrgency', () => {
    const now = new Date('2026-04-26T00:00:00Z');
    it('returns overdue when due date is in the past', () => {
      expect(computeUrgency(new Date('2026-04-25T00:00:00Z'), now)).toBe('overdue');
    });
    it('returns red when due within 3 days', () => {
      expect(computeUrgency(new Date('2026-04-27T00:00:00Z'), now)).toBe('red');
      expect(computeUrgency(new Date('2026-04-28T12:00:00Z'), now)).toBe('red');
    });
    it('returns yellow when due within 4-7 days', () => {
      expect(computeUrgency(new Date('2026-04-30T00:00:00Z'), now)).toBe('yellow');
      expect(computeUrgency(new Date('2026-05-03T00:00:00Z'), now)).toBe('yellow');
    });
    it('returns green when due more than 7 days out', () => {
      expect(computeUrgency(new Date('2026-05-10T00:00:00Z'), now)).toBe('green');
    });
  });

  describe('isValidTransition', () => {
    it('allows todo → in_progress', () => {
      expect(isValidTransition('todo', 'in_progress')).toBe(true);
    });
    it('allows in_progress → review and in_progress → todo', () => {
      expect(isValidTransition('in_progress', 'review')).toBe(true);
      expect(isValidTransition('in_progress', 'todo')).toBe(true);
    });
    it('allows review → done and review → in_progress', () => {
      expect(isValidTransition('review', 'done')).toBe(true);
      expect(isValidTransition('review', 'in_progress')).toBe(true);
    });
    it('rejects done → anything', () => {
      expect(isValidTransition('done', 'todo')).toBe(false);
      expect(isValidTransition('done', 'in_progress')).toBe(false);
    });
    it('rejects illegal jumps', () => {
      expect(isValidTransition('todo', 'done')).toBe(false);
      expect(isValidTransition('todo', 'review')).toBe(false);
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('has all four states defined', () => {
      expect(Object.keys(VALID_TRANSITIONS).sort()).toEqual(['done', 'in_progress', 'review', 'todo']);
    });
    it('done is terminal', () => {
      expect(VALID_TRANSITIONS.done).toEqual([]);
    });
  });

  describe('computeProgress', () => {
    it('returns 0 when total is 0', () => {
      expect(computeProgress(0, 0)).toBe(0);
      expect(computeProgress(5, 0)).toBe(0);
    });
    it('returns rounded percentage', () => {
      expect(computeProgress(1, 3)).toBe(33);
      expect(computeProgress(2, 3)).toBe(67);
      expect(computeProgress(5, 10)).toBe(50);
      expect(computeProgress(10, 10)).toBe(100);
    });
  });

  describe('groupTasksByStatus', () => {
    it('partitions tasks into the 4 buckets', () => {
      const tasks = [
        { status: 'todo' }, { status: 'todo' }, { status: 'in_progress' },
        { status: 'review' }, { status: 'done' }, { status: 'done' },
      ] as TaskBoardItem[];
      const board = groupTasksByStatus(tasks);
      expect(board.todo).toHaveLength(2);
      expect(board.in_progress).toHaveLength(1);
      expect(board.review).toHaveLength(1);
      expect(board.done).toHaveLength(2);
    });
    it('ignores tasks with unknown status', () => {
      const tasks = [{ status: 'unknown' as 'todo' }, { status: 'todo' }] as TaskBoardItem[];
      const board = groupTasksByStatus(tasks);
      expect(board.todo).toHaveLength(1);
    });
  });

  describe('serializeTaskBoard / deserializeTaskBoard', () => {
    it('round-trips a board', () => {
      const board = { todo: [{ status: 'todo' } as TaskBoardItem], in_progress: [], review: [], done: [] };
      const json = serializeTaskBoard(board);
      const parsed = deserializeTaskBoard(json);
      expect(parsed).toEqual(board);
    });
    it('coerces missing arrays to empty', () => {
      const parsed = deserializeTaskBoard('{}');
      expect(parsed).toEqual({ todo: [], in_progress: [], review: [], done: [] });
    });
  });
});

describe('task-board.service: DB functions', () => {
  it('getKanbanBoard combines remediation_tasks + process_tasks', async () => {
    const client = buildClient((sql: string) => {
      if (sql.includes('FROM remediation_tasks')) {
        return { rows: [{ task_id: 't1', title: 'A', status: 'todo' }] };
      }
      if (sql.includes('FROM process_tasks')) {
        return { rows: [{ task_id: 'p1', title: 'B', status: 'done' }] };
      }
      return { rows: [] };
    });
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const board = await getKanbanBoard('t1');
    expect(board.todo.find((t) => t.taskId === 't1')).toBeTruthy();
    expect(board.done.find((t) => t.taskId === 'p1')).toBeTruthy();
  });

  it('getKanbanBoard tolerates missing process_tasks table', async () => {
    const client = {
      query: vi.fn((sql: string) => {
        if (sql.includes('FROM remediation_tasks')) {
          return Promise.resolve({ rows: [{ task_id: 't1', title: 'A', status: 'todo' }] });
        }
        return Promise.reject(new Error('relation "process_tasks" does not exist'));
      }),
    };
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const board = await getKanbanBoard('t1');
    expect(board.todo).toHaveLength(1);
  });

  it('createTask inserts and returns mapped row', async () => {
    const client = buildClient(() => ({
      rows: [{
        task_id: 'new', title: 'X', status: 'todo', description: 'd',
        assigned_to: 'u', linked_entity_type: 'control', linked_entity_id: 'c1',
      }],
    }));
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const task = await createTask('t1', { title: 'X', description: 'd' });
    expect(task.taskId).toBe('new');
    expect(task.entityType).toBe('control');
  });

  it('updateTaskStatus throws when row not found', async () => {
    const client = buildClient(() => ({ rows: [] }));
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    await expect(updateTaskStatus('t1', 'missing', 'in_progress')).rejects.toThrow('Task not found');
  });

  it('updateTaskStatus returns mapped row on success', async () => {
    const client = buildClient(() => ({
      rows: [{ task_id: 't1', title: 'X', status: 'in_progress' }],
    }));
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const task = await updateTaskStatus('t1', 't1', 'in_progress');
    expect(task.status).toBe('in_progress');
  });

  it('getTaskProgress returns completed/total/percent', async () => {
    const client = buildClient(() => ({
      rows: [{ total: '4', completed: '1' }],
    }));
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const progress = await getTaskProgress('t1', 'control', 'c1');
    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(1);
    expect(progress.percent).toBe(25);
  });

  it('getTaskProgress handles empty result', async () => {
    const client = buildClient(() => ({ rows: [] }));
    mockedWithTenantClient.mockImplementation((_t: string, fn: (c: unknown) => unknown) => fn(client));
    const progress = await getTaskProgress('t1', 'control', 'c1');
    expect(progress).toEqual({ total: 0, completed: 0, percent: 0 });
  });
});
