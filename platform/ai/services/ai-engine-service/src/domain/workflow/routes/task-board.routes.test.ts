import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/dauth-shared', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('@dos/platform-core/http', () => ({
  auditMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  asyncHandler:
    (fn: (req: unknown, res: unknown, next: (e?: unknown) => void) => Promise<unknown>) =>
    (req: unknown, res: unknown, next: (e?: unknown) => void) =>
      Promise.resolve(fn(req, res, next)).catch(next),
  moduleStack: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  setAuditData: vi.fn(),
}));

vi.mock('@dos/module-sdk', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/tasks/task-board.service', () => ({
  getKanbanBoard: vi.fn().mockResolvedValue({ todo: [{ taskId: 't1' }], in_progress: [], review: [], done: [] }),
  createTask: vi.fn().mockResolvedValue({ taskId: 'new', title: 'X' }),
  updateTaskStatus: vi.fn(),
  getTaskProgress: vi.fn().mockResolvedValue({ completed: 1, total: 4, percent: 25 }),
  isValidTransition: vi.fn().mockReturnValue(true),
}));

import taskBoardRouter from './task-board.routes';
import * as taskBoardService from '../services/tasks/task-board.service';

function mkApp(role = 'admin') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: Record<string, unknown> }).user = {
      userId: 'u1', role, roles: [role], tenantId: 't1',
    };
    next();
  });
  app.use('/task-board', taskBoardRouter);
  app.use((err: Error & { status?: number }, _req: unknown, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status ?? 500).json({ error: err.message });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('task-board.routes', () => {
  it('GET / returns kanban board', async () => {
    const res = await request(mkApp()).get('/task-board/');
    expect(res.status).toBe(200);
    expect(res.body.todo).toHaveLength(1);
  });

  it('POST /tasks creates task and returns 201', async () => {
    const res = await request(mkApp())
      .post('/task-board/tasks')
      .send({ title: 'X', entityType: 'control', entityId: 'c1' });
    expect(res.status).toBe(201);
    expect(res.body.taskId).toBe('new');
  });

  it('PUT /tasks/:id/status returns 400 on invalid status', async () => {
    const res = await request(mkApp())
      .put('/task-board/tasks/t1/status')
      .send({ status: 'banana' });
    expect(res.status).toBe(400);
  });

  it('PUT /tasks/:id/status returns 200 on valid transition', async () => {
    (taskBoardService.updateTaskStatus as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ taskId: 't1', status: 'in_progress' });
    const res = await request(mkApp())
      .put('/task-board/tasks/t1/status')
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('PUT /tasks/:id/status returns 404 when task missing', async () => {
    (taskBoardService.updateTaskStatus as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Task not found'));
    const res = await request(mkApp())
      .put('/task-board/tasks/missing/status')
      .send({ status: 'in_progress' });
    expect(res.status).toBe(404);
  });

  it('DELETE /tasks/:id marks task done', async () => {
    (taskBoardService.updateTaskStatus as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ taskId: 't1', status: 'done' });
    const res = await request(mkApp()).delete('/task-board/tasks/t1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('t1');
  });

  it('DELETE /tasks/:id returns 404 when task missing', async () => {
    (taskBoardService.updateTaskStatus as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Task not found'));
    const res = await request(mkApp()).delete('/task-board/tasks/missing');
    expect(res.status).toBe(404);
  });

  it('GET /progress/:entityType/:entityId returns counts', async () => {
    const res = await request(mkApp()).get('/task-board/progress/control/c1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ completed: 1, total: 4, percent: 25 });
  });
});
