"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const provisioning_controller_1 = require("./provisioning.controller");
const router = (0, express_1.Router)();
router.get('/jobs/:jobId', provisioning_controller_1.getProvisioningJob);
router.get('/jobs/:jobId/steps', provisioning_controller_1.getProvisioningSteps);
router.get('/jobs/:jobId/events', provisioning_controller_1.getProvisioningEvents);
router.get('/jobs/:jobId/temporal', provisioning_controller_1.getTemporalStatus);
exports.default = router;
//# sourceMappingURL=provisioning-status.controller.js.map