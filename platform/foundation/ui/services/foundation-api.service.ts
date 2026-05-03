import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';

/** Response shape for Foundation overview aggregate (used by overview page). */
export interface FoundationOverviewData {
  users: { users?: unknown[] };
  departments: { departments?: unknown[] };
  locations: { locations?: unknown[]; rows?: unknown[] };
  organizations: { organizations?: unknown[] };
  businessUnits: { businessUnits?: unknown[] };
  roles: { profiles?: unknown[]; roles?: unknown[] };
  audit: { entries?: unknown[]; rows?: unknown[] };
  invitations: { invitations?: unknown[] };
  teams: { teams?: unknown[] };
  positions: { positions?: unknown[] };
  committees: { committees?: unknown[] };
  delegations: { delegations?: unknown[] };
  policies: { policies?: unknown[] };
  /** Set when one or more parallel overview requests failed (keys = slice names). */
  loadErrors?: Record<string, string>;
}

/** Centralized lookup options (DB-driven, replaces hardcoded dropdown arrays). */
export interface FoundationLookups {
  referenceCategories?: Record<string, { code: string; nameEn: string; nameAr?: string }[]>;
  locationTypes?: string[];
  teamRoles?: string[];
  permissionGroups?: { group: string; code: string }[];
  entityStatuses?: string[];
  positionStatuses?: string[];
  delegationStatuses?: string[];
  campaignStatuses?: string[];
  ownershipTypes?: string[];
  committeeTypes?: string[];
  scopeTypes?: string[];
  delegationScopes?: string[];
  memberRoles?: string[];
  reviewDecisions?: string[];
  dataClassifications?: string[];
  riskTiers?: string[];
  reviewFrequencies?: string[];
  legalBases?: string[];
  auditActionTypes?: string[];
  auditEntityTypes?: string[];
  locationCompletenessFields?: string[];
  orgProfileFields?: string[];
  referenceDataGroups?: { key: string; endpoint: string; labelEn: string; labelAr: string; supportsWrite: boolean }[];
  foundationSurfaces?: { id: string; classification: string }[];
  /** Present when GET /foundation/lookups failed; UI should warn, not assume empty lists are valid. */
  lookupsLoadError?: string;
}

/** Result of `getFoundationSurfaces()` — includes `lookupsLoadError` when `/foundation/lookups` fails; toast via `notifyFoundationLookupsError`. */
export interface FoundationSurfacesResult {
  foundationSurfaces: { id: string; classification: string }[];
  lookupsLoadError?: string;
}

/** Foundation Location row — mirrors locations.routes.ts response payload. */
export interface FoundationLocation {
  location_id: string;
  name_en: string;
  name_ar?: string | null;
  code?: string | null;
  location_type?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  parent_location_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: 'active' | 'inactive' | 'archived' | null;
  description?: string | null;
}

/** Paginated locations response — { success, data, total, page, pageSize } from backend. */
export interface FoundationLocationsResponse {
  success?: boolean;
  data: FoundationLocation[];
  total: number;
  page: number;
  pageSize: number;
}

/** Foundation-scoped API client. Typed wrapper for Foundation module endpoints (users, org, etc.). */
@Injectable({ providedIn: 'root' })
export class FoundationApiService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Normalized message for HTTP and other errors (used by overview, lookups, and pages). */
  static formatLoadError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as Record<string, unknown> | undefined;
      const fromBody =
        (typeof body?.['error'] === 'string' && body['error']) ||
        (typeof body?.['message'] === 'string' && body['message']);
      return (fromBody as string) || err.message || `HTTP ${err.status}`;
    }
    return err instanceof Error ? err.message : String(err);
  }

  /** Per-slice error capture for overview forkJoin (no silent empty success). */
  private overviewSlice<T>(bucket: Record<string, string>, key: string, source: Observable<T>, empty: T): Observable<T> {
    return source.pipe(
      catchError((err: unknown) => {
        bucket[key] = FoundationApiService.formatLoadError(err);
        console.warn(`[FoundationApiService] overview slice "${key}" failed`, err);
        return of(empty as T);
      })
    );
  }

  // ---------- Users ----------
  getUsers(params?: { page?: number; limit?: number; search?: string; status?: string; role?: string; department_id?: string }): Observable<{ users: unknown[]; total?: number; count?: number; page?: number; limit?: number; totalPages?: number }> {
    let httpParams = new HttpParams();
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.role) httpParams = httpParams.set('role', params.role);
    if (params?.department_id) httpParams = httpParams.set('department_id', params.department_id);
    return this.http.get<{ users: unknown[]; total?: number; count?: number; page?: number; limit?: number; totalPages?: number }>(`${this.api}/users`, { params: httpParams });
  }

  getUserById(userId: string): Observable<any> {
    return this.http.get(`${this.api}/users/${userId}`);
  }

  createUser(body: { email: string; first_name?: string; last_name?: string; role?: string; password?: string; department_id?: string }): Observable<any> {
    return this.http.post(`${this.api}/users`, body);
  }

  updateUser(userId: string, body: Partial<{ first_name: string; last_name: string; role: string; status: string; department_id: string | null; job_title: string; nationality: string; is_ciso: boolean; is_dpo: boolean }>): Observable<any> {
    return this.http.put(`${this.api}/users/${userId}`, body);
  }

  deleteUser(userId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.api}/users/${userId}`);
  }

  resetPassword(userId: string): Observable<{ success: boolean; message?: string; email?: string; temporaryPassword?: string }> {
    return this.http.post<{ success: boolean; message?: string; email?: string; temporaryPassword?: string }>(`${this.api}/users/${userId}/reset-password`, {});
  }

  getUsersExport(): Observable<Blob> {
    return this.http.get(`${this.api}/users/export`, { responseType: 'blob' });
  }

  bulkAssignRole(userIds: string[], role: string): Observable<{ success: boolean; updated?: number; softWarnings?: string[] }> {
    return this.http.post<{ success: boolean; updated?: number; softWarnings?: string[] }>(`${this.api}/users/bulk/assign-role`, { user_ids: userIds, role });
  }

  bulkDeactivate(userIds: string[]): Observable<{ success: boolean; updated?: number }> {
    return this.http.post<{ success: boolean; updated?: number }>(`${this.api}/users/bulk/deactivate`, { user_ids: userIds });
  }

  bulkAssignDepartment(userIds: string[], department_id: string | null): Observable<{ success: boolean; updated?: number }> {
    return this.http.post<{ success: boolean; updated?: number }>(`${this.api}/users/bulk/assign-department`, { user_ids: userIds, department_id });
  }

  getUserTeams(userId: string): Observable<{ teams: unknown[] }> {
    return this.http.get<{ teams: unknown[] }>(`${this.api}/users/${userId}/teams`);
  }

  getUserTasks(userId: string): Observable<{ tasks: unknown[] }> {
    return this.http.get<{ tasks: unknown[] }>(`${this.api}/users/${userId}/tasks`);
  }

  assignUserToTeam(userId: string, teamId: string, teamRole?: string): Observable<any> {
    return this.http.post(`${this.api}/users/${userId}/assign-team`, { team_id: teamId, team_role: teamRole || 'member' });
  }

  removeUserFromTeam(userId: string, teamId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.api}/users/${userId}/teams/${teamId}`);
  }

  // ---------- Departments ----------
  getDepartments(): Observable<{ departments?: unknown[]; rows?: unknown[] }> {
    return this.http.get<{ departments?: unknown[]; rows?: unknown[] }>(`${this.api}/departments`);
  }

  createDepartment(body: any): Observable<any> {
    return this.http.post(`${this.api}/departments`, body);
  }

  updateDepartment(deptId: string, body: any): Observable<any> {
    return this.http.put(`${this.api}/departments/${deptId}`, body);
  }

  deleteDepartment(deptId: string): Observable<any> {
    return this.http.delete(`${this.api}/departments/${deptId}`);
  }

  // ---------- Business Units ----------
  /** Backend returns `{ success, data, total, page, pageSize }`; remap to legacy `{ businessUnits }` shape consumers expect. */
  getBusinessUnits(): Observable<{ businessUnits: unknown[]; total?: number; page?: number; pageSize?: number }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; total?: number; page?: number; pageSize?: number; businessUnits?: unknown[] }>(`${this.api}/business-units`)
      .pipe(map((res) => ({
        businessUnits: (Array.isArray(res?.data) ? res.data : (res?.businessUnits ?? [])) as unknown[],
        total: res?.total,
        page: res?.page,
        pageSize: res?.pageSize,
      })));
  }

  createBusinessUnit(body: any): Observable<any> {
    return this.http.post(`${this.api}/business-units`, body);
  }

  updateBusinessUnit(buId: string, body: any): Observable<any> {
    return this.http.put(`${this.api}/business-units/${buId}`, body);
  }

  deleteBusinessUnit(buId: string): Observable<any> {
    return this.http.delete(`${this.api}/business-units/${buId}`);
  }

  // ---------- Locations ----------
  /**
   * Locations row shape — mirrors locations.routes.ts payload from
   * modules/foundation/source/backend/foundation/routes/locations.routes.ts.
   */
  // see: getLocations / FoundationLocation typing exported below
  getLocations(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    location_type?: string;
    country?: string;
    parent_id?: string;
  }): Observable<FoundationLocationsResponse> {
    let httpParams = new HttpParams();
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.pageSize != null) httpParams = httpParams.set('pageSize', String(params.pageSize));
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.location_type) httpParams = httpParams.set('location_type', params.location_type);
    if (params?.country) httpParams = httpParams.set('country', params.country);
    if (params?.parent_id) httpParams = httpParams.set('parent_id', params.parent_id);
    return this.http.get<FoundationLocationsResponse>(`${this.api}/locations`, { params: httpParams });
  }

  createLocation(body: Partial<FoundationLocation>): Observable<{ success: boolean; data: FoundationLocation }> {
    return this.http.post<{ success: boolean; data: FoundationLocation }>(`${this.api}/locations`, body);
  }

  updateLocation(locationId: string, body: Partial<FoundationLocation>): Observable<{ success: boolean; data: FoundationLocation }> {
    return this.http.put<{ success: boolean; data: FoundationLocation }>(`${this.api}/locations/${locationId}`, body);
  }

  deleteLocation(locationId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.api}/locations/${locationId}`);
  }

  // ---------- Organizations ----------
  /** Backend returns `{ success, data, total, page, pageSize }`; remap to legacy `{ organizations }` shape consumers expect. */
  getOrganizations(): Observable<{ organizations: unknown[]; total?: number; page?: number; pageSize?: number }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; total?: number; page?: number; pageSize?: number; organizations?: unknown[] }>(`${this.api}/organizations`)
      .pipe(map((res) => ({
        organizations: (Array.isArray(res?.data) ? res.data : (res?.organizations ?? [])) as unknown[],
        total: res?.total,
        page: res?.page,
        pageSize: res?.pageSize,
      })));
  }

  createOrganization(body: any): Observable<any> {
    return this.http.post(`${this.api}/organizations`, body);
  }

  updateOrganization(orgId: string, body: any): Observable<any> {
    return this.http.put(`${this.api}/organizations/${orgId}`, body);
  }

  deleteOrganization(orgId: string): Observable<any> {
    return this.http.delete(`${this.api}/organizations/${orgId}`);
  }

  // ---------- Reference Data ----------
  /** Generic reference data getter for various entity types (frameworks, controls, etc.). */
  getReferenceData(endpoint: string): Observable<any> {
    return this.http.get(`${this.api}${endpoint}`);
  }

  createReferenceItem(endpoint: string, body: any): Observable<any> {
    return this.http.post(`${this.api}${endpoint}`, body);
  }

  updateReferenceItem(endpoint: string, itemId: string, body: any): Observable<any> {
    return this.http.put(`${this.api}${endpoint}/${itemId}`, body);
  }

  // ---------- Teams ----------
  /** Backend returns `{ success, data, total, page, pageSize }`; remap to legacy `{ teams }` shape consumers expect. */
  getTeams(): Observable<{ teams: unknown[]; total?: number; page?: number; pageSize?: number }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; total?: number; page?: number; pageSize?: number; teams?: unknown[] }>(`${this.api}/teams`)
      .pipe(map((res) => ({
        teams: (Array.isArray(res?.data) ? res.data : (res?.teams ?? [])) as unknown[],
        total: res?.total,
        page: res?.page,
        pageSize: res?.pageSize,
      })));
  }

  getTeamById(teamId: string): Observable<any> {
    return this.http.get(`${this.api}/teams/${teamId}`);
  }

  createTeam(data: any): Observable<any> {
    return this.http.post(`${this.api}/teams`, data);
  }

  updateTeam(teamId: string, data: any): Observable<any> {
    return this.http.put(`${this.api}/teams/${teamId}`, data);
  }

  deleteTeam(teamId: string): Observable<any> {
    return this.http.delete(`${this.api}/teams/${teamId}`);
  }

  addTeamMember(teamId: string, userId: string, role?: string): Observable<any> {
    return this.http.post(`${this.api}/teams/${teamId}/members`, { userId, role: role || 'member' });
  }

  removeTeamMember(teamId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.api}/teams/${teamId}/members/${userId}`);
  }

  // ---------- Positions ----------
  /** Backend returns `{ success, data, total, page, pageSize }`; remap to legacy `{ positions }` shape consumers expect. */
  getPositions(params?: { limit?: number }): Observable<{ positions: unknown[]; total?: number; page?: number; pageSize?: number }> {
    let httpParams = new HttpParams();
    if (params?.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    return this.http
      .get<{ success?: boolean; data?: unknown[]; total?: number; page?: number; pageSize?: number; positions?: unknown[] }>(`${this.api}/positions`, { params: httpParams })
      .pipe(map((res) => ({
        positions: (Array.isArray(res?.data) ? res.data : (res?.positions ?? [])) as unknown[],
        total: res?.total,
        page: res?.page,
        pageSize: res?.pageSize,
      })));
  }

  createPosition(data: any): Observable<any> {
    return this.http.post(`${this.api}/positions`, data);
  }

  updatePosition(positionId: string, data: any): Observable<any> {
    return this.http.put(`${this.api}/positions/${positionId}`, data);
  }

  deletePosition(positionId: string): Observable<any> {
    return this.http.delete(`${this.api}/positions/${positionId}`);
  }

  getReportingTree(): Observable<any> {
    return this.http.get(`${this.api}/positions/reporting-tree`);
  }

  // ---------- Committees ----------
  /** Backend returns `{ success, data }`; remap to legacy `{ committees }` shape consumers expect. */
  getCommittees(): Observable<{ committees: unknown[] }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; committees?: unknown[] }>(`${this.api}/committees`)
      .pipe(map((res) => ({
        committees: (Array.isArray(res?.data) ? res.data : (res?.committees ?? [])) as unknown[],
      })));
  }

  getCommitteeById(committeeId: string): Observable<any> {
    return this.http.get(`${this.api}/committees/${committeeId}`);
  }

  createCommittee(body: any): Observable<any> {
    return this.http.post(`${this.api}/committees`, body);
  }

  updateCommittee(committeeId: string, body: any): Observable<any> {
    return this.http.put(`${this.api}/committees/${committeeId}`, body);
  }

  deleteCommittee(committeeId: string): Observable<any> {
    return this.http.delete(`${this.api}/committees/${committeeId}`);
  }

  getCommitteeMembers(committeeId: string): Observable<{ members: unknown[] }> {
    return this.http.get<{ members: unknown[] }>(`${this.api}/committees/${committeeId}/members`);
  }

  addCommitteeMember(committeeId: string, userId: string, role: string): Observable<any> {
    return this.http.post(`${this.api}/committees/${committeeId}/members`, { user_id: userId, role });
  }

  removeCommitteeMember(committeeId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.api}/committees/${committeeId}/members/${userId}`);
  }

  getCommitteeMeetings(committeeId: string): Observable<{ meetings: unknown[] }> {
    return this.http.get<{ meetings: unknown[] }>(`${this.api}/committees/${committeeId}/meetings`);
  }

  createMeeting(committeeId: string, body: any): Observable<any> {
    return this.http.post(`${this.api}/committees/${committeeId}/meetings`, body);
  }

  // ---------- Delegations (mounted at /api/governance/delegations) ----------
  /** Backend returns `{ success, data }`; remap to legacy `{ delegations }` shape consumers expect. */
  getDelegations(): Observable<{ delegations: unknown[] }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; delegations?: unknown[] }>(`${this.api}/governance/delegations`)
      .pipe(map((res) => ({
        delegations: (Array.isArray(res?.data) ? res.data : (res?.delegations ?? [])) as unknown[],
      })));
  }

  getExpiringDelegations(days?: number): Observable<{ delegations: unknown[] }> {
    const p = days ? new HttpParams().set('days', String(days)) : undefined;
    return this.http
      .get<{ success?: boolean; data?: unknown[]; delegations?: unknown[] }>(`${this.api}/governance/delegations/expiring`, { params: p })
      .pipe(map((res) => ({
        delegations: (Array.isArray(res?.data) ? res.data : (res?.delegations ?? [])) as unknown[],
      })));
  }

  getDelegationConflicts(): Observable<{ conflicts: unknown[] }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; conflicts?: unknown[] }>(`${this.api}/governance/delegations/conflicts`)
      .pipe(map((res) => ({
        conflicts: (Array.isArray(res?.data) ? res.data : (res?.conflicts ?? [])) as unknown[],
      })));
  }

  approveDelegation(delegationId: string): Observable<any> {
    return this.http.post(`${this.api}/governance/delegations/${delegationId}/approve`, {});
  }

  /** Backend requires non-empty `reason` (Zod min 1). */
  rejectDelegation(delegationId: string, reason: string): Observable<any> {
    return this.http.post(`${this.api}/governance/delegations/${delegationId}/reject`, { reason });
  }

  /**
   * Revoke a foundation governance delegation.
   *
   * Backend contract (modules/foundation/.../delegation.routes.ts) exposes
   * `DELETE /governance/delegations/:id` for revoke. There is no `/revoke`
   * POST suffix on this router — the prior `POST .../revoke` URL targeted a
   * different domain (DAuth agent grants in auth-service) and would 404 here.
   * Tenant id is JWT-derived server-side via `requireTenantId`; do NOT pass
   * tenantId from the client.
   */
  revokeDelegation(delegationId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.api}/governance/delegations/${delegationId}`);
  }

  // ---------- Access Review ----------
  getAccessReviewCampaigns(status?: string): Observable<{ campaigns: unknown[] }> {
    let httpParams = new HttpParams();
    if (status) httpParams = httpParams.set('status', status);
    return this.http.get<{ campaigns: unknown[] }>(`${this.api}/access-review/campaigns`, { params: httpParams });
  }

  createAccessReviewCampaign(data: any): Observable<any> {
    return this.http.post(`${this.api}/access-review/campaigns`, data);
  }

  startCampaign(campaignId: string): Observable<any> {
    return this.http.put(`${this.api}/access-review/campaigns/${campaignId}/start`, {});
  }

  getCampaignItems(campaignId: string): Observable<{ items: unknown[] }> {
    return this.http.get<{ items: unknown[] }>(`${this.api}/access-review/campaigns/${campaignId}/items`);
  }

  submitItemDecision(itemId: string, data: { decision: string }): Observable<any> {
    return this.http.put(`${this.api}/access-review/items/${itemId}/decision`, data);
  }

  /** Update an access review campaign (only allowed for draft campaigns). */
  updateCampaign(campaignId: string, data: any): Observable<any> {
    return this.http.put(`${this.api}/access-review/campaigns/${campaignId}`, data);
  }

  /** Delete/cancel an access review campaign. */
  deleteCampaign(campaignId: string): Observable<any> {
    return this.http.delete(`${this.api}/access-review/campaigns/${campaignId}`);
  }

  // ---------- Ownership Mapping ----------
  /**
   * The `domain` segment is a free-form lookup key (e.g. 'risks',
   * 'controls', 'policy-areas'). It is encoded with `encodeURIComponent`
   * so values containing `/`, `?`, `#`, `%`, or whitespace cannot corrupt
   * the path. Tenant id is JWT-derived server-side; never pass it here.
   */
  getOwnershipByDomain(domain: string): Observable<{ owners: unknown[] }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; owners?: unknown[] }>(`${this.api}/ownership-mapping/${encodeURIComponent(domain)}`)
      .pipe(map((res) => ({
        owners: (Array.isArray(res?.data) ? res.data : (res?.owners ?? [])) as unknown[],
      })));
  }

  assignOwner(domain: string, data: any): Observable<any> {
    return this.http.post(`${this.api}/ownership-mapping/${encodeURIComponent(domain)}`, data);
  }

  removeOwner(domain: string, ownerId: string): Observable<any> {
    return this.http.delete(`${this.api}/ownership-mapping/${encodeURIComponent(domain)}/${encodeURIComponent(ownerId)}`);
  }

  // ---------- Roles (profiles + CRUD) ----------
  getRoles(): Observable<{ profiles?: unknown[] }> {
    return this.http.get<{ profiles?: unknown[] }>(`${this.api}/profiles/roles`);
  }

  /** Backend returns `{ success, profiles, total }`; remap to legacy `{ roles }` shape consumers expect. */
  getFoundationRoles(): Observable<{ roles: unknown[]; total?: number }> {
    return this.http
      .get<{ success?: boolean; profiles?: unknown[]; roles?: unknown[]; total?: number }>(`${this.api}/foundation/roles`)
      .pipe(map((res) => ({
        roles: (Array.isArray(res?.profiles) ? res.profiles : (res?.roles ?? [])) as unknown[],
        total: res?.total,
      })));
  }

  createRole(body: any): Observable<any> {
    return this.http.post(`${this.api}/foundation/roles`, body);
  }

  updateRole(roleId: string, body: any): Observable<any> {
    return this.http.put(`${this.api}/foundation/roles/${roleId}`, body);
  }

  deleteRole(roleId: string): Observable<any> {
    return this.http.delete(`${this.api}/profiles/roles/${roleId}`);
  }

  getRoleDetail(roleCode: string): Observable<any> {
    return this.http.get(`${this.api}/roles/${roleCode}/detail`);
  }

  getRoleUsers(roleCode: string, page = 1, limit = 25): Observable<{ users: unknown[]; total: number }> {
    return this.http.get<{ users: unknown[]; total: number }>(`${this.api}/roles/${roleCode}/users?page=${page}&limit=${limit}`);
  }

  getRolePermissions(roleCode: string): Observable<{ permissions: unknown[] }> {
    return this.http.get<{ permissions: unknown[] }>(`${this.api}/roles/${roleCode}/permissions`);
  }

  getRoleTeams(roleCode: string): Observable<{ teamMappings: unknown[]; raciEntries: unknown[] }> {
    return this.http.get<{ teamMappings: unknown[]; raciEntries: unknown[] }>(`${this.api}/roles/${roleCode}/teams`);
  }

  getRoleDashboards(roleCode: string): Observable<{ dashboards: unknown[] }> {
    return this.http.get<{ dashboards: unknown[] }>(`${this.api}/roles/${roleCode}/dashboards`);
  }

  assignRoleToUser(roleCode: string, userId: string, teamId?: string): Observable<any> {
    return this.http.post(`${this.api}/roles/${roleCode}/assign`, { user_id: userId, team_id: teamId });
  }

  removeRoleAssignment(assignmentId: string): Observable<any> {
    return this.http.delete(`${this.api}/roles/assignments/${assignmentId}`);
  }

  getInvitations(): Observable<{ invitations: unknown[] }> {
    return this.http.get<{ invitations: unknown[] }>(`${this.api}/invitations`);
  }

  createInvitation(body: any): Observable<any> {
    return this.http.post(`${this.api}/invitations`, body);
  }

  resendInvitation(invitationId: string): Observable<any> {
    return this.http.post(`${this.api}/invitations/${invitationId}/resend`, {});
  }

  revokeInvitation(invitationId: string): Observable<any> {
    return this.http.delete(`${this.api}/invitations/${invitationId}`);
  }

  // ---------- Cross-module: Audit Trail ----------
  getAuditTrail(params?: { module?: string; limit?: number; offset?: number; from?: string }): Observable<any> {
    let p = new HttpParams();
    if (params?.module) p = p.set('module', params.module);
    if (params?.limit) p = p.set('limit', String(params.limit));
    if (params?.offset) p = p.set('offset', String(params.offset));
    if (params?.from) p = p.set('from', params.from);
    return this.http.get(`${this.api}/audit-trail`, { params: p });
  }

  // ---------- Cross-module: Governance Policies ----------
  /** Backend returns `{ success, data, total, page, pageSize }`; remap to legacy `{ policies }` shape consumers expect. */
  getGovernancePolicies(): Observable<{ policies: unknown[]; total?: number; page?: number; pageSize?: number }> {
    return this.http
      .get<{ success?: boolean; data?: unknown[]; total?: number; page?: number; pageSize?: number; policies?: unknown[] }>(`${this.api}/governance/policies`)
      .pipe(map((res) => ({
        policies: (Array.isArray(res?.data) ? res.data : (res?.policies ?? [])) as unknown[],
        total: res?.total,
        page: res?.page,
        pageSize: res?.pageSize,
      })));
  }

  createGovernancePolicy(body: any): Observable<any> {
    return this.http.post(`${this.api}/governance/policies`, body);
  }

  updateGovernancePolicy(policyId: string, body: any): Observable<any> {
    return this.http.put(`${this.api}/governance/policies/${policyId}`, body);
  }

  deleteGovernancePolicy(policyId: string): Observable<any> {
    return this.http.delete(`${this.api}/governance/policies/${policyId}`);
  }

  approveGovernancePolicy(policyId: string, comment?: string): Observable<any> {
    return this.http.post(`${this.api}/governance/policies/${policyId}/approve`, { comment });
  }

  updateGovernancePolicyStatus(policyId: string, status: string): Observable<any> {
    return this.http.put(`${this.api}/governance/policies/${policyId}`, { status });
  }

  // ---------- Cross-module: Privacy / Data Processing ----------
  getDataProcessingActivities(): Observable<any> {
    return this.http.get(`${this.api}/privacy-ops/ropa`);
  }

  createDataProcessingActivity(body: any): Observable<any> {
    return this.http.post(`${this.api}/privacy-ops/ropa`, body);
  }

  updateDataProcessingActivity(id: string, body: any): Observable<any> {
    return this.http.put(`${this.api}/privacy-ops/ropa/${id}`, body);
  }

  deleteDataProcessingActivity(id: string): Observable<any> {
    return this.http.delete(`${this.api}/privacy-ops/ropa/${id}`);
  }

  // ---------- Cross-module: Governance Delegations ----------
  getGovernanceDelegationsForUser(userId: string): Observable<{ delegations: unknown[] }> {
    return this.http.get<{ delegations: unknown[] }>(`${this.api}/governance/delegations?delegator=${userId}`);
  }

  createGovernanceDelegation(body: any): Observable<any> {
    return this.http.post(`${this.api}/governance/delegations`, body);
  }

  /**
   * @deprecated Use `revokeDelegation(id)` instead.
   *
   * The backend delegation router (`delegation.routes.ts`) exposes only
   * `DELETE /governance/delegations/:id` for the revoke action — there is no
   * `POST .../revoke` suffix on that router. The previous POST URL would 404.
   * This method now uses the correct DELETE verb to match the backend contract.
   */
  revokeGovernanceDelegation(delegationId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.api}/governance/delegations/${delegationId}`);
  }

  // ---------- Cross-module: PDPL Consent ----------
  grantPdplConsent(consentType: string): Observable<any> {
    return this.http.post(`${this.api}/foundation-governance/pdpl/consent`, { consent_type: consentType, granted: true });
  }

  // ---------- Cross-module: Team Member Lifecycle ----------
  getTeamMemberLifecycle(userId: string): Observable<any> {
    return this.http.get(`${this.api}/member-lifecycle/${userId}`);
  }

  // ---------- Cross-module: Role Assignment History ----------
  getRoleAssignmentHistory(roleCode: string): Observable<{ history: unknown[] }> {
    return this.http.get<{ history: unknown[] }>(`${this.api}/roles/${encodeURIComponent(roleCode)}/assignment-history`);
  }

  // ---------- Platform: Tenant Config ----------
  getTenantConfig(): Observable<any> {
    return this.http.get(`${this.api}/tenant-config`);
  }

  // ---------- Health Config ----------
  getHealthConfig(): Observable<any> {
    return this.http.get(`${this.api}/foundation/health-config`);
  }

  getFoundationHealth(): Observable<any> {
    return this.http.get(`${this.api}/foundation/health`);
  }

  getFoundationModuleConfig(): Observable<any> {
    return this.http.get(`${this.api}/foundation/module-config`);
  }

  // ---------- Authority & SoD ----------
  /** GET /api/foundation/authority/kinds — list all authority kind definitions. */
  getAuthorityKinds(): Observable<{ data: unknown[] }> {
    return this.http.get<{ data: unknown[] }>(`${this.api}/foundation/authority/kinds`);
  }

  /** GET /api/foundation/sod/rules — list SoD rule definitions for the tenant. */
  getSodRules(): Observable<{ data: unknown[] }> {
    return this.http.get<{ data: unknown[] }>(`${this.api}/foundation/sod/rules`);
  }

  /** GET /api/foundation/sod/violations — list unresolved SoD violations for the tenant. */
  getSodViolations(params?: { user_id?: string; status?: string }): Observable<{ data: unknown[] }> {
    let httpParams = new HttpParams();
    if (params?.user_id) httpParams = httpParams.set('user_id', params.user_id);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<{ data: unknown[] }>(`${this.api}/foundation/sod/violations`, { params: httpParams });
  }

  // ---------- Training & COI ----------
  /** GET /api/foundation/training — list training assignments for the current user. */
  getTrainingAssignments(params?: { user_id?: string; status?: string }): Observable<{ data: unknown[] }> {
    let httpParams = new HttpParams();
    if (params?.user_id) httpParams = httpParams.set('user_id', params.user_id);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<{ data: unknown[] }>(`${this.api}/foundation/training`, { params: httpParams });
  }

  /** GET /api/foundation/coi — list COI declarations for the tenant. */
  getCoiDeclarations(params?: { user_id?: string; status?: string }): Observable<{ data: unknown[] }> {
    let httpParams = new HttpParams();
    if (params?.user_id) httpParams = httpParams.set('user_id', params.user_id);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<{ data: unknown[] }>(`${this.api}/foundation/coi`, { params: httpParams });
  }

  // ---------- Foundation Surfaces (from lookups) ----------
  /**
   * Surfaces list comes from the same `/foundation/lookups` call as dropdowns.
   * On failure, `foundationSurfaces` is empty and `lookupsLoadError` is set — call `notifyFoundationLookupsError` from `foundation-notify-lookups`.
   */
  getFoundationSurfaces(): Observable<FoundationSurfacesResult> {
    return this.getLookups().pipe(
      map((l): FoundationSurfacesResult => ({
        foundationSurfaces: l.foundationSurfaces ?? [],
        ...(l.lookupsLoadError ? { lookupsLoadError: l.lookupsLoadError } : {}),
      })),
    );
  }

  // ---------- Lookups (centralized dropdown options, DB-driven) ----------
  /** Loads all dropdown/enum options from the backend. Cache-friendly — call once on page init. */
  getLookups(): Observable<FoundationLookups> {
    return this.http.get<FoundationLookups>(`${this.api}/foundation/lookups`).pipe(
      catchError((err: unknown) => {
        const message = FoundationApiService.formatLoadError(err);
        console.warn('[FoundationApiService] getLookups failed', err);
        return of({ lookupsLoadError: message } as FoundationLookups);
      })
    );
  }

  // ---------- Overview aggregate (pilot: single typed method for Foundation overview page) ----------
  /**
   * Loads Foundation overview slices. Users/departments/teams use `/foundation/*` (foundation.read).
   * Deferred workflow/governance slices are opt-in so Foundation-only bring-up
   * never calls modules that are intentionally disabled. Failures are recorded
   * in `loadErrors` instead of silent `{}`.
   */
  getOverviewData(options: { includeWorkflowSlices?: boolean } = {}): Observable<FoundationOverviewData> {
    const includeWorkflowSlices = options.includeWorkflowSlices === true;
    const loadErrors: Record<string, string> = {};
    const s = (key: string, obs: Observable<any>, empty: unknown) => this.overviewSlice(loadErrors, key, obs, empty);
    /** Map backend `{success, data, ...}` slices into the legacy `{<key>: rows}` shape that the overview KPI helper reads. */
    const remap = <T extends Record<string, unknown>>(targetKey: string, src$: Observable<any>): Observable<T> =>
      src$.pipe(map((res: any) => {
        if (res && Array.isArray(res[targetKey])) return res as T;
        const rows = Array.isArray(res?.data) ? res.data : [];
        return ({ [targetKey]: rows } as unknown) as T;
      }));

    return forkJoin({
      users: s('users', this.http.get(`${this.api}/foundation/users`), { users: [] }),
      departments: s('departments', this.http.get(`${this.api}/foundation/departments`), { departments: [] }),
      locations: s('locations', this.http.get(`${this.api}/locations`), {}),
      organizations: s('organizations', remap<{ organizations: unknown[] }>('organizations', this.http.get(`${this.api}/organizations`)), { organizations: [] }),
      businessUnits: s('businessUnits', remap<{ businessUnits: unknown[] }>('businessUnits', this.http.get(`${this.api}/business-units`)), { businessUnits: [] }),
      roles: s('roles', this.http.get(`${this.api}/profiles/roles`), {}),
      audit: s('audit', this.http.get(`${this.api}/audit-trail?limit=20`), {}),
      invitations: s('invitations', this.http.get(`${this.api}/invitations`), {}),
      teams: s('teams', this.http.get<{ teams?: unknown[] }>(`${this.api}/foundation/teams`), { teams: [] }),
      positions: s('positions', remap<{ positions: unknown[] }>('positions', this.http.get(`${this.api}/positions`)), { positions: [] }),
      committees: s('committees', remap<{ committees: unknown[] }>('committees', this.http.get(`${this.api}/committees`)), { committees: [] }),
      delegations: includeWorkflowSlices
        ? s('delegations', remap<{ delegations: unknown[] }>('delegations', this.http.get(`${this.api}/governance/delegations`)), { delegations: [] })
        : of({ delegations: [] }),
      policies: includeWorkflowSlices
        ? s('policies', remap<{ policies: unknown[] }>('policies', this.http.get(`${this.api}/governance/policies`)), { policies: [] })
        : of({ policies: [] }),
    }).pipe(
      map((res): FoundationOverviewData => ({
        users: res.users as unknown,
        departments: res.departments as unknown,
        locations: res.locations as unknown,
        organizations: res.organizations as unknown,
        businessUnits: res.businessUnits as unknown,
        roles: res.roles as unknown,
        audit: res.audit as unknown,
        invitations: res.invitations as unknown,
        teams: res.teams as unknown,
        positions: res.positions as unknown,
        committees: res.committees as unknown,
        delegations: res.delegations as unknown,
        policies: res.policies as unknown,
        loadErrors: Object.keys(loadErrors).length ? { ...loadErrors } : undefined,
      }))
    );
  }
}
