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
 * DAuth route barrel — backend-owned.
 * These route implementations live in backend/src/platform/dauth/routes/ and are
 * NOT exported by the @dos/auth package. Import directly from backend-local paths.
 */
__exportStar(require("./access-contract.routes"), exports);
__exportStar(require("./auth.routes"), exports);
__exportStar(require("./authz-explain.routes"), exports);
__exportStar(require("./dynamic-rbac.routes"), exports);
__exportStar(require("./email-verification.routes"), exports);
__exportStar(require("./invitation.routes"), exports);
__exportStar(require("./me.routes"), exports);
__exportStar(require("./permission-derivation.routes"), exports);
__exportStar(require("./role-detail.routes"), exports);
__exportStar(require("./role-matrix.routes"), exports);
__exportStar(require("./role-profile.routes"), exports);
//# sourceMappingURL=index.js.map