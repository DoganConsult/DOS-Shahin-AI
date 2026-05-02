import { getRegistryEntry } from '@dos/platform-core/lifecycle';
function normalizeTransitionRequest(requestOrModuleCode, entityId, fromStatus, toStatus, actorUserId) {
    if (typeof requestOrModuleCode === 'string') {
        return {
            request: {
                moduleCode: requestOrModuleCode,
                entityType: requestOrModuleCode,
                entityId: entityId ?? '',
                fromStatus,
                toStatus: toStatus ?? '',
                actorUserId,
            },
            legacySignature: true,
        };
    }
    return {
        request: requestOrModuleCode,
        legacySignature: false,
    };
}
function resolveEntityTypes(request) {
    const candidates = [request.entityType, request.table, request.moduleCode].filter((value) => typeof value === 'string' && value.length > 0);
    return Array.from(new Set(candidates));
}
function findLifecycleEntry(request) {
    for (const entityType of resolveEntityTypes(request)) {
        try {
            const entry = getRegistryEntry(request.moduleCode, entityType);
            if (entry) {
                return entry;
            }
        }
        catch {
            return null;
        }
    }
    return null;
}
function evaluateTransition(request) {
    if (!request.moduleCode || !request.toStatus || !request.fromStatus) {
        return { allowed: true };
    }
    const entry = findLifecycleEntry(request);
    if (!entry || request.fromStatus === request.toStatus) {
        return { allowed: true };
    }
    const allowed = entry.transitions[request.fromStatus];
    if (!Array.isArray(allowed) || !allowed.includes(request.toStatus)) {
        return {
            allowed: false,
            reason: `Lifecycle transition denied for ${entry.moduleCode}/${entry.entityType}: ${request.fromStatus} -> ${request.toStatus} is not allowed.`,
        };
    }
    return { allowed: true };
}
export async function enforceStatusTransition(tenantId, requestOrModuleCode, entityId, fromStatus, toStatus, actorUserId) {
    void tenantId;
    const normalized = normalizeTransitionRequest(requestOrModuleCode, entityId, fromStatus, toStatus, actorUserId);
    const evaluation = evaluateTransition(normalized.request);
    if (!evaluation.allowed) {
        if (normalized.legacySignature) {
            const error = new Error(evaluation.reason ?? 'Lifecycle transition denied.');
            error.statusCode = 403;
            throw error;
        }
        return {
            success: false,
            blocked: true,
            pendingApproval: false,
            reason: evaluation.reason,
        };
    }
    return {
        success: false,
        blocked: false,
        pendingApproval: false,
    };
}
export async function tryLifecycleTransition(tenantId, request) {
    void tenantId;
    const evaluation = evaluateTransition(request);
    if (!evaluation.allowed) {
        return {
            handled: true,
            denied: true,
            pendingApproval: false,
            result: {
                reason: evaluation.reason,
            },
        };
    }
    return {
        handled: false,
        denied: false,
        pendingApproval: false,
    };
}
//# sourceMappingURL=module-lifecycle.service.js.map