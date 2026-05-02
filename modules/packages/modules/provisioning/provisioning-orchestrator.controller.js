"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const provisioning_controller_1 = require("./provisioning.controller");
const router = (0, express_1.Router)();
router.post('/onboarding/:sessionId/approve', provisioning_controller_1.approveOnboarding);
router.post('/onboarding/:sessionId/provision', provisioning_controller_1.provisionWorkspace);
router.post('/provisioning/jobs/:jobId/retry', provisioning_controller_1.retryProvisioningJob);
router.delete('/provisioning/jobs/:jobId', provisioning_controller_1.cancelProvisioningJob);
exports.default = router;
//# sourceMappingURL=provisioning-orchestrator.controller.js.map