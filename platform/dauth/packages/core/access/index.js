"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @dos/auth/access barrel export
 */
__exportStar(require("./access-profile.service"), exports);
__exportStar(require("./access-review.service"), exports);
__exportStar(require("./access-snapshot.service"), exports);
__exportStar(require("./access.resolver"), exports);
__exportStar(require("./admin-role-resolver"), exports);
__exportStar(require("./authorization-audit.service"), exports);
__exportStar(require("./authorization-matrix.service"), exports);
__exportStar(require("./canonical-access.service"), exports);
__exportStar(require("./canonical-access.types"), exports);
__exportStar(require("./decision-engine"), exports);
__exportStar(require("./functional-role.service"), exports);
__exportStar(require("./permission.service"), exports);
__exportStar(require("./role-assignment.service"), exports);
__exportStar(require("./role-permission-lookup.service"), exports);
__exportStar(require("./role-profiles.service"), exports);
__exportStar(require("./security-posture.service"), exports);
__exportStar(require("./rbac"), exports);
//# sourceMappingURL=index.js.map