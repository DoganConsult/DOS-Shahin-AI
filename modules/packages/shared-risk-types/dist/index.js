"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_LEVELS = void 0;
exports.riskLevelFromScore = riskLevelFromScore;
exports.RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
function riskLevelFromScore(score) {
    if (score >= 75)
        return 'critical';
    if (score >= 50)
        return 'high';
    if (score >= 25)
        return 'medium';
    return 'low';
}
//# sourceMappingURL=index.js.map