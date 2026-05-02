"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAutomationEventPublisher = setAutomationEventPublisher;
exports.automationMiddleware = automationMiddleware;
const resilience_1 = require("../../resilience/resilience");
let _publisher = null;
function setAutomationEventPublisher(fn) { _publisher = fn; }
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
function automationMiddleware(triggerCode) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            const user = req.user;
            const tenantId = req.tenantId;
            const moduleCode = req.moduleCode;
            if (user && tenantId && moduleCode) {
                const pub = getPublisher();
                if (pub) {
                    pub({
                        event: 'automation.trigger',
                        tenantId,
                        userId: user.userId || user.id,
                        module: moduleCode,
                        entityType: 'automation',
                        entityId: null,
                        data: {
                            trigger: triggerCode || `${req.method.toLowerCase()}_${req.baseUrl?.split('/').pop()}`,
                            method: req.method,
                            path: req.originalUrl,
                        },
                    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
                }
            }
            return originalJson(body);
        };
        next();
    };
}
//# sourceMappingURL=automation.js.map