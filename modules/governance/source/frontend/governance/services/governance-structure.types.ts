import { safeQuery } from "@dos/db";

/**
 * Governance API DTOs — Structure & Accountability Sub-Domain
 * Covers: Governance Domains, Bodies, Reporting Lines, Org Tree,
 *         Departments, Legal Entities, Delegations, Responsibilities,
 *         RACI Templates & Matrix, Registers, Objectives
 */

// ── Structure ───────────────────────────────────────────────────────

export interface GovernanceDomainDto {
  id: string;
  name?: string;
  description?: string;
  parentId?: string;
}

export interface CreateGovernanceDomainRequest {
  name: string;
  description?: string;
  parentId?: string;
}

export interface UpdateGovernanceDomainRequest {
  name?: string;
  description?: string;
  parentId?: string;
}

export interface GovernanceBodyDto {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  domainId?: string;
}

export interface CreateGovernanceBodyRequest {
  name: string;
  type?: string;
  description?: string;
  domainId?: string;
}

export interface UpdateGovernanceBodyRequest {
  name?: string;
  type?: string;
  description?: string;
  domainId?: string;
}

export interface ReportingLineDto {
  id: string;
  fromBodyId?: string;
  toBodyId?: string;
  type?: string;
}

export interface CreateReportingLineRequest {
  fromBodyId: string;
  toBodyId: string;
  type?: string;
}

export interface OrgTreeNodeDto {
  id: string;
  name: string;
  type: string;
  children?: OrgTreeNodeDto[];
}

export interface DepartmentDto {
  id: string;
  name?: string;
  headId?: string;
  parentId?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  headId?: string;
  parentId?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  headId?: string;
  parentId?: string;
}

export interface LegalEntityDto {
  id: string;
  name?: string;
  type?: string;
  jurisdiction?: string;
  registrationNumber?: string;
}

export interface CreateLegalEntityRequest {
  name: string;
  type?: string;
  jurisdiction?: string;
  registrationNumber?: string;
}

export interface UpdateLegalEntityRequest {
  name?: string;
  type?: string;
  jurisdiction?: string;
  registrationNumber?: string;
}

// ── Delegations ─────────────────────────────────────────────────────

export interface DelegationDto {
  id: string;
  fromUserId?: string;
  toUserId?: string;
  scope?: string;
  authorityLevel?: string;
  status?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface CreateDelegationRequest {
  fromUserId: string;
  toUserId: string;
  scope?: string;
  authorityLevel?: string;
  expiresAt?: string;
}

export interface UpdateDelegationRequest {
  scope?: string;
  authorityLevel?: string;
  expiresAt?: string;
  status?: string;
}

export interface DelegationConflictDto {
  id: string;
  delegationIds: string[];
  conflictType: string;
  description?: string;
}

export interface AuthorityLevelDto {
  id: string;
  name: string;
  level: number;
  description?: string;
}

export interface UpsertAuthorityLevelRequest {
  id?: string;
  name: string;
  level: number;
  description?: string;
}

// ── Objectives ──────────────────────────────────────────────────────

export interface ObjectiveDto {
  id: string;
  title?: string;
  description?: string;
  parentId?: string;
  status?: string;
  progress?: number;
  children?: ObjectiveDto[];
}

export interface CreateObjectiveRequest {
  title: string;
  description?: string;
  parentId?: string;
  status?: string;
}

export interface UpdateObjectiveRequest {
  title?: string;
  description?: string;
  parentId?: string;
  status?: string;
  progress?: number;
}

// ── Responsibilities ────────────────────────────────────────────────

export interface ResponsibilityDto {
  id: string;
  title?: string;
  description?: string;
  domainId?: string;
  status?: string;
}

export interface CreateResponsibilityRequest {
  title: string;
  description?: string;
  domainId?: string;
}

export interface UpdateResponsibilityRequest {
  title?: string;
  description?: string;
  domainId?: string;
  status?: string;
}

export interface ResponsibilityAssignmentDto {
  id: string;
  responsibilityId: string;
  userId: string;
  role?: string;
}

export interface CreateResponsibilityAssignmentRequest {
  responsibilityId: string;
  userId: string;
  role?: string;
}

export interface AccountabilityGapDto {
  responsibilityId: string;
  title: string;
  gapType: string;
  description?: string;
}

// ── RACI Templates ──────────────────────────────────────────────────

export interface RaciTemplateDto {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  assignments?: RaciAssignmentDto[];
}

export interface CreateRaciTemplateRequest {
  name: string;
  description?: string;
}

export interface UpdateRaciTemplateRequest {
  name?: string;
  description?: string;
}

export interface RaciAssignmentDto {
  activityId: string;
  roleId: string;
  type: string; // R, A, C, or I
}

export interface SetRaciAssignmentsRequest {
  assignments: RaciAssignmentDto[];
}

// ── RACI Matrix ─────────────────────────────────────────────────────

export interface RaciMatrixDto {
  rows: Array<{ activityId: string; activityName: string; assignments: Record<string, string> }>;
  roles: Array<{ id: string; name: string }>;
}

export interface RaciAccountabilityGapDto {
  activityId: string;
  activityName: string;
  missingRoles: string[];
  gapType: string;
}

export interface RaciSodConflictDto {
  activityId: string;
  userId: string;
  conflictingRoles: string[];
  description?: string;
}

// ── Registers ───────────────────────────────────────────────────────

export interface RegisterDto {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  status?: string;
}

export interface CreateRegisterRequest {
  name: string;
  type?: string;
  description?: string;
}

export interface UpdateRegisterRequest {
  name?: string;
  type?: string;
  description?: string;
  status?: string;
}
