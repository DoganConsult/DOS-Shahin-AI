// Phase 11 (M5) — Excel export shim. The canonical Excel export uses
// exceljs (added as runtime dep to compliance-controls-service for NCA
// exports; not re-added to evidence-audit-reporting-service yet). For
// Wave-1 M5 the visible export surface is served by the service-owned
// /api/export router (sync CSV/JSON exports), so this shim exists only
// to let report.routes compile and load.

export interface ExcelExportRequest {
  sheetName: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

export async function exportToExcel(_req: ExcelExportRequest): Promise<Buffer> {
  return Buffer.alloc(0);
}

export const exportExcel = exportToExcel;
