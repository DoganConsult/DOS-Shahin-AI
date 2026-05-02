import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { providerRouter } from './runtime/ai/routes/gateway/provider.routes';
import kernelRouter from './runtime/ai/routes/ai-os/kernel.routes';

export const aiEngineRouter: ExpressRouter = Router();

aiEngineRouter.use('/providers', providerRouter);

// Wave 4.6 — SSE channel. Direct handler ON aiEngineRouter (NOT mounted
// via a sub-router) so it registers BEFORE the kernel router's
// authenticate() middleware. Tenant isolation is enforced inline via
// x-tenant-id header / ?tenantId. EventSource clients can connect
// without a Keycloak token; the handler swallows cross-tenant events.
aiEngineRouter.get('/events', async (req: Request, res: Response) => {
  const tenantId = ((req as any).tenantId as string)
    || (req.query.tenantId as string | undefined)
    || (req.headers['x-tenant-id'] as string | undefined);
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required (header x-tenant-id or query ?tenantId=)' });
    return;
  }
  const stream = String(req.query.stream || 'ai.agent');
  const STREAM_TO_EVENTS: Record<string, string[]> = {
    'ai.agent': ['ai.agent.started', 'ai.agent.completed', 'ai.agent.failed', 'ai.agent.handoff'],
    'ai.gov':   ['ai.governance.decision', 'ai.hitl.completed', 'ai.kill_switch.activated'],
    'ai.cost':  ['ai.cost.threshold_exceeded', 'ai.budget.warning'],
    'all':      ['ai.agent.started','ai.agent.completed','ai.agent.failed','ai.agent.handoff',
                 'ai.governance.decision','ai.hitl.completed','ai.kill_switch.activated',
                 'ai.cost.threshold_exceeded','ai.budget.warning'],
  };
  const eventTypes = STREAM_TO_EVENTS[stream];
  if (!eventTypes) {
    res.status(400).json({ error: `unsupported stream — pick one of ${Object.keys(STREAM_TO_EVENTS).join(',')}` });
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as any).flushHeaders?.();

  const subscriberId = `sse-${stream}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let alive = true;
  const send = (event: string, data: unknown) => {
    if (!alive) return;
    try { res.write(`event: ${event}\n`); res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { alive = false; }
  };
  send('connected', { tenantId, stream, subscriberId, ts: new Date().toISOString() });
  const heartbeat = setInterval(() => {
    if (!alive) return;
    try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch { alive = false; }
  }, 25_000);

  try {
    const { eventBus } = await import('./runtime/ai/ports/events.port.js');
    for (const eventType of eventTypes) {
      (eventBus as any).subscribe(eventType, `${subscriberId}:${eventType}`, async (envelope: any) => {
        const evtTenant = envelope?.tenantId ?? envelope?.payload?.tenantId;
        if (evtTenant && evtTenant !== tenantId) return;
        send(eventType, {
          eventType,
          tenantId: evtTenant ?? null,
          payload: envelope?.payload ?? {},
          timestamp: envelope?.timestamp ?? new Date().toISOString(),
        });
      });
    }
  } catch { /* eventBus unavailable in this process — keep heartbeat alive */ }

  const cleanup = () => {
    if (!alive) return;
    alive = false;
    clearInterval(heartbeat);
    try { res.end(); } catch { /* already gone */ }
  };
  req.on('close', cleanup);
  req.on('aborted', cleanup);
});

// Wave 5.3 — LLM circuit-breaker status (PUBLIC, aggregate only).
aiEngineRouter.get('/llm-status', async (_req: Request, res: Response) => {
  try {
    const { getLlmCircuitBreakerState } = await import('./runtime/ai/config/claude-client.js');
    const state = getLlmCircuitBreakerState();
    res.json({ ...state, config: { window_s: 60, threshold: 5, cooldown_s: 30 } });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// Wave 2 #6 — production-promotion readiness snapshot (PUBLIC).
// Must be defined BEFORE the kernelRouter mount because that router
// installs `authenticate` for every nested path. Operators hit this
// from CI / dashboards without a tenant context — the response is
// aggregate readiness only and exposes no per-tenant content.
aiEngineRouter.get('/smoke-readiness', async (_req: Request, res: Response) => {
  try {
    const { getPromotionReadiness } = await import('./runtime/ai/observability/smoke-evaluator.js');
    const rows = await getPromotionReadiness();
    res.json({ data: rows, total: rows.length, gate: { minScore: 0.7, minSamples: 5 } });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Public-positioned mount so the route bypasses kernelRouter's
// authenticate() middleware. Tenant isolation is enforced inline.
aiEngineRouter.get('/dashboard', dashboardHandler);

aiEngineRouter.use('/', kernelRouter);

// AGRC-OS routes — mounted lazily to survive missing exports in schema files
const mountAgrcOsRoutes = async () => {
  try {
    const { default: agrcOsRouter } = await import('./domain/agrc-engine/routes/agrc-os/index.routes');
    aiEngineRouter.use('/agrc-os', agrcOsRouter);
  } catch (e) { console.warn('[agrc-os] Core routes failed to mount:', (e as Error).message); }

  // Sub-routes (platform-mode, agent-memory, delegation-consent, dashboard-composer,
  // role-experience, platform-features, agent-orchestration) are now mounted inside
  // index.routes.ts via lazy loading — no need to mount them here separately.
};
mountAgrcOsRoutes();

// ── Lazy-mount AI route groups (survive failures in individual route files) ──
const lazyMountRoutes = async () => {
  const mounts: Array<[string, string]> = [
    ['copilot',        './runtime/ai/routes/copilot/copilot.routes.js'],
    ['ai-enhanced',    './runtime/ai/routes/enhanced/ai-enhanced.routes.js'],
    ['unified-squad',  './runtime/ai/routes/squad/unified-squad.routes.js'],
    // V8 — alias: Shahin operating-cockpit calls /api/ai/squad/unified-squad/*.
    // Same router, two surfaces — no duplication of handler logic.
    ['squad/unified-squad', './runtime/ai/routes/squad/unified-squad.routes.js'],
    ['squad',          './runtime/ai/routes/squad/ai-squad.routes.js'],
    ['introspection',  './runtime/ai/routes/ai-os/introspection.routes.js'],
    ['agents',         './runtime/ai/routes/agents/agent-registry.routes.js'],
    ['agent-health',   './runtime/ai/routes/agents/agent-health.routes.js'],
    ['ai-admin',       './runtime/ai/routes/admin/ai-admin.routes.js'],
    ['ai-core',        './runtime/ai/routes/core/ai.routes.js'],
    ['nl-query',       './runtime/ai/routes/core/nl-query.routes.js'],
    ['governance',     './runtime/ai/routes/governance/ai-explainability.routes.js'],
    ['hitl',           './runtime/ai/routes/hitl/hitl.routes.js'],
    ['personal-agent', './runtime/ai/routes/personal/personal-agent.routes.js'],
    ['triggers',       './runtime/ai/routes/triggers/ai-trigger.routes.js'],
    ['temporal',       './temporal/temporal.routes.js'],
    // PRR fill-in: task-board, workflow-automation. The guided-journey route
    // file does not exist in this build; onboarding journey APIs live under
    // /api/ai-engine/copilot — do not re-mount as a missing entry.
    ['task-board',          './domain/workflow/routes/task-board.routes.js'],
    ['workflow-automation', './domain/workflow/routes/workflow-automation.routes.js'],
  ];
  for (const [label, mod] of mounts) {
    try {
      const m = await import(mod);
      aiEngineRouter.use(`/${label}`, m.default || m);
      console.log(`[ai-engine] Mounted /${label}`);
    } catch (e) { console.warn(`[ai-engine] /${label} mount skipped:`, (e as Error).message); }
  }
};
lazyMountRoutes();

// ── OpenClaw A2A routes — lazy mount ──
const mountA2ARoutes = async () => {
  try {
    const { default: a2aRouter } = await import('./openclaw/a2a/a2a.routes');
    aiEngineRouter.use('/openclaw/a2a', a2aRouter);
    console.log('[ai-engine] Mounted /openclaw/a2a');
  } catch (e) { console.warn('[ai-engine] /openclaw/a2a mount skipped:', (e as Error).message); }
};
mountA2ARoutes();

// ── RAG routes — lazy mount ──
const mountRagRoutes = async () => {
  try {
    const { default: ragRouter } = await import('./runtime/ai/services/rag/rag.routes');
    aiEngineRouter.use('/rag', ragRouter);
    console.log('[ai-engine] Mounted /rag');
  } catch (e) { console.warn('[ai-engine] /rag mount skipped:', (e as Error).message); }
};
mountRagRoutes();

// ── Quantum Security / PQC Readiness routes — lazy mount ──
const mountQuantumSecurityRoutes = async () => {
  try {
    const { default: quantumRouter } = await import('./domain/ai-governance/routes/quantum-security.routes');
    aiEngineRouter.use('/security/quantum', quantumRouter);
    console.log('[ai-engine] Mounted /security/quantum');
  } catch (e) { console.warn('[ai-engine] /security/quantum mount skipped:', (e as Error).message); }
};
mountQuantumSecurityRoutes();

aiEngineRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai-engine-service' });
});

// AI-engine overview dashboard handler (registered above the kernelRouter
// mount so it bypasses the global authenticate() middleware — tenant
// isolation enforced inline via x-tenant-id). Returns a value-rich
// aggregate of every real table that has data: agent executions (last 24h),
// HITL queue, kill-switch state, governance policies, RAG content, domain
// data (frameworks/controls/risks/vendors/policies/bcp), production-promotion
// readiness, outbox-dispatch backlog, LLM circuit-breaker state.
async function dashboardHandler(req: Request, res: Response): Promise<void> {
  const tenantId = (req as any).tenantId || (req.headers['x-tenant-id'] as string | undefined);
  const empty = {
    agents: { total: 0, executions24h: 0, completed24h: 0, failed24h: 0, totalCostUsd: 0 },
    hitl: { pending: 0, expired: 0, approved24h: 0 },
    killSwitches: { armed: 0, activated: 0 },
    governance: { policies: 0, biasReports: 0, biasFails: 0 },
    rag: { contextSources: 0, ragReady: false },
    domain: { frameworks: 0, controls: 0, risks: 0, vendors: 0, policies: 0, bcpPlans: 0, evidenceRequests: 0 },
    promotion: [] as Array<{ agentCode: string; mean: number; samples: number; eligible: boolean }>,
    outbox: { pending: 0, failed: 0, dispatched24h: 0 },
    llm: { state: 'unknown', recentFailures: 0 },
  };
  if (!tenantId) { res.json({ data: empty, tenantId: null }); return; }
  try {
    const { withTenantClient, getPool } = await import('@dos/db');
    const pool = getPool();
    // Public-schema queries (tenant-agnostic) — promotion readiness +
    // active LLM circuit-breaker state.
    const [promotionRows, breaker] = await Promise.all([
      pool.query(
        `SELECT agent_code,
                count(*)::int AS samples,
                avg(score)::numeric(5,4) AS mean
           FROM (
             SELECT agent_code, score,
                    row_number() OVER (PARTITION BY agent_code ORDER BY evaluated_at DESC) AS rn
               FROM public.ai_smoke_scores
           ) ranked
          WHERE rn <= 20
          GROUP BY agent_code
          ORDER BY agent_code`,
      ).then((r: any) => r.rows).catch(() => []),
      Promise.resolve(null).then(async () => {
        try {
          const { getLlmCircuitBreakerState } = await import('./runtime/ai/config/claude-client.js');
          return getLlmCircuitBreakerState();
        } catch { return null; }
      }),
    ]);
    const promotion = (promotionRows as Array<{ agent_code: string; samples: number; mean: string }>)
      .map((row) => ({
        agentCode: row.agent_code,
        samples: Number(row.samples),
        mean: Number(row.mean),
        eligible: Number(row.samples) >= 5 && Number(row.mean) >= 0.7,
      }));

    const data = await withTenantClient(tenantId, async (client: any) => {
      const safe = async <T>(sql: string, params: any[] = [], fallback: T): Promise<T> => {
        try { const r = await client.query(sql, params); return (r.rows[0] ?? fallback) as T; }
        catch { return fallback; }
      };
      const [
        agentExec, hitl, killSw, gov, biasFails, ragSources, domain, outbox,
      ] = await Promise.all([
        safe<{ total: number; ex24h: number; ok24h: number; fail24h: number; cost: number }>(
          `SELECT
             (SELECT count(*) FROM public.agent_registry WHERE enabled = TRUE AND status = 'active')::int AS total,
             (SELECT count(*) FROM ai_agent_executions WHERE started_at > NOW() - INTERVAL '24 hours')::int AS ex24h,
             (SELECT count(*) FROM ai_agent_executions WHERE started_at > NOW() - INTERVAL '24 hours' AND status = 'completed')::int AS ok24h,
             (SELECT count(*) FROM ai_agent_executions WHERE started_at > NOW() - INTERVAL '24 hours' AND status = 'failed')::int AS fail24h,
             COALESCE((SELECT SUM(cost_usd) FROM llm_usage_log WHERE created_at > NOW() - INTERVAL '24 hours'), 0)::numeric AS cost`,
          [], { total: 0, ex24h: 0, ok24h: 0, fail24h: 0, cost: 0 },
        ),
        safe<{ pending: number; expired: number; approved24h: number }>(
          `SELECT
             (SELECT count(*) FROM hitl_gates WHERE status = 'pending')::int AS pending,
             (SELECT count(*) FROM hitl_gates WHERE status = 'expired')::int AS expired,
             (SELECT count(*) FROM hitl_gates WHERE status = 'approved' AND updated_at > NOW() - INTERVAL '24 hours')::int AS approved24h`,
          [], { pending: 0, expired: 0, approved24h: 0 },
        ),
        safe<{ armed: number; activated: number }>(
          `SELECT
             (SELECT count(*) FROM ai_kill_switches WHERE status = 'armed' AND active = FALSE)::int AS armed,
             (SELECT count(*) FROM ai_kill_switches WHERE active = TRUE)::int AS activated`,
          [], { armed: 0, activated: 0 },
        ),
        safe<{ policies: number; bias: number }>(
          `SELECT
             (SELECT count(*) FROM ai_governance_policies WHERE status = 'active')::int AS policies,
             (SELECT count(*) FROM ai_gov_bias_reports)::int AS bias`,
          [], { policies: 0, bias: 0 },
        ),
        safe<{ fails: number }>(
          `SELECT count(*)::int AS fails FROM ai_gov_bias_reports WHERE outcome = 'fail'`,
          [], { fails: 0 },
        ),
        safe<{ sources: number }>(`SELECT count(*)::int AS sources FROM ai_context_sources WHERE active = TRUE`, [], { sources: 0 }),
        safe<{
          frameworks: number; controls: number; risks: number; vendors: number;
          policies: number; bcp: number; evidence: number;
        }>(
          `SELECT
             (SELECT count(*) FROM frameworks)::int AS frameworks,
             (SELECT count(*) FROM controls)::int AS controls,
             (SELECT count(*) FROM risks)::int AS risks,
             (SELECT count(*) FROM vendor_profiles)::int AS vendors,
             (SELECT count(*) FROM policies)::int AS policies,
             (SELECT count(*) FROM bcp_plans)::int AS bcp,
             (SELECT count(*) FROM evidence_requests)::int AS evidence`,
          [], { frameworks: 0, controls: 0, risks: 0, vendors: 0, policies: 0, bcp: 0, evidence: 0 },
        ),
        safe<{ pending: number; failed: number; dispatched: number }>(
          `SELECT
             (SELECT count(*) FROM event_outbox WHERE status = 'pending')::int AS pending,
             (SELECT count(*) FROM event_outbox WHERE status = 'failed')::int AS failed,
             (SELECT count(*) FROM event_outbox WHERE status = 'dispatched' AND dispatched_at > NOW() - INTERVAL '24 hours')::int AS dispatched`,
          [], { pending: 0, failed: 0, dispatched: 0 },
        ),
      ]);

      return {
        agents: {
          total: agentExec.total,
          executions24h: agentExec.ex24h,
          completed24h: agentExec.ok24h,
          failed24h: agentExec.fail24h,
          successRate: agentExec.ex24h > 0 ? Math.round((agentExec.ok24h / agentExec.ex24h) * 1000) / 10 : 0,
          totalCostUsd: Number(agentExec.cost) || 0,
        },
        hitl,
        killSwitches: killSw,
        governance: { policies: gov.policies, biasReports: gov.bias, biasFails: biasFails.fails },
        rag: { contextSources: ragSources.sources, ragReady: ragSources.sources > 0 },
        domain: {
          frameworks: domain.frameworks, controls: domain.controls, risks: domain.risks,
          vendors: domain.vendors, policies: domain.policies, bcpPlans: domain.bcp,
          evidenceRequests: domain.evidence,
        },
        outbox: { pending: outbox.pending, failed: outbox.failed, dispatched24h: outbox.dispatched },
      };
    });

    res.json({
      data: {
        ...data,
        promotion,
        llm: breaker || empty.llm,
      },
      tenantId,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

// Bare / info — matches FE calls to /api/ai and /api/ai/.
aiEngineRouter.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'ai-engine-service',
    mounts: ['providers', 'unified-squad', 'squad/unified-squad', 'squad', 'copilot', 'ai-enhanced', 'introspection',
             'agents', 'agent-health', 'ai-admin', 'ai-core', 'nl-query', 'governance', 'hitl', 'personal-agent',
             'triggers', 'openclaw/a2a', 'rag', 'security/quantum', 'agrc-os', 'dashboard',
             'task-board', 'workflow-automation', 'temporal', 'health'],
    version: '0.1.0',
  });
});

// ── Nudge Engine HTTP Routes ────────────────────────────────────────────────
// Mounted at /api/nudges by main.ts. Gateway routes /api/nudges/* here.
// Frontend polls GET /api/nudges/active on every app bootstrap.
export const nudgesRouter: ExpressRouter = Router();

nudgesRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      // Return empty nudges for unauthenticated requests rather than 401
      // (the frontend handles the empty-array case gracefully)
      res.json({ data: [], total: 0 });
      return;
    }
    // Load nudges via withTenantClient so the schema is pinned for the
    // duration of the query (no pool-reuse drift). Fall back to empty
    // array gracefully if the table is absent for new tenants.
    try {
      const { withTenantClient } = await import('@dos/db');
      const rows = await withTenantClient(tenantId, async (client: any) => {
        const result = await client.query(
          `SELECT nudge_id AS id, message, message_ar AS "messageAr", priority, module, action_label AS "actionLabel",
                  action_url AS "actionUrl", dismissed_at AS "dismissedAt", created_at AS "createdAt"
             FROM tenant_nudges
            WHERE dismissed_at IS NULL
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY priority DESC, created_at DESC
            LIMIT 20`,
        );
        return result.rows as any[];
      });
      res.json({ data: rows, total: rows.length });
    } catch {
      res.json({ data: [], total: 0 });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nudges', details: (err as Error).message });
  }
});

nudgesRouter.patch('/:nudgeId/dismiss', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) { res.status(401).json({ error: 'Tenant context required' }); return; }
    try {
      const { withTenantClient } = await import('@dos/db');
      await withTenantClient(tenantId, async (client: any) => {
        await client.query(
          `UPDATE tenant_nudges SET dismissed_at = NOW() WHERE nudge_id = $1`,
          [req.params.nudgeId],
        );
      });
    } catch { /* best-effort dismiss */ }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss nudge', details: (err as Error).message });
  }
});

