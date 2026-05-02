import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());

import { authenticate } from '../../ports/auth.port';
import { getInitiativeDefinitions, seedInitiativeDefinitions, getModulesCovered } from '../../../governance-os/services/initiative/initiative-registry.service';
import {
  getMilestoneDefinitions,
  getMilestoneInstances,
  getRollupByModule,
  getRollupByLayer,
  seedMilestoneDefinitions,
  getDefaultMilestones as _getDefaultMilestones,
  evaluateMilestonesFromLiveData,
  getSupportedLiveEvaluationModules,
  type MilestoneLayer,
} from '../../../governance-os/services/misc/milestone-engine.service';
import { getExpertPack, getAllExpertPacks, seedExpertPacks } from '../../../governance-os/services/misc/expert-pack.service';
import { getOutcomeLinks, getImpactChain, getModuleOutcomeScore } from '../../../governance-os/services/misc/outcome-graph.service';
import { runOrchestrator, getRecentRuns, getActiveRuns, getAutonomyLabels } from '../../../governance-os/services/initiative/initiative-orchestrator.service';
import {
  generateDigest,
  getDigests,
  getLatestDigest,
  getDigestTypes,
  type DigestType,
} from '../../../governance-os/services/misc/leadership-digest.service';
import type { LinkCategory } from '../../../governance-os/services/misc/outcome-graph.service';
import { validate, auditMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';

import { createSeedBody, createRunBody, createGenerateBody, createEvaluateLiveBody } from '../../schemas/governance.schemas';

const LINK_CATEGORIES: readonly LinkCategory[] = [
  'task_to_milestone',
  'action_to_outcome',
  'control_to_readiness',
  'evidence_to_milestone',
  'finding_to_exposure',
  'risk_to_posture',
  'initiative_to_artifact',
  'activity_to_kpi',
  'qiyas_to_maturity',
] as const;

const DIGEST_TYPES = new Set<DigestType>(getDigestTypes());

const MILESTONE_LAYERS = new Set<MilestoneLayer>(['operational', 'capability', 'outcome']);

function parseMilestoneLayer(value: unknown): MilestoneLayer | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const s = String(value);
  return MILESTONE_LAYERS.has(s as MilestoneLayer) ? (s as MilestoneLayer) : undefined;
}

function parseDigestType(value: unknown): DigestType | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const s = String(value);
  return DIGEST_TYPES.has(s as DigestType) ? (s as DigestType) : undefined;
}

function parseLinkCategory(value: unknown): LinkCategory | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const s = String(value);
  return (LINK_CATEGORIES as readonly string[]).includes(s) ? (s as LinkCategory) : undefined;
}

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(mutationEventHook('governance'));

router.get('/initiatives', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const moduleCode = req.query.module as string | undefined;
    const allDefs = await getInitiativeDefinitions();
    const defs = moduleCode ? allDefs.filter(d => d.moduleCode === moduleCode) : allDefs;
    res.json({ initiatives: defs, count: defs.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/initiatives/modules', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  res.json({ modules: getModulesCovered() });
});

router.get('/initiatives/autonomy-levels', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  res.json({ levels: getAutonomyLabels() });
});

router.post('/initiatives/seed', authenticate, validate({ body: createSeedBody }), async (_req: Request, res: Response) => {
  try {
    const count = await seedInitiativeDefinitions();
    res.json({ seeded: count });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/milestones/definitions', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const moduleCode = req.query.module as string | undefined;
    const defs = await getMilestoneDefinitions(moduleCode as MilestoneLayer | undefined);
    res.json({ milestones: defs, count: defs.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/milestones/instances', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const _moduleCode = req.query.module as string | undefined;
    const layer = parseMilestoneLayer(req.query.layer);
    const instances = await getMilestoneInstances(tenantId, layer);
    res.json({ instances, count: instances.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/milestones/rollup/module', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const rollup = await getRollupByModule(tenantId);
    res.json({ rollup });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/milestones/rollup/layer', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const rollup = await getRollupByLayer(tenantId);
    res.json({ rollup });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.post('/milestones/seed', authenticate, validate({ body: createSeedBody }), async (_req: Request, res: Response) => {
  try {
    const count = await seedMilestoneDefinitions();
    res.json({ seeded: count });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/expert-packs', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  try {
    const packs = await getAllExpertPacks();
    res.json({ packs, count: packs.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/expert-packs/:moduleCode', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const pack = await getExpertPack(req.params.moduleCode);
    if (!pack) return res.status(404).json({ error: 'not_found' });
    res.json(pack);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.post('/expert-packs/seed', authenticate, validate({ body: createSeedBody }), async (_req: Request, res: Response) => {
  try {
    const count = await seedExpertPacks();
    res.json({ seeded: count });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/outcome-links', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const category = parseLinkCategory(req.query.category);
    const links = await getOutcomeLinks(tenantId, category);
    res.json({ links, count: links.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/outcome-links/impact/:sourceType/:sourceId', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const chain = await getImpactChain(tenantId, req.params.sourceId);
    res.json(chain);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/outcome-links/module-score/:moduleCode', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const score = await getModuleOutcomeScore(tenantId, req.params.moduleCode);
    res.json(score);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.post('/orchestrator/run', authenticate, validate({ body: createRunBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { moduleCode: _moduleCode, triggerEvent: _triggerEvent } = req.body as { moduleCode?: string; triggerEvent?: string };
    const result = await runOrchestrator(tenantId);
    res.json(result);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/orchestrator/runs', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const runs = await getRecentRuns(tenantId);
    res.json({ runs, count: runs.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/orchestrator/active', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const runs = await getActiveRuns(tenantId);
    res.json({ runs, count: runs.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.post('/digests/generate', authenticate, validate({ body: createGenerateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const body = req.body as { digestType?: unknown; periodHours?: unknown };
    const digestType = parseDigestType(body.digestType);
    const _periodHours = typeof body.periodHours === 'number' ? body.periodHours : Number(body.periodHours);
    if (!digestType) return res.status(400).json({ error: 'digestType required', valid: getDigestTypes() });
    const digest = await generateDigest(tenantId, digestType);
    res.json(digest);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/digests', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const digestType = parseDigestType(req.query.type);
    const digests = await getDigests(tenantId, digestType);
    res.json({ digests, count: digests.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/digests/latest/:digestType', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const digestType = parseDigestType(req.params.digestType);
    if (!digestType) return res.status(400).json({ error: 'invalid_digest_type', valid: getDigestTypes() });
    const digest = await getLatestDigest(tenantId, digestType);
    if (!digest) return res.status(404).json({ error: 'no_digest_found' });
    res.json(digest);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/digests/types', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  res.json({ types: getDigestTypes() });
});

router.post('/milestones/evaluate-live', authenticate, validate({ body: createEvaluateLiveBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const body = req.body as { moduleCode?: string };
    const _moduleCode = body.moduleCode;
    const results = await evaluateMilestonesFromLiveData(tenantId);

    const changed = results.filter(r => (r as Record<string, unknown>).changed);
    res.json({ results, totalEvaluated: results.length, totalChanged: changed.length });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.get('/milestones/live-modules', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  res.json({ modules: getSupportedLiveEvaluationModules() });
});

router.get('/leadership/summary', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const milestones = await getMilestoneInstances(tenantId);
    const moduleRollup = await getRollupByModule(tenantId);
    const layerRollup = await getRollupByLayer(tenantId);
    const recentRuns = await getRecentRuns(tenantId, 20);
    const activeRuns = await getActiveRuns(tenantId);
    const expertPacks = await getAllExpertPacks();
    const blocked = milestones.filter(m => m.status === 'blocked');

    const atRisk = milestones.filter(m => (m as Record<string, unknown>).health === 'at_risk');
    const completed = milestones.filter(m => m.status === 'completed');
    res.json({
      milestones: { total: milestones.length, blocked: blocked.length, atRisk: atRisk.length, completed: completed.length, instances: milestones },
      moduleRollup, layerRollup,
      initiatives: { recentRuns: recentRuns.length, activeRuns: activeRuns.length, latestRuns: recentRuns.slice(0, 10) },
      expertPacks: expertPacks.length,
      blockedMilestones: blocked, atRiskMilestones: atRisk,
    });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;

