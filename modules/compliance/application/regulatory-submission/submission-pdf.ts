// ============================================
// Shahin — Submission PDF Export
// Generates bilingual A4 PDF from a completed
// regulatory submission draft using PDFKit
// ============================================

import PDFDocument from "pdfkit";
import { RegulatorySubmissionDraft } from "./submission.types";
import { safeQuery } from "@dos/db";

/**
 * Export submission draft as PDF.
 * Custom PDF generation for regulatory submissions with bilingual support.
 */
export async function exportSubmissionDraftPDF(
  tenantId: string,
  draft: RegulatorySubmissionDraft
): Promise<Buffer> {
  const isArabic = draft.language === "ar";
  const isBilingual = draft.language === "bilingual";

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const primaryColor = "#1e40af";
    const textAlign = isArabic ? ("right" as const) : ("left" as const);

    // --- Cover Page / Header ---
    doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
    doc
      .fillColor("#ffffff")
      .fontSize(20)
      .text(
        isBilingual
          ? `${draft.frameworkNameEn} / ${draft.frameworkNameAr}`
          : isArabic
          ? draft.frameworkNameAr
          : draft.frameworkNameEn,
        50,
        40,
        { align: "center", width: doc.page.width - 100 }
      );
    doc.fontSize(12).text(
      isBilingual
        ? `${draft.regulatorNameEn} / ${draft.regulatorNameAr} \u2014 ${draft.submissionType.toUpperCase()} Submission`
        : isArabic
        ? `${draft.regulatorNameAr} \u2014 \u062a\u0642\u062f\u064a\u0645 ${draft.submissionType}`
        : `${draft.regulatorNameEn} \u2014 ${draft.submissionType.toUpperCase()} Submission`,
      50,
      70,
      { align: "center", width: doc.page.width - 100 }
    );
    doc.fontSize(10).text(
      `${isArabic ? "\u0627\u0644\u0641\u062a\u0631\u0629" : "Period"}: ${draft.periodStart} to ${draft.periodEnd}`,
      50,
      100,
      { align: "center", width: doc.page.width - 100 }
    );

    doc.moveDown(3);

    // --- Metadata Summary ---
    doc.fillColor(primaryColor).fontSize(14).text(isArabic ? "\u0645\u0644\u062e\u0635 \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644" : "Compliance Summary");
    doc.moveDown(0.5);
    doc.fillColor("#111827").fontSize(11);
    doc.text(
      `${isArabic ? "\u062f\u0631\u062c\u0629 \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644" : "Compliance Score"}: ${draft.metadata.complianceScore}%`
    );
    doc.text(
      `${isArabic ? "\u062a\u063a\u0637\u064a\u0629 \u0627\u0644\u0623\u062f\u0644\u0629" : "Evidence Coverage"}: ${draft.metadata.evidenceCoverage}%`
    );
    doc.text(
      `${isArabic ? "\u0648\u0636\u0639 \u0627\u0644\u0645\u062e\u0627\u0637\u0631" : "Risk Posture"}: ${draft.metadata.riskPosture.toUpperCase()}`
    );
    doc.moveDown(1.5);

    // --- Sections ---
    for (const section of draft.sections.sort((a, b) => a.order - b.order)) {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      // Section title
      doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold");
      const sectionTitle = isBilingual
        ? `${section.titleEn} / ${section.titleAr}`
        : isArabic
        ? section.titleAr
        : section.titleEn;
      doc.text(sectionTitle, { align: textAlign });
      doc.moveDown(0.5);

      // Section content
      doc.fillColor("#111827").fontSize(11).font("Helvetica");
      const sectionContent = isBilingual
        ? `${section.contentEn}\n\n---\n\n${section.contentAr}`
        : isArabic
        ? section.contentAr
        : section.contentEn;
      doc.text(sectionContent, { align: textAlign, lineGap: 4 });
      doc.moveDown(1.5);
    }

    // --- Footer on all pages ---
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const pageNum = i - range.start + 1;
      doc
        .fillColor("#6b7280")
        .fontSize(8)
        .text(
          `${isArabic ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621" : "Generated"}: ${draft.generatedAt.slice(0, 10)}  |  ${
            isArabic ? "\u0635" : "Page"
          } ${pageNum} ${isArabic ? "\u0645\u0646" : "of"} ${totalPages}`,
          50,
          doc.page.height - 30,
          { align: "center", width: doc.page.width - 100 }
        );
    }

    doc.end();
  });
}
