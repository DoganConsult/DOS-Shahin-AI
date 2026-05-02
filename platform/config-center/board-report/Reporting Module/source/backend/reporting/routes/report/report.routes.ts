import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '../../ports/logger.port';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Report Routes
// Compliance reports, executive snapshots,
// PDF/Excel export, and report scheduling
// Requirements: 3.1–3.7
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  generateComplianceReport,
  generateExecutiveSnapshot,
  scheduleReportBasic,
  getScheduledReports,
  ReportData,
} from '../../services/report/report.service';
import { exportPDF } from '../../services/misc/pdf-export.service';
import { exportExcel } from '../../services/misc/excel-export.service';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  generateRegulatorySubmissionDraft,
  exportSubmissionDraftPDF,
  saveSubmissionDraft,
  getSubmissionDraft,
  listSubmissionDrafts,
  updateSubmissionStatus,
} from "../../../compliance/services/regulatory/regulatory-submission-generator.service";

function renderReportHtml(data: ReportData, lang: string): string {
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const cs = data.controlSummary;
  const rows = data.assessments?.map(a =>
    `<tr><td>${a.assessmentId || ''}</td><td>${a.title || ''}</td><td>${a.status || ''}</td><td>${a.score ?? ''}</td></tr>`
  ).join('') || '';
  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${data.title}</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem;direction:${dir}}table{border-collapse:collapse;width:100%;margin-top:1rem}th,td{border:1px solid #d1d5db;padding:8px 12px;text-align:${isAr ? 'right' : 'left'}}th{background:#f3f4f6}h1{color:#1e3a5f}.summary{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0}.summary .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:1rem;min-width:140px;text-align:center}.card .num{font-size:1.5rem;font-weight:700}.card .lbl{font-size:.85rem;color:#6b7280}</style></head><body>
<h1>${data.title}</h1>
<p>${isAr ? 'تاريخ التقرير' : 'Generated'}: ${data.generatedAt}</p>
<p>${isAr ? 'النتيجة الإجمالية' : 'Overall Score'}: <strong>${data.overallScore ?? 'N/A'}%</strong></p>
<div class="summary">
  <div class="card"><div class="num">${cs.compliant}</div><div class="lbl">${isAr ? 'ممتثل' : 'Compliant'}</div></div>
  <div class="card"><div class="num">${cs.partiallyCompliant}</div><div class="lbl">${isAr ? 'ممتثل جزئياً' : 'Partial'}</div></div>
  <div class="card"><div class="num">${cs.nonCompliant}</div><div class="lbl">${isAr ? 'غير ممتثل' : 'Non-Compliant'}</div></div>
  <div class="card"><div class="num">${cs.notAssessed}</div><div class="lbl">${isAr ? 'لم يُقيّم' : 'Not Assessed'}</div></div>
  <div class="card"><div class="num">${cs.notApplicable}</div><div class="lbl">${isAr ? 'غير منطبق' : 'N/A'}</div></div>
</div>
<p>${isAr ? 'عدد الأدلة' : 'Evidence Count'}: ${data.evidenceCount}</p>
${rows ? `<table><thead><tr><th>${isAr ? 'رقم الضابط' : 'Control ID'}</th><th>${isAr ? 'الاسم' : 'Name'}</th><th>${isAr ? 'الحالة' : 'Status'}</th><th>${isAr ? 'النتيجة' : 'Score'}</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
</body></html>`;
}


// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, fieldRbacFilter, validate, moduleStack } from '../../ports/middleware.port';
import { createComplianceframeworkIdBody, createSchedulesBody, createRegulatorysubmissionsGenerateBody, createRegulatorysubmissionssubmissionIdExportpdfBody, updateRegulatorysubmissionssubmissionIdStatusBody, updateRegulatorysubmissionssubmissionIdBody } from "../../schemas/reporting.schemas";

const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware("reporting"));
router.use(automationMiddleware("reporting"));
router.use(fieldRbacFilter("reporting"));

// POST /api/reports/compliance/:frameworkId — Generate a compliance report
router.post(
  "/compliance/:frameworkId", authenticate, requirePermission("report.document.read"), validate({ body: createComplianceframeworkIdBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { frameworkId } = req.params;
    const report = await generateComplianceReport(tenantId, frameworkId);
    setAuditData(res as any, { action: "create", entityType: "report", entityId: frameworkId, afterState: report });
    emitEvent(({ tenantId, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report', entityId: frameworkId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.status(201).json(report);
  }
);

// GET /api/reports/executive-snapshot — Generate executive snapshot KPIs
router.get(
  "/executive-snapshot", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const snapshot = await generateExecutiveSnapshot(tenantId);
    res.json(snapshot);
  }
);

// GET /api/reports/schedules — List all report schedules
router.get(
  "/schedules", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const schedules = await getScheduledReports(tenantId);
    res.json(schedules);
  }
);

// POST /api/reports/schedules — Create a report schedule
router.post(
  "/schedules", authenticate, requirePermission("report.document.write"), validate({ body: createSchedulesBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.userId!;
      const { reportType, parameters, cronExpression } = req.body;

      if (!reportType || !cronExpression) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
      }

      const schedule = await scheduleReportBasic(tenantId, {
        reportType,
        parameters: parameters || {},
        cronExpression,
        createdBy: userId,
      });
      setAuditData(res as any, { action: "create", entityType: "report", entityId: schedule.scheduleId || reportType, afterState: schedule });
      emitEvent(({ tenantId, userId, module: 'reporting', event: 'created', entityType: 'report_schedule', entityId: schedule.scheduleId || reportType } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
      res.status(201).json(schedule);
    } catch (err: unknown) {
      if (toErrorMessage(err).includes("Invalid cron expression")) {
        res.status(400).json({ error: errMsg('INVALID_INPUT', req) });
        return;
      }
      res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
);

// GET /api/reports/:id/pdf — Generate and export a compliance report as PDF
router.get(
  "/:id/pdf", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const frameworkId = req.params.id;

    const reportData = await generateComplianceReport(tenantId, frameworkId);
    const pdfBuffer = await exportPDF({
      title: (reportData as any)?.title || `Compliance Report: ${frameworkId}`,
      sections: [{ heading: 'report', body: JSON.stringify(reportData) }],
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${frameworkId}.pdf"`
    );
    res.send(pdfBuffer);
  }
);

// GET /api/reports/:id/excel — Generate and export a compliance report as Excel
router.get(
  "/:id/excel", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const frameworkId = req.params.id;

    const reportData = await generateComplianceReport(tenantId, frameworkId);
    const excelBuffer = await exportExcel({
      sheetName: 'report',
      headers: Object.keys((reportData as any) || {}),
      rows: [reportData as any],
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${frameworkId}.xlsx"`
    );
    res.send(excelBuffer);
  }
);

// GET /api/reports/generate/:reportType/:format — Universal report generation for all types
router.get(
  "/generate/:reportType/:format", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { reportType, format } = req.params;
    const lang = (req.query.lang as string) || "en";

    // Build report data based on type
    let reportData: ReportData;
    switch (reportType) {
      case "regulator-heatmap":
      case "cross-mapping":
      case "dpia":
      case "risk-register":
      case "audit-summary":
      case "executive-snapshot":
      default: {
        // Generate executive snapshot and wrap it as ReportData
        const snapshot = await generateExecutiveSnapshot(tenantId);
        reportData = {
          title: getReportTitle(reportType, lang),
          frameworkId: reportType,
          generatedAt: new Date().toISOString(),
          overallScore: snapshot.overallComplianceScore,
          assessments: [],
          controlSummary: { compliant: 0, partiallyCompliant: 0, nonCompliant: 0, notApplicable: 0, notAssessed: 0 },
          evidenceCount: 0,
        };
        // Try to enrich with framework-specific compliance data
        try {
          const enriched = await generateComplianceReport(tenantId, reportType);
          reportData.assessments = enriched.assessments;
          reportData.controlSummary = enriched.controlSummary;
          reportData.evidenceCount = enriched.evidenceCount;
          if (enriched.overallScore > 0) reportData.overallScore = enriched.overallScore;
        } catch {
          // Use executive snapshot data if no framework-specific data
          reportData.controlSummary = {
            compliant: 0, partiallyCompliant: 0,
            nonCompliant: snapshot.openRisksCount,
            notApplicable: 0, notAssessed: snapshot.pendingRemediationsCount,
          };
        }
        break;
      }
    }

    if (format === "pdf") {
      const pdfBuffer = await exportPDF({
        title: (reportData as any)?.title || `Report: ${reportType}`,
        sections: [{ heading: 'report', body: JSON.stringify(reportData) }],
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${reportType}-report.pdf"`);
      res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await exportExcel({
        sheetName: 'report',
        headers: Object.keys((reportData as any) || {}),
        rows: [reportData as any],
      });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${reportType}-report.xlsx"`);
      res.send(excelBuffer);
    } else if (format === "html") {
      const html = renderReportHtml(reportData, lang);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${reportType}-report.html"`);
      res.send(html);
    } else {
      res.status(400).json({ error: errMsg('INVALID_INPUT', req) });
    }
  }
);

// GET /api/reports/tenant-export — Full tenant data export (GDPR Art. 20 data portability)
router.get(
  "/tenant-export", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { query: dbQuery, tenantSchema: ts } = await import('../../../../config/database.js');
    const schema = ts(tenantId);
    const format = (req.query.format as string) || "json";

    const tables = [
      { key: "risks", sql: `SELECT * FROM "${schema}".risks ORDER BY created_at DESC` },
      { key: "controls", sql: `SELECT * FROM "${schema}".ucf_controls ORDER BY code` },
      { key: "policies", sql: `SELECT * FROM "${schema}".policies ORDER BY created_at DESC` },
      { key: "incidents", sql: `SELECT * FROM "${schema}".incidents ORDER BY created_at DESC` },
      { key: "evidence", sql: `SELECT evidence_id, control_id, title, description, status, submitted_by, created_at FROM "${schema}".evidence ORDER BY created_at DESC` },
      { key: "vendors", sql: `SELECT * FROM "${schema}".vendors ORDER BY name` },
      { key: "audit_plans", sql: `SELECT * FROM "${schema}".workflows WHERE definition->>'type' = 'audit_plan' ORDER BY created_at DESC` },
      { key: "frameworks", sql: `SELECT * FROM "${schema}".frameworks ORDER BY name` },
      { key: "assets", sql: `SELECT * FROM "${schema}".assets WHERE deleted_at IS NULL ORDER BY created_at DESC` },
      { key: "teams", sql: `SELECT * FROM "${schema}".teams WHERE deleted_at IS NULL ORDER BY name_en` },
    ];

    const exportData: Record<string, any[]> = {};
    for (const t of tables) {
      try {
        const result = await dbQuery(t.sql);
        exportData[t.key] = result.rows;
      } catch {
        exportData[t.key] = [];
      }
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      tenantId,
      format: "AGRC-OS Tenant Export v1",
      tables: exportData,
      recordCounts: Object.fromEntries(Object.entries(exportData).map(([k, v]) => [k, v.length])),
    };

    if (format === "xlsx") {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      for (const [key, rows] of Object.entries(exportData)) {
        if (rows.length === 0) continue;
        const sheet = workbook.addWorksheet(key);
        const cols = Object.keys(rows[0]);
        sheet.addRow(cols);
        for (const row of rows) {
          sheet.addRow(cols.map(c => {
            const v = row[c];
            if (v && typeof v === "object") return JSON.stringify(v);
            return v;
          }));
        }
      }
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="tenant-export-${tenantId}.xlsx"`);
      res.send(Buffer.from(buffer));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="tenant-export-${tenantId}.json"`);
      res.json(payload);
    }
  }
);

function getReportTitle(reportType: string, lang: string): string {
  const titles: Record<string, { en: string; ar: string }> = {
    "regulator-heatmap": { en: "Regulator Compliance Heatmap", ar: "خريطة حرارية للامتثال التنظيمي" },
    "cross-mapping": { en: "Cross-Framework Control Mapping", ar: "خريطة الضوابط المتقاطعة" },
    "dpia": { en: "PDPL Data Protection Impact Assessment", ar: "تقييم أثر حماية البيانات" },
    "executive-snapshot": { en: "Executive GRC Summary", ar: "ملخص الحوكمة والمخاطر والامتثال التنفيذي" },
    "risk-register": { en: "Risk Register Report", ar: "تقرير سجل المخاطر" },
    "audit-summary": { en: "Audit Summary Report", ar: "تقرير ملخص التدقيق" },
  };
  const t = titles[reportType] || { en: `${reportType} Report`, ar: `تقرير ${reportType}` };
  return lang === "ar" ? t.ar : t.en;
}

// ============================================
// Regulatory Submission Draft Generator Routes
// Feature 49: Auto-fill sections, AI narrative, bilingual support
// ============================================

// POST /api/reports/regulatory-submissions/generate — Generate a regulatory submission draft
router.post(
  "/regulatory-submissions/generate", authenticate, requirePermission("report.document.write"), validate({ body: createRegulatorysubmissionsGenerateBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { regulatorCode, frameworkCode, submissionType, periodStart, periodEnd, language } = req.body;

      if (!regulatorCode || !frameworkCode) {
        return res.status(400).json({ error: errMsg({ messageEn: "regulatorCode and frameworkCode are required" }, req) });
      }

      const draft = await generateRegulatorySubmissionDraft(
        tenantId,
        regulatorCode,
        frameworkCode,
        submissionType || "annual",
        periodStart,
        periodEnd,
        language || "bilingual",
        req.user!.userId!
      );

      // Auto-save draft
      await saveSubmissionDraft(tenantId, draft);

      setAuditData(res as any, {
        action: "create",
        entityType: "regulatory_submission",
        entityId: draft.submissionId,
        afterState: { regulatorCode, frameworkCode, submissionType: draft.submissionType },
      });

      emitEvent(({
              tenantId,
              userId: req.user!.userId!,
              module: 'reporting',
              event: 'created',
              entityType: 'regulatory_submission',
              entityId: draft.submissionId,
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));

      res.status(201).json(draft);
    } catch (err: unknown) {
      logger.error("[RegulatorySubmission] Generate error:", toErrorMessage(err));
      res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
);

// GET /api/reports/regulatory-submissions — List all submission drafts
router.get(
  "/regulatory-submissions", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { regulatorCode, frameworkCode } = req.query;

      const drafts = await listSubmissionDrafts(
        tenantId,
        regulatorCode as string | undefined,
        frameworkCode as string | undefined
      );

      res.json(drafts);
    } catch (err: unknown) {
      logger.error("[RegulatorySubmission] List error:", toErrorMessage(err));
      res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
);

// GET /api/reports/regulatory-submissions/:submissionId — Get a specific submission draft
router.get(
  "/regulatory-submissions/:submissionId", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { submissionId } = req.params;

      const draft = await getSubmissionDraft(tenantId, submissionId);

      if (!draft) {
        return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      }

      res.json(draft);
    } catch (err: unknown) {
      logger.error("[RegulatorySubmission] Get error:", toErrorMessage(err));
      res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
);

// POST /api/reports/regulatory-submissions/:submissionId/export-pdf — Export submission as PDF
router.post(
  "/regulatory-submissions/:submissionId/export-pdf", authenticate, requirePermission("report.document.read"), validate({ body: createRegulatorysubmissionssubmissionIdExportpdfBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { submissionId } = req.params;

      const draft = await getSubmissionDraft(tenantId, submissionId);

      if (!draft) {
        return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      }

      const pdfBuffer = await exportSubmissionDraftPDF(tenantId, draft.submissionId);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="regulatory-submission-${draft.regulatorCode}-${draft.frameworkCode}-${draft.submissionId}.pdf"`
      );

      setAuditData(res as any, {
        action: "export",
        entityType: "regulatory_submission",
        entityId: submissionId,
        afterState: { format: "pdf" },
      });

      res.send(pdfBuffer);
    } catch (err: unknown) {
      logger.error("[RegulatorySubmission] PDF export error:", toErrorMessage(err));
      res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
);

// PUT /api/reports/regulatory-submissions/:submissionId/status — Update submission status
router.put(
  "/regulatory-submissions/:submissionId/status", authenticate, requirePermission("report.document.write"), validate({ body: updateRegulatorysubmissionssubmissionIdStatusBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { submissionId } = req.params;
      const { status, reviewNotes } = req.body;

      if (!status || !["draft", "review", "approved", "submitted"].includes(status)) {
        return res.status(400).json({ error: errMsg({ messageEn: "Invalid status" }, req) });
      }

      await updateSubmissionStatus(tenantId, submissionId, status, reviewNotes);

      setAuditData(res as any, {
        action: "update",
        entityType: "regulatory_submission",
        entityId: submissionId,
        afterState: { status },
      });

      emitEvent(({
              tenantId,
              userId: req.user!.userId!,
              module: 'reporting',
              event: 'updated',
              entityType: 'regulatory_submission',
              entityId: submissionId,
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));

      res.json({ success: true, status });
    } catch (err: unknown) {
      logger.error("[RegulatorySubmission] Status update error:", toErrorMessage(err));
      res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
);

// PUT /api/reports/regulatory-submissions/:submissionId — Update submission draft (save changes)
router.put(
  "/regulatory-submissions/:submissionId", authenticate, requirePermission("report.document.write"), validate({ body: updateRegulatorysubmissionssubmissionIdBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { submissionId } = req.params;
      const draftUpdates = req.body;

      // Get existing draft
      const existingDraft = await getSubmissionDraft(tenantId, submissionId);

      if (!existingDraft) {
        return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      }

      // Merge updates
      const updatedDraft = {
        ...existingDraft,
        ...draftUpdates,
        submissionId, // Prevent ID change
        updatedAt: new Date().toISOString(),
      };

      await saveSubmissionDraft(tenantId, updatedDraft);

      setAuditData(res as any, {
        action: "update",
        entityType: "regulatory_submission",
        entityId: submissionId,
        afterState: updatedDraft,
      });

      res.json(updatedDraft);
    } catch (err: unknown) {
      logger.error("[RegulatorySubmission] Update error:", toErrorMessage(err));
      res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
    }
  }
);

export default router;
