/**
 * Langfuse Observability Bridge for ai-engine-service
 *
 * Wraps the canonical Langfuse adapter from tenant-service and provides
 * engine-specific trace creation, generation logging, and metric recording.
 *
 * Graceful degradation: if Langfuse is not configured, all methods are no-ops.
 */
import { logger } from '../ports/logger.port';
// ── Langfuse client (lazy singleton) ─────────────────────────────────
let _langfuse = null;
let _initAttempted = false;
function isLangfuseEnabled() {
    return (process.env.LANGFUSE_ENABLED !== 'false' &&
        !!process.env.LANGFUSE_PUBLIC_KEY &&
        !!process.env.LANGFUSE_SECRET_KEY);
}
async function getLangfuse() {
    if (_langfuse)
        return _langfuse;
    if (_initAttempted)
        return null;
    _initAttempted = true;
    if (!isLangfuseEnabled()) {
        logger.info('[langfuse-bridge] Langfuse not configured, observability disabled');
        return null;
    }
    try {
        const { Langfuse } = await import('langfuse');
        _langfuse = new Langfuse({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
        });
        logger.info('[langfuse-bridge] Langfuse client initialized for ai-engine-service');
        return _langfuse;
    }
    catch (err) {
        logger.warn('[langfuse-bridge] Failed to initialize Langfuse', { error: err.message });
        return null;
    }
}
export async function createEngineTrace(options) {
    const langfuse = await getLangfuse();
    if (!langfuse)
        return null;
    try {
        // Wave 2: derive a stable surface tag from engineType so DNOC/DSOC
        // dashboards can filter consistently with traceSurfaceCall (Wave 1).
        // engineType="agent.A01" → surface:agent-A01, engineType="assessment"
        // → surface:engine-assessment. READ-ONLY mapping of the canonical id;
        // never overrides agent metadata.
        const engineType = options.engineType || 'assessment';
        const surfaceTag = engineType.startsWith('agent.')
            ? `surface:agent-${engineType.slice('agent.'.length)}`
            : `surface:engine-${engineType}`;
        const trace = langfuse.trace({
            name: `agrc-engine:${engineType}`,
            userId: options.userId,
            metadata: {
                tenantId: options.tenantId,
                runId: options.runId,
                service: 'ai-engine-service',
                ...options.metadata,
            },
            tags: ['ai-engine', `tenant:${options.tenantId}`, engineType, surfaceTag],
        });
        return { trace, traceId: trace.id };
    }
    catch (err) {
        logger.warn('[langfuse-bridge] Failed to create trace', { error: err.message });
        return null;
    }
}
export async function logGeneration(options) {
    if (!options.trace)
        return;
    try {
        options.trace.generation({
            name: options.name,
            model: options.model,
            input: options.input,
            output: options.output,
            usage: options.usage,
            metadata: options.metadata,
            startTime: options.durationMs
                ? new Date(Date.now() - options.durationMs)
                : undefined,
            endTime: new Date(),
        });
    }
    catch (err) {
        logger.warn('[langfuse-bridge] Failed to log generation', { error: err.message });
    }
}
// ── Score Logging ────────────────────────────────────────────────────
export async function logScore(trace, name, value, comment) {
    if (!trace)
        return;
    try {
        trace.score({ name, value, comment });
    }
    catch (err) {
        logger.warn('[langfuse-bridge] Failed to log score', { error: err.message });
    }
}
// ── Span Creation ────────────────────────────────────────────────────
export async function createSpan(trace, name, metadata) {
    if (!trace)
        return null;
    try {
        return trace.span({ name, metadata, startTime: new Date() });
    }
    catch {
        return null;
    }
}
export function endSpan(span) {
    if (!span)
        return;
    try {
        span.end({ endTime: new Date() });
    }
    catch { /* ignore */ }
}
// ── Flush ────────────────────────────────────────────────────────────
export async function flushLangfuse() {
    if (_langfuse) {
        try {
            await _langfuse.flushAsync();
        }
        catch {
            // ignore flush errors
        }
    }
}
export async function traceSurfaceCall(opts, fn) {
    const lf = await getLangfuse();
    if (!lf) {
        return fn(null);
    }
    let trace = null;
    try {
        trace = lf.trace({
            name: opts.name || opts.surface,
            userId: opts.userId || 'anonymous',
            sessionId: opts.sessionId,
            input: opts.input,
            metadata: {
                tenantId: opts.tenantId || 'public',
                service: 'ai-engine-service',
                ...opts.metadata,
            },
            tags: [
                'ai-engine',
                `surface:${opts.surface}`,
                ...(opts.agentId ? [`surface:agent-${opts.agentId}`] : []),
                ...(opts.tenantId ? [`tenant:${opts.tenantId}`] : []),
            ],
        });
    }
    catch (err) {
        logger.warn('[langfuse-bridge] surface trace create failed', { surface: opts.surface, error: err.message });
    }
    const startedAt = Date.now();
    try {
        const result = await fn(trace);
        if (trace) {
            try {
                trace.update({ output: typeof result === 'object' ? result : { value: result } });
                await logScore(trace, 'surface-call-success', 1);
            }
            catch { /* ignore */ }
        }
        return result;
    }
    catch (err) {
        if (trace) {
            try {
                trace.update({ output: { error: err.message }, level: 'ERROR' });
                await logScore(trace, 'surface-call-success', 0, err.message);
            }
            catch { /* ignore */ }
        }
        throw err;
    }
    finally {
        if (trace) {
            try {
                trace.update({ metadata: { durationMs: Date.now() - startedAt } });
            }
            catch { /* ignore */ }
            flushLangfuse().catch(() => undefined);
        }
    }
}
// ── Engine-Specific Convenience ──────────────────────────────────────
export async function traceEngineRun(tenantId, runId, fn) {
    const traceResult = await createEngineTrace({ tenantId, runId });
    try {
        const result = await fn(traceResult?.trace ?? null);
        if (traceResult?.trace) {
            await logScore(traceResult.trace, 'engine-run-success', 1, 'Run completed successfully');
        }
        return result;
    }
    catch (err) {
        if (traceResult?.trace) {
            await logScore(traceResult.trace, 'engine-run-success', 0, err.message);
        }
        throw err;
    }
    finally {
        await flushLangfuse();
    }
}
const _datasetCache = new Map();
async function fetchDatasetItems(name) {
    if (_datasetCache.has(name))
        return _datasetCache.get(name);
    const host = (process.env.LANGFUSE_HOST || 'http://127.0.0.1:4090/admin/langfuse').replace(/\/$/, '');
    const pk = process.env.LANGFUSE_PUBLIC_KEY;
    const sk = process.env.LANGFUSE_SECRET_KEY;
    if (!pk || !sk)
        return [];
    try {
        const res = await fetch(`${host}/api/public/dataset-items?datasetName=${encodeURIComponent(name)}`, {
            headers: { authorization: 'Basic ' + Buffer.from(`${pk}:${sk}`).toString('base64') },
        });
        if (!res.ok)
            return [];
        const j = await res.json();
        const items = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        _datasetCache.set(name, items);
        return items;
    }
    catch {
        return [];
    }
}
function shapeMatchScore(actual, expected) {
    if (expected == null)
        return 1;
    if (typeof expected !== 'object') {
        return actual === expected ? 1 : 0;
    }
    const keys = Object.keys(expected);
    if (keys.length === 0)
        return 1;
    let hits = 0;
    for (const k of keys) {
        const expV = expected[k];
        const actV = actual && typeof actual === 'object' ? actual[k] : undefined;
        if (typeof expV === 'object' && expV !== null) {
            hits += shapeMatchScore(actV, expV);
        }
        else if (actV === expV) {
            hits += 1;
        }
        else if (actV !== undefined && expV !== undefined) {
            hits += 0.5;
        }
    }
    return hits / keys.length;
}
// ── Wave 1.7 — Versioned prompt fetch (production label) ────────────
// Loads the current production version of `agent.<id>.system` from
// Langfuse, falling back to a static system message when Langfuse is
// unavailable so the agent never hard-fails on a network blip.
const _promptCache = new Map();
const PROMPT_TTL_MS = 60_000;
export async function getAgentSystemPrompt(agentCode, fallback) {
    const name = `agent.${agentCode.toLowerCase()}.system`;
    const cached = _promptCache.get(name);
    if (cached && Date.now() - cached.at < PROMPT_TTL_MS) {
        return { body: cached.body, model: cached.model, temperature: cached.temperature, source: 'langfuse' };
    }
    try {
        const lf = await getLangfuse();
        if (lf && typeof lf.getPrompt === 'function') {
            const p = await lf.getPrompt(name, undefined, { label: 'production', cacheTtlSeconds: 60 });
            const body = typeof p?.prompt === 'string' ? p.prompt : (Array.isArray(p?.prompt) ? p.prompt.map((m) => m?.content ?? '').join('\n') : fallback);
            const model = p?.config?.model;
            const temperature = p?.config?.temperature;
            _promptCache.set(name, { at: Date.now(), body, model, temperature });
            return { body, model, temperature, source: 'langfuse' };
        }
    }
    catch (err) {
        logger.warn('[langfuse-bridge] getAgentSystemPrompt failed, using fallback', { error: err.message, agentCode });
    }
    return { body: fallback, source: 'fallback' };
}
export async function evaluateAgainstSmokeDataset(input) {
    const datasetName = `dataset.${input.agentCode.toLowerCase()}.smoke`;
    const items = await fetchDatasetItems(datasetName);
    if (items.length === 0) {
        return { score: 0, matched: 0, total: 0 };
    }
    let best = 0;
    for (const it of items) {
        const expected = it?.expectedOutput ?? it?.expected_output ?? input.expectedShape ?? {};
        const s = shapeMatchScore(input.output, expected);
        if (s > best)
            best = s;
    }
    if (input.trace) {
        try {
            await logScore(input.trace, `smoke.${datasetName}`, best, `matched ${best.toFixed(2)} against ${items.length} items`);
        }
        catch { /* best-effort */ }
    }
    return { score: best, matched: best >= 0.7 ? 1 : 0, total: items.length };
}
//# sourceMappingURL=langfuse-bridge.js.map