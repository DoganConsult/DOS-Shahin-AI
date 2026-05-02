import { Router, Request, Response } from 'express';
import { AGRC_AGENTS, SHAHIN_PRODUCT_CODE, SHAHIN_PRODUCT_MANIFEST } from '@shahin-ai/product';
import { logger } from '@dos/platform-core/observability';

const AI_ENGINE_URL = process.env.AI_ENGINE_SERVICE_URL || 'http://127.0.0.1:4008';

/**
 * Proxy POST request to AI Engine ai-core endpoints (existing helper).
 */
async function proxyToAiEngine(path: string, req: Request, res: Response): Promise<void> {
  try {
    const targetUrl = `${AI_ENGINE_URL}/api/ai-engine/ai-core${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward auth and tenant headers
    if (req.headers.authorization) headers['authorization'] = req.headers.authorization;
    if (req.headers['x-tenant-id']) headers['x-tenant-id'] = req.headers['x-tenant-id'] as string;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    logger.error('[AiGateway] Proxy to AI Engine failed', { path, error: err?.message });
    res.status(502).json({ error: 'AI Engine unreachable', details: err?.message });
  }
}

/**
 * Forward arbitrary GET request under /api/ai/squad/* to ai-engine's
 * /api/ai-engine/squad/* — the engine owns the unified-squad implementation
 * (dashboard, agents/monitoring, workflow-timeline, etc).
 */
async function forwardSquadGet(req: Request, res: Response): Promise<void> {
  const subpath = req.originalUrl.replace(/^\/api\/ai/, '');
  const targetUrl = `${AI_ENGINE_URL}/api/ai-engine${subpath}`;
  try {
    const headers: Record<string, string> = {};
    if (req.headers.authorization) headers['authorization'] = req.headers.authorization;
    if (req.headers['x-tenant-id']) headers['x-tenant-id'] = req.headers['x-tenant-id'] as string;
    if (req.headers.cookie) headers['cookie'] = req.headers.cookie as string;

    const response = await fetch(targetUrl, { method: 'GET', headers });
    const text = await response.text();
    res.status(response.status);
    const ct = response.headers.get('content-type');
    if (ct) res.type(ct);
    res.send(text);
  } catch (err: any) {
    logger.error('[AiGateway] Squad forward failed', { subpath, error: err?.message });
    res.status(502).json({ error: 'AI Engine unreachable', details: err?.message });
  }
}

type AgentSummary = {
  id: string;
  name: string;
  nameAr: string;
  domain: string;
  domainAr: string;
  moduleCode: string;
  delegationScope: string;
  routePatterns: string[];
  approvalBoundary: 'low' | 'medium' | 'high';
  maxActionsPerCycle: number;
  escalationPolicy: {
    escalateTo: string;
    afterMinutes: number;
  };
};

const AI_MODULES = ['ai', 'ai-governance', 'agrc-engine', 'governance-ai', 'mcp', 'knowledge', 'local-knowledge'];

function toAgentSummary(agent: (typeof AGRC_AGENTS)[number]): AgentSummary {
  return {
    id: agent.id,
    name: agent.name,
    nameAr: agent.nameAr,
    domain: agent.domain,
    domainAr: agent.domainAr,
    moduleCode: agent.moduleCode,
    delegationScope: agent.delegationScope,
    routePatterns: agent.routePatterns,
    approvalBoundary: agent.governance.approvalBoundary as 'low' | 'medium' | 'high',
    maxActionsPerCycle: agent.governance.maxActionsPerCycle as number,
    escalationPolicy: agent.governance.escalationPolicy as { escalateTo: string; afterMinutes: number },
  };
}

const agentSummaries = AGRC_AGENTS.map(toAgentSummary);

export const infoRoutes: Router = Router();
export const aiRoutes: Router = Router();
export const agentRoutes: Router = Router();
export const agentRegistryRoutes: Router = Router();

infoRoutes.get('/info', (req, res) => {
  res.json({
    service: 'ai-gateway-service',
    version: '0.1.0',
    scope: req.baseUrl,
    productCode: SHAHIN_PRODUCT_CODE,
    modules: AI_MODULES,
    agentCount: AGRC_AGENTS.length,
  });
});

aiRoutes.get('/info', (_req, res) => {
  res.json({
    service: 'ai-gateway-service',
    version: '0.1.0',
    productCode: SHAHIN_PRODUCT_CODE,
    modules: AI_MODULES,
    agentCount: AGRC_AGENTS.length,
  });
});

aiRoutes.post('/suggestions/list', (req, res) => proxyToAiEngine('/suggestions/list', req, res));
aiRoutes.post('/suggestions/filters', (req, res) => proxyToAiEngine('/suggestions/filters', req, res));
aiRoutes.post('/query/interpret', (req, res) => proxyToAiEngine('/query/interpret', req, res));
aiRoutes.post('/classify', (req, res) => proxyToAiEngine('/classify', req, res));
aiRoutes.post('/predict', (req, res) => proxyToAiEngine('/predict', req, res));
aiRoutes.post('/analytics/empty-state', (req, res) => proxyToAiEngine('/analytics/empty-state', req, res));
aiRoutes.post('/analytics/anomalies', (req, res) => proxyToAiEngine('/analytics/anomalies', req, res));
aiRoutes.post('/voice/command', (req, res) => proxyToAiEngine('/voice/command', req, res));
aiRoutes.post('/compose/description', (req, res) => proxyToAiEngine('/compose/description', req, res));
aiRoutes.post('/compose/improve', (req, res) => proxyToAiEngine('/compose/improve', req, res));

aiRoutes.get('/health', async (_req, res) => {
  try {
    const response = await fetch(`${AI_ENGINE_URL}/api/ai-engine/health`);
    const data = await response.json();
    res.json({ status: 'healthy', engine: data });
  } catch {
    res.json({ status: 'healthy', engine: { status: 'unreachable' } });
  }
});

aiRoutes.get('/agents', (_req, res) => {
  res.json({
    productCode: SHAHIN_PRODUCT_CODE,
    total: AGRC_AGENTS.length,
    agents: agentSummaries,
  });
});

// Frontend ai-api.service.ts contract:
//   GET /api/ai           → { data: AiRecord[], count }
//   GET /api/ai/:id       → AiRecord
// Records are synthesised from the static AGRC_AGENTS catalogue.
aiRoutes.get('/', (_req, res) => {
  const now = new Date().toISOString();
  const records = AGRC_AGENTS.map((agent) => ({
    id: agent.id,
    tenant_id: 'platform',
    status: 'active',
    created_at: now,
    updated_at: now,
    name: agent.name,
    domain: agent.domain,
    moduleCode: agent.moduleCode,
  }));
  res.json({ data: records, count: records.length });
});

aiRoutes.get('/:agentId', (req, res, next) => {
  // Skip if the path is one of the namespaced sub-routers (squad, registry, etc).
  const id = req.params.agentId;
  if (id === 'squad' || id === 'registry' || id === 'agents' || id === 'health' || id === 'info') {
    next();
    return;
  }
  const agent = AGRC_AGENTS.find((candidate) => candidate.id.toLowerCase() === id.toLowerCase());
  if (!agent) {
    res.status(404).json({ error: 'Agent not found', code: 'AGENT_NOT_FOUND', agentId: id });
    return;
  }
  const now = new Date().toISOString();
  res.json({
    id: agent.id,
    tenant_id: 'platform',
    status: 'active',
    created_at: now,
    updated_at: now,
    name: agent.name,
    domain: agent.domain,
    moduleCode: agent.moduleCode,
    routePatterns: agent.routePatterns,
  });
});

// Forward unified-squad reads (dashboard, agents/monitoring, workflow-timeline, etc)
// to ai-engine. Frontend calls /api/ai/squad/unified-squad/* on this service.
aiRoutes.get('/squad/unified-squad/dashboard', forwardSquadGet);
aiRoutes.get('/squad/unified-squad/agents/monitoring', forwardSquadGet);
aiRoutes.get('/squad/unified-squad/workflow-timeline', forwardSquadGet);
aiRoutes.get('/squad/unified-squad/participants', forwardSquadGet);
aiRoutes.get('/squad/unified-squad/interventions', forwardSquadGet);
aiRoutes.get('/squad/unified-squad/capability-matrix', forwardSquadGet);
aiRoutes.get('/squad/unified-squad/agents', forwardSquadGet);

agentRoutes.get('/', (_req, res) => {
  res.json({
    productCode: SHAHIN_PRODUCT_CODE,
    total: AGRC_AGENTS.length,
    agents: agentSummaries,
  });
});

agentRoutes.get('/:agentId', (req, res) => {
  const agent = AGRC_AGENTS.find((candidate) => candidate.id.toLowerCase() === req.params.agentId.toLowerCase());

  if (!agent) {
    res.status(404).json({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
      agentId: req.params.agentId,
    });
    return;
  }

  res.json({
    productCode: SHAHIN_PRODUCT_CODE,
    agent,
  });
});

agentRegistryRoutes.get('/', (_req, res) => {
  const byApprovalBoundary = AGRC_AGENTS.reduce<Record<string, number>>((accumulator, agent) => {
    const key = String(agent.governance.approvalBoundary);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  res.json({
    product: {
      productCode: SHAHIN_PRODUCT_MANIFEST.productCode,
      displayName: SHAHIN_PRODUCT_MANIFEST.displayName,
      moduleCodes: SHAHIN_PRODUCT_MANIFEST.moduleCodes,
    },
    registry: {
      totalAgents: AGRC_AGENTS.length,
      byApprovalBoundary,
      agentIds: AGRC_AGENTS.map((agent) => agent.id),
    },
  });
});
