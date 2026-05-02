export async function getScheduledReports(_tenantId) {
    return [];
}
export async function generateExecutiveSnapshot(_tenantId) {
    return { generatedAt: new Date().toISOString(), overallComplianceScore: 0 };
}
export async function generateComplianceReport(_tenantId, _frameworkId) {
    return {
        title: '',
        frameworkId: _frameworkId,
        generatedAt: new Date().toISOString(),
        overallScore: 0,
        assessments: [],
        controlSummary: { compliant: 0, partiallyCompliant: 0, nonCompliant: 0, notApplicable: 0, notAssessed: 0 },
        evidenceCount: 0,
    };
}
//# sourceMappingURL=report.service.js.map