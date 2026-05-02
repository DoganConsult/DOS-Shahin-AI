import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';

vi.mock('@dos/dauth-shared', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAnyPermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('@dos/platform-core/resilience/resilient-catch', () => ({
  swallow: (_ec: unknown, p: Promise<unknown>) => p,
  EC: {},
}));

vi.mock('../../services/orchestration/ai-os-orchestrator.service', () => ({
  orchestratedAssessRisk: vi.fn(),
  orchestratedAnalyzeGap: vi.fn(),
  orchestratedGeneratePolicy: vi.fn(),
  orchestratedPrepareAudit: vi.fn(),
  orchestratedTriageIncident: vi.fn(),
  orchestratedAnalyzeRegulatoryChange: vi.fn(),
  orchestratedGetProactiveInsights: vi.fn(),
  orchestratedAutoClassifyRisk: vi.fn(),
  orchestratedAutoClassifyIncident: vi.fn(),
}));

const gatewayJSONMock = vi.fn();
vi.mock('../../services/gateway/ai-gateway.service', () => ({
  gatewayJSON: (...args: any[]) => gatewayJSONMock(...args),
}));

vi.mock('@dos/platform-core/http', () => ({
  auditMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  automationMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  fieldRbacFilter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  moduleStack: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  asyncHandler:
    (fn: (req: unknown, res: unknown, next: (e?: unknown) => void) => Promise<unknown>) =>
    (req: unknown, res: unknown, next: (e?: unknown) => void) =>
      Promise.resolve(fn(req, res, next)).catch(next),
  validate: (schemaOrMap: any) => (req: any, res: any, next: () => void) => {
    const isMap = schemaOrMap && typeof schemaOrMap === 'object' && !('safeParse' in schemaOrMap);
    const strict = isMap ? Boolean(schemaOrMap.strict) : false;
    const sources: Array<'body' | 'query' | 'params'> = isMap ? ['body', 'query', 'params'] : ['body'];
    for (const src of sources) {
      const schema = isMap ? schemaOrMap[src] : schemaOrMap;
      if (!schema) continue;
      const parseResult = strict && typeof schema.strict === 'function'
        ? schema.strict().safeParse(req[src])
        : schema.safeParse(req[src]);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          source: src,
          details: parseResult.error.issues.map((issue: any) => ({
            field: issue.path.join('.') || 'root',
            message: issue.message,
            code: issue.code,
          })),
        });
        return;
      }
      req[src] = parseResult.data;
    }
    next();
  },
  setAuditData: vi.fn(),
}));

vi.mock('../schemas/ai.schemas', () => ({
  generatePolicyBody: z.object({}).passthrough(),
  copilotQueryBody: z.object({}).passthrough(),
  autoEvalBody: z.object({}).passthrough(),
}));

vi.mock('../../services/emit-event', () => ({
  emitModuleEvent: vi.fn(),
}));

vi.mock('@dos/module-sdk', async (importOriginal) => {
  const mod = await importOriginal<any>();
  return { ...mod, toErrorMessage: (e: any) => String(e?.message ?? e) };
});

import aiRouter from './ai.routes';

function mkApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { userId: 'u1', role: 'admin', roles: ['admin'], tenantId: 't1' };
    (req as any).tenantId = 't1';
    next();
  });
  app.use('/', aiRouter);
  app.use((err: any, _req: unknown, res: express.Response, _next: express.NextFunction) => {
    res.status(err?.status ?? 500).json({ error: err?.message, code: err?.code });
  });
  return app;
}

beforeEach(() => {
  gatewayJSONMock.mockReset();
});

describe('ai.routes compose', () => {
  it('POST /compose/description returns suggestion', async () => {
    gatewayJSONMock.mockResolvedValueOnce('Hello world');
    const res = await request(mkApp())
      .post('/compose/description')
      .send({ context: 'Context', itemType: 'policy' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ suggestion: 'Hello world' });
  });

  it('POST /compose/description falls back when gateway fails', async () => {
    gatewayJSONMock.mockRejectedValueOnce(new Error('upstream'));
    const res = await request(mkApp())
      .post('/compose/description')
      .send({ context: 'Context', itemType: 'record' });
    expect(res.status).toBe(200);
    expect(typeof res.body.suggestion).toBe('string');
    expect(res.body.suggestion.length).toBeGreaterThan(0);
  });

  it('POST /compose/description returns 400 on invalid body', async () => {
    const res = await request(mkApp())
      .post('/compose/description')
      .send({ itemType: 'record' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /compose/improve returns improved text', async () => {
    gatewayJSONMock.mockResolvedValueOnce('Improved');
    const res = await request(mkApp())
      .post('/compose/improve')
      .send({ text: 'Original', tone: 'professional' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ improved: 'Improved' });
  });

  it('POST /compose/improve returns 400 on invalid tone', async () => {
    const res = await request(mkApp())
      .post('/compose/improve')
      .send({ text: 'Original', tone: 'angry' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
