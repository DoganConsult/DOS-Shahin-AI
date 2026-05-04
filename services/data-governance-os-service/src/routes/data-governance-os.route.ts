import { Router, type Request, type Response } from 'express';
import { listRecords, getRecord, createRecord, publishRecord, listEvents, emitEvent } from '../lib/data-governance-os-repo.js';
import { RecordCreateSchema, RecordPublishSchema, EventEmitSchema } from '../schemas/data-governance-os.schemas.js';

export const dataGovernanceOsRouter = Router();

dataGovernanceOsRouter.get('/records', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ records: await listRecords(status) });
  } catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

dataGovernanceOsRouter.get('/records/:record_key', async (req: Request, res: Response) => {
  try {
    const v = req.query.version ? Number(req.query.version) : undefined;
    const rec = await getRecord(String(req.params.record_key), v);
    if (!rec) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ record: rec });
  } catch (e) { res.status(500).json({ error: 'get_failed', detail: String((e as Error).message) }); }
});

dataGovernanceOsRouter.post('/records', async (req: Request, res: Response) => {
  const p = RecordCreateSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.status(201).json({ ok: true, record: await createRecord(p.data as Parameters<typeof createRecord>[0]) }); }
  catch (e) { res.status(500).json({ error: 'create_failed', detail: String((e as Error).message) }); }
});

dataGovernanceOsRouter.post('/records/publish', async (req: Request, res: Response) => {
  const p = RecordPublishSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.json({ ok: true, record: await publishRecord(String(p.data.record_key), Number(p.data.version)) }); }
  catch (e) { res.status(409).json({ error: 'publish_failed', detail: String((e as Error).message) }); }
});

dataGovernanceOsRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const rk = typeof req.query.record_key === 'string' ? req.query.record_key : undefined;
    const lim = req.query.limit ? Number(req.query.limit) : 100;
    res.json({ events: await listEvents(rk, lim) });
  } catch (e) { res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) }); }
});

dataGovernanceOsRouter.post('/events', async (req: Request, res: Response) => {
  const p = EventEmitSchema.safeParse(req.body);
  if (!p.success) { res.status(400).json({ error: 'validation', issues: p.error.issues }); return; }
  try { res.status(201).json({ ok: true, event: await emitEvent(p.data as Parameters<typeof emitEvent>[0]) }); }
  catch (e) { res.status(500).json({ error: 'emit_failed', detail: String((e as Error).message) }); }
});
