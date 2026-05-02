"use strict";
// ============================================================
// Cooperative Workflow #9 — Audit Prep Checklist Co-Builder
// A05 analyzes framework requirements, cross-references evidence
// and control tests, generates checklist with gap indicators.
// Audit team reviews, adds items, marks ready. A05 auto-generates
// evidence package for ready items.
// ============================================================
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChecklists = exports.getChecklist = exports.updateChecklistStatus = exports.markItemReady = exports.addHumanItem = exports.generateChecklist = void 0;
var database_port_1 = require("../../../ports/database.port");
var events_port_1 = require("../../../ports/events.port");
var audit_trail_service_1 = require("../core/audit-trail.service");
var crypto_1 = require("crypto");
var db_1 = require("@dos/db");
var resilience_1 = require("@dos/platform-core/resilience");
// ── Generate Checklist ─────────────────────────────────────────────────────
function generateChecklist(tenantId, input) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, controlsRes, items, _i, _a, ctrl, evidRes, ev, total, approved, lastUpdated, evidenceStatus, isStale, testRes, testResult, gapCount, readyCount, res;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)("SELECT control_id, title, control_ref FROM \"".concat(schema, "\".controls\n     WHERE framework_id = $1 ORDER BY control_ref"), [input.frameworkId]), { tenantId: tenantId, operation: 'query controls' })];
                case 1:
                    controlsRes = _e.sent();
                    items = [];
                    _i = 0, _a = controlsRes.rows;
                    _e.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    ctrl = _a[_i];
                    return [4 /*yield*/, (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)([{ total: 0, approved: 0, last_updated: null }]), (0, database_port_1.safeQuery)("SELECT COUNT(*) AS total,\n              COUNT(*) FILTER (WHERE status = 'approved') AS approved,\n              MAX(updated_at) AS last_updated\n       FROM \"".concat(schema, "\".evidence WHERE control_id = $1"), [ctrl.control_id]), { tenantId: tenantId, operation: 'query evidence' })];
                case 3:
                    evidRes = _e.sent();
                    ev = (0, db_1.getFirstRow)(evidRes);
                    total = Number(ev.total || 0);
                    approved = Number(ev.approved || 0);
                    lastUpdated = ev.last_updated;
                    evidenceStatus = 'missing';
                    if (total > 0 && approved === total) {
                        isStale = lastUpdated && (Date.now() - new Date(lastUpdated).getTime()) > 90 * 86400000;
                        evidenceStatus = isStale ? 'stale' : 'present';
                    }
                    else if (total > 0) {
                        evidenceStatus = 'partial';
                    }
                    return [4 /*yield*/, (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)("SELECT result FROM \"".concat(schema, "\".control_tests\n       WHERE control_id = $1 ORDER BY tested_at DESC LIMIT 1"), [ctrl.control_id]), { tenantId: tenantId, operation: 'query control_tests' })];
                case 4:
                    testRes = _e.sent();
                    testResult = (_b = (0, db_1.getFirstRow)(testRes)) === null || _b === void 0 ? void 0 : _b.result;
                    items.push({
                        itemId: (0, crypto_1.randomUUID)(),
                        controlRef: ctrl.control_ref || ctrl.control_id,
                        controlTitle: ctrl.title,
                        evidenceStatus: evidenceStatus,
                        testResult: testResult || 'not_tested',
                        agentNotes: buildAgentNotes(evidenceStatus, testResult),
                        addedBy: 'agent',
                        markedReady: evidenceStatus === 'present' && testResult === 'pass',
                    });
                    _e.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    gapCount = items.filter(function (i) { return i.evidenceStatus !== 'present' || i.testResult === 'fail'; }).length;
                    readyCount = items.filter(function (i) { return i.markedReady; }).length;
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".audit_prep_checklists\n       (framework_id, audit_team_lead_id, items, gap_count, ready_count)\n     VALUES ($1, $2, $3, $4, $5) RETURNING checklist_id, created_at, updated_at"), [input.frameworkId, input.auditTeamLeadId, JSON.stringify(items), gapCount, readyCount])];
                case 7:
                    res = _e.sent();
                    return [4 /*yield*/, events_port_1.eventBus.publish({
                            tenantId: tenantId,
                            eventType: 'audit_prep.generated', severity: 'info',
                            entityId: (_c = (0, db_1.getFirstRow)(res)) === null || _c === void 0 ? void 0 : _c.checklist_id,
                            payload: { frameworkId: input.frameworkId, totalItems: items.length, gapCount: gapCount, readyCount: readyCount },
                        })];
                case 8:
                    _e.sent();
                    return [2 /*return*/, getChecklist(tenantId, (_d = (0, db_1.getFirstRow)(res)) === null || _d === void 0 ? void 0 : _d.checklist_id)];
            }
        });
    });
}
exports.generateChecklist = generateChecklist;
// ── Add Human Item ─────────────────────────────────────────────────────────
function addHumanItem(tenantId, checklistId, item) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, checklist, items, gapCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, getRawChecklist(schema, checklistId)];
                case 1:
                    checklist = _a.sent();
                    items = checklist.items;
                    items.push({
                        itemId: (0, crypto_1.randomUUID)(),
                        controlRef: item.controlRef,
                        controlTitle: item.controlTitle,
                        evidenceStatus: 'missing',
                        agentNotes: '',
                        humanNotes: item.humanNotes,
                        addedBy: 'human',
                        markedReady: false,
                    });
                    gapCount = items.filter(function (i) { return !i.markedReady; }).length;
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".audit_prep_checklists SET items = $1, gap_count = $2, updated_at = NOW() WHERE checklist_id = $3"), [JSON.stringify(items), gapCount, checklistId])];
                case 2:
                    _a.sent();
                    return [2 /*return*/, getChecklist(tenantId, checklistId)];
            }
        });
    });
}
exports.addHumanItem = addHumanItem;
// ── Mark Item Ready ────────────────────────────────────────────────────────
function markItemReady(tenantId, checklistId, itemId, _userId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, checklist, items, item, readyCount, gapCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, getRawChecklist(schema, checklistId)];
                case 1:
                    checklist = _a.sent();
                    items = checklist.items;
                    item = items.find(function (i) { return i.itemId === itemId; });
                    if (item)
                        item.markedReady = true;
                    readyCount = items.filter(function (i) { return i.markedReady; }).length;
                    gapCount = items.filter(function (i) { return !i.markedReady; }).length;
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".audit_prep_checklists\n     SET items = $1, ready_count = $2, gap_count = $3, updated_at = NOW()\n     WHERE checklist_id = $4"), [JSON.stringify(items), readyCount, gapCount, checklistId])];
                case 2:
                    _a.sent();
                    return [2 /*return*/, getChecklist(tenantId, checklistId)];
            }
        });
    });
}
exports.markItemReady = markItemReady;
// ── Update Checklist Status ────────────────────────────────────────────────
function updateChecklistStatus(tenantId, checklistId, status, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".audit_prep_checklists SET status = $1, updated_at = NOW() WHERE checklist_id = $2"), [status, checklistId])];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, audit_trail_service_1.recordAudit)({
                            tenantId: tenantId,
                            userId: userId,
                            module: 'cooperative-workflows',
                            action: 'update', entityType: 'audit_prep_checklist', entityId: checklistId,
                            afterState: { status: status },
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, getChecklist(tenantId, checklistId)];
            }
        });
    });
}
exports.updateChecklistStatus = updateChecklistStatus;
// ── Query ──────────────────────────────────────────────────────────────────
function getChecklist(tenantId, checklistId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, raw;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, getRawChecklist(schema, checklistId)];
                case 1:
                    raw = _a.sent();
                    return [2 /*return*/, mapChecklist(raw)];
            }
        });
    });
}
exports.getChecklist = getChecklist;
function listChecklists(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT * FROM \"".concat(schema, "\".audit_prep_checklists ORDER BY updated_at DESC LIMIT 50"))];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, res.rows.map(mapChecklist)];
            }
        });
    });
}
exports.listChecklists = listChecklists;
// ── Helpers ────────────────────────────────────────────────────────────────
function buildAgentNotes(evidenceStatus, testResult) {
    var parts = [];
    if (evidenceStatus === 'missing')
        parts.push('⚠ No evidence uploaded');
    if (evidenceStatus === 'stale')
        parts.push('⚠ Evidence is older than 90 days');
    if (evidenceStatus === 'partial')
        parts.push('⚠ Some evidence pending approval');
    if (testResult === 'fail')
        parts.push('⚠ Latest control test failed');
    if (testResult === 'not_tested')
        parts.push('ℹ Control has not been tested');
    if (evidenceStatus === 'present' && testResult === 'pass')
        parts.push('✓ Ready for audit');
    return parts.join('. ');
}
function getRawChecklist(schema, checklistId) {
    return __awaiter(this, void 0, void 0, function () {
        var res, r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT * FROM \"".concat(schema, "\".audit_prep_checklists WHERE checklist_id = $1"), [checklistId])];
                case 1:
                    res = _a.sent();
                    if (!res.rows.length)
                        throw new Error('Checklist not found');
                    r = (0, db_1.getFirstRow)(res);
                    r.items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [];
                    return [2 /*return*/, r];
            }
        });
    });
}
function mapChecklist(r) {
    var _a, _b, _c, _d;
    return {
        checklistId: r.checklist_id, frameworkId: r.framework_id, agentId: r.agent_id,
        auditTeamLeadId: r.audit_team_lead_id,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [],
        status: r.status || 'draft', gapCount: Number(r.gap_count), readyCount: Number(r.ready_count),
        createdAt: ((_b = (_a = r.created_at) === null || _a === void 0 ? void 0 : _a.toISOString) === null || _b === void 0 ? void 0 : _b.call(_a)) || String(r.created_at),
        updatedAt: ((_d = (_c = r.updated_at) === null || _c === void 0 ? void 0 : _c.toISOString) === null || _d === void 0 ? void 0 : _d.call(_c)) || r.updated_at,
    };
}
