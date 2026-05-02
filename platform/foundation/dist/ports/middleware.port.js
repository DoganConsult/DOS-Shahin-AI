"use strict";
/**
 * Middleware port — outbound interface wrapping HTTP utility middlewares.
 * Default impls are inert pass-throughs so the module is testable standalone;
 * host wires real `asyncHandler/validate/auditMiddleware/setAuditData/moduleStack`
 * from `@dos/platform-core/http` (or any equivalent) via `bindMiddlewarePort`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleStack = exports.setAuditData = exports.auditMiddleware = exports.validate = exports.asyncHandler = void 0;
exports.bindMiddlewarePort = bindMiddlewarePort;
exports.scopeContext = scopeContext;
const defaultAsyncHandler = (fn) => async (req, res, next) => {
    try {
        await Promise.resolve(fn(req, res, next));
    }
    catch (err) {
        next(err);
    }
};
const defaultValidate = () => (_req, _res, next) => next();
const defaultAudit = () => (_req, _res, next) => next();
const defaultSetAudit = (res, data) => {
    res.__auditData = { ...(res.__auditData ?? {}), ...data };
};
const defaultModuleStack = (moduleCode) => (req, _res, next) => {
    req.moduleCode = moduleCode;
    next();
};
let _asyncHandler = defaultAsyncHandler;
let _validate = defaultValidate;
let _auditMiddleware = defaultAudit;
let _setAuditData = defaultSetAudit;
let _moduleStack = defaultModuleStack;
function bindMiddlewarePort(impl) {
    if (impl.asyncHandler)
        _asyncHandler = impl.asyncHandler;
    if (impl.validate)
        _validate = impl.validate;
    if (impl.auditMiddleware)
        _auditMiddleware = impl.auditMiddleware;
    if (impl.setAuditData)
        _setAuditData = impl.setAuditData;
    if (impl.moduleStack)
        _moduleStack = impl.moduleStack;
}
const asyncHandler = (fn) => _asyncHandler(fn);
exports.asyncHandler = asyncHandler;
const validate = (s) => _validate(s);
exports.validate = validate;
const auditMiddleware = (m) => _auditMiddleware(m);
exports.auditMiddleware = auditMiddleware;
const setAuditData = (r, d) => _setAuditData(r, d);
exports.setAuditData = setAuditData;
const moduleStack = (m) => _moduleStack(m);
exports.moduleStack = moduleStack;
function scopeContext(_req, _res, next) {
    next();
}
//# sourceMappingURL=middleware.port.js.map