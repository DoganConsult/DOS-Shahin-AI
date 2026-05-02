/**
 * Training API Service DTOs
 * Type definitions for all training-related API endpoints.
 */

// ── Content ───────────────────────────────────────────────────────────

export interface TrainingContentDto {
  id?: string;
  title?: string;
  category?: string;
  contentType?: string;
  duration?: number;
  description?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CreateTrainingContentRequest {
  title: string;
  category?: string;
  contentType?: string;
  duration?: number;
  description?: string;
  [key: string]: unknown;
}

export interface UpdateTrainingContentRequest {
  title?: string;
  category?: string;
  contentType?: string;
  duration?: number;
  description?: string;
  [key: string]: unknown;
}

// ── Campaigns ─────────────────────────────────────────────────────────

export interface TrainingCampaignDto {
  id?: string;
  title?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  targetAudience?: string[];
  contentIds?: string[];
  [key: string]: unknown;
}

export interface CreateTrainingCampaignRequest {
  title: string;
  startDate?: string;
  endDate?: string;
  targetAudience?: string[];
  contentIds?: string[];
  [key: string]: unknown;
}

export interface CampaignLaunchResultDto {
  success?: boolean;
  campaignId?: string;
  assignmentsCreated?: number;
  [key: string]: unknown;
}

// ── Assignments ───────────────────────────────────────────────────────

export interface TrainingAssignmentDto {
  id?: string;
  userId?: string;
  contentId?: string;
  campaignId?: string;
  status?: string;
  dueDate?: string;
  completedAt?: string;
  score?: number;
  [key: string]: unknown;
}

export interface AssignTrainingRequest {
  userId: string;
  contentId?: string;
  campaignId?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface CompleteAssignmentResultDto {
  success?: boolean;
  assignmentId?: string;
  score?: number;
  certificateId?: string;
  [key: string]: unknown;
}

// ── Certifications ────────────────────────────────────────────────────

export interface TrainingCertificationDto {
  id?: string;
  userId?: string;
  contentId?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: string;
  [key: string]: unknown;
}

export interface RevokeCertificateResultDto {
  success?: boolean;
  certificateId?: string;
  [key: string]: unknown;
}

// ── Phishing ──────────────────────────────────────────────────────────

export interface PhishingCampaignDto {
  id?: string;
  title?: string;
  status?: string;
  targetCount?: number;
  clickRate?: number;
  reportRate?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CreatePhishingCampaignRequest {
  title: string;
  templateId?: string;
  targetUsers?: string[];
  [key: string]: unknown;
}

export interface PhishingLaunchResultDto {
  success?: boolean;
  phishingId?: string;
  emailsSent?: number;
  [key: string]: unknown;
}

export interface PhishingResultRecordRequest {
  userId: string;
  action: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface PhishingResultRecordResultDto {
  success?: boolean;
  [key: string]: unknown;
}

// ── Compliance Snapshot ───────────────────────────────────────────────

export interface TrainingComplianceSnapshotDto {
  overallCompletionRate?: number;
  overdueCount?: number;
  byCategory?: Array<{ category: string; completionRate: number; overdueCount: number }>;
  [key: string]: unknown;
}

// ── Overdue ───────────────────────────────────────────────────────────

export interface TrainingOverdueDto {
  overdueAssignments?: TrainingAssignmentDto[];
  totalOverdue?: number;
  [key: string]: unknown;
}

// ── Expiring Certifications ───────────────────────────────────────────

export interface ExpiringCertificationDto {
  id?: string;
  userId?: string;
  contentId?: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
  [key: string]: unknown;
}

// ── KSA Regulatory Training ───────────────────────────────────────────

export interface SectorTrainingPathDto {
  id?: string;
  sectorCode?: string;
  title?: string;
  modules?: Array<{ moduleId: string; title: string; order: number }>;
  [key: string]: unknown;
}

export interface AssignSectorTrainingResultDto {
  success?: boolean;
  assignmentId?: string;
  [key: string]: unknown;
}

export interface TrainingByFrameworkDto {
  frameworkCode?: string;
  frameworkName?: string;
  totalContent?: number;
  completionRate?: number;
  [key: string]: unknown;
}

export interface RegulatorTrainingStatusDto {
  regulatorCode?: string;
  regulatorName?: string;
  requiredTrainings?: number;
  completedTrainings?: number;
  complianceRate?: number;
  [key: string]: unknown;
}
