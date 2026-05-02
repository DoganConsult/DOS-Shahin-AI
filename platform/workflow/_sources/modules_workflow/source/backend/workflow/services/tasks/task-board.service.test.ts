/**
 * Co-located tests for task-board.service.ts
 * Tests pure functions: computeUrgency, isValidTransition, computeProgress,
 * groupTasksByStatus, serializeTaskBoard, deserializeTaskBoard.
 */
import {  describe, it, expect , vi as _vi } from 'vitest';
import {
  computeUrgency,
  isValidTransition,
  computeProgress,
  groupTasksByStatus,
  serializeTaskBoard,
  deserializeTaskBoard,
  VALID_TRANSITIONS as _VALID_TRANSITIONS,
  type TaskBoardItem,
  type TaskStatus,
} from './task-board.service';

describe('task-board.service — computeUrgency', () => {
  const now = new Date('2026-03-01T00:00:00Z');

  it('returns "overdue" when due date is in the past', () => {
    const past = new Date('2026-02-28T00:00:00Z');
    expect(computeUrgency(past, now)).toBe('overdue');
  });

  it('returns "red" when due within 3 days', () => {
    const soon = new Date('2026-03-02T00:00:00Z');
    expect(computeUrgency(soon, now)).toBe('red');
  });

  it('returns "yellow" when due within 7 days', () => {
    const week = new Date('2026-03-07T00:00:00Z');
    expect(computeUrgency(week, now)).toBe('yellow');
  });

  it('returns "green" when due more than 7 days out', () => {
    const far = new Date('2026-03-15T00:00:00Z');
    expect(computeUrgency(far, now)).toBe('green');
  });
});

describe('task-board.service — isValidTransition', () => {
  it('allows todo -> in_progress', () => {
    expect(isValidTransition('todo', 'in_progress')).toBe(true);
  });

  it('blocks todo -> done (must go through review)', () => {
    expect(isValidTransition('todo', 'done')).toBe(false);
  });

  it('allows review -> done', () => {
    expect(isValidTransition('review', 'done')).toBe(true);
  });

  it('blocks done -> any (terminal state)', () => {
    expect(isValidTransition('done', 'todo')).toBe(false);
    expect(isValidTransition('done', 'in_progress')).toBe(false);
    expect(isValidTransition('done', 'review')).toBe(false);
  });

  it('allows in_progress -> review', () => {
    expect(isValidTransition('in_progress', 'review')).toBe(true);
  });
});

describe('task-board.service — computeProgress', () => {
  it('returns 0 when total is 0', () => {
    expect(computeProgress(0, 0)).toBe(0);
  });

  it('returns 0 when total is negative', () => {
    expect(computeProgress(5, -1)).toBe(0);
  });

  it('returns rounded percentage', () => {
    expect(computeProgress(1, 3)).toBe(33);
    expect(computeProgress(2, 3)).toBe(67);
    expect(computeProgress(3, 3)).toBe(100);
  });
});

describe('task-board.service — groupTasksByStatus', () => {
  const makeTask = (status: TaskStatus): TaskBoardItem => ({
    taskId: `t-${status}`,
    title: status,
    description: '',
    status,
    assignedTo: 'user-1',
    dueDate: null,
    entityType: 'risk',
    entityId: 'r-1',
    urgency: 'green',
    createdAt: '2026-01-01',
  });

  it('groups tasks into correct columns', () => {
    const tasks = [makeTask('todo'), makeTask('in_progress'), makeTask('done')];
    const board = groupTasksByStatus(tasks);

    expect(board.todo).toHaveLength(1);
    expect(board.in_progress).toHaveLength(1);
    expect(board.review).toHaveLength(0);
    expect(board.done).toHaveLength(1);
  });
});

describe('task-board.service — serialize/deserialize round-trip', () => {
  it('round-trips a board state through JSON', () => {
    const board = { todo: [], in_progress: [], review: [], done: [] };
    const json = serializeTaskBoard(board);
    const restored = deserializeTaskBoard(json);
    expect(restored).toEqual(board);
  });

  it('deserialize handles missing keys gracefully', () => {
    const result = deserializeTaskBoard('{}');
    expect(result.todo).toEqual([]);
    expect(result.in_progress).toEqual([]);
  });
});
