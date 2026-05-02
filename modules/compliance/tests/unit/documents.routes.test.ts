import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({ withTenantClient: vi.fn(async (_t, _u, cb) => cb({ query: vi.fn() })),
  safeQuery: vi.fn(),
  tenantSchema: (t: string) => `tenant_${t}`,
}));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../adapters/auth.adapter', () => ({
  authenticate: vi.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', email: 'u1@t.co', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
    req.tenantId = 't1';
    next();
  }),
  requireTenantId: vi.fn((req: any, _res: any, next: any) => {
    req.tenantId = req.tenantId || 't1';
    next();
  }),
  requirePermission: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

import router from '../routes/documents.routes';
import * as db from '@dos/db';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/documents', router);
  return app;
}

const VALID_DOC_ID = '11111111-1111-1111-1111-111111111111';

describe('documents.routes — GET /api/documents/:id/elements', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('returns 400 for non-UUID document id', async () => {
    const res = await request(app).get('/api/documents/not-a-uuid/elements');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DOCUMENT_ID_INVALID');
    expect((db.safeQuery as any)).not.toHaveBeenCalled();
  });

  it('returns flat element list with correct shape', async () => {
    (db.safeQuery as any).mockResolvedValueOnce({
      rows: [
        { clause_id: 'c1', clause_ref: '1', text: 'Section one text', clause_type: 'section', page_number: 1, sort_order: 0 },
        { clause_id: 'c2', clause_ref: '1.1', text: 'Sub-clause body text', clause_type: 'obligation', page_number: 2, sort_order: 1 },
      ],
    });

    const res = await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.elements).toHaveLength(1); // only root after tree assembly
    const root = res.body.elements[0];
    expect(root.elementId).toBe('c1');
    expect(root.ref).toBe('1');
    expect(root.type).toBe('section');
    expect(root.children).toHaveLength(1);
    expect(root.children[0].elementId).toBe('c2');
    expect(root.children[0].parentId).toBe('c1');
    expect(root.children[0].type).toBe('obligation');
  });

  it('builds parent-child tree from dotted clause refs', async () => {
    (db.safeQuery as any).mockResolvedValueOnce({
      rows: [
        { clause_id: 'a', clause_ref: '4', text: 'Section 4', clause_type: 'section', page_number: null, sort_order: 0 },
        { clause_id: 'b', clause_ref: '4.2', text: 'Sub 4.2', clause_type: 'clause', page_number: null, sort_order: 1 },
        { clause_id: 'c', clause_ref: '4.2.1', text: 'Leaf 4.2.1', clause_type: 'obligation', page_number: null, sort_order: 2 },
      ],
    });

    const res = await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);
    expect(res.status).toBe(200);
    expect(res.body.elements).toHaveLength(1);
    const [section] = res.body.elements;
    expect(section.elementId).toBe('a');
    expect(section.children[0].elementId).toBe('b');
    expect(section.children[0].children[0].elementId).toBe('c');
  });

  it('coerces unknown clause_type to "clause"', async () => {
    (db.safeQuery as any).mockResolvedValueOnce({
      rows: [
        { clause_id: 'x', clause_ref: '1', text: 'hi', clause_type: 'bogus-value', page_number: null, sort_order: 0 },
      ],
    });

    const res = await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);
    expect(res.status).toBe(200);
    expect(res.body.elements[0].type).toBe('clause');
  });

  it('maps "reporting" clause_type to "obligation"', async () => {
    (db.safeQuery as any).mockResolvedValueOnce({
      rows: [
        { clause_id: 'x', clause_ref: '1', text: 'hi', clause_type: 'reporting', page_number: null, sort_order: 0 },
      ],
    });

    const res = await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);
    expect(res.status).toBe(200);
    expect(res.body.elements[0].type).toBe('obligation');
  });

  it('returns empty list when no clauses exist for the document', async () => {
    (db.safeQuery as any).mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);
    expect(res.status).toBe(200);
    expect(res.body.elements).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('returns 500 on DB error', async () => {
    (db.safeQuery as any).mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to load document elements');
  });

  it('scopes query to the tenant schema', async () => {
    (db.safeQuery as any).mockResolvedValueOnce({ rows: [] });
    await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);
    const sqlCall = (db.safeQuery as any).mock.calls[0];
    expect(sqlCall[0]).toContain('"tenant_t1".regulatory_clauses');
    expect(sqlCall[1]).toEqual([VALID_DOC_ID]);
  });

  it('orders by sort_order then clause_ref', async () => {
    (db.safeQuery as any).mockResolvedValueOnce({ rows: [] });
    await request(app).get(`/api/documents/${VALID_DOC_ID}/elements`);
    const sql = (db.safeQuery as any).mock.calls[0][0] as string;
    expect(sql).toMatch(/ORDER BY\s+sort_order ASC,\s*clause_ref ASC NULLS LAST/);
  });
});
