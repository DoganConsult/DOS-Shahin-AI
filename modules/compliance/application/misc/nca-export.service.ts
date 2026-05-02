import { logger as _logger } from '../../ports/logger.port';
// ============================================
// Shahin — NCA ECC Assessment Export Service
// PDF, Excel, and Interactive HTML export
// ============================================

import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { AssessmentResult, DomainScore as _DomainScore } from "./nca-assessment.service";
import { safeQuery } from "@dos/db";

// ===================== Arabic Font Paths =====================
const FONT_DIR = path.join(__dirname, "..", "fonts");
const FONT_AR_REGULAR = path.join(FONT_DIR, "NotoSansArabic-Regular.ttf");
const FONT_AR_BOLD = path.join(FONT_DIR, "NotoSansArabic-Bold.ttf");

// ===================== Inline Chart.js for offline HTML =====================
const CHARTJS_PATH = path.join(__dirname, "..", "data", "chartjs-4.4.0.umd.min.js");
let _chartJsInline: string | null = null;
function getChartJsInline(): string {
  if (!_chartJsInline) {
    try {
      _chartJsInline = fs.readFileSync(CHARTJS_PATH, "utf-8");
    } catch {
      _chartJsInline = "";
    }
  }
  return _chartJsInline;
}

// ===================== PDF EXPORT =====================

export async function exportNCAAssessmentPDF(
  assessment: AssessmentResult,
  lang: string = "en"
): Promise<Buffer> {
  const isAr = lang === "ar";

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    // Register Arabic fonts for RTL support
    try {
      doc.registerFont("NotoArabic", FONT_AR_REGULAR);
      doc.registerFont("NotoArabicBold", FONT_AR_BOLD);
    } catch {
      // Fonts not found — fall back to default Helvetica
    }

    const fontRegular = isAr ? "NotoArabic" : "Helvetica";
    const fontBold = isAr ? "NotoArabicBold" : "Helvetica-Bold";
    const _textAlign = isAr ? "right" as const : "center" as const;
    const _textFeatures = isAr ? { features: ["rtla", "arab"] } : {};

    const primary = "#1e40af";
    const green = "#16a34a";
    const amber = "#d97706";
    const red = "#dc2626";

    // --- Cover Page ---
    doc.rect(0, 0, doc.page.width, 200).fill(primary);
    doc.font(fontBold).fillColor("#ffffff").fontSize(28).text(
      isAr ? "تقييم الضوابط الأساسية للأمن السيبراني" : "NCA ECC Self-Assessment Report",
      50, 60, { align: "center", width: doc.page.width - 100 }
    );
    doc.fontSize(14).text(
      isAr ? "الهيئة الوطنية للأمن السيبراني — ECC 2-2024" : "National Cybersecurity Authority — ECC 2-2024",
      50, 110, { align: "center", width: doc.page.width - 100 }
    );
    doc.fontSize(11).text(
      `${isAr ? "التاريخ" : "Date"}: ${assessment.updatedAt.slice(0, 10)}`,
      50, 150, { align: "center", width: doc.page.width - 100 }
    );

    doc.moveDown(6);

    // --- Overall Score ---
    doc.font(fontBold).fillColor(primary).fontSize(18).text(
      isAr ? "النتيجة الإجمالية" : "Overall Compliance Score"
    );
    doc.moveDown(0.3);
    const scoreColor = assessment.overallScore >= 70 ? green : assessment.overallScore >= 40 ? amber : red;
    doc.font(fontBold).fillColor(scoreColor).fontSize(42).text(`${assessment.overallScore}%`);
    doc.moveDown(0.5);

    // Risk Exposure
    doc.font(fontRegular).fillColor("#6b7280").fontSize(11).text(
      `${isAr ? "مستوى التعرض للمخاطر" : "Risk Exposure"}: ${assessment.riskExposure}%`
    );
    doc.moveDown(1);

    // --- Summary Table ---
    doc.font(fontBold).fillColor(primary).fontSize(14).text(isAr ? "ملخص التقييم" : "Assessment Summary");
    doc.moveDown(0.5);

    const summaryRows = [
      [isAr ? "الحالة" : "Status", isAr ? "العدد" : "Count"],
      [isAr ? "مطبق" : "Implemented", String(assessment.summary.implemented)],
      [isAr ? "مطبق جزئياً" : "Partially Implemented", String(assessment.summary.partial)],
      [isAr ? "غير مطبق" : "Not Implemented", String(assessment.summary.notImplemented)],
      [isAr ? "غير قابل للتطبيق" : "Not Applicable", String(assessment.summary.notApplicable)],
      [isAr ? "فجوات حرجة" : "Critical Gaps", String(assessment.summary.criticalGaps)],
      [isAr ? "فجوات عالية" : "High Gaps", String(assessment.summary.highGaps)],
    ];
    drawSimpleTable(doc, summaryRows, primary, fontRegular, fontBold);
    doc.moveDown(1);

    // --- Domain Scores ---
    doc.addPage();
    doc.font(fontBold).fillColor(primary).fontSize(16).text(
      isAr ? "النتائج حسب المجال" : "Domain Scores"
    );
    doc.moveDown(0.5);

    const domainRows: string[][] = [
      [isAr ? "المجال" : "Domain", isAr ? "النتيجة" : "Score", isAr ? "مطبق" : "Impl.", isAr ? "جزئي" : "Partial", isAr ? "فجوات" : "Gaps"],
    ];
    for (const ds of assessment.domainScores) {
      domainRows.push([
        isAr ? ds.nameAr : ds.nameEn,
        `${ds.score}%`,
        String(ds.implemented),
        String(ds.partial),
        String(ds.notImplemented),
      ]);
    }
    drawSimpleTable(doc, domainRows, primary, fontRegular, fontBold);
    doc.moveDown(1.5);

    // --- Critical Gaps List ---
    const criticalGaps = assessment.items.filter(
      (i) => (i.status === "not_implemented" || i.status === "partially") && i.priority === "critical"
    );

    if (criticalGaps.length > 0) {
      doc.font(fontBold).fillColor(red).fontSize(14).text(
        isAr ? "الفجوات الحرجة التي تتطلب إجراء فوري" : "Critical Gaps Requiring Immediate Action"
      );
      doc.moveDown(0.5);

      const gapRows: string[][] = [
        [isAr ? "الرمز" : "Code", isAr ? "الضابط" : "Control", isAr ? "الحالة" : "Status"],
      ];
      for (const g of criticalGaps.slice(0, 30)) {
        gapRows.push([
          g.code,
          isAr ? g.titleAr : g.titleEn,
          g.status === "not_implemented" ? (isAr ? "غير مطبق" : "Not Implemented") : (isAr ? "جزئي" : "Partial"),
        ]);
      }
      drawSimpleTable(doc, gapRows, red, fontRegular, fontBold);
    }

    // --- Footer: DoganConsult Branding ---
    doc.addPage();
    doc.moveDown(2);
    doc.font(fontRegular).fillColor("#64748b").fontSize(10).text(
      "─────────────────────────────────────────────────────", { align: "center" }
    );
    doc.moveDown(0.5);
    doc.font(fontBold).fillColor(primary).fontSize(12).text(
      "Shahin-AI — KSA GRC Platform", { align: "center" }
    );
    doc.moveDown(0.3);
    doc.font(fontRegular).fillColor("#334155").fontSize(10).text(
      isAr ? "بواسطة Dogan Consult — حلول تقنية مبتكرة" : "by Dogan Consult — Innovative ICT Solutions",
      { align: "center" }
    );
    doc.moveDown(0.3);
    doc.font(fontRegular).fillColor("#0369a1").fontSize(10).text(
      "www.doganconsult.com", { align: "center", link: "https://www.doganconsult.com" }
    );
    doc.moveDown(0.5);
    doc.font(fontRegular).fillColor("#94a3b8").fontSize(8).text(
      `© ${new Date().getFullYear()} Shahin-AI by Dogan Consult. All rights reserved.`,
      { align: "center" }
    );

    doc.end();
  });
}

function drawSimpleTable(
  doc: PDFKit.PDFDocument,
  rows: string[][],
  headerColor: string,
  fontRegular: string = "Helvetica",
  fontBold: string = "Helvetica-Bold"
): void {
  if (rows.length === 0) return;
  const startX = 50;
  const colWidth = (doc.page.width - 100) / rows[0].length;
  const rowHeight = 22;
  let y = doc.y;

  for (let i = 0; i < rows.length; i++) {
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage();
      y = 50;
    }

    const isHeader = i === 0;
    if (isHeader) {
      doc.rect(startX, y, doc.page.width - 100, rowHeight).fill(headerColor);
    }

    for (let j = 0; j < rows[i].length; j++) {
      doc.font(isHeader ? fontBold : fontRegular)
        .fillColor(isHeader ? "#ffffff" : "#111827")
        .fontSize(isHeader ? 10 : 9)
        .text(rows[i][j], startX + j * colWidth + 4, y + 6, {
          width: colWidth - 8,
          lineBreak: false,
        });
    }

    y += rowHeight;
    if (!isHeader) {
      doc.strokeColor("#e5e7eb").lineWidth(0.5)
        .moveTo(startX, y).lineTo(doc.page.width - 50, y).stroke();
    }
  }
  doc.y = y + 4;
}

// ===================== EXCEL EXPORT =====================

export async function exportNCAAssessmentExcel(
  assessment: AssessmentResult
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // --- Executive Summary Sheet ---
  const summary = workbook.addWorksheet("Executive Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 35 },
    { header: "Value", key: "value", width: 30 },
  ];
  summary.addRows([
    { field: "Assessment Title", value: assessment.title },
    { field: "Date", value: assessment.updatedAt.slice(0, 10) },
    { field: "Status", value: assessment.status },
    { field: "Overall Score", value: `${assessment.overallScore}%` },
    { field: "Risk Exposure", value: `${assessment.riskExposure}%` },
    { field: "Total Controls", value: assessment.summary.total },
    { field: "Implemented", value: assessment.summary.implemented },
    { field: "Partially Implemented", value: assessment.summary.partial },
    { field: "Not Implemented", value: assessment.summary.notImplemented },
    { field: "Not Applicable", value: assessment.summary.notApplicable },
    { field: "Critical Gaps", value: assessment.summary.criticalGaps },
    { field: "High Gaps", value: assessment.summary.highGaps },
  ]);
  // Style header
  summary.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // --- Domain Breakdown Sheet ---
  const domains = workbook.addWorksheet("Domain Breakdown");
  domains.columns = [
    { header: "Domain", key: "domain", width: 45 },
    { header: "Domain (AR)", key: "domainAr", width: 40 },
    { header: "Score %", key: "score", width: 12 },
    { header: "Implemented", key: "impl", width: 14 },
    { header: "Partial", key: "partial", width: 12 },
    { header: "Gaps", key: "gaps", width: 10 },
    { header: "N/A", key: "na", width: 8 },
  ];
  for (const ds of assessment.domainScores) {
    const row = domains.addRow({
      domain: ds.nameEn,
      domainAr: ds.nameAr,
      score: ds.score,
      impl: ds.implemented,
      partial: ds.partial,
      gaps: ds.notImplemented,
      na: ds.notApplicable,
    });
    // Conditional formatting
    const scoreCell = row.getCell("score");
    if (ds.score >= 70) {
      scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBBF7D0" } };
    } else if (ds.score >= 40) {
      scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    } else {
      scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
    }
  }
  domains.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // --- Full Control Matrix Sheet ---
  const controls = workbook.addWorksheet("Full Control Matrix");
  controls.columns = [
    { header: "Code", key: "code", width: 10 },
    { header: "Control (EN)", key: "titleEn", width: 40 },
    { header: "Control (AR)", key: "titleAr", width: 40 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Status", key: "status", width: 18 },
    { header: "Automatable", key: "automatable", width: 14 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  for (const item of assessment.items) {
    const row = controls.addRow({
      code: item.code,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      priority: item.priority,
      status: item.status,
      automatable: item.automatable ? "Yes" : "No",
      notes: item.notes,
    });
    // Color status cells
    const statusCell = row.getCell("status");
    const statusColors: Record<string, string> = {
      implemented: "FFBBF7D0",
      partially: "FFFEF3C7",
      not_implemented: "FFFECACA",
      not_applicable: "FFF1F5F9",
    };
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: statusColors[item.status] || "FFFFFFFF" },
    };
  }
  controls.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // --- Gap Remediation Plan Sheet ---
  const gaps = workbook.addWorksheet("Gap Remediation Plan");
  gaps.columns = [
    { header: "Code", key: "code", width: 10 },
    { header: "Control", key: "title", width: 45 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Status", key: "status", width: 18 },
    { header: "Recommended Action", key: "action", width: 40 },
    { header: "Target Date", key: "target", width: 15 },
    { header: "Owner", key: "owner", width: 20 },
  ];
  const gapItems = assessment.items.filter(
    (i) => i.status === "not_implemented" || i.status === "partially"
  );
  // Sort by priority: critical first
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  gapItems.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
  for (const item of gapItems) {
    gaps.addRow({
      code: item.code,
      title: item.titleEn,
      priority: item.priority,
      status: item.status === "not_implemented" ? "Not Implemented" : "Partial",
      action: `Implement ${item.titleEn}`,
      target: "",
      owner: "",
    });
  }
  gaps.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ===================== INTERACTIVE HTML EXPORT =====================

export function exportNCAAssessmentHTML(assessment: AssessmentResult): string {
  const chartJsCode = getChartJsInline();
  // Escape </ sequences to prevent XSS when injecting into <script> tag
  const data = JSON.stringify({
    title: assessment.title,
    date: assessment.updatedAt.slice(0, 10),
    overallScore: assessment.overallScore,
    riskExposure: assessment.riskExposure,
    summary: assessment.summary,
    domainScores: assessment.domainScores,
    items: assessment.items.map((i) => ({
      code: i.code,
      titleEn: i.titleEn,
      titleAr: i.titleAr,
      priority: i.priority,
      status: i.status,
      domainId: i.domainId,
    })),
  }).replace(/<\//g, "<\\/");

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NCA ECC Assessment — ${assessment.title}</title>
<script>${chartJsCode ? chartJsCode : 'logger.warn("Chart.js not available offline")'}<\/script>
<style>
  :root { --primary: #1e40af; --green: #16a34a; --amber: #d97706; --red: #dc2626; --bg: #f8fafc; --card: #fff; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  .header { background: linear-gradient(135deg, var(--primary), #3b82f6); color: #fff; padding: 40px; border-radius: 16px; margin-bottom: 24px; text-align: center; }
  .header h1 { font-size: 28px; margin-bottom: 8px; }
  .header p { opacity: 0.85; font-size: 14px; }
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .kpi-card { background: var(--card); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .kpi-value { font-size: 36px; font-weight: 800; }
  .kpi-label { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .chart-card { background: var(--card); border-radius: 12px; padding: 20px; border: 1px solid var(--border); }
  .chart-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
  .domain-bars { margin-bottom: 24px; }
  .domain-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .domain-name { width: 280px; font-size: 13px; font-weight: 600; }
  .domain-track { flex: 1; height: 24px; background: #f1f5f9; border-radius: 12px; overflow: hidden; position: relative; }
  .domain-fill { height: 100%; border-radius: 12px; transition: width 0.6s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; font-size: 11px; font-weight: 700; color: #fff; }
  .gap-table { width: 100%; border-collapse: collapse; background: var(--card); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
  .gap-table th { background: var(--primary); color: #fff; padding: 10px 12px; text-align: start; font-size: 12px; font-weight: 700; }
  .gap-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--border); }
  .gap-table tr:hover { background: #f0f9ff; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .badge-critical { background: #fecaca; color: #991b1b; }
  .badge-high { background: #fed7aa; color: #9a3412; }
  .badge-medium { background: #fef3c7; color: #92400e; }
  .badge-low { background: #d1fae5; color: #065f46; }
  .badge-impl { background: #bbf7d0; color: #14532d; }
  .badge-partial { background: #fef3c7; color: #92400e; }
  .badge-notimpl { background: #fecaca; color: #991b1b; }
  .badge-na { background: #f1f5f9; color: #64748b; }
  .toolbar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
  .toolbar input, .toolbar select { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; }
  .toolbar input { min-width: 250px; }
  .btn { padding: 8px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn-primary { background: var(--primary); color: #fff; }
  .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
  .section-title { font-size: 18px; font-weight: 700; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
  .lang-toggle { position: fixed; top: 16px; right: 16px; z-index: 100; }
  [dir="rtl"] .lang-toggle { right: auto; left: 16px; }
  [dir="rtl"] .domain-name { text-align: right; }
  @media print { .toolbar, .lang-toggle, .btn { display: none; } .container { padding: 0; } .kpi-row { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } .charts-row { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<button class="lang-toggle btn btn-outline" onclick="toggleLang()">عربي / English</button>
<div class="container" id="app">
  <div class="header">
    <h1 id="title"></h1>
    <p>NCA Essential Cybersecurity Controls (ECC 2-2024) — <span id="date"></span></p>
  </div>

  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-value" id="kpi-score" style="color:var(--green)"></div><div class="kpi-label" data-en="Compliance Score" data-ar="نتيجة الامتثال">Compliance Score</div></div>
    <div class="kpi-card"><div class="kpi-value" id="kpi-risk" style="color:var(--red)"></div><div class="kpi-label" data-en="Risk Exposure" data-ar="التعرض للمخاطر">Risk Exposure</div></div>
    <div class="kpi-card"><div class="kpi-value" id="kpi-impl" style="color:var(--green)"></div><div class="kpi-label" data-en="Implemented" data-ar="مطبق">Implemented</div></div>
    <div class="kpi-card"><div class="kpi-value" id="kpi-gaps" style="color:var(--red)"></div><div class="kpi-label" data-en="Critical Gaps" data-ar="فجوات حرجة">Critical Gaps</div></div>
  </div>

  <div class="charts-row">
    <div class="chart-card"><div class="chart-title" data-en="Domain Compliance Radar" data-ar="رادار الامتثال حسب المجال">Domain Compliance Radar</div><canvas id="radarChart"></canvas></div>
    <div class="chart-card"><div class="chart-title" data-en="Status Distribution" data-ar="توزيع الحالات">Status Distribution</div><canvas id="donutChart"></canvas></div>
  </div>

  <div class="section-title" data-en="Domain Scores" data-ar="النتائج حسب المجال">Domain Scores</div>
  <div class="domain-bars" id="domainBars"></div>

  <div class="section-title" data-en="Gap Details" data-ar="تفاصيل الفجوات">Gap Details</div>
  <div class="toolbar">
    <input type="text" id="search" placeholder="Search controls..." oninput="filterTable()">
    <select id="filterPriority" onchange="filterTable()"><option value="">All Priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
    <select id="filterDomain" onchange="filterTable()"><option value="">All Domains</option></select>
    <button class="btn btn-primary" onclick="window.print()">Print</button>
  </div>
  <table class="gap-table" id="gapTable">
    <thead><tr><th data-en="Code" data-ar="الرمز">Code</th><th data-en="Control" data-ar="الضابط">Control</th><th data-en="Priority" data-ar="الأولوية">Priority</th><th data-en="Status" data-ar="الحالة">Status</th></tr></thead>
    <tbody id="gapBody"></tbody>
  </table>

  <div style="margin-top:40px;padding:24px;border-top:2px solid var(--border);text-align:center">
    <div style="font-size:14px;font-weight:700;color:var(--primary)">Shahin-AI — KSA GRC Platform</div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">
      <span data-en="by" data-ar="بواسطة">by</span>
      <a href="https://www.doganconsult.com" target="_blank" style="color:var(--primary);text-decoration:none;font-weight:700">Dogan Consult</a>
      — Innovative ICT Solutions
    </div>
    <div style="margin-top:4px">
      <a href="https://www.doganconsult.com" target="_blank" style="color:var(--primary);text-decoration:none;font-size:12px;font-weight:600">www.doganconsult.com</a>
    </div>
    <div style="font-size:10px;color:#94a3b8;margin-top:8px">© ${new Date().getFullYear()} Shahin-AI by Dogan Consult. All rights reserved.</div>
  </div>
</div>

<script>
const DATA = ${data};
let currentLang = 'en';

function init() {
  document.getElementById('title').textContent = DATA.title;
  document.getElementById('date').textContent = DATA.date;
  document.getElementById('kpi-score').textContent = DATA.overallScore + '%';
  document.getElementById('kpi-risk').textContent = DATA.riskExposure + '%';
  document.getElementById('kpi-impl').textContent = DATA.summary.implemented + '/' + DATA.summary.total;
  document.getElementById('kpi-gaps').textContent = DATA.summary.criticalGaps;

  // Domain bars
  const barsHtml = DATA.domainScores.map(d => {
    const color = d.score >= 70 ? 'var(--green)' : d.score >= 40 ? 'var(--amber)' : 'var(--red)';
    return '<div class="domain-bar"><div class="domain-name" data-en="' + d.nameEn + '" data-ar="' + d.nameAr + '">' + d.nameEn + '</div>' +
      '<div class="domain-track"><div class="domain-fill" style="width:' + d.score + '%;background:' + color + '">' + d.score + '%</div></div></div>';
  }).join('');
  document.getElementById('domainBars').innerHTML = barsHtml;

  // Filter dropdown
  const domainSelect = document.getElementById('filterDomain');
  DATA.domainScores.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.domainId;
    opt.textContent = d.nameEn;
    domainSelect.appendChild(opt);
  });

  renderGapTable(DATA.items);
  renderCharts();
}

function renderGapTable(items) {
  const tbody = document.getElementById('gapBody');
  const gapItems = items.filter(i => i.status === 'not_implemented' || i.status === 'partially');
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gapItems.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

  tbody.innerHTML = gapItems.map(i => {
    const pBadge = 'badge badge-' + i.priority;
    const sBadge = i.status === 'not_implemented' ? 'badge badge-notimpl' : 'badge badge-partial';
    const sLabel = i.status === 'not_implemented' ? (currentLang === 'ar' ? 'غير مطبق' : 'Not Implemented') : (currentLang === 'ar' ? 'جزئي' : 'Partial');
    const title = currentLang === 'ar' ? i.titleAr : i.titleEn;
    return '<tr><td>' + i.code + '</td><td>' + title + '</td><td><span class="' + pBadge + '">' + i.priority + '</span></td><td><span class="' + sBadge + '">' + sLabel + '</span></td></tr>';
  }).join('');
}

function filterTable() {
  const q = document.getElementById('search').value.toLowerCase();
  const priority = document.getElementById('filterPriority').value;
  const domain = document.getElementById('filterDomain').value;

  let filtered = DATA.items;
  if (priority) filtered = filtered.filter(i => i.priority === priority);
  if (domain) filtered = filtered.filter(i => i.domainId === domain);
  if (q) filtered = filtered.filter(i => i.titleEn.toLowerCase().includes(q) || i.titleAr.includes(q) || i.code.includes(q));

  renderGapTable(filtered);
}

function renderCharts() {
  // Radar
  new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: DATA.domainScores.map(d => currentLang === 'ar' ? d.nameAr : d.nameEn),
      datasets: [{ label: currentLang === 'ar' ? 'الامتثال %' : 'Compliance %', data: DATA.domainScores.map(d => d.score), backgroundColor: 'rgba(30,64,175,0.15)', borderColor: '#1e40af', pointBackgroundColor: '#1e40af' }]
    },
    options: { responsive: true, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }, plugins: { legend: { display: false } } }
  });

  // Donut
  new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: [currentLang === 'ar' ? 'مطبق' : 'Implemented', currentLang === 'ar' ? 'جزئي' : 'Partial', currentLang === 'ar' ? 'غير مطبق' : 'Not Impl.', currentLang === 'ar' ? 'غير قابل' : 'N/A'],
      datasets: [{ data: [DATA.summary.implemented, DATA.summary.partial, DATA.summary.notImplemented, DATA.summary.notApplicable], backgroundColor: ['#16a34a', '#d97706', '#dc2626', '#94a3b8'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = currentLang === 'ar' ? el.getAttribute('data-ar') : el.getAttribute('data-en');
  });
  filterTable();
  // Rebuild charts — Chart.js v4 stores instances by canvas id
  Object.keys(Chart.instances).forEach(k => Chart.instances[k].destroy());
  renderCharts();
}

init();
<\/script>
</body>
</html>`;
}
