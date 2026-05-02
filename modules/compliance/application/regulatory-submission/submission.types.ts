import { safeQuery } from "@dos/db";

// ============================================
// Shahin — Regulatory Submission Types
// Shared interfaces for submission drafts,
// sections, and templates
// ============================================

/** Full regulatory submission draft with metadata and sections */
export interface RegulatorySubmissionDraft {
  submissionId: string;
  regulatorCode: string;
  regulatorNameEn: string;
  regulatorNameAr: string;
  frameworkCode: string;
  frameworkNameEn: string;
  frameworkNameAr: string;
  submissionType: "annual" | "quarterly" | "ad-hoc" | "exam-response";
  periodStart: string;
  periodEnd: string;
  language: "en" | "ar" | "bilingual";
  sections: SubmissionSection[];
  generatedAt: string;
  generatedBy: string;
  status: "draft" | "review" | "approved" | "submitted";
  metadata: {
    tenantId: string;
    orgNameEn: string;
    orgNameAr?: string;
    complianceScore: number;
    evidenceCoverage: number;
    riskPosture: "low" | "medium" | "high" | "critical";
  };
}

/** Individual section within a submission draft */
export interface SubmissionSection {
  sectionId: string;
  sectionCode: string;
  titleEn: string;
  titleAr: string;
  order: number;
  contentType: "auto-filled" | "ai-generated" | "manual";
  contentEn: string;
  contentAr: string;
  dataSource?: {
    type: "compliance_score" | "control_status" | "evidence_coverage" | "risk_posture" | "incident_summary" | "remediation_status";
    query?: string;
    extractedData?: any;
  };
  aiPrompt?: string;
  requiresReview: boolean;
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewNotes?: string;
}

/** Template defining the structure of a submission for a given regulator/framework */
export interface SubmissionTemplate {
  templateId: string;
  regulatorCode: string;
  frameworkCode: string;
  submissionType: "annual" | "quarterly" | "ad-hoc" | "exam-response";
  sections: Array<{
    sectionCode: string;
    titleEn: string;
    titleAr: string;
    order: number;
    contentType: "auto-filled" | "ai-generated" | "manual";
    dataSource?: {
      type: "compliance_score" | "control_status" | "evidence_coverage" | "risk_posture" | "incident_summary" | "remediation_status";
      query?: string;
    };
    aiPromptTemplate?: string;
    requiresReview: boolean;
  }>;
}
