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
exports.isModuleOn = exports.readModuleOperatingStates = exports.readGovernanceContext = exports.invalidateContextCache = void 0;
var database_port_1 = require("../../ports/database.port");
var db_1 = require("@dos/db");
var contextCache = new Map();
var moduleStateCache = new Map();
var CTX_TTL_MS = 5 * 60 * 1000;
function invalidateContextCache(tenantId) {
    contextCache.delete(tenantId);
    moduleStateCache.delete(tenantId);
}
exports.invalidateContextCache = invalidateContextCache;
function readGovernanceContext(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var cached, result, r, ctx, oldest, _a;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    cached = contextCache.get(tenantId);
                    if (cached && Date.now() - cached.fetchedAt < CTX_TTL_MS)
                        return [2 /*return*/, cached.ctx];
                    _l.label = 1;
                case 1:
                    _l.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT tenant_id, context_version, complexity,\n              business_profile, regulatory_profile, framework_profile,\n              module_profile, ownership_profile, persona_profile,\n              pain_profile, automation_profile, agent_profile,\n              computed_at\n       FROM public.tenant_governance_context\n       WHERE tenant_id = $1 AND is_active = true\n       LIMIT 1", [tenantId])];
                case 2:
                    result = _l.sent();
                    if (result.rows.length === 0)
                        return [2 /*return*/, null];
                    r = (0, db_1.getFirstRow)(result);
                    ctx = {
                        tenantId: r.tenant_id,
                        contextVersion: r.context_version,
                        complexity: r.complexity,
                        businessProfile: (_b = r.business_profile) !== null && _b !== void 0 ? _b : {},
                        regulatoryProfile: (_c = r.regulatory_profile) !== null && _c !== void 0 ? _c : {},
                        frameworkProfile: (_d = r.framework_profile) !== null && _d !== void 0 ? _d : {},
                        moduleProfile: (_e = r.module_profile) !== null && _e !== void 0 ? _e : {},
                        ownershipProfile: (_f = r.ownership_profile) !== null && _f !== void 0 ? _f : {},
                        personaProfile: (_g = r.persona_profile) !== null && _g !== void 0 ? _g : {},
                        painProfile: (_h = r.pain_profile) !== null && _h !== void 0 ? _h : {},
                        automationProfile: (_j = r.automation_profile) !== null && _j !== void 0 ? _j : {},
                        agentProfile: (_k = r.agent_profile) !== null && _k !== void 0 ? _k : {},
                        computedAt: r.computed_at,
                    };
                    if (contextCache.size >= 200) {
                        oldest = contextCache.keys().next().value;
                        if (oldest !== undefined)
                            contextCache.delete(oldest);
                    }
                    contextCache.set(tenantId, { ctx: ctx, fetchedAt: Date.now() });
                    return [2 /*return*/, ctx];
                case 3:
                    _a = _l.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.readGovernanceContext = readGovernanceContext;
function readModuleOperatingStates(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var cached, result, states, oldest, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    cached = moduleStateCache.get(tenantId);
                    if (cached && Date.now() - cached.fetchedAt < CTX_TTL_MS)
                        return [2 /*return*/, cached.states];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT module_code, state, activation_source, trial_expiry_at, is_mandatory\n       FROM public.module_operating_states\n       WHERE tenant_id = $1 AND is_active = true\n       ORDER BY priority, module_code", [tenantId])];
                case 2:
                    result = _b.sent();
                    states = result.rows.map(function (r) {
                        var _a, _b, _c, _d, _e;
                        return ({
                            moduleCode: String((_a = r.module_code) !== null && _a !== void 0 ? _a : ''),
                            state: (String((_b = r.state) !== null && _b !== void 0 ? _b : 'on') === 'off' || String((_c = r.state) !== null && _c !== void 0 ? _c : 'on') === 'trial') ? String((_d = r.state) !== null && _d !== void 0 ? _d : 'on') : 'on',
                            activationSource: String((_e = r.activation_source) !== null && _e !== void 0 ? _e : ''),
                            trialExpiryAt: r.trial_expiry_at != null ? String(r.trial_expiry_at) : null,
                            isMandatory: !!r.is_mandatory,
                        });
                    });
                    if (moduleStateCache.size >= 200) {
                        oldest = moduleStateCache.keys().next().value;
                        if (oldest !== undefined)
                            moduleStateCache.delete(oldest);
                    }
                    moduleStateCache.set(tenantId, { states: states, fetchedAt: Date.now() });
                    return [2 /*return*/, states];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.readModuleOperatingStates = readModuleOperatingStates;
function isModuleOn(states, moduleCode) {
    var s = states.find(function (m) { return m.moduleCode === moduleCode; });
    if (!s)
        return true;
    if (s.state === 'on')
        return true;
    if (s.state === 'trial') {
        if (!s.trialExpiryAt)
            return true;
        return new Date(s.trialExpiryAt) >= new Date();
    }
    return false;
}
exports.isModuleOn = isModuleOn;
