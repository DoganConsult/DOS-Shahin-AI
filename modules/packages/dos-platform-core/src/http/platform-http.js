"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPlatformHttp = setPlatformHttp;
exports.notifyD = notifyD;
exports.scopeContext = scopeContext;
exports.lifecycleGate = lifecycleGate;
exports.moduleStack = moduleStack;
exports.auditMiddleware = auditMiddleware;
exports.setAuditData = setAuditData;
exports.automationMiddleware = automationMiddleware;
exports.requireOwnership = requireOwnership;
exports.fieldRbac = fieldRbac;
exports.mandatoryFields = mandatoryFields;
exports.rateLimiter = rateLimiter;
exports.enforceMandatoryFields = enforceMandatoryFields;
exports.enforceStageGates = enforceStageGates;
let _http = null;
function setPlatformHttp(impl) {
    _http = impl;
}
function _failClosed(_req, res, _next) {
    res.status(503).json({ error: 'Platform HTTP middleware not initialized', code: 'PLATFORM_HTTP_NOT_INITIALIZED' });
}
function notifyD(tenantId, module, action, entityId) {
    if (_http) {
        _http.notifyDomainChange(tenantId, module, action, entityId);
    }
    else {
        console.warn('[PlatformHttp] notifyD called before initialization');
    }
}
function scopeContext(req, res, next) {
    if (_http?.scopeContext) {
        return _http.scopeContext(req, res, next);
    }
    _failClosed(req, res, next);
}
function lifecycleGate(configOrModule) {
    return (req, res, next) => {
        if (_http?.lifecycleGate) {
            const mw = _http.lifecycleGate(configOrModule);
            return mw(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function moduleStack(moduleCode) {
    return (req, res, next) => {
        if (_http?.moduleStack) {
            return _http.moduleStack(moduleCode)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function auditMiddleware(actionCode) {
    return (req, res, next) => {
        if (_http?.auditMiddleware) {
            return _http.auditMiddleware(actionCode)(req, res, next);
        }
        next();
    };
}
function setAuditData(req, data) {
    if (_http?.setAuditData) {
        _http.setAuditData(req, data);
    }
    else {
        console.warn('[PlatformHttp] setAuditData called before initialization');
    }
}
function automationMiddleware(triggerCode) {
    return (req, res, next) => {
        if (_http?.automationMiddleware) {
            return _http.automationMiddleware(triggerCode)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function requireOwnership(ownerField) {
    return (req, res, next) => {
        if (_http?.requireOwnership) {
            return _http.requireOwnership(ownerField)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function fieldRbac(config) {
    return (req, res, next) => {
        if (_http?.fieldRbac) {
            return _http.fieldRbac(config)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function mandatoryFields(...fields) {
    return (req, res, next) => {
        if (_http?.mandatoryFields) {
            return _http.mandatoryFields(...fields)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function rateLimiter(options) {
    return (req, res, next) => {
        if (_http?.rateLimiter) {
            return _http.rateLimiter(options)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function enforceMandatoryFields(...fields) {
    return (req, res, next) => {
        if (_http?.enforceMandatoryFields) {
            return _http.enforceMandatoryFields(...fields)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
function enforceStageGates(...stages) {
    return (req, res, next) => {
        if (_http?.enforceStageGates) {
            return _http.enforceStageGates(...stages)(req, res, next);
        }
        _failClosed(req, res, next);
    };
}
//# sourceMappingURL=platform-http.js.map