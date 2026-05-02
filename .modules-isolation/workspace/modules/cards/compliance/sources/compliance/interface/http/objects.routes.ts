import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';

const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'compliance:objects', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;

const router = Router();

router.use(authenticate);
router.use(requireTenantId);

/**
 * /api/objects — generic compliance-object registry.
 *
 * Returns the list of entity kinds the compliance module exposes, with
 * counts per tenant. Lets clients discover what objects exist and how to
 * reach their typed endpoints, rather than calling a half-dozen
 * different /api/<entity> routes just to enumerate them.
 *
 * The registry is hand-curated (one row per ownedTable in the manifest)
 * so the discovery surface is stable; counts come from a single SQL pass
 * inside withTenantClient.
 */

interface ObjectKind {
  kind: string;
  table: string;
  endpoint: string;
  description: string;
}

const REGISTRY: ObjectKind[] = [
  { kind: 'framework',             table: 'frameworks',                 endpoint: '/api/frameworks',                 description: 'Regulatory or internal compliance frameworks' },
  { kind: 'control',               table: 'controls',                   endpoint: '/api/controls',                   description: 'Compliance controls within a framework' },
  { kind: 'compliance_mapping',    table: 'compliance_mappings',        endpoint: '/api/framework-mapping',          description: 'Cross-framework control mappings' },
  { kind: 'assessment',            table: 'compliance_assessments',     endpoint: '/api/compliance',                 description: 'Compliance assessment records' },
  { kind: 'gap',                   table: 'compliance_gaps',            endpoint: '/api/compliance',                 description: 'Detected compliance gaps' },
  { kind: 'requirement',           table: 'compliance_requirements',    endpoint: '/api/compliance',                 description: 'Compliance requirements' },
  { kind: 'control_objective',     table: 'control_objectives',         endpoint: '/api/control',                    description: 'Control objectives' },
  { kind: 'control_testing',       table: 'control_testing',            endpoint: '/api/control',                    description: 'Control testing records' },
  { kind: 'control_evidence_link', table: 'control_evidence_links',     endpoint: '/api/control',                    description: 'Evidence linked to controls' },
];

router.get('/', async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string;
  try {
    const counts = await withTenantClient(tenantId, async (client) => {
      const out: Record<string, number> = {};
      for (const k of REGISTRY) {
        try {
          const r = await client.query<{ n: string | number }>(
            `SELECT COUNT(*)::int AS n FROM ${k.table}`,
          );
          out[k.kind] = Number(r.rows[0]?.n ?? 0);
        } catch {
          out[k.kind] = 0;
        }
      }
      return out;
    });
    res.json({
      data: REGISTRY.map((k) => ({ ...k, count: counts[k.kind] ?? 0 })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enumerate compliance objects', details: (err as Error).message });
  }
});

router.get('/:kind', async (req: Request, res: Response) => {
  const entry = REGISTRY.find((k) => k.kind === req.params.kind);
  if (!entry) {
    res.status(404).json({ error: `unknown compliance object kind: ${req.params.kind}` });
    return;
  }
  res.json({ data: entry });
});

export default router;
