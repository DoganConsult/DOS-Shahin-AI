import { Component, OnInit, OnDestroy, inject, Input, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { Subscription } from 'rxjs';
import { WebSocketClientService } from '@app/core/services/websocket/websocket-client.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { TabViewModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { devError } from '@app/runtime/utils/dev-logger';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { GrcFormFieldComponent } from '@app/widgets';

import { WorkflowNode, WorkflowEdge } from './models/workflow.models';
import { WorkflowDataService } from './services/workflow-data.service';
import { WorkflowListComponent } from './components/workflow-list.component';
import { WorkflowDesignerComponent } from './components/workflow-designer.component';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Top-level workflows page. Coordinates tabs:
 *   0 - Workflow List (child component)
 *   1 - Predefined Templates
 *   2 - Designer (child component)
 *   3 - Execution History
 *   4 - Analytics
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflows',
    imports: [
        CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent, StatCardComponent, GrcFormFieldComponent,
        TabViewModule, CardModule, ButtonModule, InputTextModule, DropdownModule,
        ToolbarModule, ChipModule, TooltipModule, ToastModule, TagModule, DialogModule, ConfirmDialogModule,
        AppDatePipe, RaciPanelComponent,
        WorkflowListComponent, WorkflowDesignerComponent,
    ],
    providers: [MessageService, ConfirmationService, WorkflowDataService],
    styleUrls: ['./workflows.component.scss'],
    templateUrl: './workflows.component.html'
})
export class WorkflowsComponent implements OnInit, OnDestroy {
  @ViewChild('designer') designer!: WorkflowDesignerComponent;
  @Input() initialTab: string | null = null;

  private wsSub: Subscription | null = null;
  private keycloakAuth = inject(SessionService);
  private cdr = inject(ChangeDetectorRef);
  private dataService = inject(WorkflowDataService);
  private messageService = inject(MessageService);
  private wsClient = inject(WebSocketClientService);
  i18n = inject(I18nService);

  tabIndex = 0;
  loading = true;
  workflows: GrcRecord[] = [];
  executions: GrcRecord[] = [];

  // Analytics
  analyticsData: GrcRecord | null = null;
  analyticsWorkflowId = '';
  workflowDropdownOptions: { label: string; value: string }[] = [];

  // RACI panel
  raciWfVisible = false;
  raciWfLoading = false;
  raciWfMatrix: GrcRecord | null = null;
  raciWfLabel = '';

  // Templates
  predefinedTemplates: GrcRecord[] = [];
  extTemplates: GrcRecord[] = [];
  templateSearch = '';
  selectedTemplate: GrcRecord | null = null;
  instanceName = '';
  instancePriority = 'medium';
  instanceAssignee = '';
  instantiating = false;

  // Team/Role options (shared with child components)
  teamMemberOptions: { label: string; value: string }[] = [];
  approverOptions: { label: string; value: string }[] = [];
  roleOptions: { label: string; value: string }[] = [];

  priorityOptions = [
    { label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' },
  ];

  private static readonly TAB_MAP: Record<string, number> = { list: 0, templates: 1, designer: 2, executions: 3, analytics: 4 };

  // ---- Lifecycle ----

  ngOnInit(): void {
    if (this.initialTab && WorkflowsComponent.TAB_MAP[this.initialTab] !== undefined) {
      this.tabIndex = WorkflowsComponent.TAB_MAP[this.initialTab];
    }
    this.loadWorkflows();
    this.loadTeamAndRoles();
    this.loadTemplates();
    this.keycloakAuth.getToken().catch((e: unknown) => { console.warn('[Workflows] Token fetch failed:', e); });
    this.wsSub = this.wsClient.workflowUpdates$.subscribe((update) => {
      const wf = this.workflows.find(w => w.workflow_id === update.workflowId);
      if (wf) { wf.status = update.status; }
      this.loadWorkflows();
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  // ---- Data Loading ----

  loadWorkflows(): void {
    this.loading = true;
    this.dataService.loadWorkflows().subscribe({
      next: (wfs) => {
        this.workflows = wfs;
        this.workflowDropdownOptions = wfs.map(w => ({ label: w.name, value: w.workflow_id }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadWorkflows'), life: 4000 });
      },
    });
    this.dataService.loadExecutions().subscribe({
      next: (execs) => { this.executions = execs; },
      error: (e) => devError('[API]', e),
    });
  }

  private loadTeamAndRoles(): void {
    this.dataService.loadTeamAndRoles().subscribe({
      next: ({ teamMemberOptions, approverOptions, roleOptions }) => {
        this.teamMemberOptions = teamMemberOptions;
        this.approverOptions = approverOptions;
        this.roleOptions = roleOptions;
      },
      error: (e) => devError('[API]', e),
    });
  }

  private loadTemplates(): void {
    this.dataService.loadPredefinedTemplates().subscribe({
      next: (data) => { this.predefinedTemplates = data; },
      error: (e) => devError('[API]', e),
    });
    this.dataService.loadExtTemplates().subscribe({
      next: (data) => { this.extTemplates = data; },
      error: (e) => devError('[API]', e),
    });
    this.dataService.loadDbTemplates().subscribe({
      next: (dbTemplates) => {
        const keys = new Set(this.predefinedTemplates.map((t) => t.templateKey || t.name_en));
        for (const dt of dbTemplates) {
          if (!keys.has(dt.templateKey) && !keys.has(dt.name_en)) {
            this.predefinedTemplates = [...this.predefinedTemplates, dt];
            keys.add(dt.templateKey);
          }
        }
      },
      error: (e) => devError('[API]', e),
    });
  }

  // ---- Template computed / helpers ----

  get filteredTemplates(): GrcRecord[] {
    const all = [...this.predefinedTemplates, ...this.extTemplates];
    if (!this.templateSearch) return all;
    const q = this.templateSearch.toLowerCase();
    return all.filter(t =>
      (t.name_en || t.nameEn || '').toLowerCase().includes(q) ||
      (t.name_ar || t.nameAr || '').toLowerCase().includes(q) ||
      (t.description_en || t.descriptionEn || '').toLowerCase().includes(q)
    );
  }

  selectTemplate(tpl: GrcRecord): void {
    this.selectedTemplate = tpl;
    this.instanceName = tpl.name_en || tpl.nameEn || '';
    this.instancePriority = 'medium';
    this.instanceAssignee = '';
  }

  isTemplateSelected(tpl: GrcRecord): boolean {
    if (!this.selectedTemplate) return false;
    return (this.selectedTemplate.templateKey === tpl.templateKey) ||
           (this.selectedTemplate.templateId === tpl.templateId);
  }

  getTemplateName(tpl: GrcRecord): string {
    if (this.i18n.currentLang() === 'ar') return tpl.name_ar || tpl.nameAr || tpl.name_en || tpl.nameEn || '';
    return tpl.name_en || tpl.nameEn || tpl.name_ar || tpl.nameAr || '';
  }

  getTemplateDesc(tpl: GrcRecord): string {
    return tpl.description_en || tpl.descriptionEn || '';
  }

  getTemplateStepCount(tpl: GrcRecord): number {
    return tpl.definition?.nodes?.length || tpl.steps?.length || 0;
  }

  getTemplateNodes(): GrcRecord[] {
    if (this.selectedTemplate?.definition?.nodes) return this.selectedTemplate.definition.nodes;
    if (this.selectedTemplate?.steps) return this.selectedTemplate.steps;
    return [];
  }

  getTemplateEdges(): GrcRecord[] {
    if (this.selectedTemplate?.definition?.edges) return this.selectedTemplate.definition.edges;
    return [];
  }

  instantiateTemplate(): void {
    if (!this.selectedTemplate) return;
    this.instantiating = true;
    const key = this.selectedTemplate.templateKey || this.selectedTemplate.templateId;
    const payload = {
      templateKey: key,
      params: {
        name: this.instanceName || this.selectedTemplate.name_en || this.selectedTemplate.nameEn,
        priority: this.instancePriority,
        ...(this.instanceAssignee ? { assignee: this.instanceAssignee } : {}),
      },
    };
    this.dataService.instantiateFromTemplate(payload).subscribe({
      next: () => {
        this.instantiating = false;
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.created'), detail: this.i18n.translate('common.workflowCreated'), life: 3000 });
        this.selectedTemplate = null;
        this.tabIndex = 0;
        this.loadWorkflows();
      },
      error: (err) => {
        this.instantiating = false;
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: err?.error?.error || 'Failed to create workflow', life: 4000 });
      },
    });
  }

  // ---- Designer bridge ----

  newWorkflow(): void {
    this.designer?.reset();
    this.tabIndex = 2;
  }

  editWorkflow(w: GrcRecord): void {
    this.designer?.loadWorkflow(w);
    this.tabIndex = 2;
  }

  onDesignerSave(payload: { designerWf: GrcRecord; nodes: WorkflowNode[]; edges: WorkflowEdge[] }): void {
    const nodesWithMode = payload.nodes.map(n => ({
      ...n,
      operation_mode: n.config?.['operationMode'] || null,
    }));
    const data = {
      ...payload.designerWf,
      definition: { nodes: nodesWithMode, edges: payload.edges },
    };
    this.dataService.createWorkflow(data).subscribe({
      next: () => {
        this.tabIndex = 0;
        this.loadWorkflows();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.workflowSaved'), life: 3000 });
      },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToSave'), life: 4000 }),
    });
  }

  // ---- Analytics ----

  loadAnalytics(): void {
    if (!this.analyticsWorkflowId) { this.analyticsData = null; return; }
    this.dataService.loadAnalytics(this.analyticsWorkflowId).subscribe({
      next: (data) => { this.analyticsData = data; },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadAnalytics'), life: 4000 }),
    });
  }

  // ---- RACI ----

  viewRaci(w: GrcRecord): void {
    const id = w.workflow_id ?? w.id ?? w.name;
    this.raciWfLabel = w.name ?? id;
    this.raciWfMatrix = null;
    this.raciWfLoading = true;
    this.raciWfVisible = true;
    this.dataService.getRACIMatrix('workflow', id).subscribe({
      next: (data) => { this.raciWfMatrix = data; this.raciWfLoading = false; },
      error: () => {
        this.raciWfMatrix = { responsible: [], accountable: [], consulted: [], informed: [] };
        this.raciWfLoading = false;
      }
    });
  }

  raciWfLetter(role: string): string {
    return { responsible: 'R', accountable: 'A', consulted: 'C', informed: 'I' }[role] ?? role[0].toUpperCase();
  }

  raciWfSev(role: string): 'success' | 'info' | 'warning' | 'secondary' | 'danger' | 'contrast' {
    const m: Record<string, 'success' | 'info' | 'warning' | 'secondary'> = { responsible: 'success', accountable: 'info', consulted: 'warning', informed: 'secondary' };
    return m[role] ?? 'secondary';
  }
}
