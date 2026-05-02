"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * AI Governance Module Controller
 *
 * Consolidates the four AI governance route files into a single module
 * controller, following the same pattern as qiyas.controller.ts.
 *
 * Sub-routers:
 *   /config  -> ai-governance-config.routes   (enforcement mode, SoD policy)
 *   /ops     -> ai-governance-ops.routes       (break-glass, promotions, health, repair)
 *   /wave1   -> ai-governance-wave1.routes     (alerts, kill switches, agent stats, drift, maturity, board)
 *   /wave2   -> ai-governance-wave2.routes     (fairness, EU AI Act, red team, ethics, impact, regulatory)
 *   (root)   -> ai-act-classification.routes  (EU AI Act classification, AIIA CRUD, scoring)
 */
const express_1 = require("express");
const middleware_port_1 = require("./ports/middleware.port");
const ai_governance_config_routes_1 = __importDefault(require("./routes/ai/ai-governance-config.routes"));
const ai_governance_ops_routes_1 = __importDefault(require("./routes/ai/ai-governance-ops.routes"));
const ai_governance_wave1_routes_1 = __importDefault(require("./routes/ai/ai-governance-wave1.routes"));
const ai_governance_wave2_routes_1 = __importDefault(require("./routes/ai/ai-governance-wave2.routes"));
const ai_act_classification_routes_1 = __importDefault(require("./routes/ai/ai-act-classification.routes"));
const router = (0, express_1.Router)();
// Apply field-level RBAC filtering for all ai-governance endpoints
router.use((0, middleware_port_1.fieldRbacFilter)('ai-governance'));
// Mount sub-routers
router.use('/config', ai_governance_config_routes_1.default);
router.use('/ops', ai_governance_ops_routes_1.default);
router.use('/wave1', ai_governance_wave1_routes_1.default);
router.use('/wave2', ai_governance_wave2_routes_1.default);
// EU AI Act classification and impact assessment routes
// Mounted at root level so paths become /api/ai-governance/models/:modelId/classify etc.
router.use('/', ai_act_classification_routes_1.default);
exports.default = router;
//# sourceMappingURL=ai-governance.controller.js.map