"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYBOOKS_ACTIONS = exports.PLAYBOOKS_ROLES = exports.PLAYBOOKS_PERMISSIONS = void 0;
const playbooks_module_1 = require("../playbooks.module");
exports.PLAYBOOKS_PERMISSIONS = playbooks_module_1.PLAYBOOKS_MANIFEST.securityPermissions;
exports.PLAYBOOKS_ROLES = playbooks_module_1.PLAYBOOKS_MANIFEST.securityRoles;
exports.PLAYBOOKS_ACTIONS = playbooks_module_1.PLAYBOOKS_MANIFEST.securityActions;
//# sourceMappingURL=playbooks.security.js.map