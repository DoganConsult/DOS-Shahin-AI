import { Router, type Request, type Response } from 'express';
import { listRecords, getRecord, createRecord, publishRecord, listEvents, emitEvent , evaluateRecord} from '../lib/vendor-risk-os-repo.js';
import { RecordCreateSchema, RecordPublishSchema, EventEmitSchema } from '../schemas/vendor-risk-os.schemas.js';

export const vendorRiskOsRouter = Router();

vendorRiskOsRouter.get('/records', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ records: await listRecords(status) });
  } catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

vendorRiskOsRouter.get('/records/:record_key', async (req: Request, res: Response) => {
  try {
    const v = req.query.version ? Number(req.query.version) : undefined;
    const rec = await getRecord(String(req.params.record_key), v);
    if (!rec) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ record: rec });
  } catch (e) { res.status(500).json({ error: 'get_failed', detail: String((e as Error).message) }); }
});

vendorRiskOsRouter.post('/records', async (req: Request, res: Response) => {
  const p = RecordCreateSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.status(201).json({ ok: true, record: await createRecord(p.data as Parameters<typeof createRecord>[0]) }); }
  catch (e) { res.status(500).json({ error: 'create_failed', detail: String((e as Error).message) }); }
});

vendorRiskOsRouter.post('/records/publish', async (req: Request, res: Response) => {
  const p = RecordPublishSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.json({ ok: true, record: await publishRecord(String(p.data.record_key), Number(p.data.version)) }); }
  catch (e) { res.status(409).json({ error: 'publish_failed', detail: String((e as Error).message) }); }
});

vendorRiskOsRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const rk = typeof req.query.record_key === 'string' ? req.query.record_key : undefined;
    const lim = req.query.limit ? Number(req.query.limit) : 100;
    res.json({ events: await listEvents(rk, lim) });
  } catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

vendorRiskOsRouter.post('/events', async (req: Request, res: Response) => {
  const p = EventEmitSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.status(201).json({ ok: true, event: await emitEvent(p.data as Parameters<typeof emitEvent>[0]) }); }
  catch (e) { res.status(500).json({ error: 'emit_failed', detail: String((e as Error).message) }); }
});

// ── Phase 3 / L30 — domain-aware deterministic record evaluator.
vendorRiskOsRouter.post('/records/:record_key/evaluate', async (req: Request, res: Response) => {
  try {
    const ctx = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const result = await evaluateRecord(String(req.params.record_key), {
      tenant_id: typeof ctx.tenant_id === 'string' ? ctx.tenant_id : undefined,
      user_id:   typeof ctx.user_id === 'string'   ? ctx.user_id   : undefined,
      cohort:    typeof ctx.cohort === 'string'    ? ctx.cohort    : undefined,
    });
    res.json({ ok: true, evaluation: result });
  } catch (e) {
    const msg = String((e as Error).message);
    res.status(msg === 'record_not_published' ? 404 : 500).json({ error: 'evaluate_failed', detail: msg });
  }
});
