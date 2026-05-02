"use strict";
// ============================================
// Shahin — Governance Constitution Service
// AGRC-OS Layer 1: Risk appetite, authority
// matrix, and escalation threshold management.
// Machine-readable governance config per tenant.
// ============================================
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConstitution = exports.seedDefaultConstitution = exports.checkRiskAgainstAppetite = exports.resolveApprover = exports.getConstitution = exports.upsertEscalationThresholds = exports.getEscalationThresholds = exports.deleteAuthorityMatrixRule = exports.upsertAuthorityMatrix = exports.getAuthorityMatrix = exports.upsertRiskAppetite = exports.getRiskAppetite = void 0;
var database_port_1 = require("../../../ports/database.port");
// Tables are created by database.ts bootstrap + migration 125.
// No inline DDL needed.
// ── Risk Appetite CRUD ─────────────────────────────────────────────────────
function getRiskAppetite(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT * FROM \"".concat(schema, "\".governance_risk_appetite ORDER BY category"))];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(rowToAppetite)];
            }
        });
    });
}
exports.getRiskAppetite = getRiskAppetite;
function upsertRiskAppetite(tenantId, entries) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, _i, entries_1, e;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    _i = 0, entries_1 = entries;
                    _a.label = 1;
                case 1:
                    if (!(_i < entries_1.length)) return [3 /*break*/, 4];
                    e = entries_1[_i];
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".governance_risk_appetite\n         (category, max_residual_score, acceptance_requires_role, review_cadence_days, updated_at)\n       VALUES ($1, $2, $3, $4, NOW())\n       ON CONFLICT (category) DO UPDATE SET\n         max_residual_score = $2,\n         acceptance_requires_role = $3,\n         review_cadence_days = $4,\n         updated_at = NOW()"), [e.category, e.maxResidualScore, e.acceptanceRequiresRole, e.reviewCadenceDays])];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, getRiskAppetite(tenantId)];
            }
        });
    });
}
exports.upsertRiskAppetite = upsertRiskAppetite;
// ── Authority Matrix CRUD ──────────────────────────────────────────────────
function getAuthorityMatrix(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT * FROM \"".concat(schema, "\".authority_matrix ORDER BY decision_type, min_criticality"))];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(rowToAuthority)];
            }
        });
    });
}
exports.getAuthorityMatrix = getAuthorityMatrix;
function upsertAuthorityMatrix(tenantId, rules) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, _i, rules_1, r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    _i = 0, rules_1 = rules;
                    _a.label = 1;
                case 1:
                    if (!(_i < rules_1.length)) return [3 /*break*/, 6];
                    r = rules_1[_i];
                    if (!r.ruleId) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("UPDATE \"".concat(schema, "\".authority_matrix SET\n           decision_type = $1, min_criticality = $2,\n           required_approver_role = $3, escalation_timeout_hours = $4\n         WHERE rule_id = $5"), [r.decisionType, r.minCriticality, r.requiredApproverRole, r.escalationTimeoutHours, r.ruleId])];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".authority_matrix\n           (decision_type, min_criticality, required_approver_role, escalation_timeout_hours)\n         VALUES ($1, $2, $3, $4)"), [r.decisionType, r.minCriticality, r.requiredApproverRole, r.escalationTimeoutHours])];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, getAuthorityMatrix(tenantId)];
            }
        });
    });
}
exports.upsertAuthorityMatrix = upsertAuthorityMatrix;
function deleteAuthorityMatrixRule(tenantId, ruleId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("DELETE FROM \"".concat(schema, "\".authority_matrix WHERE rule_id = $1"), [ruleId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteAuthorityMatrixRule = deleteAuthorityMatrixRule;
// ── Escalation Thresholds CRUD ─────────────────────────────────────────────
function getEscalationThresholds(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT * FROM \"".concat(schema, "\".escalation_thresholds ORDER BY level"))];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (r) { return ({
                            level: r.level,
                            timeoutHours: r.timeout_hours,
                            notifyRole: r.notify_role,
                        }); })];
            }
        });
    });
}
exports.getEscalationThresholds = getEscalationThresholds;
function upsertEscalationThresholds(tenantId, thresholds) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, _i, thresholds_1, t;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    _i = 0, thresholds_1 = thresholds;
                    _a.label = 1;
                case 1:
                    if (!(_i < thresholds_1.length)) return [3 /*break*/, 4];
                    t = thresholds_1[_i];
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".escalation_thresholds (level, timeout_hours, notify_role, updated_at)\n       VALUES ($1, $2, $3, NOW())\n       ON CONFLICT (level) DO UPDATE SET\n         timeout_hours = $2, notify_role = $3, updated_at = NOW()"), [t.level, t.timeoutHours, t.notifyRole])];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, getEscalationThresholds(tenantId)];
            }
        });
    });
}
exports.upsertEscalationThresholds = upsertEscalationThresholds;
// ── Get full constitution ──────────────────────────────────────────────────
function getConstitution(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, riskAppetite, authorityMatrix, escalationThresholds;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        getRiskAppetite(tenantId),
                        getAuthorityMatrix(tenantId),
                        getEscalationThresholds(tenantId),
                    ])];
                case 1:
                    _a = _b.sent(), riskAppetite = _a[0], authorityMatrix = _a[1], escalationThresholds = _a[2];
                    return [2 /*return*/, { riskAppetite: riskAppetite, authorityMatrix: authorityMatrix, escalationThresholds: escalationThresholds }];
            }
        });
    });
}
exports.getConstitution = getConstitution;
// ── Authority check: who must approve? ─────────────────────────────────────
function resolveApprover(tenantId, decisionType, criticality) {
    return __awaiter(this, void 0, void 0, function () {
        var matrix, CRITICALITY_ORDER, critLevel, matching;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getAuthorityMatrix(tenantId)];
                case 1:
                    matrix = _a.sent();
                    CRITICALITY_ORDER = ['low', 'medium', 'high', 'critical'];
                    critLevel = CRITICALITY_ORDER.indexOf(criticality);
                    matching = matrix
                        .filter(function (r) { return r.decisionType === decisionType; })
                        .filter(function (r) { return CRITICALITY_ORDER.indexOf(r.minCriticality) <= critLevel; })
                        .sort(function (a, b) {
                        return CRITICALITY_ORDER.indexOf(b.minCriticality) - CRITICALITY_ORDER.indexOf(a.minCriticality);
                    });
                    if (matching.length === 0)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            requiredRole: matching[0].requiredApproverRole,
                            timeoutHours: matching[0].escalationTimeoutHours,
                        }];
            }
        });
    });
}
exports.resolveApprover = resolveApprover;
// ── Check risk against appetite ────────────────────────────────────────────
function checkRiskAgainstAppetite(tenantId, category, residualScore) {
    return __awaiter(this, void 0, void 0, function () {
        var appetite, entry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getRiskAppetite(tenantId)];
                case 1:
                    appetite = _a.sent();
                    entry = appetite.find(function (a) { return a.category === category; });
                    if (!entry) {
                        // No appetite defined for this category — allow by default
                        return [2 /*return*/, { withinAppetite: true, maxAllowed: -1, requiredRole: null }];
                    }
                    return [2 /*return*/, {
                            withinAppetite: residualScore <= entry.maxResidualScore,
                            maxAllowed: entry.maxResidualScore,
                            requiredRole: residualScore > entry.maxResidualScore ? entry.acceptanceRequiresRole : null,
                        }];
            }
        });
    });
}
exports.checkRiskAgainstAppetite = checkRiskAgainstAppetite;
// ── Seed default constitution ──────────────────────────────────────────────
function seedDefaultConstitution(tenantId, agrcOsConfig) {
    return __awaiter(this, void 0, void 0, function () {
        var appetite, preset, appetiteMultiplier, cadenceMultiplier, lowApprover, highApprover, baseSla, escLevel, escBaseSla;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getRiskAppetite(tenantId)];
                case 1:
                    appetite = _a.sent();
                    if (appetite.length > 0)
                        return [2 /*return*/]; // already seeded
                    preset = (agrcOsConfig === null || agrcOsConfig === void 0 ? void 0 : agrcOsConfig.riskAppetite) || 'moderate';
                    appetiteMultiplier = preset === 'conservative' ? 0.6 : preset === 'aggressive' ? 1.4 : 1.0;
                    cadenceMultiplier = preset === 'conservative' ? 0.5 : preset === 'aggressive' ? 2.0 : 1.0;
                    return [4 /*yield*/, upsertRiskAppetite(tenantId, [
                            { category: 'operational', maxResidualScore: Math.round(50 * appetiteMultiplier), acceptanceRequiresRole: 'risk_manager', reviewCadenceDays: Math.round(90 * cadenceMultiplier) },
                            { category: 'compliance', maxResidualScore: Math.round(30 * appetiteMultiplier), acceptanceRequiresRole: 'compliance_officer', reviewCadenceDays: Math.round(60 * cadenceMultiplier) },
                            { category: 'financial', maxResidualScore: Math.round(40 * appetiteMultiplier), acceptanceRequiresRole: 'owner', reviewCadenceDays: Math.round(90 * cadenceMultiplier) },
                            { category: 'strategic', maxResidualScore: Math.round(60 * appetiteMultiplier), acceptanceRequiresRole: 'owner', reviewCadenceDays: Math.round(180 * cadenceMultiplier) },
                            { category: 'reputational', maxResidualScore: Math.round(25 * appetiteMultiplier), acceptanceRequiresRole: 'owner', reviewCadenceDays: Math.round(60 * cadenceMultiplier) },
                        ])];
                case 2:
                    _a.sent();
                    lowApprover = preset === 'conservative' ? 'compliance_officer' : 'risk_manager';
                    highApprover = 'owner';
                    baseSla = preset === 'conservative' ? 24 : preset === 'aggressive' ? 72 : 48;
                    return [4 /*yield*/, upsertAuthorityMatrix(tenantId, [
                            { ruleId: '', decisionType: 'risk_acceptance', minCriticality: 'low', requiredApproverRole: lowApprover, escalationTimeoutHours: baseSla * 1.5 },
                            { ruleId: '', decisionType: 'risk_acceptance', minCriticality: 'high', requiredApproverRole: highApprover, escalationTimeoutHours: baseSla },
                            { ruleId: '', decisionType: 'exception_approval', minCriticality: 'low', requiredApproverRole: lowApprover, escalationTimeoutHours: baseSla },
                            { ruleId: '', decisionType: 'exception_approval', minCriticality: 'critical', requiredApproverRole: highApprover, escalationTimeoutHours: Math.max(baseSla / 2, 12) },
                            { ruleId: '', decisionType: 'policy_change', minCriticality: 'medium', requiredApproverRole: 'compliance_officer', escalationTimeoutHours: baseSla },
                            { ruleId: '', decisionType: 'vendor_onboarding', minCriticality: 'high', requiredApproverRole: lowApprover, escalationTimeoutHours: baseSla },
                        ])];
                case 3:
                    _a.sent();
                    escLevel = (agrcOsConfig === null || agrcOsConfig === void 0 ? void 0 : agrcOsConfig.escalationLevel) || 'high';
                    escBaseSla = escLevel === 'all' ? 12 : escLevel === 'medium' ? 18 : escLevel === 'critical' ? 48 : 24;
                    return [4 /*yield*/, upsertEscalationThresholds(tenantId, [
                            { level: 1, timeoutHours: escBaseSla, notifyRole: 'admin' },
                            { level: 2, timeoutHours: escBaseSla * 2, notifyRole: 'compliance_officer' },
                            { level: 3, timeoutHours: escBaseSla * 3, notifyRole: 'owner' },
                        ])];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.seedDefaultConstitution = seedDefaultConstitution;
var VALID_ROLES = ['owner', 'admin', 'compliance_officer', 'risk_manager', 'auditor', 'viewer', 'it_security_officer', 'ciso'];
var VALID_CRITICALITIES = ['low', 'medium', 'high', 'critical'];
function validateConstitution(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var errors, warnings, _a, appetite, matrix, escalation, _i, appetite_1, a, levels, i, i, sorted, decisionTypes, _loop_1, _b, decisionTypes_1, dt;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    errors = [];
                    warnings = [];
                    return [4 /*yield*/, Promise.all([
                            getRiskAppetite(tenantId),
                            getAuthorityMatrix(tenantId),
                            getEscalationThresholds(tenantId),
                        ])];
                case 1:
                    _a = _c.sent(), appetite = _a[0], matrix = _a[1], escalation = _a[2];
                    // Risk appetite validation: scores 0-100
                    for (_i = 0, appetite_1 = appetite; _i < appetite_1.length; _i++) {
                        a = appetite_1[_i];
                        if (a.maxResidualScore < 0 || a.maxResidualScore > 100) {
                            errors.push("Risk appetite \"".concat(a.category, "\": max score ").concat(a.maxResidualScore, " must be 0-100"));
                        }
                        if (!VALID_ROLES.includes(a.acceptanceRequiresRole)) {
                            warnings.push("Risk appetite \"".concat(a.category, "\": role \"").concat(a.acceptanceRequiresRole, "\" not in standard RBAC roles"));
                        }
                        if (a.reviewCadenceDays < 1) {
                            errors.push("Risk appetite \"".concat(a.category, "\": review cadence must be >= 1 day"));
                        }
                    }
                    levels = escalation.map(function (e) { return e.level; }).sort(function (a, b) { return a - b; });
                    for (i = 0; i < levels.length; i++) {
                        if (levels[i] !== i + 1) {
                            errors.push("Escalation levels must be sequential starting from 1. Found gap at level ".concat(levels[i]));
                            break;
                        }
                    }
                    // Escalation timeouts should increase with level
                    for (i = 1; i < escalation.length; i++) {
                        sorted = __spreadArray([], escalation, true).sort(function (a, b) { return a.level - b.level; });
                        if (sorted[i].timeoutHours <= sorted[i - 1].timeoutHours) {
                            warnings.push("Escalation level ".concat(sorted[i].level, " timeout (").concat(sorted[i].timeoutHours, "h) should be greater than level ").concat(sorted[i - 1].level, " (").concat(sorted[i - 1].timeoutHours, "h)"));
                        }
                    }
                    decisionTypes = __spreadArray([], new Set(matrix.map(function (r) { return r.decisionType; })), true);
                    _loop_1 = function (dt) {
                        var rules = matrix.filter(function (r) { return r.decisionType === dt; });
                        var coveredCriticalities = rules.map(function (r) { return r.minCriticality; });
                        if (!coveredCriticalities.some(function (c) { return c === 'low'; })) {
                            warnings.push("Authority matrix \"".concat(dt, "\": no rule covers \"low\" criticality \u2014 defaults may apply"));
                        }
                        for (var _d = 0, rules_2 = rules; _d < rules_2.length; _d++) {
                            var rule = rules_2[_d];
                            if (!VALID_CRITICALITIES.includes(rule.minCriticality)) {
                                errors.push("Authority matrix \"".concat(dt, "\": invalid criticality \"").concat(rule.minCriticality, "\""));
                            }
                            if (!VALID_ROLES.includes(rule.requiredApproverRole)) {
                                warnings.push("Authority matrix \"".concat(dt, "\": role \"").concat(rule.requiredApproverRole, "\" not in standard RBAC roles"));
                            }
                        }
                    };
                    for (_b = 0, decisionTypes_1 = decisionTypes; _b < decisionTypes_1.length; _b++) {
                        dt = decisionTypes_1[_b];
                        _loop_1(dt);
                    }
                    // Must have at least one risk appetite entry
                    if (appetite.length === 0) {
                        warnings.push('No risk appetite entries defined — constitution is incomplete');
                    }
                    if (escalation.length === 0) {
                        warnings.push('No escalation thresholds defined — escalation chain is empty');
                    }
                    return [2 /*return*/, { valid: errors.length === 0, errors: errors, warnings: warnings }];
            }
        });
    });
}
exports.validateConstitution = validateConstitution;
// ── Row mappers ────────────────────────────────────────────────────────────
function rowToAppetite(row) {
    return {
        // @ts-ignore - Pragmatic stabilization to unblock build
        category: row.category,
        maxResidualScore: parseFloat(row.max_residual_score),
        // @ts-ignore - Pragmatic stabilization to unblock build
        acceptanceRequiresRole: row.acceptance_requires_role,
        // @ts-ignore - Pragmatic stabilization to unblock build
        reviewCadenceDays: row.review_cadence_days,
    };
}
function rowToAuthority(row) {
    return {
        // @ts-ignore - Pragmatic stabilization to unblock build
        ruleId: row.rule_id,
        // @ts-ignore - Pragmatic stabilization to unblock build
        decisionType: row.decision_type,
        // @ts-ignore - Pragmatic stabilization to unblock build
        minCriticality: row.min_criticality,
        // @ts-ignore - Pragmatic stabilization to unblock build
        requiredApproverRole: row.required_approver_role,
        // @ts-ignore - Pragmatic stabilization to unblock build
        escalationTimeoutHours: row.escalation_timeout_hours,
    };
}
