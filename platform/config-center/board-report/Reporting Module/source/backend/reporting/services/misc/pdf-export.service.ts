// Phase 11 (M5) — PDF export shim. The canonical pdf-export service
// uses pdfkit (added as runtime dep to compliance-controls-service for
// NCA/SAMA; not yet re-added to evidence-audit-reporting-service). For
// Wave-1 M5 any export button visible to the user uses the service-
// owned /api/export router (sync list/single/bulk exports) — this shim
// only exists so the report.routes compiled file resolves. If a future
// surface actually needs a PDF export, add pdfkit to the service deps
// and replace this stub.

export interface PdfExportRequest {
  title: string;
  sections: Array<{ heading: string; body: string }>;
}

export async function exportToPdf(_req: PdfExportRequest): Promise<Buffer> {
  // Wave-1: no PDF synthesis — return an empty buffer so callers that
  // stream it hand the client a zero-byte body rather than crashing.
  return Buffer.alloc(0);
}

export const exportPDF = exportToPdf;
