"use strict";
/**
 * UPOR Types — Unified Platform Object Registry
 * Dr-Dogan-AGRC-OS / Shahin-AI GRC Platform
 *
 * Shared TypeScript types for the registry service, routes, and tests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELIGIBLE_STATUSES = exports.HARD_BLOCK_STATUSES = void 0;
/** Statuses that can never be surfaced in effective output, even with a tenant override */
exports.HARD_BLOCK_STATUSES = new Set(['deprecated', 'retired', 'draft']);
/** Statuses eligible for the effective resolver */
exports.ELIGIBLE_STATUSES = new Set(['active', 'beta']);
//# sourceMappingURL=upor.types.js.map