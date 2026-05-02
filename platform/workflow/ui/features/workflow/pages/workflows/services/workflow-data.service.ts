import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { GrcOperationsService } from '@app/grc/services/grc-operations.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { environment } from '@env/environment';

@Injectable()
export class WorkflowDataService {
  private ops = inject(GrcOperationsService);
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private api = environment.apiUrl;

  // ---- Workflows ----

  /** Load all workflows (excluding template-status entries). */
  loadWorkflows(): Observable<any[]> {
    return this.ops.getWorkflows().pipe(
      map((r: Record<string, any>) => (r.workflows || []).filter(( w: Record<string, any>) => w.status !== 'template'))
    );
  }

  /** Load execution history. */
  loadExecutions(): Observable<any[]> {
    return this.http.get<Record<string, any>>(`${this.api}/workflows/executions/list`).pipe(
      map((r: Record<string, any>) =>
        (r.executions || []).map((e: Record<string, any>) => ({
          execution_id: e.execution_id,
          workflow_id: e.workflow_id,
          workflow_name: e.workflow_name || this.i18n.translate('common.unknown'),
          status: e.status,
          started_at: e.started_at,
          completed_at: e.completed_at,
          total_steps: e.steps_executed || 0,
          steps_completed: e.steps_executed || 0,
          is_simulation: e.is_simulation,
          step_log: Array.isArray(e.step_log)
            ? e.step_log.map((s: Record<string, any>) => ({
                node_id: s.nodeId,
                node_label: s.label || s.nodeId,
                status: s.status,
              }))
            : [],
        }))
      )
    );
  }

  // ---- Templates ----

  /** Load predefined templates from the static registry. */
  loadPredefinedTemplates(): Observable<any[]> {
    return this.ops.getWorkflowTemplates().pipe(
      map((data: any) => (Array.isArray(data) ? data : []))
    );
  }

  /** Load extended (marketplace) templates. */
  loadExtTemplates(): Observable<any[]> {
    return this.ops.getWorkflowExtTemplates().pipe(
      map((data: any) => (Array.isArray(data) ? data : data?.templates || []))
    );
  }

  /** Load DB-stored templates and merge with predefined set. */
  loadDbTemplates(): Observable<any[]> {
    return this.http.get<Record<string, any>>(`${this.api}/workflows/templates`).pipe(
      map((data: any) =>
        (data?.templates || []).map(( t: Record<string, any>) => ({
          templateKey: t.template_id,
          templateId: t.template_id,
          name_en: t.name,
          name_ar: t.name,
          description_en: t.description || '',
          definition:
            typeof t.definition === 'string'
              ? JSON.parse(t.definition)
              : t.definition || { nodes: [], edges: [] },
        }))
      )
    );
  }

  // ---- Team & Roles ----

  /** Load team members and roles, returning pre-formatted option arrays. */
  loadTeamAndRoles(): Observable<{
    teamMemberOptions: { label: string; value: string }[];
    approverOptions: { label: string; value: string }[];
    roleOptions: { label: string; value: string }[];
  }> {
    return forkJoin({
      members: this.ops.getTeamMembers(),
      roles: this.ops.getRoles(),
    }).pipe(
      map(({ members, roles }) => {
        const memberList = Array.isArray(members) ? members : ((members as any).members || []);
        const roleList = roles.roles || [];
        const teamMemberOptions = memberList.map((m: Record<string, any>) => ({
          label: `${m.name} (${m.email})`,
          value: m.user_id,
        }));
        const approverRoleIds = new Set(
          roleList.filter((r: Record<string, any>) => r.can_approve).map((r: Record<string, any>) => r.role_id)
        );
        const approverOptions = memberList
          .filter((m: Record<string, any>) => approverRoleIds.has(m.role))
          .map((m: Record<string, any>) => ({ label: `${m.name} (${m.role})`, value: m.user_id }));
        const roleOptions = roleList.map((r: Record<string, any>) => ({
          label: this.i18n.localize(r.name_en, r.name_ar),
          value: r.role_id,
        }));
        return { teamMemberOptions, approverOptions, roleOptions };
      })
    );
  }

  // ---- Analytics ----

  /** Load analytics data for a specific workflow. */
  loadAnalytics(workflowId: string): Observable<any> {
    return this.ops.getWorkflowAnalytics(workflowId);
  }

  // ---- CRUD helpers ----

  createWorkflow(data: any): Observable<any> {
    return this.ops.createWorkflow(data);
  }

  deleteWorkflow(workflowId: string): Observable<any> {
    return this.http.delete(`${this.api}/workflows/${workflowId}`);
  }

  updateWorkflowStatus(workflowId: string, status: string): Observable<any> {
    return this.ops.updateWorkflowStatus(workflowId, status);
  }

  executeWorkflow(workflowId: string, params: Record<string, any>): Observable<any> {
    return this.ops.executeWorkflow(workflowId, params);
  }

  instantiateFromTemplate(payload: Record<string, unknown>): Observable<any> {
    return this.ops.instantiateWorkflowFromTemplate(payload as any);
  }

  getRACIMatrix(entityType: string, entityId: string): Observable<any> {
    return this.ops.getRACIMatrix(entityType, entityId);
  }
}
