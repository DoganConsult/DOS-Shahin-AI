import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { z as _z } from 'zod';
import crypto from 'crypto';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, asyncHandler as _asyncHandler, rateLimiter, auditMiddleware, setAuditData, automationMiddleware } from '../../ports/middleware.port';
import {
  handleQuery,
  getSessionHistory,
  getAgentPerformance,
  buildSuggestions,
  handlePublicQuery,
  getCanonicalPublicAgentsForLanding,
  exportCopilotAudit,
} from '../../ports/platform.port';
import { executeDelegatedAction } from '../../services/delegation/agent-delegation.service';
import {
  approveAction,
  rejectAction,
  cancelAutoExecute,
  getPendingCount,
} from '../../services/workflow/proposed-action.service';
import { emitModuleEvent } from '../../services/emit-event';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

import { createChatBody, createExecuteActionBody, updateApproveBody, updateRejectBody, updateCancelAutoBody, createPublicChatBody, intentToQueryBody } from '../../schemas/ai.schemas';
import { parseIntentToQuery } from '../../services/copilot/intent-to-query.service';
import { traceSurfaceCall } from '../../../../domain/agrc-engine/observability/langfuse-bridge';
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('governance'));
router.use(automationMiddleware('governance'));

// POST /api/copilot/chat — Send a query to the AI copilot (context-aware)
router.post('/chat', authenticate, requirePermission('ai.copilot.write'), validate({ body: createChatBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { sessionId, query: userQuery, pageContext, activeAgentId } = req.body;

    if (!userQuery || typeof userQuery !== 'string') {
      res.status(400).json({ error: 'query is required and must be a string' });
      return;
    }

    const activeSessionId = sessionId || crypto.randomUUID();
    const result = await traceSurfaceCall(
      {
        surface: 'copilot-authed',
        name: `copilot.chat.${activeAgentId || 'general'}`,
        tenantId,
        userId,
        sessionId: activeSessionId,
        input: { query: userQuery.slice(0, 1024), pageContext, activeAgentId },
        metadata: { activeAgentId, hasPageContext: !!pageContext },
      },
      () => handleQuery(tenantId, userId, activeSessionId, userQuery, { pageContext, activeAgentId }),
    );
    setAuditData(res as any, { action: 'create', entityType: 'copilot', entityId: activeSessionId, afterState: result });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.user.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'copilot', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.copilot.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/copilot/intent-to-query — Parse natural language into a structured filter payload for generic lists
router.post('/intent-to-query', authenticate, requirePermission('ai.copilot.read'), validate({ body: intentToQueryBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { query: userQuery, moduleCode, language } = req.body;

    const result = await traceSurfaceCall(
      {
        surface: 'nl-intent',
        name: `nl-intent.${moduleCode}`,
        tenantId,
        userId,
        input: { query: String(userQuery || '').slice(0, 1024), moduleCode, language },
        metadata: { moduleCode, language },
      },
      () => parseIntentToQuery(tenantId, userId, moduleCode, userQuery, language),
    );

    // Explicit runtime tracking
    setAuditData(res as any, { action: 'query', entityType: 'copilot-intent', entityId: moduleCode, afterState: result });

    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/copilot/sessions/:id — Get session conversation history
router.get('/sessions/:id', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const sessionId = req.params.id as string;
    const messages = await getSessionHistory(sessionId, tenantId);
    res.json(messages);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/copilot/export — Export copilot audit (prompts, responses, context) for date range
router.get('/export', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const from = (req.query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = (req.query.to as string) || new Date().toISOString();
    const topic = req.query.topic as string | undefined;
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';
    const result = await exportCopilotAudit(tenantId, { from, to, topic, format });
    if (format === 'csv' && result.csv) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="copilot-audit-${from.slice(0, 10)}-to-${to.slice(0, 10)}.csv"`);
      res.send(result.csv);
      return;
    }
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/copilot/agent-performance — Get agent performance records
router.get('/agent-performance', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agentId as string | undefined;
    const records = await getAgentPerformance(agentId);
    res.json(records);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/copilot/suggestions — Proactive suggestions for current page agent
router.get('/suggestions', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const agentId = req.query.agentId as string | undefined;
    if (!agentId) {
      res.json({ suggestions: [] });
      return;
    }
    const result = await buildSuggestions(tenantId, agentId);
    res.json(result);
  } catch {
    // Suggestions must never break the UI
    res.json({ suggestions: [] });
  }
});

// POST /api/copilot/execute-action — Execute a proposed action via delegation

router.post('/execute-action', authenticate, requirePermission('ai.copilot.write'), validate({ body: createExecuteActionBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { action, agentId, actionId } = req.body;

    if (!action || !agentId) {
      res.status(400).json({ error: 'action and agentId are required' });
      return;
    }

    const result = await executeDelegatedAction(tenantId, userId, agentId, {
      type: action.type,
      title: action.title,
      description: action.description,
      priority: action.priority || 'medium',
      entityType: action.entityType,
      entityId: action.entityId,
      assignToRole: action.assignToRole,
      dueInDays: action.dueInDays,
    });

    setAuditData(res as any, {
      action: 'create',
      entityType: 'copilot-action',
      entityId: actionId || result.actionId,
      afterState: { agentId, actionType: action.type, approvedBy: userId, grantId: result.grantId },
    });

    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.user.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'copilot', entityId: '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.copilot.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PATCH /api/copilot/actions/:id/approve — Approve action with quality gate
router.patch('/actions/:id/approve', authenticate, requirePermission('ai.copilot.write'), validate({ body: updateApproveBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const actionId = req.params.id;
    const result = await approveAction(tenantId, actionId, userId);
    if (result.error) {
      res.status(409).json(result);
      return;
    }
    setAuditData(res as any, { action: 'update', entityType: 'copilot-action', entityId: actionId, afterState: { status: 'completed', executedBy: userId } });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.user.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'copilot', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.copilot.updated' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PATCH /api/copilot/actions/:id/reject — Reject action with reason
router.patch('/actions/:id/reject', authenticate, requirePermission('ai.copilot.write'), validate({ body: updateRejectBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const actionId = req.params.id;
    const { reason } = req.body || {};
    const result = await rejectAction(tenantId, actionId, userId, reason);
    if (!result.success) {
      res.status(409).json({ error: 'already_processed' });
      return;
    }
    setAuditData(res as any, { action: 'update', entityType: 'copilot-action', entityId: actionId, afterState: { status: 'rejected', rejectedBy: userId } });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.user.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'copilot', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.copilot.updated' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PATCH /api/copilot/actions/:id/cancel-auto — Cancel auto-execution countdown

router.patch('/actions/:id/cancel-auto', authenticate, requirePermission('ai.copilot.write'), validate({ body: updateCancelAutoBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const actionId = req.params.id;
    const result = await cancelAutoExecute(tenantId, actionId, userId);
    if (!result.success) {
      res.status(409).json({ error: 'already_processed' });
      return;
    }
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.user.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'copilot', entityId: req.params.id || '' }), { tenantId: req.user.tenantId, operation: 'grcEvent:governance.copilot.updated' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/copilot/actions/pending — Pending action count for badge
router.get('/actions/pending', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const result = await getPendingCount(tenantId, userId);
    res.json(result);
  } catch {
    res.json({ count: 0 });
  }
});

// POST /api/copilot/public-chat — Public landing page chat (no auth, rate-limited)
const publicChatLimiter = rateLimiter({ namespace: 'public-chat', maxRequests: 10, windowMs: 60_000, keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'any' });
const publicAgentsLimiter = rateLimiter({ namespace: 'public-agents', maxRequests: 120, windowMs: 60_000, keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'any' });

// GET /api/copilot/public-agents — Canonical landing-page agent list (no auth, rate-limited)
router.get('/public-agents', publicAgentsLimiter, async (_req: Request, res: Response) => {
  try {
    res.json({ agents: getCanonicalPublicAgentsForLanding(), source: 'copilot' });
  } catch {
    res.status(500).json({ error: 'public_agents_unavailable' });
  }
});

router.post('/public-chat', publicChatLimiter, validate({ body: createPublicChatBody }), async (req: Request, res: Response) => {
  try {
    // Schema (createPublicChatBody) validates `message`. Accept legacy `query`
    // alias and optional `agentId` from the public landing component.
    const userQuery: string | undefined =
      (typeof req.body?.message === 'string' ? req.body.message : undefined)
      ?? (typeof req.body?.query === 'string' ? req.body.query : undefined);
    const agentId: string | undefined =
      typeof req.body?.agentId === 'string' ? req.body.agentId : undefined;
    if (!userQuery || userQuery.length > 5000) {
      res.status(400).json({ error: 'message required (max 5000 chars)' });
      return;
    }
    const visitorIp = req.ip || req.socket?.remoteAddress || 'unknown';
    // Phase 2 — A13 graduates from anonymous Q&A to lead capture. Optional
    // contact fields on the request let the visitor submit their email +
    // company while chatting. We classify the intent from the message
    // (cheap regex) and persist a row in public.copilot_leads when there's
    // signal. Routing to Sales / Product happens via the daily_lead_summary
    // shift digest; future Phase 3 will route in real-time on critical leads.
    // Soft-validate email so a malformed value never 400s the whole chat.
    const rawEmail: string | undefined = typeof req.body?.email === 'string' ? req.body.email : undefined;
    const contactEmail: string | undefined = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : undefined;
    const contactCompany: string | undefined = typeof req.body?.company === 'string' ? req.body.company : undefined;
    const contactRoleTitle: string | undefined = typeof req.body?.roleTitle === 'string' ? req.body.roleTitle : undefined;
    const intent = classifyA13Intent(userQuery);
    // Stable session id for the visitor's chat session (cookie-able). If the
    // client passes one we honour it; otherwise we mint here. Session id ties
    // multi-turn audit entries together.
    const sessionId: string = typeof req.body?.sessionId === 'string' && /^[0-9a-f-]{8,}$/i.test(req.body.sessionId)
      ? req.body.sessionId
      : crypto.randomUUID();
    // VS-1: emit a visitor-side audit-trail entry for the chat message itself
    // (independent of any lead). Gives compliance a complete view of what
    // anonymous users ask the public copilot.
    void writeVisitorAudit({
      action: 'public.copilot.message',
      sessionId,
      visitorIp,
      payload: { intent, agentId, length: userQuery.length, hasEmail: !!contactEmail, locale: detectLocale(userQuery) },
    });
    const leadId = (intent !== 'general' || contactEmail) ? await captureA13Lead({
      intent, message: userQuery, email: contactEmail, company: contactCompany, roleTitle: contactRoleTitle,
      visitorIp, userAgent: req.headers['user-agent'] as string | undefined, sessionId,
    }) : null;
    if (leadId) {
      void writeVisitorAudit({
        action: 'public.copilot.lead.captured',
        sessionId,
        visitorIp,
        payload: { leadId, intent, hasEmail: !!contactEmail, hasCompany: !!contactCompany },
      });
      // Phase-1 final: publish ai.copilot.lead.captured so notification-service
      // can dispatch a confirmation email to the visitor (when email present).
      void publishLeadCaptured({
        leadId, intent,
        email: contactEmail ?? null,
        company: contactCompany ?? null,
        roleTitle: contactRoleTitle ?? null,
        message: userQuery.slice(0, 1024),
        sessionId,
        // Soft locale signal for the email template selection.
        language: detectLocale(userQuery),
      });
    }

    const result = await traceSurfaceCall(
      {
        surface: 'landing-copilot',
        // Landing copilot is the 13th canonical agent (A13). Dual-tag
        // emits both `surface:landing-copilot` and `surface:agent-A13`
        // so the agent grid + legacy public-surface dashboards both work.
        agentId: 'A13',
        name: agentId ? `landing-copilot.${agentId}` : 'landing-copilot.general',
        tenantId: undefined, // public surface — no tenant context
        userId: `anon:${visitorIp}`,
        input: { message: userQuery.slice(0, 1024), agentId, intent, leadCaptured: !!leadId },
        metadata: { agentId, canonicalAgentId: 'A13', source: 'landing-page', ip: visitorIp, intent, leadId },
      },
      () => handlePublicQuery(userQuery, agentId),
    );
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: 'public', userId: 'anonymous', module: 'governance', event: 'created', entityType: 'copilot', entityId: crypto.randomUUID() }), { tenantId: 'public', operation: 'grcEvent:governance.copilot.created' });
    res.json({ ...(result as any), intent, leadId, sessionId });
  } catch {
    res.status(500).json({ error: 'Service temporarily unavailable' });
  }
});

// GET /api/copilot/agents — List available AI agents with status (DB-driven)
router.get('/agents', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const { loadDbAgents } = await import('../../../mcp/loaders/db-loader');
    const tenantId = req.user?.tenantId || 'default';
    const dbAgents = await loadDbAgents(tenantId);
    if (dbAgents.size > 0) {
      const agents = Array.from(dbAgents.values()).map(a => ({
        id: a.agentId,
        name: a.nameEn,
        nameAr: a.nameAr,
        summary: a.summaryEn,
        summaryAr: a.summaryAr,
        domain: a.domainCode,
        ownerModuleCode: a.ownerModuleCode,
        moduleCodes: a.moduleCodes,
        capabilities: a.capabilities,
        icon: a.icon,
        color: a.color,
        status: a.status,
        isEnabled: a.isEnabled,
      }));
      res.json({ agents, source: 'db' });
      return;
    }
  } catch { /* fallback below */ }
  const AGENTS = [
    { id: 'A01', name: 'Onboarding Agent',        domain: 'onboarding',    status: 'active' },
    { id: 'A02', name: 'Identity Provisioning',    domain: 'identity',      status: 'active' },
    { id: 'A03', name: 'Framework Mapping Agent',  domain: 'mapping',       status: 'active' },
    { id: 'A04', name: 'Control Authoring Agent',  domain: 'controls',      status: 'active' },
    { id: 'A05', name: 'Evidence Collection Agent', domain: 'evidence',     status: 'active' },
    { id: 'A06', name: 'Gap Remediation Agent',    domain: 'compliance',    status: 'active' },
    { id: 'A07', name: 'Risk Assessment Agent',    domain: 'risk',          status: 'active' },
    { id: 'A08', name: 'Policy Lifecycle Agent',   domain: 'governance',    status: 'active' },
    { id: 'A09', name: 'Vendor Risk Agent',        domain: 'vendors',       status: 'active' },
    { id: 'A10', name: 'Audit & Reporting Agent',  domain: 'audit',         status: 'active' },
    { id: 'A11', name: 'BCP Continuity Agent',    domain: 'bcp',           status: 'active' },
    { id: 'A12', name: 'Training Agent',           domain: 'training',      status: 'active' },
    { id: 'A13', name: 'Landing Copilot Agent',   domain: 'landing',       status: 'active' },
  ];
  res.json({ agents: AGENTS, source: 'fallback' });
});

// D6: GET /api/copilot/stream — SSE endpoint for real-time delegation chain events
router.get('/stream', authenticate, requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  const { initSSEResponse, sendSSEEvent, endSSE } = await import('../../services/llm/llm-stream.service');
  const { subscribe } = await import('@dos/platform-core/events');

  initSSEResponse(res);
  const tenantId = req.user.tenantId;
  const sessionId = req.query.sessionId as string;
  const activeAgentId = req.query.activeAgentId as string;

  sendSSEEvent(res, 'session', { sessionId, activeAgentId, tenantId });

  // Subscribe to delegation events for this tenant
  const unsub = subscribe({
    eventType: 'ai.delegation.*',
    subscriberId: `sse-${sessionId || crypto.randomUUID()}`,
    handler: async (event: any) => {
      if (event.tenantId !== tenantId && event.tenant_id !== tenantId) return;
      try {
        const eventName = event.event_type || event.eventType || event.event || 'delegation';
        const payload = event.payload || event.data || event;
        sendSSEEvent(res, 'delegation', { event: eventName, ...payload, timestamp: new Date().toISOString() });
      } catch { /* connection may be closed */ }
    },
  });

  // Keep alive with heartbeat every 30s
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 30000);

  // Auto-close after 5 minutes max
  const autoClose = setTimeout(() => {
    try { endSSE(res); } catch { /* already closed */ }
  }, 300000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clearTimeout(autoClose);
    if (typeof unsub === 'function') unsub();
  });
});

export default router;

let genericPayloadSchema = z.record(z.unknown());

/**
 * Phase 2 — A13 lead-capture helpers.
 *
 * `classifyA13Intent` is an intentionally cheap regex on the user message.
 * Phase 3 will swap this for an LLM-graded classifier, but for now the
 * deterministic regex is well-tested and avoids burning Claude tokens on
 * every public-chat turn.
 */
function classifyA13Intent(message: string): 'demo' | 'contact' | 'pricing' | 'docs' | 'general' {
  const m = message.toLowerCase();
  // Arabic morphology: words inflect with suffixes (اً, ة, ـات, ـية).
  // Match the stem and tolerate any Arabic letters between the two key
  // words for "عرض توضيحي" (demo) and "عرض أسعار" (price quote).
  // Range ء-ي covers Arabic letters; ً-ٟ covers diacritic
  // marks (fatha, tanwin, shadda, etc.) — required to bridge "عرضاً توضيحياً".
  const arabicGap = '[\\s\\u0621-\\u065F]*';
  if (new RegExp(`(demo|trial|see\\s+it\\s+work|walkthrough|عرض${arabicGap}توضيحي|تجربة)`).test(m)) return 'demo';
  if (new RegExp(`(price|pricing|cost|quote|سعر|تكلفة|عرض${arabicGap}أسعار)`).test(m)) return 'pricing';
  if (/(contact|sales|talk\s+to|اتصل|تواصل|مبيعات)/.test(m)) return 'contact';
  if (/(docs?|documentation|api|spec|توثيق|مستندات)/.test(m)) return 'docs';
  return 'general';
}

async function captureA13Lead(input: {
  intent: 'demo' | 'contact' | 'pricing' | 'docs' | 'general';
  message: string;
  email?: string;
  company?: string;
  roleTitle?: string;
  visitorIp?: string;
  userAgent?: string;
  sessionId?: string;
}): Promise<string | null> {
  try {
    const { safeQuery } = await import('@dos/db');
    // VS-2 dedup: if the visitor submits another lead with the same email
    // within the last 24h, append the new message + intent to the existing
    // row's metadata.history[] instead of inserting a duplicate. Sales does
    // not want to chase the same person five times.
    if (input.email) {
      const existing = await safeQuery(
        `SELECT lead_id FROM public.copilot_leads
          WHERE email = $1 AND captured_at >= NOW() - INTERVAL '24 hours'
          ORDER BY captured_at DESC LIMIT 1`,
        [input.email],
      );
      const existingLeadId = existing.rows?.[0]?.lead_id as string | undefined;
      if (existingLeadId) {
        await safeQuery(
          `UPDATE public.copilot_leads
              SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{history}',
                COALESCE(metadata -> 'history', '[]'::jsonb) || jsonb_build_array(
                  jsonb_build_object('intent', $2::text, 'message', $3::text, 'at', NOW())
                )
              ),
              -- promote the highest-intent on the row so Sales sees the strongest signal
              intent = CASE
                WHEN intent = 'demo' THEN intent
                WHEN $2 = 'demo' THEN 'demo'
                WHEN intent = 'pricing' THEN intent
                WHEN $2 = 'pricing' THEN 'pricing'
                WHEN intent = 'contact' THEN intent
                WHEN $2 = 'contact' THEN 'contact'
                ELSE intent
              END
            WHERE lead_id = $1`,
          [existingLeadId, input.intent, input.message.slice(0, 2000)],
        ).catch(() => undefined);
        return existingLeadId;
      }
    }
    const r = await safeQuery(
      `INSERT INTO public.copilot_leads
         (intent, email, company, role_title, message, visitor_ip, user_agent, source, session_id, metadata)
       VALUES ($1, $2, $3, $4, $5, NULLIF($6,'unknown')::inet, $7, 'landing-copilot', $8::uuid, '{"history":[]}'::jsonb)
       RETURNING lead_id`,
      [input.intent, input.email ?? null, input.company ?? null, input.roleTitle ?? null,
        input.message.slice(0, 2000), input.visitorIp ?? null, input.userAgent ?? null,
        input.sessionId ?? null],
    );
    return r.rows?.[0]?.lead_id ?? null;
  } catch {
    return null;
  }
}

/** Lightweight Arabic-vs-English heuristic for audit metadata. */
function detectLocale(text: string): 'ar' | 'en' {
  return /[؀-ۿ]/.test(text) ? 'ar' : 'en';
}

/**
 * Publish the `ai.copilot.lead.captured` platform event so notification-service
 * can dispatch a confirmation email to the visitor when they supplied an email.
 * Best-effort: the captured row + audit-trail entry are the durable record;
 * the email is a courtesy.
 */
async function publishLeadCaptured(payload: {
  leadId: string; intent: string;
  email: string | null; company: string | null; roleTitle: string | null;
  message: string; sessionId: string;
  language: 'en' | 'ar';
}): Promise<void> {
  try {
    const { eventBus } = await import('../../ports/events.port');
    await eventBus.publish({
      eventType: 'ai.copilot.lead.captured',
      tenantId: null,
      sourceService: 'ai-engine-service',
      payload,
    } as any);
  } catch {
    /* fall through — email is optional courtesy */
  }
}

/**
 * VS-1: write a public-copilot audit-trail entry. Each anonymous visitor
 * interaction is durably logged in dos.audit_trail with action prefix
 * `public.copilot.*` so compliance has a complete record independent of
 * Langfuse traces (which are observability, not legal record).
 */
async function writeVisitorAudit(input: {
  action: 'public.copilot.session.opened' | 'public.copilot.message' | 'public.copilot.lead.captured';
  sessionId: string;
  visitorIp: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const { safeQuery } = await import('@dos/db');
    await safeQuery(
      `INSERT INTO dos.audit_trail (tenant_id, actor_id, action, entity_type, entity_id, module, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        'public',
        `anon:${input.visitorIp}`,
        input.action,
        'public_copilot_session',
        input.sessionId,
        'ai',
        JSON.stringify({ ...input.payload, ip: input.visitorIp }),
      ],
    ).catch(() => undefined);
  } catch { /* never block chat on audit failure */ }
}
