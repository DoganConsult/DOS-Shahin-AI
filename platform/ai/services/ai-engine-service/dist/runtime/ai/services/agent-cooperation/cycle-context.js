// ============================================
// AGRC-OS — Agent Cycle Context Management
// In-memory shared context per tenant cycle,
// discovery registration, and cycle lifecycle.
// ============================================
// ── Shared context per cycle ───────────────────────────────────────────────
export const activeCycleContexts = new Map();
export function initCycleContext(tenantId) {
    const ctx = {
        tenantId,
        cycleId: `cycle-${Date.now().toString(36)}`,
        discoveries: [],
        handoffs: [],
        correlations: [],
    };
    activeCycleContexts.set(tenantId, ctx);
    return ctx;
}
export function getCycleId(tenantId) {
    return activeCycleContexts.get(tenantId)?.cycleId;
}
export function getCycleContext(tenantId) {
    return activeCycleContexts.get(tenantId);
}
export function closeCycleContext(tenantId) {
    const ctx = activeCycleContexts.get(tenantId);
    activeCycleContexts.delete(tenantId);
    return ctx;
}
// ── Discovery Registration ─────────────────────────────────────────────────
export function registerDiscovery(tenantId, discovery) {
    const ctx = activeCycleContexts.get(tenantId);
    const d = {
        ...discovery,
        id: `disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
    };
    if (ctx) {
        ctx.discoveries.push(d);
        // Lazy import to avoid circular dependency with handoff.ts
        const { _evaluateCooperationRules } = require('./handoff');
        _evaluateCooperationRules(tenantId, d, ctx);
    }
    return d;
}
//# sourceMappingURL=cycle-context.js.map