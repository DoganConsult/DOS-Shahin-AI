import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiClientService } from '@app/core/services/api-client.service';
import { GrcOperationsService } from '@app/grc/services/grc-governance.service';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { GrcComplianceService } from '@app/grc/services/grc-governance.service';

/**
 * Service responsible for all Team Management data-loading operations.
 * Returns raw Observables so the component can set its own signals.
 */
@Injectable()
export class TeamDataService {
    private complianceSvc = inject(GrcComplianceService);
    private governanceSvc = inject(GrcGovernanceService);
    private operationsSvc = inject(GrcOperationsService);
    private apiclientSvc = inject(ApiClientService);

  /**
   * Load all core data for the Team Management page in parallel:
   * teams, role profiles, org members, and RACI total count.
   */
  loadCoreData(): Observable<{ teams: unknown; roles: unknown; members: unknown; raciCount: unknown }> {
    return forkJoin({
      teams: this.apiclientSvc.get('/teams').pipe(catchError(() => of({ teams: [] }))),
      roles: this.operationsSvc.getRoleProfiles().pipe(catchError(() => of({ profiles: [] }))),
      members: this.operationsSvc.getTeamMembers().pipe(catchError(() => of({ members: [] }))),
      raciCount: this.operationsSvc.getTeamRACICount().pipe(catchError(() => of({ count: 0 }))),
    });
  }

  /** Load RACI scopes for a single team. */
  loadRaci(teamId: string): Observable<any> {
    return this.operationsSvc.getTeamRACIScopes(teamId);
  }

  /** Load workload data for a team. */
  loadWorkload(teamId: string): Observable<any> {
    return this.operationsSvc.getTeamWorkload(teamId);
  }

  /** Load role staffing proposals with optional filters. */
  loadRoleStaffing(range?: string, sector?: string): Observable<any> {
    return this.operationsSvc.getRoleStaffing(range, sector);
  }

  /** Load invitations list. */
  loadInvitations(): Observable<any> {
    return this.operationsSvc.getInvitations();
  }

  /** Load RACI suggestions from templates. */
  loadRaciSuggestions(): Observable<any> {
    return this.apiclientSvc.get('/teams/raci-suggestions');
  }

  /** Load member directory (for lifecycle info in the drawer). */
  loadMemberDirectory(): Observable<any> {
    return this.operationsSvc.getMemberDirectory();
  }

  /** Load scope items for RACI assignment based on scope type. */
  loadRaciScopeItems(scopeType: string): Observable<any> {
    switch (scopeType) {
      case 'policy':
        return this.governanceSvc.getPolicies();
      case 'workflow':
        return this.operationsSvc.getWorkflows();
      case 'process':
        return this.operationsSvc.getWorkflows();
      case 'control_group':
        return this.complianceSvc.getControls();
      default:
        return of([]);
    }
  }

  // ---- Mutation operations ----

  createTeam(payload: any): Observable<any> {
    return this.apiclientSvc.post('/teams', payload);
  }

  updateTeam(teamId: string, payload: any): Observable<any> {
    return this.apiclientSvc.put(`/teams/${teamId}`, payload);
  }

  deleteTeam(teamId: string): Observable<any> {
    return this.apiclientSvc.del(`/teams/${teamId}`);
  }

  addMember(teamId: string, userId: string, role: string): Observable<any> {
    return this.apiclientSvc.post(`/teams/${teamId}/members`, { userId, role });
  }

  removeMember(teamId: string, userId: string): Observable<any> {
    return this.apiclientSvc.del(`/teams/${teamId}/members/${userId}`);
  }

  sendInvitation(payload: any): Observable<any> {
    return this.apiclientSvc.post('/invitations', payload);
  }

  revokeInvitation(invitationId: string): Observable<any> {
    return this.operationsSvc.revokeInvitationById(invitationId);
  }

  resendInvitation(invitationId: string): Observable<any> {
    return this.operationsSvc.resendInvitationEmail(invitationId);
  }

  linkWorkflow(teamId: string, workflowIdOrCode: string): Observable<any> {
    return this.apiclientSvc.post(`/teams/${teamId}/link-workflow`, { workflowIdOrCode });
  }

  linkControlGroup(teamId: string, controlGroupId: string): Observable<any> {
    return this.apiclientSvc.post(`/teams/${teamId}/link-controls`, { controlGroupId });
  }

  setRACIRole(scopeType: string, scopeId: string, raciRole: string, teamId: string, userId?: string, notes?: string): Observable<any> {
    return this.operationsSvc.setRACIRole(scopeType, scopeId, raciRole, teamId, userId, notes);
  }

  deleteRaci(raciId: string): Observable<any> {
    return this.apiclientSvc.del(`/teams/raci/${raciId}`);
  }

  sendRoleInvitation(payload: any): Observable<any> {
    return this.operationsSvc.sendRoleInvitation(payload);
  }
}
