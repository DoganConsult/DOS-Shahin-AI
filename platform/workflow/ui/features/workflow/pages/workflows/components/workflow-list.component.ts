import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { WorkflowDataService } from '../services/workflow-data.service';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Workflow list with search, filter, and CRUD actions.
 * Emits events for edit, new, and RACI view to the parent.
 */
@Component({
    selector: 'app-workflow-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, AppDatePipe, StatusBadgeComponent,
        CardModule, ButtonModule, InputTextModule, DropdownModule,
        ToolbarModule, TooltipModule,
    ],
    styleUrls: ['../workflows.component.scss'],
    template: `
    <p-toolbar styleClass="mb-3">
      <ng-template pTemplate="start">
        <p-button [label]="i18n.translate('workflows.new')" icon="pi pi-plus"
                  (onClick)="newClicked.emit()" />
        <input pInputText [(ngModel)]="searchQuery" [placeholder]="'Search workflows...'" [attr.aria-label]="'Search workflows...'"
               class="ms-2" style="max-width:220px" />
      </ng-template>
      <ng-template pTemplate="end">
        <p-dropdown [(ngModel)]="statusFilter" [options]="statusFilterOptions"
                    optionLabel="label" optionValue="value" [placeholder]="i18n.translate('workflows.allStatuses')"
                    [style]="{'min-width':'140px'}" [showClear]="true" />
      </ng-template>
    </p-toolbar>

    <div class="cards-grid">
      <p-card *ngFor="let w of filteredWorkflows" styleClass="wf-card" (click)="editClicked.emit(w)">
        <div class="wf-inner">
          <div class="wf-header">
            <app-status-badge [status]="w.status" />
            <span class="wf-version">v{{ w.version || 1 }}</span>
          </div>
          <h3 class="wf-name">{{ w.name }}</h3>
          <p class="wf-desc">{{ w.description || '\u2014' }}</p>
          <div class="wf-meta">
            <span><i class="pi pi-sitemap"></i> {{ (w.definition?.nodes || []).length }} nodes</span>
            <span><i class="pi pi-bolt"></i> {{ w.trigger_type || 'manual' }}</span>
            <span *ngIf="w.last_executed"><i class="pi pi-clock"></i> {{ w.last_executed | appDate:'short' }}</span>
          </div>
          <div class="wf-actions">
            <p-button *ngIf="w.status !== 'active'" icon="pi pi-check-circle"
                      [label]="i18n.translate('workflows.activate')"
                      severity="success" [text]="true" size="small"
                      (onClick)="activateWf(w, $event)" pTooltip="Activate workflow" />
            <p-button *ngIf="w.status === 'active'" icon="pi pi-pause-circle"
                      severity="warning" [text]="true" size="small"
                      (onClick)="deactivateWf(w, $event)" pTooltip="Deactivate" />
            <p-button icon="pi pi-play" [label]="i18n.translate('workflows.execute')"
                      severity="success" [text]="true" size="small"
                      [disabled]="w.status !== 'active'"
                      (onClick)="executeWf(w, $event)" pTooltip="Execute workflow" />
            <p-button icon="pi pi-gauge" [label]="i18n.translate('workflows.simulate')"
                      severity="info" [text]="true" size="small"
                      (onClick)="simulateWf(w, $event)" pTooltip="Simulate workflow" />
            <p-button icon="pi pi-copy" severity="secondary" [text]="true" size="small"
                      (onClick)="duplicateWf(w, $event)" pTooltip="Duplicate" />
            <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                      (onClick)="deleteWf(w, $event)" pTooltip="Delete" />
            <p-button icon="pi pi-sitemap" severity="secondary" [text]="true" size="small"
                      (onClick)="viewRaci(w, $event)" pTooltip="View RACI teams" />
          </div>
        </div>
      </p-card>
      <div *ngIf="filteredWorkflows.length===0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('common.noData') }}</p>
        <p-button [label]="i18n.translate('workflows.createFirst')" icon="pi pi-plus" (onClick)="newClicked.emit()" />
      </div>
    </div>
  `
})
export class WorkflowListComponent {
  /** Workflow array from parent. */
  workflows = input<any[]>([]);

  /** Emitted when user wants to create a new workflow. */
  newClicked = output<void>();
  /** Emitted when user clicks a workflow card to edit. */
  editClicked = output<any>();
  /** Emitted after a CRUD action that requires refreshing the list. */
  refreshNeeded = output<void>();
  /** Emitted when user wants to view RACI for a workflow. */
  raciClicked = output<any>();

  i18n = inject(I18nService);
  private messageService = inject(MessageService);
  private confirmService = inject(ConfirmationService);
  private dataService = inject(WorkflowDataService);

  searchQuery = '';
  statusFilter = '';
  statusFilterOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Completed', value: 'completed' },
    { label: 'Failed', value: 'failed' },
  ];

  get filteredWorkflows(): GrcRecord[] {
    let list = this.workflows();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(w => (w.name || '').toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q));
    }
    if (this.statusFilter) {
      list = list.filter(w => w.status === this.statusFilter);
    }
    return list;
  }

  duplicateWf(w: GrcRecord, event: Event): void {
    event.stopPropagation();
    const data: Record<string, unknown> = { ...w, name: w.name + ' (Copy)', definition: { ...(w.definition || {}) } };
    delete data.workflow_id;
    this.dataService.createWorkflow(data).subscribe({
      next: () => {
        this.refreshNeeded.emit();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.duplicated'), detail: this.i18n.translate('common.workflowDuplicated'), life: 3000 });
      },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToDuplicate'), life: 4000 }),
    });
  }

  deleteWf(w: GrcRecord, event: Event): void {
    event.stopPropagation();
    this.confirmService.confirm({
      message: `Delete workflow "${w.name}"?`,
      accept: () => {
        this.dataService.deleteWorkflow(w.workflow_id).subscribe({
          next: () => {
            this.refreshNeeded.emit();
            this.messageService.add({ severity: 'info', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.workflowRemoved'), life: 3000 });
          },
          error: () => {
            this.refreshNeeded.emit();
            this.messageService.add({ severity: 'info', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.workflowRemoved'), life: 3000 });
          },
        });
      },
    });
  }

  activateWf(w: GrcRecord, event: Event): void {
    event.stopPropagation();
    this.dataService.updateWorkflowStatus(w.workflow_id, 'active').subscribe({
      next: () => {
        this.refreshNeeded.emit();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('workflows.activated'), detail: `${w.name} is now active`, life: 3000 });
      },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToActivate'), life: 4000 }),
    });
  }

  deactivateWf(w: GrcRecord, event: Event): void {
    event.stopPropagation();
    this.dataService.updateWorkflowStatus(w.workflow_id, 'template').subscribe({
      next: () => {
        this.refreshNeeded.emit();
        this.messageService.add({ severity: 'info', summary: this.i18n.translate('workflows.deactivated'), detail: `${w.name} set to template`, life: 3000 });
      },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToDeactivate'), life: 4000 }),
    });
  }

  executeWf(w: GrcRecord, event: Event): void {
    event.stopPropagation();
    this.dataService.executeWorkflow(w.workflow_id, {}).subscribe({
      next: (result) => {
        this.refreshNeeded.emit();
        const steps = result?.stepsExecuted || 0;
        const paused = result?.pausedForApproval;
        const detail = paused
          ? `Executed ${steps} steps \u2014 paused for approval`
          : `Completed ${steps} steps`;
        const severity = paused ? 'warn' : 'success';
        this.messageService.add({ severity, summary: paused ? 'Paused' : this.i18n.translate('common.success'), detail, life: 4000 });
      },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToExecute'), life: 4000 }),
    });
  }

  simulateWf(w: GrcRecord, event: Event): void {
    event.stopPropagation();
    this.dataService.executeWorkflow(w.workflow_id, { simulate: true }).subscribe({
      next: (result) => {
        const steps = result?.stepsSimulated || result?.stepsExecuted || 0;
        this.messageService.add({ severity: 'info', summary: this.i18n.translate('common.simulation'), detail: this.i18n.translate('common.simulatedSteps', { steps: String(steps) }), life: 4000 });
      },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.simulationFailed'), life: 4000 }),
    });
  }

  viewRaci(w: GrcRecord, event: Event): void {
    event.stopPropagation();
    this.raciClicked.emit(w);
  }
}
