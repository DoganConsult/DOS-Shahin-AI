export const RISK_LEVELS = ['critical', 'high', 'medium', 'low', 'negligible'];
export function riskLevelFromScore(score) {
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