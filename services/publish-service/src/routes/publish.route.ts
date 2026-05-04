import { Router, type Request, type Response } from 'express';
import { ensureTarget, createRevision, publishRevision, rollbackRevision, listRevisions } from '../lib/publish-repo.js';
import { CreateRevisionSchema, PublishSchema, RollbackSchema, TargetEnsureSchema } from '../schemas/publish.schemas.js';

export const publishRouter = Router();

publishRouter.get('/revisions', async (req, res) => {
  try {
    const tk = typeof req.query.target_kind === 'string' ? req.query.target_kind : undefined;
    const td = typeof req.query.target_key === 'string' ? req.query.target_key : undefined;
    res.json({ revisions: await listRevisions(tk, td) });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', detail: String((e as Error).message) });
  }
});

publishRouter.post('/targets', async (req: Request, res: Response) => {
  const parse = TargetEnsureSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    await ensureTarget(parse.data.target_kind, parse.data.target_key, parse.data.display_name, parse.data.owner_team ?? null);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'target_failed', detail: String((e as Error).message) });
  }
});

publishRouter.post('/revisions', async (req: Request, res: Response) => {
  const parse = CreateRevisionSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    const r = await createRevision({
      target_kind: parse.data.target_kind,
      target_key: parse.data.target_key,
      payload: parse.data.payload,
      created_by: parse.data.created_by,
      change_request_id: parse.data.change_request_id ?? null,
    });
    res.status(201).json({ ok: true, revision: r });
  } catch (e) {
    res.status(500).json({ error: 'create_failed', detail: String((e as Error).message) });
  }
});

publishRouter.post('/publish', async (req: Request, res: Response) => {
  const parse = PublishSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    res.json(await publishRevision(parse.data.revision_id));
  } catch (e) {
    res.status(500).json({ error: 'publish_failed', detail: String((e as Error).message) });
  }
});

publishRouter.post('/rollback', async (req: Request, res: Response) => {
  const parse = RollbackSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'validation', issues: parse.error.issues }); return; }
  try {
    res.json(await rollbackRevision(parse.data.revision_id, parse.data.rolled_back_by, parse.data.reason));
  } catch (e) {
    res.status(500).json({ error: 'rollback_failed', detail: String((e as Error).message) });
  }
});
