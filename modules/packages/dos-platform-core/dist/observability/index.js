"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRecordAudit = setRecordAudit;
exports.recordAudit = recordAudit;
exports.setDetectPatterns = setDetectPatterns;
exports.detectPatterns = detectPatterns;
exports.computeWorkload = computeWorkload;
exports.getLatestWorkload = getLatestWorkload;
exports.computeBatchWorkloads = computeBatchWorkloads;
__exportStar(require("./logger"), exports);
__exportStar(require("./prometheus.service"), exports);
__exportStar(require("./tenant-migration-ledger-refresher"), exports);
__exportStar(require("./tracing"), exports);
__exportStar(require("./pii-redact"), exports);
const logger_1 = require("./logger");
let _recordAuditImpl = null;
/**
 * Register the real audit implementation at service startup.
 * Follows the same pattern as setLogger / setEventBus in @dos/module-sdk.
 */
function setRecordAudit(impl) {
    _recordAuditImpl = impl;
}
async function recordAudit(record) {
    if (_recordAuditImpl)
        return _recordAuditImpl(record);
    logger_1.logger.warn('[observability] recordAudit stub called — no implementation registered via setRecordAudit(). Audit record dropped.', {
        module: record.module,
        action: record.action,
        entityType: record.entityType,
    });
}
let _detectPatternsImpl = null;
/**
 * Register the real pattern detection implementation at service startup.
 */
function setDetectPatterns(impl) {
    _detectPatternsImpl = impl;
}
let _detectPatternsWarned = false;
async function detectPatterns(tenantId, discoveries, windowMinutes) {
    if (_detectPatternsImpl)
        return _detectPatternsImpl(tenantId, discoveries, windowMinutes);
    if (!_detectPatternsWarned && discoveries.length > 0) {
        logger_1.logger.warn('[observability] detectPatterns stub active — no implementation registered via setDetectPatterns(). Returning [] for all discovery input.');
        _detectPatternsWarned = true;
    }
    return [];
}
const _workloads = new Map();
async function computeWorkload(tenantId, userId) {
    const computedAt = new Date().toISOString();
    const snapshot = { tenantId, userId, score: 0, computedAt };
    _workloads.set(`${tenantId}:${userId}`, snapshot);
    return snapshot;
}
async function getLatestWorkload(tenantId, userId) {
    return _workloads.get(`${tenantId}:${userId}`) ?? computeWorkload(tenantId, userId);
}
async function computeBatchWorkloads(tenantId, userIds) {
    const results = [];
    for (const userId of userIds) {
        results.push(await computeWorkload(tenantId, userId));
    }
    return results;
}
//# sourceMappingURL=index.js.map