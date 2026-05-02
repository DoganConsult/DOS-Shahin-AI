import { toXLSX } from '@dos/platform-core/export';
export function exportExcel(tenantId, reportData, columns) {
    const flattenedData = reportData.assessments.map(req => ({
        Code: req.controlCode,
        Name: req.controlName,
        Status: req.status,
        Findings: req.findingsCount,
        Score: Math.round(req.complianceScore * 100) + '%'
    }));
    return toXLSX(flattenedData, columns || ['Code', 'Name', 'Status', 'Findings', 'Score'], reportData.title || 'Export');
}
//# sourceMappingURL=excel-export.service.js.map