"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bootstrap_routes_1 = __importDefault(require("./routes/bootstrap.routes"));
const bootstrap_diagnostics_routes_1 = __importDefault(require("./routes/bootstrap-diagnostics.routes"));
const bootstrap_admin_routes_1 = __importDefault(require("./admin/bootstrap-admin.routes"));
const router = (0, express_1.Router)();
router.use('/', bootstrap_routes_1.default);
router.use('/diagnostics', bootstrap_diagnostics_routes_1.default);
router.use('/admin', bootstrap_admin_routes_1.default);
exports.default = router;
//# sourceMappingURL=bootstrap.controller.js.map