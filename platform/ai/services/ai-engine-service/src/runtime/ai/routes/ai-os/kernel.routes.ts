import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { moduleStack, mutationEventHook, auditMiddleware, validate } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import { kernelProcessIdParams, kernelAgentIdParams, kernelAutonomyBody } from '../../schemas/ai.schemas';

const router: Router = Router();

router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));
router.use(authenticate); // Ensure basic authentication

// GET /api/ai-os/kernel/status — Fetch high-level OS specs
router.get('/kernel/status', requirePermission('ai.kernel.admin'), async (req: Request, res: Response) => {
  try {
    // @ts-ignore -- justified: req.user typed by auth middleware at runtime
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // @ts-ignore -- justified: dynamic tenant-service import resolved at runtime
    const { getKernelStatus } = await import('../../../../../tenant-service/src/domain/ai-os/ai-os-kernel.service.ts');
    const status = await getKernelStatus(tenantId);
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch Kernel status', detail: toErrorMessage(err) });
  }
});

// GET /api/ai-os/kernel/processes — Fetch real-time active PID processes (HTOP style)
router.get('/kernel/processes', requirePermission('ai.kernel.admin'), async (req: Request, res: Response) => {
  try {
    // @ts-ignore -- justified: req.user typed by auth middleware at runtime
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // @ts-ignore -- justified: dynamic tenant-service import resolved at runtime
    const { getProcessTable } = await import('../../../../../tenant-service/src/domain/ai-os/ai-os-kernel.service.ts');
    const processes = await getProcessTable(tenantId);
    res.json(processes);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch Process Table', detail: toErrorMessage(err) });
  }
});

// GET /api/ai-os/kernel/memory — Fetch vector partition data
router.get('/kernel/memory', requirePermission('ai.kernel.admin'), async (req: Request, res: Response) => {
  try {
    // @ts-ignore -- justified: req.user typed by auth middleware at runtime
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // @ts-ignore -- justified: dynamic tenant-service import resolved at runtime
    const { getMemoryPartitions } = await import('../../../../../tenant-service/src/domain/ai-os/ai-os-kernel.service.ts');
    const memory = await getMemoryPartitions(tenantId);
    res.json(memory);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch Memory Partitions', detail: toErrorMessage(err) });
  }
});

// POST /api/ai-os/kernel/kill/:pid — Execute a process SIGKILL
router.post('/kernel/kill/:pid', requirePermission('ai.kernel.admin'), validate({ params: kernelProcessIdParams }), async (req: Request, res: Response) => {
  try {
    // @ts-ignore -- justified: req.user typed by auth middleware at runtime
    const tenantId = req.user?.tenantId;
    const { pid } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // @ts-ignore -- justified: dynamic tenant-service import resolved at runtime
    const { killProcess } = await import('../../../../../tenant-service/src/domain/ai-os/ai-os-kernel.service.ts');
    const success = await killProcess(tenantId, pid);
    res.json({ success, message: success ? `Process ${pid} killed.` : `Process ${pid} could not be killed (already terminated or invalid).` });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Kill Process Failed', detail: toErrorMessage(err) });
  }
});

// POST /api/ai-os/kernel/reboot/:agentId — Reboot an agent safely
router.post('/kernel/reboot/:agentId', requirePermission('ai.kernel.admin'), validate({ params: kernelAgentIdParams }), async (req: Request, res: Response) => {
  try {
    // @ts-ignore -- justified: req.user typed by auth middleware at runtime
    const tenantId = req.user?.tenantId;
    const { agentId } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // @ts-ignore -- justified: dynamic tenant-service import resolved at runtime
    const { rebootAgent } = await import('../../../../../tenant-service/src/domain/ai-os/ai-os-kernel.service.ts');
    const result = await rebootAgent(tenantId, agentId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Reboot Agent Failed', detail: toErrorMessage(err) });
  }
});

// POST /api/ai-os/kernel/autonomy — Set global autonomy bounds
router.post(
  '/kernel/autonomy', 
  requirePermission('ai.kernel.admin'), 
  validate({ body: kernelAutonomyBody }), 
  async (req: Request, res: Response) => {
  try {
    // @ts-ignore -- justified: req.user typed by auth middleware at runtime
    const tenantId = req.user?.tenantId;
    const { level } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // @ts-ignore -- justified: dynamic tenant-service import resolved at runtime
    const { setGlobalAutonomyLevel } = await import('../../../../../tenant-service/src/domain/ai-os/ai-os-kernel.service.ts');
    const result = await setGlobalAutonomyLevel(tenantId, level);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Autonomy Adjustment Failed', detail: toErrorMessage(err) });
  }
});

export default router;
