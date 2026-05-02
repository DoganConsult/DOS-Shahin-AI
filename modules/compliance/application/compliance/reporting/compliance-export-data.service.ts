/**
 * Compliance Export — CSV/Excel export for controls and findings registers.
 *
 * Split from compliance-audit-export.service.ts for modularity.
 */

import * as ExcelJS from "exceljs";
import type { ComplianceScope } from "../../misc/compliance.utils.js";
import { getComplianceSettings } from "../core/compliance-settings.service";
import { getControlsRegister, getFindingsRegister } from "../assessments/compliance-assessment-findings.service";
import { safeQuery } from "@dos/db";

// ═══════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS (CSV/Excel for controls and findings)
// ═══════════════════════════════════════════════════════════════════

/**
 * Export controls as CSV or Excel.
 * Respects paginationMaxPageSize from settings.
 */
export async function exportControls(
  tenantId: string,
  format: "csv" | "xlsx",
  frameworkId?: string,
  scope?: ComplianceScope,
  userId?: string,
  status?: string,
  owner?: string
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const settings = await getComplianceSettings(tenantId);
  const maxLimit = settings.paginationMaxPageSize;

  // Fetch all controls (up to maxLimit)
  const { items } = await getControlsRegister(tenantId, frameworkId, {
    limit: maxLimit,
    offset: 0,
    scope,
    userId,
    status,
    owner,
  });

  if (format === "csv") {
    const headers = [
      "Control ID",
      "Title",
      "Description",
      "Status",
      "Test Status",
      "Frameworks",
      "Owner",
      "Automatable",
      "Evidence Count",
      "Risk Count",
      "Last Tested At",
      "Created At",
    ];
    const rows = items.map((c) => [
      c.controlId || "",
      c.title || "",
      (c.description || "").replace(/"/g, '""'),
      c.status || "",
      c.testStatus || "",
      (c.frameworks || []).join("; "),
      c.owner || "",
      c.automatable ? "Yes" : "No",
      String(c.evidenceCount || 0),
      String(c.riskCount || 0),
      c.lastTestedAt ? new Date(c.lastTestedAt).toISOString() : "",
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
    ]);
    const csvLines = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell)}"`).join(",")),
    ];
    const csv = csvLines.join("\n");
    return {
      buffer: Buffer.from(csv, "utf-8"),
      filename: `controls-export-${new Date().toISOString().split("T")[0]}.csv`,
      contentType: "text/csv",
    };
  } else {
    // Excel format
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Controls");
    worksheet.columns = [
      { header: "Control ID", key: "controlId", width: 36 },
      { header: "Title", key: "title", width: 40 },
      { header: "Description", key: "description", width: 50 },
      { header: "Status", key: "status", width: 15 },
      { header: "Test Status", key: "testStatus", width: 15 },
      { header: "Frameworks", key: "frameworks", width: 30 },
      { header: "Owner", key: "owner", width: 30 },
      { header: "Automatable", key: "automatable", width: 12 },
      { header: "Evidence Count", key: "evidenceCount", width: 15 },
      { header: "Risk Count", key: "riskCount", width: 12 },
      { header: "Last Tested At", key: "lastTestedAt", width: 20 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];
    worksheet.addRows(
      items.map((c) => ({
        controlId: c.controlId || "",
        title: c.title || "",
        description: c.description || "",
        status: c.status || "",
        testStatus: c.testStatus || "",
        frameworks: (c.frameworks || []).join("; "),
        owner: c.owner || "",
        automatable: c.automatable ? "Yes" : "No",
        evidenceCount: c.evidenceCount || 0,
        riskCount: c.riskCount || 0,
        lastTestedAt: c.lastTestedAt ? new Date(c.lastTestedAt).toISOString() : "",
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
      }))
    );
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: `controls-export-${new Date().toISOString().split("T")[0]}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
}

/**
 * Export findings as CSV or Excel.
 * Respects paginationMaxPageSize from settings.
 */
export async function exportFindings(
  tenantId: string,
  format: "csv" | "xlsx",
  frameworkId?: string,
  severity?: string,
  scope?: ComplianceScope,
  userId?: string,
  status?: string,
  assignedTo?: string
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const settings = await getComplianceSettings(tenantId);
  const maxLimit = settings.paginationMaxPageSize;

  // Fetch all findings (up to maxLimit)
  const { items } = await getFindingsRegister(tenantId, frameworkId, severity, {
    limit: maxLimit,
    offset: 0,
    scope,
    userId,
    status,
    assignedTo,
  });

  if (format === "csv") {
    const headers = [
      "Finding ID",
      "Title",
      "Description",
      "Severity",
      "Status",
      "Source Type",
      "Source ID",
      "Remediation Plan",
      "Due Date",
      "Assigned To",
      "Created At",
    ];
    const rows = items.map((f) => [
      f.findingId || "",
      f.title || "",
      (f.description || "").replace(/"/g, '""'),
      f.severity || "",
      f.status || "",
      f.sourceType || "",
      f.sourceId || "",
      (f.remediationPlan || "").replace(/"/g, '""'),
      f.dueDate ? new Date(f.dueDate).toISOString() : "",
      f.assignedTo || "",
      f.createdAt ? new Date(f.createdAt).toISOString() : "",
    ]);
    const csvLines = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell)}"`).join(",")),
    ];
    const csv = csvLines.join("\n");
    return {
      buffer: Buffer.from(csv, "utf-8"),
      filename: `findings-export-${new Date().toISOString().split("T")[0]}.csv`,
      contentType: "text/csv",
    };
  } else {
    // Excel format
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Findings");
    worksheet.columns = [
      { header: "Finding ID", key: "findingId", width: 36 },
      { header: "Title", key: "title", width: 40 },
      { header: "Description", key: "description", width: 50 },
      { header: "Severity", key: "severity", width: 12 },
      { header: "Status", key: "status", width: 15 },
      { header: "Source Type", key: "sourceType", width: 15 },
      { header: "Source ID", key: "sourceId", width: 36 },
      { header: "Remediation Plan", key: "remediationPlan", width: 50 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Assigned To", key: "assignedTo", width: 30 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];
    worksheet.addRows(
      items.map((f) => ({
        findingId: f.findingId || "",
        title: f.title || "",
        description: f.description || "",
        severity: f.severity || "",
        status: f.status || "",
        sourceType: f.sourceType || "",
        sourceId: f.sourceId || "",
        remediationPlan: f.remediationPlan || "",
        dueDate: f.dueDate ? new Date(f.dueDate).toISOString() : "",
        assignedTo: f.assignedTo || "",
        createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : "",
      }))
    );
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: `findings-export-${new Date().toISOString().split("T")[0]}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
}
