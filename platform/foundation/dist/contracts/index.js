"use strict";
/**
 * @dos/module-foundation/contracts
 *
 * Public typed boundary for the Foundation module. Peer modules MUST consume
 * Foundation through this barrel — never via relative paths into module
 * internals (`source/backend/...`) or runtime imports of services.
 *
 * Contents:
 *  - Domain types (FoundationEntityType, FoundationStatus, FoundationNode, …)
 *  - Request/response DTOs (FoundationNodeCreateDTO, FoundationTreeResponseDTO, …)
 *  - Event-name constants and unions (FOUNDATION_EVENT_NAMES, …)
 *  - Permission-code constants and unions (FOUNDATION_PERMISSION_CODES, …)
 *  - Error-code constants (FOUNDATION_ERROR_CODES, …)
 *
 * This file is pure TypeScript with zero runtime side-effects beyond the
 * frozen const objects. Safe to import from any tier (frontend, backend,
 * other modules, services, tests).
 */
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
__exportStar(require("./foundation.types"), exports);
__exportStar(require("./foundation.dto"), exports);
__exportStar(require("./foundation.events"), exports);
__exportStar(require("./foundation.event-payloads"), exports);
__exportStar(require("./foundation.permissions"), exports);
__exportStar(require("./foundation.errors"), exports);
//# sourceMappingURL=index.js.map