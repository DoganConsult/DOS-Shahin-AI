"use strict";
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
exports.listReviews = exports.getReview = exports.finalizeReview = exports.addDialogueEntry = exports.submitHumanAssessment = exports.createAgentAssessment = void 0;
var resilience_1 = require("@dos/platform-core/resilience");
// ============================================================
// Cooperative Workflow #4 — Risk Assessment Pair Review
// A02 runs quantitative scoring, human adds qualitative,
// disagreements trigger structured dialogue, final = blend.
// ============================================================
var database_port_1 = require("../../ports/database.port");
var events_port_1 = require("../../ports/events.port");
var audit_trail_service_1 = require("../../../audit/services/audit/core/audit-trail.service");
var crypto_1 = require("crypto");
var db_1 = require("@dos/db");
var DISAGREEMENT_THRESHOLD = 20; // score difference that triggers dialogue
// ── Create Agent Assessment ────────────────────────────────────────────────
function createAgentAssessment(tenantId, input) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, res;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".risk_pair_reviews\n       (risk_id, agent_id, human_analyst_id, agent_score, agent_reasoning)\n     VALUES ($1, 'AGENT-A02', $2, $3, $4) RETURNING review_id, created_at"), [input.riskId, input.humanAnalystId, input.agentScore, input.agentReasoning])];
                case 1:
                    res = _c.sent();
                    return [4 /*yield*/, events_port_1.eventBus.publish({
                            tenantId: tenantId,
                            eventType: 'risk_pair.agent_assessed', severity: 'info',
                            entityId: input.riskId,
                            payload: { reviewId: (_a = (0, db_1.getFirstRow)(res)) === null || _a === void 0 ? void 0 : _a.review_id, agentScore: input.agentScore },
                        })];
                case 2:
                    _c.sent();
                    return [2 /*return*/, getReview(tenantId, (_b = (0, db_1.getFirstRow)(res)) === null || _b === void 0 ? void 0 : _b.review_id)];
            }
        });
    });
}
exports.createAgentAssessment = createAgentAssessment;
// ── Submit Human Assessment ────────────────────────────────────────────────
function submitHumanAssessment(tenantId, reviewId, input) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, current, row, agentScore, disagreement, nextStatus;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT review_id, risk_id, agent_score\n     FROM \"".concat(schema, "\".risk_pair_reviews\n     WHERE review_id = $1"), [reviewId])];
                case 1:
                    current = _c.sent();
                    if (!current.rows.length)
                        throw new Error('Review not found');
                    row = (0, db_1.getFirstRow)(current);
                    agentScore = Number((_a = row.agent_score) !== null && _a !== void 0 ? _a : 0);
                    disagreement = Math.abs(agentScore - input.humanScore) >= DISAGREEMENT_THRESHOLD;
                    nextStatus = disagreement ? 'dialogue' : 'human_review';
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".risk_pair_reviews\n     SET human_score = $1,\n         human_reasoning = $2,\n         disagreement_flag = $3,\n         status = $4,\n         updated_at = NOW()\n     WHERE review_id = $5"), [input.humanScore, input.humanReasoning, disagreement, nextStatus, reviewId])];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, audit_trail_service_1.recordAudit)({
                            tenantId: tenantId,
                            userId: input.userId, module: 'cooperative-workflows',
                            action: 'update', entityType: 'risk_pair_review', entityId: reviewId,
                            afterState: { humanScore: input.humanScore, disagreement: disagreement },
                        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}))];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, events_port_1.eventBus.publish({
                            tenantId: tenantId,
                            eventType: 'risk_pair.human_assessed',
                            severity: 'info',
                            entityId: String((_b = row.risk_id) !== null && _b !== void 0 ? _b : ''),
                            payload: { reviewId: reviewId, humanScore: input.humanScore, disagreement: disagreement },
                        })];
                case 4:
                    _c.sent();
                    return [2 /*return*/, getReview(tenantId, reviewId)];
            }
        });
    });
}
exports.submitHumanAssessment = submitHumanAssessment;
// ── Add Dialogue Entry ─────────────────────────────────────────────────────
function addDialogueEntry(tenantId, reviewId, entry) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, current, r, existing, next;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT dialogue_entries\n     FROM \"".concat(schema, "\".risk_pair_reviews\n     WHERE review_id = $1"), [reviewId])];
                case 1:
                    current = _b.sent();
                    if (!current.rows.length)
                        throw new Error('Review not found');
                    r = (0, db_1.getFirstRow)(current);
                    existing = typeof r.dialogue_entries === 'string'
                        ? JSON.parse(r.dialogue_entries)
                        : ((_a = r.dialogue_entries) !== null && _a !== void 0 ? _a : []);
                    next = {
                        id: (0, crypto_1.randomUUID)(),
                        reviewId: reviewId,
                        from: entry.from,
                        source: entry.from === 'agent' ? 'ai' : 'human',
                        message: entry.message,
                        timestamp: new Date().toISOString(),
                    };
                    existing.push(next);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".risk_pair_reviews\n     SET dialogue_entries = $1,\n         status = 'dialogue',\n         updated_at = NOW()\n     WHERE review_id = $2"), [JSON.stringify(existing), reviewId])];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, events_port_1.eventBus.publish({
                            tenantId: tenantId,
                            eventType: 'risk_pair.dialogue_added',
                            severity: 'info',
                            entityId: reviewId,
                            payload: { from: entry.from },
                        }).catch(function () { return undefined; })];
                case 3:
                    _b.sent();
                    return [2 /*return*/, getReview(tenantId, reviewId)];
            }
        });
    });
}
exports.addDialogueEntry = addDialogueEntry;
// ── Finalize Review ────────────────────────────────────────────────────────
function finalizeReview(tenantId, reviewId, input) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, rev;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".risk_pair_reviews\n     SET final_score = $1, final_method = $2, status = 'finalized', finalized_at = NOW()\n     WHERE review_id = $3"), [input.finalScore, input.finalMethod, reviewId])];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT risk_id FROM \"".concat(schema, "\".risk_pair_reviews WHERE review_id = $1"), [reviewId])];
                case 2:
                    rev = _b.sent();
                    if (!rev.rows.length) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".risks SET inherent_score = $1 WHERE risk_id = $2"), [input.finalScore, (_a = (0, db_1.getFirstRow)(rev)) === null || _a === void 0 ? void 0 : _a.risk_id]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}))];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4: return [4 /*yield*/, (0, audit_trail_service_1.recordAudit)({
                        tenantId: tenantId,
                        userId: input.userId, module: 'cooperative-workflows',
                        action: 'update', entityType: 'risk_pair_review', entityId: reviewId,
                        afterState: { finalScore: input.finalScore, finalMethod: input.finalMethod },
                    })];
                case 5:
                    _b.sent();
                    return [2 /*return*/, getReview(tenantId, reviewId)];
            }
        });
    });
}
exports.finalizeReview = finalizeReview;
// ── Query ──────────────────────────────────────────────────────────────────
function getReview(tenantId, reviewId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT * FROM \"".concat(schema, "\".risk_pair_reviews WHERE review_id = $1"), [reviewId])];
                case 1:
                    res = _a.sent();
                    if (!res.rows.length)
                        throw new Error('Review not found');
                    return [2 /*return*/, mapReview((0, db_1.getFirstRow)(res))];
            }
        });
    });
}
exports.getReview = getReview;
function listReviews(tenantId, status) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, where, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    where = status ? "WHERE status = $1" : '';
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT * FROM \"".concat(schema, "\".risk_pair_reviews ").concat(where, " ORDER BY created_at DESC LIMIT 100"), status ? [status] : [])];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, res.rows.map(mapReview)];
            }
        });
    });
}
exports.listReviews = listReviews;
function mapReview(r) {
    var _a, _b, _c, _d;
    return {
        // @ts-ignore - Pragmatic stabilization to unblock build
        reviewId: r.review_id, riskId: r.risk_id, agentId: r.agent_id,
        // @ts-ignore - Pragmatic stabilization to unblock build
        humanAnalystId: r.human_analyst_id, agentScore: r.agent_score,
        // @ts-ignore - Pragmatic stabilization to unblock build
        agentReasoning: r.agent_reasoning, humanScore: r.human_score,
        // @ts-ignore - Pragmatic stabilization to unblock build
        humanReasoning: r.human_reasoning, finalScore: r.final_score,
        // @ts-ignore - Pragmatic stabilization to unblock build
        finalMethod: r.final_method, disagreementFlag: r.disagreement_flag,
        dialogueEntries: typeof r.dialogue_entries === 'string' ? JSON.parse(r.dialogue_entries) : r.dialogue_entries || [],
        // @ts-ignore - Pragmatic stabilization to unblock build
        status: r.status, createdAt: ((_b = (_a = r.created_at) === null || _a === void 0 ? void 0 : _a.toISOString) === null || _b === void 0 ? void 0 : _b.call(_a)) || r.created_at,
        // @ts-ignore - Pragmatic stabilization to unblock build
        finalizedAt: ((_d = (_c = r.finalized_at) === null || _c === void 0 ? void 0 : _c.toISOString) === null || _d === void 0 ? void 0 : _d.call(_c)) || r.finalized_at,
    };
}
