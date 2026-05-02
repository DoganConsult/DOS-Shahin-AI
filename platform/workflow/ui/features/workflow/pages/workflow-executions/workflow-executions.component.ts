import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { WebSocketClientService } from '@app/core/services/websocket/websocket-client.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { SlaTimerPillComponent } from '@app/shared/components/status-indicators/sla-timer-pill.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { devError } from '@app/runtime/utils/dev-logger';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { GanttChartComponent, GanttTask } from '@app/shared/gantt-chart/gantt-chart.component';
import { CalendarViewComponent, CalendarEvent } from '@app/shared/calendar/calendar-view.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-executions',
    imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, TooltipModule, ToastModule, DialogModule, DropdownModule, InputTextModule, AppDatePipe, SlaTimerPillComponent, SkeletonLoaderComponent, EmptyStateComponent, PageShellComponent, GanttChartComponent, CalendarViewComponent],
    providers: [MessageService],
    template: `
    <app-page-shell icon="pi pi-sitemap" title="Workflow Executions" subtitle="View and manage workflow runs" [breadcrumbs]="i18n.currentLang()==='ar' ? ['لوحة التحكم', 'سير العمل', 'التنفيذات'] : ['Dashboard', 'Workflows', 'Executions']" [loading]="false">
    <p-toast />
    @if (loadError()) {
      <div class="wfe-error-panel">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
        <p>{{ i18n.currentLang()==='ar' ? 'فشل تحميل قائمة التنفيذات' : 'Failed to load executions' }}</p>
        <button pButton [label]="i18n.translate('common.retry')" icon="pi pi-replay" class="p-button-outlined" (click)="retryLoad()"></button>
      </div>
    } @else if (loading()) {
      <div class="wfe-toolbar">
        <span class="p-input-icon-left wfe-search"><i class="pi pi-search"></i><input type="text" pInputText disabled class="wfe-search" /></span>
        <p-dropdown [style]="{'min-width':'140px'}" [disabled]="true" placeholder="All statuses"></p-dropdown>
      </div>
      <app-skeleton-loader variant="list" [count]="8"></app-skeleton-loader>
    } @else {
    <div class="wfe-toolbar">
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <input type="text" pInputText [(ngModel)]="searchTerm" placeholder="Search executions..." aria-label="Search executions" (input)="filter()" class="wfe-search" />
      </span>
      <p-dropdown [(ngModel)]="statusFilter" [options]="statusOptions" optionLabel="label" optionValue="value" placeholder="All statuses" [showClear]="true" (onChange)="filter()" [style]="{'min-width':'140px'}" />
      <button pButton icon="pi pi-refresh" class="p-button-text" pTooltip="Refresh" (click)="load()"></button>
      <button *ngIf="selected.length > 0" pButton icon="pi pi-times" label="Cancel Selected ({{ selected.length }})" class="p-button-danger p-button-sm" (click)="bulkCancel()"></button>
      <span class="wfe-view-toggle">
        <button pButton icon="pi pi-list" class="p-button-text p-button-sm" [class.p-button-primary]="execView==='list'" pTooltip="List View" (click)="execView='list'"></button>
        <button pButton icon="pi pi-calendar" class="p-button-text p-button-sm" [class.p-button-primary]="execView==='gantt'" pTooltip="Gantt Timeline" (click)="execView='gantt'"></button>
        <button pButton icon="pi pi-calendar-plus" class="p-button-text p-button-sm" [class.p-button-primary]="execView==='calendar'" pTooltip="Calendar View" (click)="execView='calendar'"></button>
      </span>
    </div>

    @if (execView === 'gantt' && filtered().length > 0) {
      <app-gantt-chart [tasks]="executionGanttTasks()" [readonly]="true" height="450px" (taskSelected)="onExecGanttClick($event)" />
    }

    @if (execView === 'calendar' && filtered().length > 0) {
      <app-calendar-view [events]="executionCalendarEvents()" [locale]="i18n.currentLang()" [direction]="i18n.direction()" (eventClicked)="onCalendarExecClick($event)" />
    }

    @if (execView === 'list' && executions().length === 0) {
      <app-empty-state
        [title]="i18n.currentLang()==='ar' ? 'لا توجد عمليات تنفيذ' : 'No executions yet'"
        [description]="i18n.currentLang()==='ar' ? 'ستظهر التنفيذات هنا عند تشغيل سير العمل.' : 'Executions will appear here when workflows are run.'"
        actionLabel="Process Tasks"
        (action)="goToProcessTasks()"
      />
    } @else if (execView === 'list') {
    <p-table aria-label="Workflow Executions" [value]="filtered()" [paginator]="filtered().length > 10" [rows]="10"
             styleClass="p-datatable-striped p-datatable-sm" [loading]="false"
             [(selection)]="selected" dataKey="execution_id">
      <ng-template pTemplate="header">
        <tr>
          <th style="width:40px"><p-tableHeaderCheckbox /></th>
          <th>{{ i18n.currentLang()==='ar' ? 'سير العمل' : 'Workflow' }}</th>
          <th>{{ i18n.currentLang()==='ar' ? 'الحالة' : 'Status' }}</th>
          <th>{{ i18n.currentLang()==='ar' ? 'المشغل' : 'Trigger' }}</th>
          <th>{{ i18n.currentLang()==='ar' ? 'الخطوات' : 'Steps' }}</th>
          <th>{{ i18n.currentLang()==='ar' ? 'بدأ في' : 'Started' }}</th>
          <th>{{ i18n.currentLang()==='ar' ? 'المدة' : 'Duration' }}</th>
          <th style="width:180px">{{ i18n.currentLang()==='ar' ? 'إجراءات' : 'Actions' }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-ex>
        <tr>
          <td><p-tableCheckbox [value]="ex" /></td>
          <td><strong>{{ ex.workflow_name || '—' }}</strong></td>
          <td>
            <p-tag [value]="ex.status" [severity]="statusSeverity(ex.status)" />
            <p-tag *ngIf="getSlaState(ex) === 'breached'" value="SLA Breached" severity="danger" styleClass="ms-1" />
            <p-tag *ngIf="getSlaState(ex) === 'at_risk'" value="At Risk" severity="warning" styleClass="ms-1" />
          </td>
          <td>{{ ex.trigger_type || 'manual' }}</td>
          <td>{{ ex.steps_executed || 0 }}</td>
          <td>{{ ex.started_at | appDate:'short' }}</td>
          <td>{{ getDuration(ex) }}</td>
          <td>
            <div class="wfe-actions">
              <button pButton icon="pi pi-eye" class="p-button-text p-button-sm" pTooltip="View details" (click)="openDetail(ex)"></button>
              <button *ngIf="ex.status === 'paused'" pButton icon="pi pi-play" class="p-button-text p-button-sm p-button-success" pTooltip="Resume" (click)="resume(ex)"></button>
              <button *ngIf="ex.status === 'running' || ex.status === 'paused'" pButton icon="pi pi-times" class="p-button-text p-button-sm p-button-danger" pTooltip="Cancel" (click)="cancel(ex)"></button>
              <button *ngIf="ex.status === 'failed' || ex.status === 'cancelled'" pButton icon="pi pi-replay" class="p-button-text p-button-sm p-button-warning" [pTooltip]="i18n.translate('common.retry')" (click)="retry(ex)"></button>
              <button pButton icon="pi pi-download" class="p-button-text p-button-sm" pTooltip="Export log" (click)="exportLog(ex)"></button>
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="8" class="wfe-empty">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-color-secondary)"></i>
            <p>{{ i18n.currentLang()==='ar' ? 'لا توجد عمليات تنفيذ' : 'No executions found' }}</p>
          </td>
        </tr>
      </ng-template>
    </p-table>
    }

    <p-dialog [header]="detailExec?.workflow_name || 'Execution Detail'" [(visible)]="detailVisible" [modal]="true" [style]="{width:'720px','max-height':'80vh'}" [dismissableMask]="true">
      <ng-container *ngIf="detailExec">
        <div class="wfe-detail-header">
          <div class="wfe-detail-meta">
            <span><strong>ID:</strong> {{ detailExec.execution_id | slice:0:8 }}...</span>
            <p-tag [value]="detailExec.status" [severity]="statusSeverity(detailExec.status)" />
            <span><strong>{{ i18n.currentLang()==='ar' ? 'المشغل' : 'Trigger' }}:</strong> {{ detailExec.trigger_type || 'manual' }}</span>
            <span><strong>{{ i18n.currentLang()==='ar' ? 'المدة' : 'Duration' }}:</strong> {{ getDuration(detailExec) }}</span>
          </div>
        </div>
        <div *ngIf="detailLoading" class="wfe-loading-sm"><i class="pi pi-spin pi-spinner"></i> {{ i18n.currentLang()==='ar' ? 'جاري التحميل...' : 'Loading...' }}</div>
        <h4 style="margin:16px 0 8px" *ngIf="!detailLoading && detailMermaid"><i class="pi pi-sitemap"></i> {{ i18n.currentLang()==='ar' ? 'مسار التنفيذ' : 'Execution Path' }}</h4>
        <div *ngIf="!detailLoading && detailMermaid" class="wfe-mermaid-wrap">
          <pre class="wfe-mermaid-code">{{ detailMermaid }}</pre>
          <a href="https://mermaid.live/edit" target="_blank" rel="noopener" class="wfe-mermaid-link">{{ i18n.currentLang()==='ar' ? 'فتح في Mermaid Live' : 'Open in Mermaid Live' }}</a>
        </div>
        <h4 style="margin:16px 0 8px"><i class="pi pi-list"></i> {{ i18n.currentLang()==='ar' ? 'سجل الخطوات' : 'Step Timeline' }}</h4>
        <div class="wfe-steps" *ngIf="detailSteps.length > 0 || getSteps(detailExec).length > 0">
          <div *ngFor="let step of (detailSteps.length ? detailSteps : getSteps(detailExec)); let idx = index" class="wfe-step" [ngClass]="'wfe-step--' + (step.status || 'completed')">
            <div class="wfe-step-indicator">
              <i *ngIf="step.status === 'running'" class="pi pi-spin pi-spinner" style="color:var(--primary-color)"></i>
              <i *ngIf="step.status === 'completed' || !step.status" class="pi pi-check-circle" style="color:var(--green-500)"></i>
              <i *ngIf="step.status === 'failed'" class="pi pi-times-circle" style="color:var(--red-500)"></i>
              <i *ngIf="step.status === 'paused' || step.status === 'waiting_approval'" class="pi pi-pause-circle" style="color:var(--orange-500)"></i>
              <i *ngIf="step.status === 'skipped'" class="pi pi-minus-circle" style="color:var(--text-color-secondary)"></i>
              <span *ngIf="step.isAI" class="wfe-ai-badge">AI</span>
            </div>
            <div class="wfe-step-body">
              <div class="wfe-step-name">{{ step.label || step.nodeId || step.type || ('Step ' + (idx + 1)) }}</div>
              <div class="wfe-step-meta">
                <span *ngIf="step.type" class="wfe-step-type">{{ step.type }}</span>
                <span *ngIf="step.startedAt">{{ step.startedAt | appDate:'short' }}</span>
                <span *ngIf="step.durationMs">{{ step.durationMs }}ms</span>
                <span *ngIf="step.assigneeRole || step.swimlane" class="wfe-step-role"><i class="pi pi-id-card"></i> {{ step.assigneeRole || step.swimlane }}</span>
                <span *ngIf="step.slaHours" class="wfe-step-sla-h">SLA: {{ step.slaHours }}h</span>
                <span *ngIf="step.dueAt" class="wfe-step-due">Due: {{ step.dueAt | appDate:'short' }}</span>
                <span *ngIf="step.branchTaken" class="wfe-step-branch" [style.color]="step.branchTaken === 'true' || step.branchTaken === 'yes' ? 'var(--green-500)' : 'var(--red-500)'"><i class="pi pi-directions"></i> {{ step.branchTaken }}</span>
              </div>
              <div *ngIf="step.teamName || step.userName" class="wfe-step-assignment">
                <span *ngIf="step.teamName"><i class="pi pi-users"></i> {{ step.teamName }}</span>
                <span *ngIf="step.userName"><i class="pi pi-user"></i> {{ step.userName }}</span>
                <span *ngIf="step.routingTier" class="wfe-step-tier">{{ step.routingTier }}</span>
              </div>
              <div *ngIf="step.dueAt && step.status !== 'completed' && step.status !== 'failed' && step.status !== 'skipped'" class="wfe-step-sla-pill">
                <app-sla-timer-pill [dueDate]="step.dueAt" [slaHours]="step.slaHours || 0" [status]="step.status || 'pending'" />
              </div>
              <div *ngIf="step.error" class="wfe-step-error">{{ step.error }}</div>
              <div *ngIf="step.status === 'waiting_approval' || step.status === 'pending_approval'" class="wfe-step-waiting">Waiting for approval</div>
            </div>
          </div>
          <div *ngIf="(detailSteps.length || getSteps(detailExec).length) === 0" class="wfe-no-steps">No step data recorded for this execution.</div>
        </div>
        <div *ngIf="getSlaState(detailExec) !== 'none'" class="wfe-sla-banner" [ngClass]="'wfe-sla--' + getSlaState(detailExec)">
          <i class="pi" [ngClass]="getSlaState(detailExec)==='breached' ? 'pi-exclamation-circle' : 'pi-clock'"></i>
          {{ getSlaState(detailExec)==='breached' ? 'SLA Breached' : 'SLA At Risk' }}
          <span *ngIf="detailExec.sla_deadline || detailExec.deadline">— Due: {{ (detailExec.sla_deadline || detailExec.deadline) | appDate:'short' }}</span>
        </div>

        <h4 style="margin:16px 0 8px" *ngIf="activityLog.length > 0"><i class="pi pi-history"></i> {{ i18n.currentLang()==='ar' ? 'سجل النشاط' : 'Activity Log' }}</h4>
        <div class="wfe-activity-list" *ngIf="activityLog.length > 0">
          <div *ngFor="let a of activityLog" class="wfe-activity-entry">
            <div class="wfe-activity-icon">
              <i class="pi" [ngClass]="getActivityIcon(a.type)"></i>
            </div>
            <div class="wfe-activity-body">
              <span class="wfe-activity-type">{{ a.type }}</span>
              <span class="wfe-activity-detail">{{ a.detail }}</span>
              <span class="wfe-activity-meta">{{ a.actor }} · {{ a.timestamp | appDate:'short' }}</span>
            </div>
          </div>
        </div>
        <div *ngIf="activityLoading" class="wfe-loading-sm"><i class="pi pi-spin pi-spinner"></i></div>

        <div class="wfe-detail-actions">
          <button *ngIf="detailExec.status === 'paused'" pButton label="Resume" icon="pi pi-play" class="p-button-success p-button-sm" (click)="resume(detailExec); detailVisible = false"></button>
          <button *ngIf="detailExec.status === 'running' || detailExec.status === 'paused'" pButton label="Cancel" icon="pi pi-times" class="p-button-danger p-button-sm" (click)="cancel(detailExec); detailVisible = false"></button>
          <button *ngIf="detailExec.status === 'failed' || detailExec.status === 'cancelled'" pButton [label]="i18n.translate('common.retry')" icon="pi pi-replay" class="p-button-warning p-button-sm" (click)="retry(detailExec); detailVisible = false"></button>
          <button pButton label="Export Log" icon="pi pi-download" class="p-button-outlined p-button-sm" (click)="exportLog(detailExec)"></button>
        </div>
      </ng-container>
    </p-dialog>
    }
    </app-page-shell>
  `,
    styles: [`
    .wfe-error-panel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px; text-align: center; color: var(--text-color-secondary); }
    .wfe-error-panel i { font-size: var(--font-size-5xl); color: var(--orange-500); }
    .wfe-error-panel p { margin: 0; font-weight: 500; }
    .wfe-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .wfe-search { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-color-secondary); z-index: 1; }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .wfe-actions { display: flex; gap: 2px; }
    .wfe-empty { text-align: center; padding: 32px; color: var(--text-color-secondary); }
    .wfe-detail-header { border-bottom: 1px solid var(--surface-border); padding-bottom: 12px; }
    .wfe-detail-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: var(--font-size-base); }
    .wfe-steps { display: flex; flex-direction: column; gap: 0; }
    .wfe-step { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--surface-100); }
    .wfe-step:last-child { border-bottom: none; }
    .wfe-step-indicator { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 28px; padding-top: 2px; }
    .wfe-ai-badge { font-size: var(--font-size-nano); font-weight: 700; background: var(--primary-100); color: var(--primary-700); padding: 1px 4px; border-radius: var(--radius-xs); }
    .wfe-step-body { flex: 1; }
    .wfe-step-name { font-weight: 600; font-size: var(--font-size-base); }
    .wfe-step-meta { display: flex; gap: 12px; font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 2px; }
    .wfe-step-type { background: var(--surface-100); padding: 1px 6px; border-radius: var(--radius-xs); }
    .wfe-step-role, .wfe-step-sla-h, .wfe-step-due { margin-inline-end: 8px; }
    .wfe-step-sla-pill { margin-top: 4px; }
    .wfe-step-error { color: var(--red-500); font-size: var(--font-size-caption); margin-top: 4px; }
    .wfe-step-branch { display: flex; align-items: center; gap: 3px; font-weight: 600; font-size: var(--font-size-sm); }
    .wfe-step-assignment { display: flex; gap: 10px; font-size: var(--font-size-sm); margin-top: 3px; color: var(--primary-700); }
    .wfe-step-assignment i { font-size: var(--font-size-xs); margin-inline-end: 2px; }
    .wfe-step-tier { background: var(--surface-200); padding: 0 5px; border-radius: 3px; font-size: var(--font-size-2xs); font-weight: 600; color: var(--text-color-secondary); }
    .wfe-step-waiting { color: var(--orange-500); font-size: var(--font-size-caption); margin-top: 4px; font-style: italic; }
    .wfe-no-steps { text-align: center; padding: 24px; color: var(--text-color-secondary); font-style: italic; }
    .wfe-detail-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--surface-border); }
    .wfe-sla-banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--border-radius); font-size: var(--font-size-tag); font-weight: 600; margin: 12px 0; }
    .wfe-sla--breached { background: var(--red-50, #fef2f2); color: var(--red-700, #b91c1c); border: 1px solid var(--red-200, #fecaca); }
    .wfe-sla--at_risk { background: var(--orange-50, #fff7ed); color: var(--orange-700, #c2410c); border: 1px solid var(--orange-200, #fed7aa); }
    .wfe-activity-list { display: flex; flex-direction: column; gap: 0; max-height: 200px; overflow-y: auto; }
    .wfe-activity-entry { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface-100); font-size: var(--font-size-caption); }
    .wfe-activity-entry:last-child { border-bottom: none; }
    .wfe-activity-icon { min-width: 24px; display: flex; align-items: flex-start; justify-content: center; padding-top: 2px; color: var(--text-color-secondary); }
    .wfe-activity-body { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .wfe-activity-type { font-weight: 600; text-transform: capitalize; }
    .wfe-activity-detail { color: var(--text-color-secondary); }
    .wfe-activity-meta { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .wfe-loading-sm { text-align: center; padding: 8px; color: var(--primary-color); }
    .wfe-mermaid-wrap { background: var(--surface-50); border: 1px solid var(--surface-200); border-radius: var(--border-radius); padding: 12px; margin-bottom: 12px; }
    .wfe-mermaid-code { margin: 0; font-size: var(--font-size-sm); white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow: auto; }
    .wfe-mermaid-link { display: inline-block; margin-top: 8px; font-size: var(--font-size-caption); color: var(--primary-color); }
    .ms-1 { margin-inline-start: 4px; }
    .wfe-view-toggle { display: inline-flex; gap: 2px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 2px; margin-inline-start: auto; }
  `]
})
export class WorkflowExecutionsComponent implements OnInit, OnDestroy {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private msg = inject(MessageService);
  private wsSvc = inject(WebSocketClientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wsSub?: Subscription;
  private highlightId: string | null = null;

  executions = signal<GrcRecord[]>([]);
  filtered = signal<GrcRecord[]>([]);
  loading = signal(true);
  loadError = signal(false);
  searchTerm = '';
  statusFilter = '';
  statusOptions = [
    { label: 'Running', value: 'running' },
    { label: 'Completed', value: 'completed' },
    { label: 'Failed', value: 'failed' },
    { label: 'Paused', value: 'paused' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  execView: 'list' | 'gantt' | 'calendar' = 'list';

  executionGanttTasks = computed<GanttTask[]>(() => {
    return this.filtered().map(ex => {
      const start = ex.started_at ? new Date(ex.started_at) : new Date();
      const end = ex.completed_at ? new Date(ex.completed_at) : new Date();
      const durationMs = Math.max(end.getTime() - start.getTime(), 60000);
      const durationDays = Math.max(1, Math.ceil(durationMs / 86400000));
      const progress = ex.status === 'completed' ? 1 : ex.status === 'running' ? 0.5 : ex.status === 'paused' ? 0.3 : 0;
      const color = ex.status === 'completed' ? '#22c55e' : ex.status === 'failed' ? '#ef4444'
        : ex.status === 'running' ? '#3b82f6' : ex.status === 'paused' ? '#f59e0b' : '#94a3b8';
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      return { id: ex.execution_id, text: ex.workflow_name || ex.execution_id?.slice(0,8) || 'Exec', start_date: fmt(start), duration: durationDays, progress, color };
    });
  });

  executionCalendarEvents = computed<CalendarEvent[]>(() => {
    return this.filtered().map(ex => {
      const color = ex.status === 'completed' ? '#22c55e' : ex.status === 'failed' ? '#ef4444'
        : ex.status === 'running' ? '#3b82f6' : ex.status === 'paused' ? '#f59e0b' : '#94a3b8';
      return {
        id: ex.execution_id,
        title: `${ex.workflow_name || 'Exec'} (${ex.status})`,
        start: ex.started_at || new Date().toISOString(),
        end: ex.completed_at || undefined,
        color,
        extendedProps: { executionId: ex.execution_id, status: ex.status },
      };
    });
  });

  detailVisible = false;
  detailExec: GrcRecord | null = null;
  detailSteps: GrcRecord[] = [];
  detailMermaid: string | null = null;
  detailLoading = false;
  selected: GrcRecord[] = [];
  activityLog: GrcRecord[] = [];
  activityLoading = false;

  ngOnInit(): void {
    this.highlightId = this.route.snapshot.queryParamMap.get('id');
    this.load();
    this.wsSub = this.wsSvc.workflowUpdates$.subscribe(() => this.load());
  }

  ngOnDestroy(): void { this.wsSub?.unsubscribe(); }

  load(): void {
    this.loadError.set(false);
    this.loading.set(true);
    this.operationsSvc.getWorkflowExecutions(100).subscribe({
      next: (res) => {
        const list: any[] = (res as any).executions ?? res ?? [];
        this.executions.set(list);
        this.filter();
        this.loading.set(false);
        if (this.highlightId) {
          const match = list.find((e: any) => e.execution_id === this.highlightId);
          if (match) { this.openDetail(match); }
          this.highlightId = null; // only on first load
        }
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadExecutions'), life: 4000 });
      }
    });
  }

  retryLoad(): void {
    this.loadError.set(false);
    this.load();
  }

  goToProcessTasks(): void {
    this.router.navigate(['/process-tasks']);
  }

  filter(): void {
    let r = this.executions();
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter((e) => (e.workflow_name || '').toLowerCase().includes(t) || (e.execution_id || '').toLowerCase().includes(t) || (e.trigger_type || '').toLowerCase().includes(t));
    }
    if (this.statusFilter) r = r.filter((e) => e.status === this.statusFilter);
    this.filtered.set(r);
  }

  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'paused': return 'warning';
      case 'failed': return 'danger';
      case 'cancelled': return 'secondary';
      default: return undefined;
    }
  }

  getDuration(ex: GrcRecord): string {
    if (!ex.started_at) return '—';
    const start = new Date(ex.started_at).getTime();
    const end = ex.completed_at ? new Date(ex.completed_at).getTime() : Date.now();
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  getSteps(ex: GrcRecord): GrcRecord[] {
    const log = ex.step_log;
    if (!log) return [];
    if (Array.isArray(log)) return log;
    try { return JSON.parse(log); } catch { return []; }
  }

  openDetail(ex: GrcRecord): void {
    this.detailExec = ex;
    this.detailSteps = [];
    this.detailMermaid = null;
    this.activityLog = [];
    this.detailLoading = true;
    this.activityLoading = true;
    this.detailVisible = true;
    this.operationsSvc.getExecutionDetail(ex.execution_id).subscribe({
      next: (res) => {
        this.detailExec = res.execution || ex;
        this.detailSteps = res.steps || [];
        this.detailMermaid = res.mermaid || null;
        this.activityLog = this.detailSteps;
        this.detailLoading = false;
        this.activityLoading = false;
      },
      error: () => {
        this.detailSteps = this.getSteps(ex);
        this.detailMermaid = null;
        this.activityLog = [];
        this.detailLoading = false;
        this.activityLoading = false;
        this.operationsSvc.getExecutionActivity(ex.execution_id).subscribe({
          next: (r) => { this.activityLog = r.activities || []; },
          error: (err) => {
            devError('[WorkflowExecutions] Failed to load execution activity', err);
            this.activityLog = [];
          },
        });
      },
    });
  }

  getSlaState(ex: GrcRecord): string {
    const deadline = ex.sla_deadline || ex.deadline || ex.due_at;
    if (!deadline) return 'none';
    if (ex.status === 'completed') return 'none';
    const now = Date.now();
    const due = new Date(deadline).getTime();
    if (due < now) return 'breached';
    if (due - now < 4 * 60 * 60 * 1000) return 'at_risk';
    return 'none';
  }

  getActivityIcon(type: string): string {
    if (type.includes('started')) return 'pi-play';
    if (type.includes('completed')) return 'pi-check-circle';
    if (type.includes('failed')) return 'pi-times-circle';
    if (type.includes('cancelled')) return 'pi-ban';
    if (type.includes('paused')) return 'pi-pause';
    if (type.includes('approval')) return 'pi-check-square';
    if (type.includes('reassign')) return 'pi-user-edit';
    return 'pi-circle';
  }

  resume(ex: GrcRecord): void {
    if (!ex.workflow_id || !ex.execution_id) return;
    this.operationsSvc.resumeWorkflow(ex.workflow_id, ex.execution_id).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.resumed'), detail: this.i18n.translate('common.executionResumed'), life: 3000 });
        this.load();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: err?.error?.message || this.i18n.translate('common.failedToResume'), life: 4000 });
      }
    });
  }

  cancel(ex: GrcRecord): void {
    this.operationsSvc.cancelWorkflowExecution(ex.execution_id).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.cancelled'), detail: this.i18n.translate('common.executionCancelled'), life: 3000 });
        this.load();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: err?.error?.error || this.i18n.translate('common.failedToCancel'), life: 4000 });
      }
    });
  }

  bulkCancel(): void {
    const ids = this.selected.map((ex) => ex.execution_id).filter(Boolean);
    if (ids.length === 0) return;
    this.operationsSvc.bulkCancelWorkflowExecutions(ids).subscribe({
      next: (res) => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.cancelled'), detail: res.message || this.i18n.translate('common.bulkCancelCount', { count: String((res as any).cancelled?.length || 0) }), life: 4000 });
        this.selected = [];
        this.load();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: err?.error?.error || this.i18n.translate('common.bulkCancelFailed'), life: 4000 });
      }
    });
  }

  retry(ex: GrcRecord): void {
    if (!ex.execution_id) return;
    this.operationsSvc.retryExecution(ex.execution_id).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.retried'), detail: this.i18n.translate('common.executionRerunInitiated'), life: 3000 });
        this.load();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: err?.error?.error || this.i18n.translate('common.retryFailed'), life: 4000 });
      }
    });
  }

  onExecGanttClick(task: GanttTask): void {
    const ex = this.executions().find(e => e.execution_id === task.id);
    if (ex) this.openDetail(ex);
  }

  onCalendarExecClick(event: CalendarEvent): void {
    const ex = this.executions().find(e => e.execution_id === event.id);
    if (ex) this.openDetail(ex);
  }

  exportLog(ex: GrcRecord): void {
    if (!ex.execution_id) return;
    this.operationsSvc.exportExecutionLog(ex.execution_id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `execution-${ex.execution_id.slice(0, 8)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.exported'), detail: this.i18n.translate('common.executionLogDownloaded'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToExportLog'), life: 4000 });
      }
    });
  }
}
