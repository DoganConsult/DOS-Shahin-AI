/**
 * Governance API DTOs — Policy Sub-Domain
 * Covers: Policy, Procedures, Policy Rules, Policy Templates,
 *         Policy Attestation, Acknowledgements, Policy Guidance
 */

// ── Policy ──────────────────────────────────────────────────────────

export interface PolicyDto {
  id: string;
  title: string;
  status: string;
  version?: number;
  owner?: string;
  content?: string;
  frameworks?: string[];
}

export interface CreatePolicyRequest {
  title: string;
  status?: string;
  owner?: string;
  content?: string;
  frameworks?: string[];
}

export interface UpdatePolicyRequest {
  title?: string;
  status?: string;
  owner?: string;
  content?: string;
  frameworks?: string[];
}

// ── Procedures ──────────────────────────────────────────────────────

export interface ProcedureDto {
  id: string;
  title: string;
  policyId?: string;
  status?: string;
  version?: number;
}

export interface CreateProcedureRequest {
  title: string;
  policyId?: string;
  status?: string;
}

export interface UpdateProcedureRequest {
  title?: string;
  policyId?: string;
  status?: string;
}

// ── Policy Rules ────────────────────────────────────────────────────

export interface PolicyRuleDto {
  id?: string;
  policyId: string;
  rule: Record<string, unknown>;
}

export interface PolicyRuleExecutionResult {
  passed: boolean;
  results?: Array<{ ruleId: string; passed: boolean; message?: string }>;
  errors?: string[];
}

// ── Acknowledgements ────────────────────────────────────────────────

export interface AcknowledgementDto {
  id: string;
  userId?: string;
  policyId?: string;
  campaignId?: string;
  acknowledgedAt?: string;
  status?: string;
}

export interface AcknowledgementCampaignDto {
  id: string;
  title?: string;
  policyId?: string;
  status?: string;
  createdAt?: string;
  dueDate?: string;
}

export interface CreateAcknowledgementCampaignRequest {
  title: string;
  policyId: string;
  dueDate?: string;
  userIds?: string[];
}

export interface CampaignStatusDto {
  campaignId: string;
  totalRecipients: number;
  acknowledged: number;
  pending: number;
  overdue: number;
}

export interface RecordAcknowledgementRequest {
  campaignId: string;
  policyId: string;
  userId?: string;
}

export interface AcknowledgementStatsDto {
  totalCampaigns: number;
  activeCampaigns: number;
  overallAcknowledgementRate: number;
}

// ── Policy Attestation ──────────────────────────────────────────────

export interface AttestationCampaignDto {
  id: string;
  title?: string;
  policyId?: string;
  status?: string;
  createdAt?: string;
  dueDate?: string;
}

export interface CreateAttestationCampaignRequest {
  title: string;
  policyId: string;
  dueDate?: string;
  userIds?: string[];
}

export interface AttestationCampaignStatusDto {
  campaignId: string;
  totalRecipients: number;
  attested: number;
  pending: number;
  overdue: number;
}

export interface SubmitAttestationRequest {
  campaignId: string;
  policyId: string;
  userId?: string;
  accepted: boolean;
  comments?: string;
}

export interface AttestationSubmissionDto {
  id: string;
  campaignId: string;
  userId: string;
  accepted: boolean;
  attestedAt: string;
}

// ── Policy Templates ────────────────────────────────────────────────

export interface PolicyTemplateDto {
  id: string;
  key: string;
  name?: string;
  category?: string;
  framework?: string;
  description?: string;
  content?: string;
}

export interface PolicyPreviewDto {
  title: string;
  content: string;
  sections?: Array<{ heading: string; body: string }>;
}

export interface GeneratedPolicyDto {
  policyId: string;
  title: string;
  status: string;
}

export interface BulkGeneratePoliciesRequest {
  templateKeys: string[];
  options?: Record<string, unknown>;
}

export interface BulkGeneratePoliciesResultDto {
  generated: GeneratedPolicyDto[];
  errors?: Array<{ templateKey: string; error: string }>;
}

export interface PolicyWorkflowDto {
  policyId: string;
  currentStep: string;
  steps: Array<{ name: string; status: string; completedAt?: string }>;
}

export interface PolicyProcessDto {
  policyId: string;
  stage: string;
  history?: Array<{ stage: string; enteredAt: string; exitedAt?: string }>;
}

export interface PolicyGuidanceDto {
  items: Array<{ topic: string; guidance: string; priority?: string }>;
}
