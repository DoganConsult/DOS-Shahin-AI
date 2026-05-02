"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_LEVELS = void 0;
exports.riskLevelFromScore = riskLevelFromScore;
exports.RISK_LEVELS = ['critical', 'high', 'medium', 'low', 'negligible'];
function riskLevelFromScore(score) {
    if (score >= 80)
        return 'critical';
    if (score >= 60)
        return 'high';
    if (score >= 40)
        return 'medium';
    if (score >= 20)
        return 'low';
    return 'negligible';
}
//# sourceMappingURL=risk.js.map