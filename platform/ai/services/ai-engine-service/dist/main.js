// MUST be the first import: bootstraps OpenTelemetry SDK before any other
// module loads, so auto-instrumentations can hook http/pg/ioredis at require time.
import './otel-init.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { bootstrapService } from '@dos/service-bootstrap';
import { aiEngineRouter, nudgesRouter } from './routes';
import { logger, setRecordAudit } from '@dos/platform-core/observability';
import { setEventBus, toErrorMessage } from '@dos/module-sdk';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { initEventTriggerListener } from './runtime/ai/services/workflow/ai-event-trigger.service';
import { initAgentToolsRegistry } from './runtime/ai/services/agents/core/agent-tools-registry.service';
import { mcpGateway } from './runtime/ai/mcp-gateway';
import { registerAiEventSubscribers } from './runtime/ai/events/ai.subscribers';
import { startCatchUpProducer } from './runtime/ai/events/ai-catch-up-producer';
import { startOutboxDispatcher } from './runtime/ai/events/outbox-dispatcher';
import { startHitlExpiryCron } from './runtime/ai/events/hitl-expiry-cron';
function initSdkEventBus(serviceCode) {
    const config = loadServiceConfig(serviceCode);
    const backbone = createEventBackbone({
        redisUrl: config.redis.url,
        serviceCode,
    });
    const afterPublishHandlers = new Map();
    setEventBus({
        publish: async (event) => {
            const eventId = await backbone.publish(event.eventType, event.payload, {
                tenantId: event.tenantId,
                userId: event.userId,
                idempotencyKey: event.idempotencyKey
                    || event.correlationId,
            });
            for (const handler of afterPublishHandlers.values()) {
                await handler(event);
            }
            return eventId;
        },
        subscribe: (eventType, subscriberId, handler) => {
            void subscriberId;
            backbone.subscribe(eventType, async (event) => {
                await handler({
                    eventId: event.eventId,
                    eventType: event.eventType,
                    tenantId: event.tenantId,
                    userId: event.userId,
                    payload: event.payload,
                    timestamp: event.timestamp,
                    sourceService: event.source,
                });
            });
        },
        onAfterPublish: (subscriberId, handler) => {
            afterPublishHandlers.set(subscriberId, handler);
        },
    });
    backbone.startConsuming().catch((error) => {
        logger.error('AI Engine event backbone consumer failed: ' + error.message);
    });
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Public-schema SQL from modules_ai-governance (symlinked under ./migrations). */
const aiEngineMigrationsDir = path.resolve(__dirname, '../migrations');
async function bootstrap() {
    try {
        initSdkEventBus('ai-engine-service');
        const app = await bootstrapService('ai-engine-service', {
            mountBase: '/api/ai-engine',
            router: aiEngineRouter,
            migrationsDir: aiEngineMigrationsDir,
        });
        // Mount nudge engine routes at /api/nudges — gateway proxies /api/nudges/* here.
        // Frontend polls GET /api/nudges/active on app bootstrap.
        app.use('/api/nudges', nudgesRouter);
        // Secondary mount: expose copilot routes at /api/copilot in addition to /api/ai-engine/copilot
        // Gateway routes /api/copilot/* here so frontend can call /api/copilot/intent-to-query directly.
        try {
            const { default: copilotRouter } = await import('./runtime/ai/routes/copilot/copilot.routes.js');
            app.use('/api/copilot', copilotRouter);
            logger.info('Copilot routes mounted at /api/copilot');
        }
        catch (err) {
            logger.warn('Copilot secondary mount skipped', { error: err.message });
        }
        // Secondary mount: /api/ai-enhanced (admin AI surfaces: model-config, budgets, prompts, evals).
        // Frontend ai-model-config.component.ts calls /api/ai-enhanced/model-config directly.
        try {
            const { default: aiEnhancedRouter } = await import('./runtime/ai/routes/enhanced/ai-enhanced.routes.js');
            app.use('/api/ai-enhanced', aiEnhancedRouter);
            logger.info('AI Enhanced routes mounted at /api/ai-enhanced');
        }
        catch (err) {
            logger.warn('AI Enhanced secondary mount skipped', { error: err.message });
        }
        // Secondary mount: /api/agrc-os (frontend ai-execution-plans.component.ts uses AGRCOSService at {apiUrl}/agrc-os).
        try {
            const { default: agrcOsRouter } = await import('./domain/agrc-engine/routes/agrc-os/index.routes.js');
            app.use('/api/agrc-os', agrcOsRouter);
            logger.info('AGRC OS routes mounted at /api/agrc-os');
        }
        catch (err) {
            logger.warn('AGRC OS secondary mount skipped', { error: err.message });
        }
        // Secondary mount: /api/security/quantum (Quantum Readiness / PQC Security module).
        // Frontend security pages call /api/security/quantum/kpis, /api/security/quantum/crypto-inventory, etc.
        try {
            const { default: quantumRouter } = await import('./domain/ai-governance/routes/quantum-security.routes.js');
            app.use('/api/security/quantum', quantumRouter);
            logger.info('Quantum Security routes mounted at /api/security/quantum');
        }
        catch (err) {
            logger.warn('Quantum Security secondary mount skipped', { error: err.message });
        }
        // Phase 8 deeper (2026-04-30): top-level FE prefixes lifted from
        // ai-engine sub-router. Each backing router declares its own path
        // segment (e.g. /explainability, /dpia, /models/...), so mount each at
        // its FE-canonical /api/<prefix>. Same secondary-mount pattern as
        // /api/copilot, /api/ai-enhanced, /api/agrc-os, /api/ai-hr above.
        const aiTopLevelMounts = [
            ['/api/ai-explainability', './runtime/ai/routes/governance/ai-explainability.routes.js'],
            ['/api/ai-compliance-framework', './runtime/ai/routes/admin/ai-compliance-framework.routes.js'],
            ['/api/ai-dpia', './runtime/ai/routes/admin/ai-dpia-enhanced.routes.js'],
            ['/api/ai-model-risk', './runtime/ai/routes/admin/ai-model-risk.routes.js'],
            ['/api/ai-agent-performance', './runtime/ai/routes/agents/ai-agent-performance.routes.js'],
        ];
        for (const [mountPath, modPath] of aiTopLevelMounts) {
            try {
                const m = await import(modPath);
                app.use(mountPath, m.default || m);
                logger.info(`AI top-level route mounted at ${mountPath}`);
            }
            catch (err) {
                logger.warn(`AI top-level mount skipped ${mountPath}`, { error: err.message });
            }
        }
        // Secondary mount: /api/ai-os aggregator (policy-rules, event-triggers, route-rules, recommendations,
        // agent runtime-configs, stuck-runs, circuit-breakers). Frontend pages ai-policy-rules,
        // ai-route-rules, ai-event-triggers, ai-recommendation-inbox, ai-runtime-config, ai-settings call
        // /api/ai-os/* directly. The underlying routers declare their paths as /ai-os/<noun>, so we mount
        // them at /api and rely on their internal /ai-os prefix.
        const aiOsAggregator = (await import('express')).default.Router();
        // Phase 12C — ai-os sub-routers (policy, agents, decisions, introspection,
        // operations, signals, cockpit, kernel, services) call res.ok / res.paginated
        // / res.created / res.deleted. Those helpers are declared in
        // @dos/module-sdk/http.ts but are a bare interface — nothing installs them
        // on Response. Install a tiny shim here so the secondary-mounted ai-os
        // routes stop 500'ing when they try to send a response.
        aiOsAggregator.use((req, res, next) => {
            const r = res;
            if (typeof r.ok !== 'function') {
                r.ok = (data) => res.status(200).json(data);
            }
            if (typeof r.created !== 'function') {
                r.created = (data) => res.status(201).json(data);
            }
            if (typeof r.deleted !== 'function') {
                r.deleted = (message) => res.status(200).json({ message });
            }
            if (typeof r.paginated !== 'function') {
                r.paginated = (items, total, page, pageSize) => res.status(200).json({ items, total, page, pageSize });
            }
            next();
        });
        const aiOsMounts = [
            ['policy', './runtime/ai/routes/ai-os/policy.routes.js'],
            ['agents-ai-os', './runtime/ai/routes/ai-os/agents.routes.js'],
            ['decisions', './runtime/ai/routes/ai-os/decisions.routes.js'],
            ['introspection', './runtime/ai/routes/ai-os/introspection.routes.js'],
            ['operations', './runtime/ai/routes/ai-os/operations.routes.js'],
            ['signals', './runtime/ai/routes/ai-os/signals.routes.js'],
            ['ai-os-cockpit', './runtime/ai/routes/ai-os/ai-os-cockpit.routes.js'],
            ['kernel', './runtime/ai/routes/ai-os/kernel.routes.js'],
            ['ai-os-services', './runtime/ai/routes/ai-os/ai-os-services.routes.js'],
        ];
        for (const [label, mod] of aiOsMounts) {
            try {
                const m = await import(mod);
                aiOsAggregator.use('/', m.default || m);
                logger.info(`AI OS aggregator mounted sub-router ${label}`);
            }
            catch (err) {
                logger.warn(`AI OS aggregator skipped ${label}`, { error: err.message });
            }
        }
        app.use('/api', aiOsAggregator);
        logger.info('AI OS aggregator mounted at /api (serves /api/ai-os/*)');
        // Wire the real audit implementation so platform-core consumers get the
        // append-only audit trail backed by dos.audit_trail. The engine-local
        // recordAudit (positional args) is the source of truth; here we expose it
        // through @dos/platform-core/observability's named-arg AuditRecord port
        // so cross-module callers also persist correctly.
        try {
            const localAudit = await import('./runtime/audit/services/audit/core/audit-trail.service.js');
            setRecordAudit(async (record) => {
                await localAudit.recordAudit(record.tenantId, record.userId || 'system', record.action, record.entityType, record.entityId, { module: record.module, beforeState: record.beforeState, afterState: record.afterState });
            });
        }
        catch (err) {
            logger.warn('Audit trail wiring failed — audit records will be dropped', { error: toErrorMessage(err) });
        }
        // Register all agent tools (delegate_to_agent, domain tools, MCP, RAG) into the global registry.
        // Without this call the toolRegistry is empty and agents have zero tools at runtime.
        initAgentToolsRegistry();
        registerAiEventSubscribers();
        // Wave 2 #5 — until the per-service producers are wired in
        // tenant-service / risk / compliance / audit, the catch-up producer
        // polls each tenant schema for newly-created risks/compliance gaps/
        // evidence/controls/audit_plans and synthesizes the canonical events
        // that registerAiEventSubscribers expects. Idempotent via cursors.
        startCatchUpProducer(parseInt(process.env.AI_CATCH_UP_INTERVAL_MS || '60000', 10));
        // P1-1 — outbox dispatcher. Drains <tenant>.event_outbox by
        // re-publishing pending rows to the EventBus + marking them
        // dispatched. Without this, the catch-up producer's events pile
        // up in event_outbox forever (audit observed 6,443 stuck rows).
        startOutboxDispatcher(parseInt(process.env.AI_OUTBOX_INTERVAL_MS || '5000', 10));
        // P1-2 — HITL gate expiry cron. Flips hitl_gates rows from
        // 'pending' → 'expired' once expires_at passes. Without this,
        // expired gates stay pending and operators see stale entries.
        startHitlExpiryCron(parseInt(process.env.AI_HITL_EXPIRY_INTERVAL_MS || '60000', 10));
        initEventTriggerListener();
        // Bootstrap MCP Context Channels
        await mcpGateway.initialize();
        // Tier 4 — start the autonomous cron scheduler (gated by CRON_SCHEDULER_ENABLED)
        try {
            const { startCronRunner } = await import('./runtime/ai/services/scheduler/cron-runner.service.js');
            startCronRunner();
        }
        catch (err) {
            logger.warn('Cron scheduler not started', { error: toErrorMessage(err) });
        }
        // Wave 6 — start alert rules runner (gated by AI_ALERTING_ENABLED).
        try {
            const { startAlertRulesRunner } = await import('./runtime/ai/services/alerting/alert-rules-runner.service.js');
            startAlertRulesRunner();
        }
        catch (err) {
            logger.warn('Alert rules runner not started', { error: toErrorMessage(err) });
        }
        // Wave 5 — DNOC AI Operations + DSOC AI Security read-only aggregator endpoints.
        // Live in ai-engine until dnoc-service / dsoc-service grow the AI subdomain natively;
        // gateway can then path-rewrite /api/dnoc/ai/* and /api/dsoc/ai/* without code change.
        try {
            const { default: dnocAiRouter } = await import('./runtime/ai/routes/dnoc-ops/dnoc-ai.routes.js');
            const { default: dsocAiRouter } = await import('./runtime/ai/routes/dsoc-security/dsoc-ai.routes.js');
            app.use('/api/dnoc-ai', dnocAiRouter);
            app.use('/api/dsoc-ai', dsocAiRouter);
            logger.info('DNOC AI ops + DSOC AI security routes mounted at /api/{dnoc-ai,dsoc-ai}');
        }
        catch (err) {
            logger.warn('DNOC/DSOC AI routes mount failed', { error: toErrorMessage(err) });
        }
        // Sales: Copilot Leads — backed by public.copilot_leads, captures from
        // /api/copilot/public-chat (A13). RBAC ai.copilot.read/write. Every list +
        // view + transition writes into dos.audit_trail (sales.lead.*).
        try {
            const { default: salesLeadsRouter } = await import('./runtime/ai/routes/sales/copilot-leads.routes.js');
            app.use('/api/sales/copilot-leads', salesLeadsRouter);
            logger.info('Sales copilot-leads routes mounted at /api/sales/copilot-leads');
        }
        catch (err) {
            logger.warn('Sales copilot-leads routes mount failed', { error: toErrorMessage(err) });
        }
        // AI Employees Phase 1 — HR-style org chart + autonomous shifts.
        // Routes mounted at /api/ai-hr/*. Shifts seeded once at startup; the
        // existing alert-rules-runner tick (60s) also drives runDueShifts().
        try {
            const { default: aiHrRouter } = await import('./runtime/ai/routes/hr/ai-hr.routes.js');
            app.use('/api/ai-hr', aiHrRouter);
            logger.info('AI-HR (employees) routes mounted at /api/ai-hr');
            const { seedShiftsForAllTenants, seedShiftsForTenant, runDueShifts } = await import('./runtime/ai/services/hr/ai-hr.service.js');
            // Seed at startup (idempotent)
            seedShiftsForAllTenants().then((r) => logger.info('[ai-hr] shifts seeded', r)).catch((err) => logger.warn('[ai-hr] seed failed', { error: toErrorMessage(err) }));
            // HB-2 fix: seed a tenant's shifts the moment their workspace is
            // provisioned. Without this, a customer registering after engine
            // boot has zero agents working until next restart.
            const onTenantOnboarded = async (event) => {
                const tenantId = event.tenantId || event.payload?.tenantId;
                if (!tenantId)
                    return;
                try {
                    const r = await seedShiftsForTenant(tenantId);
                    logger.info('[ai-hr] new tenant onboarded — shifts seeded', { tenantId, ...r });
                }
                catch (err) {
                    logger.warn('[ai-hr] tenant onboard seed failed', { tenantId, error: toErrorMessage(err) });
                }
            };
            try {
                const { eventBus } = await import('./runtime/ai/ports/events.port.js');
                eventBus.subscribe('workspace.provisioning.completed', 'ai-hr.tenant-onboarded', onTenantOnboarded);
                eventBus.subscribe('tenant.created', 'ai-hr.tenant-created', onTenantOnboarded);
                eventBus.subscribe('tenant.activated', 'ai-hr.tenant-activated', onTenantOnboarded);
                logger.info('[ai-hr] tenant-onboarding subscribers wired');
            }
            catch (err) {
                logger.warn('[ai-hr] failed to wire tenant-onboarding subscribers', { error: toErrorMessage(err) });
            }
            // 60s shift dispatcher — light-touch, safe to share the alerts cadence.
            setInterval(() => {
                runDueShifts().then((r) => {
                    if (r.executed > 0 || r.failed > 0) {
                        logger.info('[ai-hr] shift tick', r);
                    }
                }).catch((err) => logger.warn('[ai-hr] shift tick failed', { error: toErrorMessage(err) }));
            }, 60_000);
        }
        catch (err) {
            logger.warn('AI-HR routes mount failed', { error: toErrorMessage(err) });
        }
        // DSOC audit bridge — subscribe to ai.* events and re-emit as
        // dsoc.audit.* so DSOC's persistent subscribers write them into
        // platform_dsoc.audit_log per the AI-OS manifest contract.
        try {
            const { installDSOCAuditBridge } = await import('./runtime/ai/bootstrap/dsoc-audit-bridge.js');
            const { wired } = installDSOCAuditBridge();
            logger.info('[ai-dsoc-bridge] subscribers wired', { count: wired });
        }
        catch (err) {
            logger.warn('[ai-dsoc-bridge] install failed', { error: toErrorMessage(err) });
        }
        // Wave 2 — validate the RAG substrate at boot so operators see a clear
        // green/red signal instead of silently degrading to lexical-only search.
        try {
            const { getPool } = await import('@dos/db');
            const pool = getPool();
            const ext = await pool.query(`SELECT extversion FROM pg_extension WHERE extname = 'vector'`).catch(() => null);
            const tbls = await pool.query(`SELECT count(*)::int AS n FROM information_schema.tables
          WHERE table_schema LIKE 'tenant_%' AND table_name = 'ai_context_sources'`).catch(() => null);
            const rows = await pool.query(`SELECT COALESCE(SUM(GREATEST(c.reltuples, 0))::bigint, 0) AS n
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname LIKE 'tenant_%' AND c.relname = 'ai_context_sources'`).catch(() => null);
            const vectorVer = ext?.rows?.[0]?.extversion;
            const tableCount = tbls?.rows?.[0]?.n ?? 0;
            const rowEstimate = rows?.rows?.[0]?.n ?? 0;
            if (!vectorVer) {
                logger.warn('[ai-rag-substrate] pgvector extension MISSING — A03/A04/A07/A08 will fall back to lexical ILIKE only');
            }
            else if (tableCount === 0) {
                logger.warn(`[ai-rag-substrate] pgvector ${vectorVer} present but ai_context_sources table is missing in every tenant — apply tenant migration 052_ai_context_sources.sql`);
            }
            else {
                logger.info(`[ai-rag-substrate] pgvector=${vectorVer} ai_context_sources present in ${tableCount} tenants (~${rowEstimate} rows)`);
            }
        }
        catch (err) {
            logger.warn('[ai-rag-substrate] validation failed', { error: toErrorMessage(err) });
        }
        logger.info('AI Engine Service booted standalone successfully and listening for invocation bindings.');
    }
    catch (err) {
        logger.fatal('Failed to bootstrap AI Engine Service', { error: toErrorMessage(err) });
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map