/**
 * core/services/api/index.ts
 * Canonical barrel for all platform API services.
 */

// ── Feature-layer canonical re-exports ────────────────────────────────────────
export { AiEnhancedApiService } from '../../../config-center/board-report/features/ai-governance/services/ai-enhanced-api.service';
export { AiGovernanceApiService } from '../../../config-center/board-report/features/ai-governance/services/ai-governance-api.service';
export { PlaybooksApiService, type PlaybookDto } from '../../../config-center/board-report/features/playbooks/services/playbooks-api.service';
// Foundation-Only Bring-Up: ComplianceApiService re-export removed —
// compliance feature is deferred until its own hard-move/build gate.
export {
  KnowledgeApiService,
  type KnowledgeArticleDto,
  type KnowledgeSearchResultDto,
} from '../api-clients/ai/knowledge-api.service';
// Foundation-Only Bring-Up: WorkItemsApiService re-export removed —
// workflow feature is deferred until its own hard-move/build gate.
export { RiskApiService } from '@risk-module/ui/features/risk/services/risk-api.service';
export {
  EvidenceApiService,
  type PolicyDto,
  type GrcControlDto,
  type GrcFrameworkDto,
  type GrcRiskDto,
  type EvidenceAttachmentDto,
} from '../../../config-center/board-report/features/evidence/services/evidence-api.service';
export { PolicyImpactApiService, type ImpactedEntity, type PolicyImpactResult, type BatchImpactRequest, type BatchImpactResult } from '../../../config-center/board-report/features/policy-impact/services/policy-impact-api.service';
// Foundation-Only Bring-Up: WorkflowApiService re-export removed —
// workflow feature is deferred until its own hard-move/build gate.
export {
  VendorApiService,
  type VendorDto,
  type VendorSLADto,
  type VendorRiskProfileDto,
  type VendorAssessmentDto,
  type VendorQuestionnaireDto,
} from '../../../config-center/board-report/features/vendor-risk/services/vendor-api.service';
export {
  WorkpaperGeneratorApiService,
  type TestProcedure,
  type TestResult,
  type EvidenceItem,
  type WorkpaperControl,
  type Workpaper,
  type WorkpaperGenerationRequest,
  type TraceabilityMatrixRow,
  type WorkpaperGenerationResult,
  type BatchWorkpaperRequest,
  type BatchWorkpaperResult,
} from '../../../config-center/board-report/features/workpapers/services/workpaper-generator-api.service';

// ── Enterprise-grade implementations ──────────────────────────────────────────
export { LandingApiService, type LandingContentDto, type PlatformStatsDto } from './landing-api.service';
export { BcpApiService, type BcpPlanDto, type BcpListResponse } from './bcp-api.service';
export {
  InboxApiService,
  type InboxItemDto,
  type InboxListResponse,
  type InboxBulkActionRequest,
} from './inbox-api.service';
export {
  IssuesApiService,
  type IssueDto,
  type IssueListResponse,
  type CreateIssueRequest,
  type IssueStatus,
  type IssueSeverity,
} from './issues-api.service';
export {
  PrivacyApiService,
  type PrivacyRecordDto,
  type PrivacyListResponse,
  type PrivacyRecordType,
  type PrivacyRecordStatus,
} from './privacy-api.service';
export {
  RecordsApiService,
  type GrcRecordDto,
  type GrcRecordListResponse,
  type RecordsSearchRequest,
} from './records-api.service';
export {
  TrainingApiService,
  type TrainingCourseDto,
  type TrainingEnrollmentDto,
  type TrainingListResponse,
  type TrainingStatus,
} from './training-api.service';
export {
  IncidentApiService,
  type IncidentDto,
  type IncidentListResponse,
  type CreateIncidentRequest,
  type IncidentSeverity,
  type IncidentStatus,
} from './incident-api.service';
export {
  RiskSmartApiService,
  type RiskSmartInsightDto,
  type RiskSmartListResponse,
  type RiskPredictionRequest,
  type RiskPredictionResult,
} from './risk-smart-api.service';
export {
  AssessmentApiService,
  type AssessmentDto,
  type AssessmentListResponse,
  type AssessmentType,
  type AssessmentStatus,
  type AssessmentScoreResult,
} from './assessment-api.service';
export {
  ProvisioningApiService,
  type ProvisioningRecordDto,
  type ProvisioningListResponse,
  type ProvisionTenantRequest,
  type ProvisioningStatus,
} from './provisioning-api.service';
export {
  WorkspaceAuditApiService,
  type WorkspaceAuditLogDto,
  type WorkspaceAuditListResponse,
  type AuditSearchRequest,
  type AuditLogAction,
} from './workspace-audit-api.service';

// ── Cross-cutting API services ────────────────────────────────────────────────
export { ApprovalsApiService } from './approvals-api.service';
export { AuditApiService } from './audit-api.service';
export { GovernanceApiService } from '../../../config-center/board-report/features/governance/services/governance-api.service';
export { PlatformEvidenceApiService } from './platform-evidence-api.service';
export { RelationshipApiService } from './relationship-api.service';
export { RiskComplianceApiService } from './risk-compliance-api.service';

// ── Canonical directory re-exports ───────────────────────────────────
export { AdminApiService } from '../../admin/admin-api.service';
export { AdminConfigApiService } from '../../admin/admin-config-api.service';
export { AdminUserApiService } from '../../admin/admin-user-api.service';
export { CollaborationApiService } from '../../../foundation/ui/workspace/collaboration-api.service';
export { NotificationsApiService } from '../api-clients/notifications-api.service';
export { OnboardingApiService } from '../../../config-center/board-report/features/onboarding-os/services/onboarding-api.service';
export { WorkspaceCollabApiService } from '../../../foundation/ui/workspace/workspace-collab-api.service';
export { GrcOperationsService } from '../grc-operations.service';
