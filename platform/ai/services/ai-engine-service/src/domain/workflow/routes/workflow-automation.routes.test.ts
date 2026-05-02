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

vi.mock('../services/ops/workflow-automation.service', () => ({
  executeWorkflowAutomation: vi.fn().mockResolvedValue({
    actionId: 'workflow-automation', success: true, message: 'Created 3 workflow definitions',
    details: { created: 3 },
  }),
  getAutomationStatus: vi.fn().mockResolvedValue({ templatesCount: 3, instancesCount: 5 }),
}));

import workflowAutomationRouter from './workflow-automation.routes';
import * as automationService from '../services/ops/workflow-automation.service';

function mkApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: Record<string, unknown> }).user = {
      userId: 'u1', tenantId: 't1', role: 'admin', roles: ['admin'],
    };
    next();
  });
  app.use('/workflow-automation', workflowAutomationRouter);
  app.use((err: Error & { status?: number }, _req: unknown, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status ?? 500).json({ error: err.message });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workflow-automation.routes', () => {
  it('POST /trigger executes automation and returns result', async () => {
    const res = await request(mkApp()).post('/workflow-automation/trigger').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.actionId).toBe('workflow-automation');
  });

  it('POST /trigger surfaces 500 on unexpected error', async () => {
    (automationService.executeWorkflowAutomation as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('db down'));
    const res = await request(mkApp()).post('/workflow-automation/trigger').send({});
    expect(res.status).toBe(500);
  });

  it('GET /status returns counts', async () => {
    const res = await request(mkApp()).get('/workflow-automation/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ templatesCount: 3, instancesCount: 5 });
  });
});
