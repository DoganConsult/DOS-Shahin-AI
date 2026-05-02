import { toXLSX } from '@dos/platform-core/export';
import type { ReportData } from '../report/report.service';

export function exportExcel(
  tenantId: string,
  reportData: ReportData,
  columns?: string[]
): Buffer {
  const flattenedData = reportData.assessments.map(req => ({
    Code: req.controlCode,
    Name: req.controlName,
    Status: req.status,
    Findings: req.findingsCount,
    Score: Math.round(req.complianceScore * 100) + '%'
  }));

  return toXLSX(
    flattenedData,
    columns || ['Code', 'Name', 'Status', 'Findings', 'Score'],
    reportData.title || 'Export'
  );
}
