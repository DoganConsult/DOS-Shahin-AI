"use strict";
// @ts-nocheck
// ============================================
// Shahin — Quick GRC Accelerator Service
// Orchestrates the top 10 quick actions to
// achieve GRC process coverage rapidly.
// Each action wraps existing services and
// tracks completion per tenant.
//
// Actions:
//  1. Run AI-guided onboarding wizard
//  2. Activate framework auto-mapping
//  3. Seed controls from registry
//  4. Generate RACI matrix
//  5. Enable nudge engine
//  6. Run gap assessment
//  7. Set up workflow automation
//  8. Activate journey/roadmap engine
//  9. Enable auto-eval continuous monitoring
// 10. Activate contextual AI assistant
// ============================================
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.resetProgress = exports.skipAction = exports.executeAction = exports.getAcceleratorProgress = void 0;
var database_port_1 = require("../ports/database.port");
var audit_trail_service_1 = require("../../audit/services/audit/core/audit-trail.service");
var events_port_1 = require("../ports/events.port");
var module_sdk_1 = require("@dos/module-sdk");
var db_1 = require("@dos/db");
// ── Action Definitions ─────────────────────────────────────────────────────
var ACTION_DEFINITIONS = [
    {
        id: 'onboarding-wizard',
        order: 1,
        titleEn: 'Run AI-Guided Onboarding',
        titleAr: 'تشغيل الإعداد الموجه بالذكاء الاصطناعي',
        descriptionEn: 'Complete the setup wizard to seed your org profile, sector, and applicable frameworks automatically.',
        descriptionAr: 'أكمل معالج الإعداد لتعبئة ملف المنظمة والقطاع والأطر التنظيمية المطبقة تلقائياً.',
        icon: 'pi pi-bolt',
        category: 'setup',
    },
    {
        id: 'framework-mapping',
        order: 2,
        titleEn: 'Activate Framework Auto-Mapping',
        titleAr: 'تفعيل الربط التلقائي للأطر التنظيمية',
        descriptionEn: 'Map your sector to applicable KSA regulations (NCA, SAMA, SDAIA, etc.) with cross-framework mappings.',
        descriptionAr: 'ربط قطاعك بالأنظمة السعودية المطبقة (الهيئة الوطنية، ساما، سدايا، إلخ) مع الربط المتقاطع.',
        icon: 'pi pi-sitemap',
        category: 'setup',
    },
    {
        id: 'seed-controls',
        order: 3,
        titleEn: 'Seed Controls from Registry',
        titleAr: 'تعبئة الضوابط من السجل',
        descriptionEn: 'Populate your control library with sector-appropriate controls from the pre-built registry.',
        descriptionAr: 'تعبئة مكتبة الضوابط بالضوابط المناسبة لقطاعك من السجل المُعد مسبقاً.',
        icon: 'pi pi-shield',
        category: 'governance',
    },
    {
        id: 'generate-raci',
        order: 4,
        titleEn: 'Generate RACI Matrix',
        titleAr: 'إنشاء مصفوفة المسؤوليات',
        descriptionEn: 'Auto-assign Responsible, Accountable, Consulted, and Informed roles to controls and processes.',
        descriptionAr: 'تعيين تلقائي لأدوار المسؤول والمحاسب والمستشار والمُبلَّغ للضوابط والعمليات.',
        icon: 'pi pi-users',
        category: 'governance',
    },
    {
        id: 'enable-nudges',
        order: 5,
        titleEn: 'Enable Nudge Engine',
        titleAr: 'تفعيل محرك التنبيهات الذكية',
        descriptionEn: 'Activate contextual reminders for overdue tasks, upcoming assessments, and evidence deadlines.',
        descriptionAr: 'تفعيل التذكيرات السياقية للمهام المتأخرة والتقييمات القادمة ومواعيد الأدلة.',
        icon: 'pi pi-bell',
        category: 'monitoring',
    },
    {
        id: 'gap-assessment',
        order: 6,
        titleEn: 'Run Gap Assessment',
        titleAr: 'تشغيل تقييم الفجوات',
        descriptionEn: 'Launch a compliance gap assessment using pre-built templates for an instant compliance score.',
        descriptionAr: 'إطلاق تقييم فجوات الامتثال باستخدام القوالب المُعدة مسبقاً للحصول على درجة امتثال فورية.',
        icon: 'pi pi-chart-bar',
        category: 'governance',
    },
    {
        id: 'workflow-automation',
        order: 7,
        titleEn: 'Set Up Workflow Automation',
        titleAr: 'إعداد أتمتة سير العمل',
        descriptionEn: 'Activate ready-made approval and review workflows for policies, risks, and incidents.',
        descriptionAr: 'تفعيل سير عمل الموافقة والمراجعة الجاهزة للسياسات والمخاطر والحوادث.',
        icon: 'pi pi-cog',
        category: 'governance',
    },
    {
        id: 'journey-roadmap',
        order: 8,
        titleEn: 'Activate Journey & Roadmap',
        titleAr: 'تفعيل الرحلة وخارطة الطريق',
        descriptionEn: 'Generate a phased compliance roadmap with milestones based on your gap assessment results.',
        descriptionAr: 'إنشاء خارطة طريق امتثال مرحلية مع معالم بناءً على نتائج تقييم الفجوات.',
        icon: 'pi pi-map',
        category: 'setup',
    },
    {
        id: 'auto-eval',
        order: 9,
        titleEn: 'Enable Continuous Monitoring',
        titleAr: 'تفعيل المراقبة المستمرة',
        descriptionEn: 'Turn on auto-evaluation of evidence quality and risk score recomputation on a schedule.',
        descriptionAr: 'تشغيل التقييم التلقائي لجودة الأدلة وإعادة حساب درجات المخاطر وفق جدول زمني.',
        icon: 'pi pi-eye',
        category: 'monitoring',
    },
    {
        id: 'contextual-ai',
        order: 10,
        titleEn: 'Activate Contextual AI Assistant',
        titleAr: 'تفعيل مساعد الذكاء الاصطناعي السياقي',
        descriptionEn: 'Enable AI-powered recommendations, proactive assistance, and smart suggestions across all modules.',
        descriptionAr: 'تفعيل التوصيات المدعومة بالذكاء الاصطناعي والمساعدة الاستباقية والاقتراحات الذكية عبر جميع الوحدات.',
        icon: 'pi pi-sparkles',
        category: 'ai',
    },
];
// ── Progress Persistence ───────────────────────────────────────────────────
/**
 * Get or initialize accelerator progress for a tenant.
 * Stores progress in tenant_config JSON under key 'quick_accelerator'.
 */
function getAcceleratorProgress(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, result, stored, _a;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT value FROM \"".concat(schema, "\".tenant_config WHERE key = 'quick_accelerator'"), [])];
                case 2:
                    result = _f.sent();
                    if (result.rows.length > 0 && ((_b = (0, db_1.getFirstRow)(result)) === null || _b === void 0 ? void 0 : _b.value)) {
                        stored = typeof ((_c = (0, db_1.getFirstRow)(result)) === null || _c === void 0 ? void 0 : _c.value) === 'string'
                            ? JSON.parse((_d = (0, db_1.getFirstRow)(result)) === null || _d === void 0 ? void 0 : _d.value)
                            : (_e = (0, db_1.getFirstRow)(result)) === null || _e === void 0 ? void 0 : _e.value;
                        // Merge with latest definitions (in case new actions were added)
                        return [2 /*return*/, mergeWithDefinitions(tenantId, stored)];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _a = _f.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, initializeProgress(tenantId)];
            }
        });
    });
}
exports.getAcceleratorProgress = getAcceleratorProgress;
function initializeProgress(tenantId) {
    var actions = ACTION_DEFINITIONS.map(function (def) { return (__assign(__assign({}, def), { status: 'pending', completedAt: null, error: null })); });
    return {
        tenantId: tenantId,
        actions: actions,
        completedCount: 0,
        totalCount: actions.length,
        percentComplete: 0,
        startedAt: null,
        lastUpdatedAt: null,
    };
}
function mergeWithDefinitions(tenantId, stored) {
    var existingMap = new Map(stored.actions.map(function (a) { return [a.id, a]; }));
    var actions = ACTION_DEFINITIONS.map(function (def) {
        var existing = existingMap.get(def.id);
        if (existing)
            return __assign(__assign({}, def), { status: existing.status, completedAt: existing.completedAt, error: existing.error });
        return __assign(__assign({}, def), { status: 'pending', completedAt: null, error: null });
    });
    var completedCount = actions.filter(function (a) { return a.status === 'completed'; }).length;
    return {
        tenantId: tenantId,
        actions: actions,
        completedCount: completedCount,
        totalCount: actions.length,
        percentComplete: Math.round((completedCount / actions.length) * 100),
        startedAt: stored.startedAt,
        lastUpdatedAt: stored.lastUpdatedAt,
    };
}
function saveProgress(tenantId, progress) {
    return __awaiter(this, void 0, void 0, function () {
        var schema;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    progress.lastUpdatedAt = new Date().toISOString();
                    progress.completedCount = progress.actions.filter(function (a) { return a.status === 'completed'; }).length;
                    progress.percentComplete = Math.round((progress.completedCount / progress.totalCount) * 100);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".tenant_config (key, value)\n     VALUES ('quick_accelerator', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"), [JSON.stringify(progress)])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ── Action Executors ───────────────────────────────────────────────────────
/**
 * Execute a single accelerator action by ID.
 * Each action delegates to existing platform services.
 */
function executeAction(tenantId, userId, actionId) {
    return __awaiter(this, void 0, void 0, function () {
        var progress, action, result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getAcceleratorProgress(tenantId)];
                case 1:
                    progress = _a.sent();
                    if (!progress.startedAt)
                        progress.startedAt = new Date().toISOString();
                    action = progress.actions.find(function (a) { return a.id === actionId; });
                    if (!action)
                        return [2 /*return*/, { actionId: actionId, success: false, message: 'Unknown action ID' }];
                    if (action.status === 'completed')
                        return [2 /*return*/, { actionId: actionId, success: true, message: 'Already completed' }];
                    action.status = 'in_progress';
                    action.error = null;
                    return [4 /*yield*/, saveProgress(tenantId, progress)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 8, , 10]);
                    return [4 /*yield*/, runActionLogic(tenantId, userId, actionId)];
                case 4:
                    result = _a.sent();
                    action.status = 'completed';
                    action.completedAt = new Date().toISOString();
                    action.error = null;
                    return [4 /*yield*/, saveProgress(tenantId, progress)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, (0, audit_trail_service_1.recordAudit)({
                            tenantId: tenantId,
                            userId: userId,
                            module: 'quick-accelerator',
                            action: 'execute',
                            entityType: 'accelerator_action',
                            entityId: actionId,
                            afterState: __assign({ status: 'completed' }, result.details),
                        })];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, events_port_1.eventBus.publish({
                            eventType: 'accelerator.action_completed',
                            tenantId: tenantId,
                            sourceService: 'quick-accelerator',
                            entityType: 'accelerator_action',
                            entityId: actionId,
                            severity: 'info',
                            payload: { actionId: actionId, userId: userId, percentComplete: progress.percentComplete + Math.round(100 / progress.totalCount) },
                        })];
                case 7:
                    _a.sent();
                    return [2 /*return*/, result];
                case 8:
                    err_1 = _a.sent();
                    action.status = 'failed';
                    action.error = (0, module_sdk_1.toErrorMessage)(err_1) || 'Execution failed';
                    return [4 /*yield*/, saveProgress(tenantId, progress)];
                case 9:
                    _a.sent();
                    return [2 /*return*/, { actionId: actionId, success: false, message: (0, module_sdk_1.toErrorMessage)(err_1) || 'Execution failed' }];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.executeAction = executeAction;
/**
 * Skip an action (mark as skipped without executing).
 */
function skipAction(tenantId, actionId) {
    return __awaiter(this, void 0, void 0, function () {
        var progress, action;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getAcceleratorProgress(tenantId)];
                case 1:
                    progress = _a.sent();
                    action = progress.actions.find(function (a) { return a.id === actionId; });
                    if (!action)
                        return [2 /*return*/, { actionId: actionId, success: false, message: 'Unknown action ID' }];
                    action.status = 'skipped';
                    action.completedAt = new Date().toISOString();
                    return [4 /*yield*/, saveProgress(tenantId, progress)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { actionId: actionId, success: true, message: 'Action skipped' }];
            }
        });
    });
}
exports.skipAction = skipAction;
/**
 * Reset all actions to pending.
 */
function resetProgress(tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var progress;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    progress = initializeProgress(tenantId);
                    return [4 /*yield*/, saveProgress(tenantId, progress)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, progress];
            }
        });
    });
}
exports.resetProgress = resetProgress;
// ── Action Logic Dispatcher ────────────────────────────────────────────────
function runActionLogic(tenantId, userId, actionId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (actionId) {
                case 'onboarding-wizard':
                    return [2 /*return*/, executeOnboardingWizard(tenantId, userId)];
                case 'framework-mapping':
                    return [2 /*return*/, executeFrameworkMapping(tenantId, userId)];
                case 'seed-controls':
                    return [2 /*return*/, executeSeedControls(tenantId, userId)];
                case 'generate-raci':
                    return [2 /*return*/, executeGenerateRaci(tenantId, userId)];
                case 'enable-nudges':
                    return [2 /*return*/, executeEnableNudges(tenantId, userId)];
                case 'gap-assessment':
                    return [2 /*return*/, executeGapAssessment(tenantId, userId)];
                case 'workflow-automation':
                    return [2 /*return*/, executeWorkflowAutomation(tenantId, userId)];
                case 'journey-roadmap':
                    return [2 /*return*/, executeJourneyRoadmap(tenantId, userId)];
                case 'auto-eval':
                    return [2 /*return*/, executeAutoEval(tenantId, userId)];
                case 'contextual-ai':
                    return [2 /*return*/, executeContextualAI(tenantId, userId)];
                default:
                    return [2 /*return*/, { actionId: actionId, success: false, message: "No executor for action: ".concat(actionId) }];
            }
            return [2 /*return*/];
        });
    });
}
// ── Individual Action Executors ────────────────────────────────────────────
function executeOnboardingWizard(tenantId, _userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, getCompanyProfile, createCompanyProfile, existing, existingObj, profile, profileObj;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../platform/dos/provisioning/setup-wizard.service'); })];
                case 1:
                    _a = _b.sent(), getCompanyProfile = _a.getCompanyProfile, createCompanyProfile = _a.createCompanyProfile;
                    return [4 /*yield*/, getCompanyProfile(tenantId)];
                case 2:
                    existing = _b.sent();
                    if (existing) {
                        existingObj = existing;
                        return [2 /*return*/, { actionId: 'onboarding-wizard', success: true, message: 'Company profile already exists', details: { profileId: existingObj.profile_id || existingObj.profileId || existingObj.id } }];
                    }
                    return [4 /*yield*/, createCompanyProfile(tenantId, {
                            companyName: 'My Organization',
                            industrySector: 'general',
                            employeeCount: '50-249',
                            ksaRegion: 'KSA',
                            subsidiaries: [],
                        })];
                case 3:
                    profile = _b.sent();
                    profileObj = (profile !== null && profile !== void 0 ? profile : {});
                    return [2 /*return*/, { actionId: 'onboarding-wizard', success: true, message: 'Company profile created — complete the setup wizard for full configuration', details: { profileId: profileObj.profile_id || profileObj.profileId } }];
            }
        });
    });
}
function executeFrameworkMapping(tenantId, _userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, getApplicableRegulations, getSectors, getCompanyProfile, profile, profileObj, sectors, sectorIds, regulations, schema;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../platform/dos/config/registry/registry.service'); })];
                case 1:
                    _a = _f.sent(), getApplicableRegulations = _a.getApplicableRegulations, getSectors = _a.getSectors;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../platform/dos/provisioning/setup-wizard.service'); })];
                case 2:
                    getCompanyProfile = (_f.sent()).getCompanyProfile;
                    return [4 /*yield*/, getCompanyProfile(tenantId)];
                case 3:
                    profile = _f.sent();
                    profileObj = (profile !== null && profile !== void 0 ? profile : {});
                    return [4 /*yield*/, getSectors()];
                case 4:
                    sectors = _f.sent();
                    sectorIds = profileObj.industrySector
                        ? sectors.filter(function (s) { var _a; return (_a = s.name_en) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(String(profileObj.industrySector).toLowerCase()); }).map(function (s) { return s.sector_id; })
                        : sectors.slice(0, 3).map(function (s) { return s.sector_id; });
                    if (sectorIds.length === 0 && sectors.length > 0) {
                        sectorIds.push(sectors[0].sector_id);
                    }
                    return [4 /*yield*/, getApplicableRegulations(sectorIds)];
                case 5:
                    regulations = _f.sent();
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    // Persist mapped frameworks to tenant config
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".tenant_config (key, value)\n     VALUES ('mapped_frameworks', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"), [JSON.stringify({ sectorIds: sectorIds, regulations: regulations, mappedAt: new Date().toISOString() })])];
                case 6:
                    // Persist mapped frameworks to tenant config
                    _f.sent();
                    return [2 /*return*/, {
                            actionId: 'framework-mapping',
                            success: true,
                            message: "Mapped ".concat(((_b = (regulations.mandatory)) === null || _b === void 0 ? void 0 : _b.length) || 0, " mandatory and ").concat(((_c = (regulations.recommended)) === null || _c === void 0 ? void 0 : _c.length) || 0, " recommended frameworks"),
                            details: { sectorIds: sectorIds, mandatoryCount: ((_d = (regulations.mandatory)) === null || _d === void 0 ? void 0 : _d.length) || 0, recommendedCount: ((_e = (regulations.recommended)) === null || _e === void 0 ? void 0 : _e.length) || 0 },
                        }];
            }
        });
    });
}
function executeSeedControls(tenantId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, existing, configResult, mapped, frameworkData, seededCount, _i, _a, fw, nodes, _b, _c, node, _d;
        var _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT COUNT(*)::int AS cnt FROM \"".concat(schema, "\".controls"), [])];
                case 1:
                    existing = _k.sent();
                    if ((((_e = (0, db_1.getFirstRow)(existing)) === null || _e === void 0 ? void 0 : _e.cnt) || 0) > 0) {
                        return [2 /*return*/, { actionId: 'seed-controls', success: true, message: "".concat((_f = (0, db_1.getFirstRow)(existing)) === null || _f === void 0 ? void 0 : _f.cnt, " controls already exist"), details: { existingCount: (_g = (0, db_1.getFirstRow)(existing)) === null || _g === void 0 ? void 0 : _g.cnt } }];
                    }
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT value FROM \"".concat(schema, "\".tenant_config WHERE key = 'mapped_frameworks'"), [])];
                case 2:
                    configResult = _k.sent();
                    mapped = (_h = (0, db_1.getFirstRow)(configResult)) === null || _h === void 0 ? void 0 : _h.value;
                    frameworkData = typeof mapped === 'string' ? JSON.parse(mapped) : mapped;
                    seededCount = 0;
                    if (!((_j = frameworkData === null || frameworkData === void 0 ? void 0 : frameworkData.regulations) === null || _j === void 0 ? void 0 : _j.mandatory)) return [3 /*break*/, 11];
                    _i = 0, _a = frameworkData.regulations.mandatory;
                    _k.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 11];
                    fw = _a[_i];
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT node_id, code, title_en, title_ar, level FROM instrument_structure\n         WHERE instrument_id = $1 AND level = 4 LIMIT 50", [fw.instrumentId || fw.instrument_id])];
                case 4:
                    nodes = _k.sent();
                    _b = 0, _c = nodes.rows;
                    _k.label = 5;
                case 5:
                    if (!(_b < _c.length)) return [3 /*break*/, 10];
                    node = _c[_b];
                    _k.label = 6;
                case 6:
                    _k.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".controls (control_id, title, description, framework_id, status, created_by)\n             VALUES (gen_random_uuid(), $1, $2, $3, 'active', $4)\n             ON CONFLICT (control_id) DO UPDATE SET\n               title = EXCLUDED.title, description = EXCLUDED.description, framework_id = EXCLUDED.framework_id\n             WHERE (controls.title, controls.description) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)"), [node.title_en || node.code, "Control from ".concat(node.code), fw.instrumentId || fw.instrument_id, userId])];
                case 7:
                    _k.sent();
                    seededCount++;
                    return [3 /*break*/, 9];
                case 8:
                    _d = _k.sent();
                    return [3 /*break*/, 9];
                case 9:
                    _b++;
                    return [3 /*break*/, 5];
                case 10:
                    _i++;
                    return [3 /*break*/, 3];
                case 11: return [2 /*return*/, { actionId: 'seed-controls', success: true, message: "Seeded ".concat(seededCount, " controls from registry"), details: { seededCount: seededCount } }];
            }
        });
    });
}
function executeGenerateRaci(tenantId, _userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, generateRaciMatrix, recommendTeamStructure, getCompanyProfile, profile, profileRaci, companyProfile, team, teamObj, roles, raci, schema, raciArr;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../governance/services/misc/raci-generator.service'); })];
                case 1:
                    _a = _b.sent(), generateRaciMatrix = _a.generateRaciMatrix, recommendTeamStructure = _a.recommendTeamStructure;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../platform/dos/provisioning/setup-wizard.service'); })];
                case 2:
                    getCompanyProfile = (_b.sent()).getCompanyProfile;
                    return [4 /*yield*/, getCompanyProfile(tenantId)];
                case 3:
                    profile = _b.sent();
                    profileRaci = (profile !== null && profile !== void 0 ? profile : {});
                    companyProfile = {
                        companySize: profileRaci.employee_count || profileRaci.employeeCount || '50-249',
                        industry: profileRaci.industrySector || 'general',
                        applicableFrameworks: [],
                        hasPrivacyObligations: false,
                    };
                    team = recommendTeamStructure(companyProfile);
                    teamObj = (team !== null && team !== void 0 ? team : {});
                    roles = Array.isArray(teamObj.roles) ? teamObj.roles : [];
                    raci = generateRaciMatrix(companyProfile, roles);
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".tenant_config (key, value)\n     VALUES ('raci_matrix', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"), [JSON.stringify({ matrix: raci, team: team, generatedAt: new Date().toISOString() })])];
                case 4:
                    _b.sent();
                    raciArr = Array.isArray(raci) ? raci : [];
                    return [2 /*return*/, {
                            actionId: 'generate-raci',
                            success: true,
                            message: "Generated RACI matrix with ".concat(raciArr.length, " entries and ").concat(roles.length, " roles"),
                            details: { raciEntries: raciArr.length, roles: roles.length },
                        }];
            }
        });
    });
}
function executeEnableNudges(tenantId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, _a, generateNudges, saveNudges, getRoadmap, roadmap, nudges, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    // Enable nudge engine in tenant config
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".tenant_config (key, value)\n     VALUES ('nudge_engine', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"), [JSON.stringify({ enabled: true, enabledBy: userId, enabledAt: new Date().toISOString(), channels: ['in_app', 'email'] })])];
                case 1:
                    // Enable nudge engine in tenant config
                    _c.sent();
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 8, , 9]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../platform/dos/notifications/nudge/nudge-engine.service'); })];
                case 3:
                    _a = _c.sent(), generateNudges = _a.generateNudges, saveNudges = _a.saveNudges;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../platform/services/misc/roadmap-builder.service'); })];
                case 4:
                    getRoadmap = (_c.sent()).getRoadmap;
                    return [4 /*yield*/, getRoadmap(tenantId)];
                case 5:
                    roadmap = _c.sent();
                    if (!roadmap) return [3 /*break*/, 7];
                    nudges = generateNudges(roadmap, { currentModule: 'dashboard', userId: userId, isFirstVisit: true }, new Date());
                    if (!(nudges.length > 0)) return [3 /*break*/, 7];
                    return [4 /*yield*/, saveNudges(tenantId, nudges)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    _b = _c.sent();
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/, { actionId: 'enable-nudges', success: true, message: 'Nudge engine enabled with in-app and email channels' }];
            }
        });
    });
}
function executeGapAssessment(tenantId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, createAssessment, getAssessments, existing, schema, configResult, mapped, frameworkData, firstFramework, assessment;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../platform/services/assessment/assessment.service'); })];
                case 1:
                    _a = _e.sent(), createAssessment = _a.createAssessment, getAssessments = _a.getAssessments;
                    return [4 /*yield*/, getAssessments(tenantId)];
                case 2:
                    existing = _e.sent();
                    if (existing.length > 0) {
                        return [2 /*return*/, { actionId: 'gap-assessment', success: true, message: "".concat(existing.length, " assessment(s) already exist"), details: { existingCount: existing.length } }];
                    }
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("SELECT value FROM \"".concat(schema, "\".tenant_config WHERE key = 'mapped_frameworks'"), [])];
                case 3:
                    configResult = _e.sent();
                    mapped = (_b = (0, db_1.getFirstRow)(configResult)) === null || _b === void 0 ? void 0 : _b.value;
                    frameworkData = typeof mapped === 'string' ? JSON.parse(mapped) : mapped;
                    firstFramework = (_d = (_c = frameworkData === null || frameworkData === void 0 ? void 0 : frameworkData.regulations) === null || _c === void 0 ? void 0 : _c.mandatory) === null || _d === void 0 ? void 0 : _d[0];
                    if (!firstFramework) {
                        return [2 /*return*/, { actionId: 'gap-assessment', success: true, message: 'No mapped frameworks found — run framework mapping first', details: { hint: 'Execute framework-mapping action first' } }];
                    }
                    return [4 /*yield*/, createAssessment(tenantId, {
                            frameworkId: firstFramework.instrumentId || firstFramework.instrument_id,
                            title: "Initial Gap Assessment \u2014 ".concat(firstFramework.name || firstFramework.title || 'Primary Framework'),
                            createdBy: userId,
                        })];
                case 4:
                    assessment = _e.sent();
                    return [2 /*return*/, {
                            actionId: 'gap-assessment',
                            success: true,
                            message: "Gap assessment created with auto-generated items from framework controls",
                            details: { assessmentId: assessment.assessment_id, title: assessment.title },
                        }];
            }
        });
    });
}
function executeWorkflowAutomation(tenantId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var runWorkflowAutomation;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../workflow/services/ops/workflow-automation.service'); })];
                case 1:
                    runWorkflowAutomation = (_a.sent()).executeWorkflowAutomation;
                    return [2 /*return*/, runWorkflowAutomation(tenantId, userId)];
            }
        });
    });
}
function executeJourneyRoadmap(tenantId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, getRoadmap, createRoadmap, getCompanyProfile, existing, profile, generateRoadmap, roadmap, initializeJourney, _b, phases;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../../platform/services/misc/roadmap-builder.service'); })];
                case 1:
                    _a = _d.sent(), getRoadmap = _a.getRoadmap, createRoadmap = _a.createRoadmap;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../platform/dos/provisioning/setup-wizard.service'); })];
                case 2:
                    getCompanyProfile = (_d.sent()).getCompanyProfile;
                    return [4 /*yield*/, getRoadmap(tenantId)];
                case 3:
                    existing = _d.sent();
                    if (existing) {
                        return [2 /*return*/, { actionId: 'journey-roadmap', success: true, message: 'Roadmap already exists', details: { phases: ((_c = existing.phases) === null || _c === void 0 ? void 0 : _c.length) || 0 } }];
                    }
                    return [4 /*yield*/, getCompanyProfile(tenantId)];
                case 4:
                    profile = _d.sent();
                    if (!profile) {
                        return [2 /*return*/, { actionId: 'journey-roadmap', success: true, message: 'No company profile found — run onboarding wizard first', details: { hint: 'Execute onboarding-wizard action first' } }];
                    }
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../platform/services/misc/roadmap-builder.service'); })];
                case 5:
                    generateRoadmap = (_d.sent()).generateRoadmap;
                    roadmap = generateRoadmap(profile);
                    return [4 /*yield*/, createRoadmap(tenantId, roadmap)];
                case 6:
                    _d.sent();
                    _d.label = 7;
                case 7:
                    _d.trys.push([7, 10, , 11]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../onboarding/services/journey/guided-journey-engine.service'); })];
                case 8:
                    initializeJourney = (_d.sent()).initializeJourney;
                    return [4 /*yield*/, initializeJourney(tenantId, userId, roadmap.roadmapId || '')];
                case 9:
                    _d.sent();
                    return [3 /*break*/, 11];
                case 10:
                    _b = _d.sent();
                    return [3 /*break*/, 11];
                case 11:
                    phases = Array.isArray(roadmap.phases) ? roadmap.phases : [];
                    return [2 /*return*/, {
                            actionId: 'journey-roadmap',
                            success: true,
                            message: "Generated ".concat(phases.length, "-phase compliance roadmap"),
                            details: { phases: phases.length, totalTasks: phases.reduce(function (sum, p) { return sum + (Array.isArray(p.tasks) ? p.tasks.length : 0); }, 0) },
                        }];
            }
        });
    });
}
function executeAutoEval(tenantId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, updateAutoTaskConfig;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    // Enable auto-eval in tenant config
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".tenant_config (key, value)\n     VALUES ('auto_eval', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"), [JSON.stringify({ enabled: true, enabledBy: userId, enabledAt: new Date().toISOString(), intervalHours: 2 })])];
                case 1:
                    // Enable auto-eval in tenant config
                    _a.sent();
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../platform/services/auto/auto-task.service'); })];
                case 2:
                    updateAutoTaskConfig = (_a.sent()).updateAutoTaskConfig;
                    return [4 /*yield*/, updateAutoTaskConfig(tenantId, { enabled: true, evidenceDaysAhead: 7, riskDaysAhead: 7, vendorDaysAhead: 14, autoAssign: true })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { actionId: 'auto-eval', success: true, message: 'Continuous monitoring enabled — auto-eval every 2 hours, auto-task generation active' }];
            }
        });
    });
}
function executeContextualAI(tenantId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var schema;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schema = (0, database_port_1.tenantSchema)(tenantId);
                    // Enable contextual AI in tenant config
                    return [4 /*yield*/, (0, database_port_1.safeQuery)("INSERT INTO \"".concat(schema, "\".tenant_config (key, value)\n     VALUES ('contextual_ai', $1)\n     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"), [JSON.stringify({
                                enabled: true,
                                enabledBy: userId,
                                enabledAt: new Date().toISOString(),
                                features: ['proactive_assistance', 'smart_suggestions', 'risk_insights', 'compliance_tips'],
                            })])];
                case 1:
                    // Enable contextual AI in tenant config
                    _a.sent();
                    return [2 /*return*/, { actionId: 'contextual-ai', success: true, message: 'Contextual AI assistant activated with proactive assistance, smart suggestions, risk insights, and compliance tips' }];
            }
        });
    });
}
