import { toPDF } from '@dos/platform-core/export';
import type { ReportData } from '../report/report.service';

export function exportPDF(
  tenantId: string,
  reportData: ReportData,
  columns?: string[],
  language: string = 'en'
): Buffer {
  const flattenedData = reportData.assessments.map(req => ({
    Code: req.controlCode,
    Name: req.controlName,
    Status: req.status,
    Findings: req.findingsCount,
    Score: Math.round(req.complianceScore * 100) + '%'
  }));

  const watermark = language === 'ar' ? 'سري' : 'CONFIDENTIAL';
  return toPDF(
    flattenedData,
    reportData.title,
    columns || ['Code', 'Name', 'Status', 'Findings', 'Score'],
    watermark
  );
}
