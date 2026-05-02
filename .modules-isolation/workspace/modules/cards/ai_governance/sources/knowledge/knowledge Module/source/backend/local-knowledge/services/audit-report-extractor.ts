// ============================================
// Shahin-Ai — Audit Report Extractor
// R3.3B Phase C: Deterministic extraction for audit reports
// ============================================

import { BaseExtractor, ExtractionResult } from './base-extractor';
import { safeQuery } from "@dos/db";

export class AuditReportExtractor extends BaseExtractor {
  async extract(content: Buffer | string, _contentType: string): Promise<ExtractionResult> {
    const text = this.parseText(content);
    const rulesUsed: string[] = [];
    const data: Record<string, unknown> = {
      documentType: 'audit_report',
      reportTitle: null,
      auditDate: null,
      auditor: null,
      scope: null,
      findings: [],
      recommendations: [],
      severity: null,
      rawText: text.substring(0, 10000),
    };

    // Rule 1: Extract report title
    const titleMatch = text.match(/^(?:Audit Report|Report Title|Title)[:\s]+(.+)$/im) ||
                      text.match(/^(.{1,200})$/m);
    if (titleMatch) {
      data.reportTitle = titleMatch[1]?.trim() || null;
      rulesUsed.push('title_pattern');
    }

    // Rule 2: Extract audit date
    const dateMatch = text.match(/(?:Audit Date|Date|Conducted on)[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    if (dateMatch) {
      data.auditDate = dateMatch[1];
      rulesUsed.push('audit_date_pattern');
    }

    // Rule 3: Extract auditor
    const auditorMatch = text.match(/(?:Auditor|Conducted by|Prepared by)[:\s]+([A-Z][^\n]{5,100})/i);
    if (auditorMatch) {
      data.auditor = auditorMatch[1].trim();
      rulesUsed.push('auditor_extraction');
    }

    // Rule 4: Extract scope
    const scopeMatch = text.match(/(?:Scope|Audit Scope)[:\s]+([^\n]{20,500})/i);
    if (scopeMatch) {
      data.scope = scopeMatch[1].trim();
      rulesUsed.push('scope_extraction');
    }

    // Rule 5: Extract findings
    const findingMatches = text.match(/(?:Finding|Issue|Observation)[:\s]+([^\n]{20,300})/gi);
    if (findingMatches) {
      data.findings = findingMatches.slice(0, 30).map(m => m.replace(/(?:Finding|Issue|Observation)[:\s]+/i, '').trim());
      rulesUsed.push('finding_extraction');
    }

    // Rule 6: Extract recommendations
    const recMatches = text.match(/(?:Recommendation|Recommend|Action Required)[:\s]+([^\n]{20,300})/gi);
    if (recMatches) {
      data.recommendations = recMatches.slice(0, 30).map(m => m.replace(/(?:Recommendation|Recommend|Action Required)[:\s]+/i, '').trim());
      rulesUsed.push('recommendation_extraction');
    }

    // Rule 7: Extract severity (Critical, High, Medium, Low)
    const severityMatch = text.match(/(?:Severity|Risk Level)[:\s]+(Critical|High|Medium|Low)/i);
    if (severityMatch) {
      data.severity = severityMatch[1];
      rulesUsed.push('severity_extraction');
    }

    const confidence = rulesUsed.length > 0 ? Math.min(0.9, 0.4 + (rulesUsed.length * 0.1)) : 0.3;

    return {
      data,
      confidence,
      rulesUsed,
      metadata: {
        extractionMethod: 'pattern_matching',
        textLength: text.length,
      },
    };
  }
}
