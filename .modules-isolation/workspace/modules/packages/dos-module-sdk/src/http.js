"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
exports.buildMeta = buildMeta;
exports.sendOk = sendOk;
exports.sendCreated = sendCreated;
exports.sendAction = sendAction;
exports.sendPaginated = sendPaginated;
exports.sendError = sendError;
exports.ok = ok;
exports.paginated = paginated;
exports.action = action;
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function buildMeta(req) {
    return {
        requestId: req?.correlationId || 'unknown',
        timestamp: new Date().toISOString(),
    };
}
function sendOk(res, data, req) {
    res.status(200).json({ success: true, data, meta: buildMeta(req) });
}
function sendCreated(res, data, req) {
    res.status(201).json({ success: true, data, meta: buildMeta(req) });
}
function sendAction(res, message, req) {
    res.status(200).json({ success: true, message, meta: buildMeta(req) });
}
function sendPaginated(res, data, total, page, pageSize, req) {
    res.status(200).json({
        success: true,
        data,
        meta: {
            ...buildMeta(req),
            page,
            pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
    });
}
/**
 * Send an error response. Mirrors `backend/src/utils/http-error.util#sendError`.
 * If the caught error has a statusCode/status property use it; otherwise use fallbackStatus.
 * For 5xx errors, the client message is sanitised unless the message matches a known-safe pattern.
 */
const SAFE_ERROR_PATTERNS = [
    /^Missing required field/,
    /^Invalid .+ format$/,
    /^Session not found$/,
    /^Job not found$/,
    /^already registered$/i,
    /^blocked/i,
    /^Provisioning job/,
    /^No provisioning/,
    /^Onboarding session/,
];
function sendError(res, err, fallbackStatus = 500, fallbackMessage = 'Internal server error') {
    const msg = err instanceof Error ? err.message : String(err ?? fallbackMessage);
    if (fallbackStatus < 500) {
        res.status(fallbackStatus).json({ error: msg });
        return;
    }
    const errObj = err;
    const status = typeof errObj?.["statusCode"] === 'number'
        ? errObj["statusCode"]
        : typeof errObj?.["status"] === 'number'
            ? errObj["status"]
            : fallbackStatus;
    const clientMsg = SAFE_ERROR_PATTERNS.some((p) => p.test(msg)) ? msg : fallbackMessage;
    res.status(status).json({ error: clientMsg });
}
function toSafeInt(value, fallback) {
    const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) ? n : fallback;
}
function resolvePagination(total, pageOrQuery, pageSizeOrReq, reqMaybe) {
    if (typeof pageOrQuery === 'number' && typeof pageSizeOrReq === 'number') {
        return { page: Math.max(1, pageOrQuery), pageSize: Math.max(1, pageSizeOrReq), req: reqMaybe ?? {} };
    }
    const query = (pageOrQuery ?? {});
    const limit = Math.max(1, Math.min(200, toSafeInt(query.limit ?? query.pageSize, 25)));
    const offset = Math.max(0, toSafeInt(query.offset, 0));
    const page = Math.max(1, toSafeInt(query.page, Math.floor(offset / limit) + 1));
    const pageSize = Math.max(1, Math.min(200, toSafeInt(query.pageSize, limit)));
    const req = (pageSizeOrReq ?? {});
    void total;
    return { page, pageSize, req };
}
function ok(data, req) {
    return { success: true, data, meta: buildMeta((req ?? {})) };
}
function paginated(data, total, pageOrQuery, pageSizeOrReq, reqMaybe) {
    const { page, pageSize, req } = resolvePagination(total, pageOrQuery, pageSizeOrReq, reqMaybe);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    return {
        success: true,
        data,
        meta: {
            ...buildMeta(req),
            page,
            pageSize,
            total,
            totalPages,
        },
    };
}
function action(message, req) {
    return { success: true, message, meta: buildMeta((req ?? {})) };
}
//# sourceMappingURL=http.js.map