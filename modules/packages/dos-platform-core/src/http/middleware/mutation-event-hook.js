"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMutationEventPublisher = setMutationEventPublisher;
exports.mutationEventHook = mutationEventHook;
const resilience_1 = require("../../resilience/resilience");
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const METHOD_TO_ACTION = {
    POST: 'created',
    PUT: 'updated',
    PATCH: 'updated',
    DELETE: 'deleted',
};
let _publisher = null;
function setMutationEventPublisher(fn) { _publisher = fn; }
function getPublisher() {
    if (_publisher)
        return _publisher;
    try {
        const sdk = require('@dos/module-sdk');
        _publisher = sdk.publishEvent;
        return _publisher;
    }
    catch {
        return null;
    }
}
function mutationEventHook(moduleCode) {
    return (req, res, next) => {
        if (!MUTATION_METHODS.has(req.method)) {
            next();
            return;
        }
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (res.statusCode < 400 && body?.success !== false) {
                const tenantId = req.tenantId;
                const user = req.user;
                if (tenantId) {
                    const action = METHOD_TO_ACTION[req.method] || 'updated';
                    const entityId = body?.data?.id || req.params?.id || null;
                    const pathParts = req.baseUrl?.split('/').filter(Boolean) || [];
                    const entityType = pathParts[pathParts.length - 1] || moduleCode;
                    const pub = getPublisher();
                    if (pub) {
                        pub({
                            event: action,
                            tenantId,
                            userId: user?.userId || user?.id || 'system',
                            module: moduleCode,
                            entityType,
                            entityId,
                            data: { method: req.method, path: req.originalUrl, action },
                        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
                    }
                }
            }
            return originalJson(body);
        };
        next();
    };
}
//# sourceMappingURL=mutation-event-hook.js.map