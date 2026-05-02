import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SessionService } from '@app/dauth/session/session.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { SlaTimerPillComponent } from '@app/shared/components/status-indicators/sla-timer-pill.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { Subscription } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

interface ProcessTask {
  task_id: string;
  source?: 'workflow_tasks' | 'process_tasks';
  title: string;
  description: string;
  task_type: string;
  status: string;
  priority: string;
  assigned_user_id: string;
  assigned_user_name: string;
  team_id: string;
  team_name: string;
  due_date: string;
  sla_hours: number;
  breached_at: string | null;
  escalation_level: number;
  trigger_source: string;
  workflow_execution_id?: string;
  workflow_step_id?: string;
  entity_id?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PRIORITY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-process-tasks',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageShellComponent, SlaTimerPillComponent,
    EmptyStateComponent, SkeletonLoaderComponent,
    CardModule, TableModule, TagModule, ButtonModule, DropdownModule,
    TabViewModule, TooltipModule, BadgeModule, DialogModule, InputTextarea, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="inbox" [title]="'My Process Tasks'" [subtitle]="'RACI-routed tasks assigned to you'" [breadcrumbs]="['Dashboard', 'My Tasks']" [loading]="loading()">
      <div class="flex flex-wrap gap-3 mb-3 align-items-center">
        <p-dropdown [options]="statusOptions" [(ngModel)]="filterStatus" (onChange)="loadTasks()" placeholder="Status" [style]="{minWidth:'140px'}"></p-dropdown>
        <p-dropdown [options]="priorityOptions" [(ngModel)]="filterPriority" (onChange)="loadTasks()" placeholder="Priority" [style]="{minWidth:'140px'}"></p-dropdown>
        <a *ngIf="filterRole()" [routerLink]="['/process-tasks']" [queryParams]="{}" class="p-button p-button-outlined p-button-sm p-button-secondary">
          <i class="pi pi-times mr-1"></i>Role: {{ filterRole() }}
        </a>
        <div class="flex gap-2">
          <button pButton [label]="myTasksOnly() ? 'My Tasks' : 'All Tasks'" [icon]="myTasksOnly() ? 'pi pi-user' : 'pi pi-users'" class="p-button-outlined p-button-sm" (click)="toggleMyTasks()"></button>
          <button pButton icon="pi pi-refresh" class="p-button-outlined p-button-sm" (click)="loadTasks()" pTooltip="Refresh"></button>
        </div>
      </div>

      <div class="grid mb-3" *ngIf="statusCounts() && !loadError()">
        <div class="col-6 md:col-2" *ngFor="let s of statusSummary()">
          <div tabindex="0" role="button" (keyup.enter)="filterStatus = s.key; loadTasks()" class="surface-card border-round p-3 text-center cursor-pointer" [class.border-primary]="filterStatus === s.key" (click)="filterStatus = s.key; loadTasks()">
            <div class="text-2xl font-bold" [style.color]="s.color">{{ s.count }}</div>
            <div class="text-xs text-color-secondary mt-1">{{ s.label }}</div>
          </div>
        </div>
      </div>

      @if (loadError()) {
        <div class="surface-card border-round p-4 text-center">
          <i class="pi pi-exclamation-triangle text-3xl text-orange-500 mb-2" aria-hidden="true"></i>
          <p class="font-semibold text-color-secondary">{{ i18n.translate('Failed to load tasks') }}</p>
          <p class="text-sm text-color-secondary mt-1">{{ i18n.translate('Check connection and try again') }}</p>
          <button pButton [label]="i18n.translate('Retry')" icon="pi pi-refresh" class="p-button-outlined mt-3" (click)="retryLoad()"></button>
        </div>
      } @else if (loading()) {
        <app-skeleton-loader variant="list" [count]="5"></app-skeleton-loader>
      } @else if (!loading() && tasks().length === 0) {
        <app-empty-state
          [title]="i18n.currentLang()==='ar' ? 'لا توجد مهام عملية' : 'No process tasks'"
          [description]="i18n.currentLang()==='ar' ? 'ستظهر المهام عند تشغيل سير العمل أو عند تعيينها لك. تحقق من مركز الموافقات للموافقات المعلقة.' : 'Tasks will appear when workflows are run or when assigned to you. Check Approval Center for pending approvals.'"
          [actionLabel]="i18n.currentLang()==='ar' ? 'الذهاب إلى سير العمل' : 'Go to Workflows'"
          (action)="goToWorkflows()">
        </app-empty-state>
      } @else {
      <p-table aria-label="Data table" [value]="tasks()" [paginator]="true" [rows]="20" [showCurrentPageReport]="true"
               currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
               [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem">Priority</th>
            <th>Title</th>
            <th>Type</th>
            <th>Team</th>
            <th>Assigned To</th>
            <th>Status</th>
            <th>SLA</th>
            <th style="width:10rem">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-task>
          <tr>
            <td>
              <p-tag [value]="task.priority" [severity]="getPrioritySeverity(task.priority)" [rounded]="true"></p-tag>
            </td>
            <td>
              <div class="font-semibold">{{ task.title }}</div>
              <div class="text-xs text-color-secondary mt-1" *ngIf="task.trigger_source">{{ task.trigger_source }}</div>
              <span *ngIf="task.source === 'workflow_tasks'" class="text-xs mt-1 text-orange-600 font-medium">Workflow</span>
              <a *ngIf="task.workflow_execution_id || task.source === 'workflow_tasks'" class="text-xs mt-1 no-underline ml-1" [routerLink]="['/workflow-executions']" [queryParams]="{id: task.workflow_execution_id || task.entity_id}"><i class="pi pi-link mr-1"></i>View</a>
            </td>
            <td>
              <span class="text-sm">{{ formatTaskType(task.task_type) }}</span>
              <i *ngIf="task.task_type === 'workflow_approval'" class="pi pi-check-square ml-1 text-orange-500" pTooltip="Requires approval decision"></i>
            </td>
            <td><span class="text-sm">{{ task.team_name || '—' }}</span></td>
            <td><span class="text-sm">{{ task.assigned_user_name || '—' }}</span></td>
            <td>
              <p-tag [value]="formatStatus(task.status)" [severity]="getStatusSeverity(task.status)" [rounded]="true"></p-tag>
              <span *ngIf="task.escalation_level > 0" class="ml-1 text-xs text-red-500">L{{ task.escalation_level }}</span>
            </td>
            <td>
              <app-sla-timer-pill [dueDate]="task.due_date" [slaHours]="task.sla_hours" [status]="task.status" [breachedAt]="task.breached_at"></app-sla-timer-pill>
              <p-tag *ngIf="task.breached_at" value="Overdue" severity="danger" styleClass="ml-1" [rounded]="true"></p-tag>
            </td>
            <td>
              <div class="flex gap-1">
                <button *ngIf="canTransition(task, 'in_progress')" pButton label="Start" icon="pi pi-play" class="p-button-sm p-button-success p-button-outlined" (click)="transition(task, 'in_progress')"></button>
                <button *ngIf="canTransition(task, 'completed') && task.task_type !== 'workflow_approval'" pButton label="Done" icon="pi pi-check" class="p-button-sm p-button-outlined" (click)="transition(task, 'completed')"></button>
                <button *ngIf="canTransition(task, 'completed') && task.task_type === 'workflow_approval'" pButton label="Approve" icon="pi pi-check-circle" class="p-button-sm p-button-warning p-button-outlined" (click)="transition(task, 'completed')"></button>
                <button *ngIf="task.status === 'pending'" pButton label="Assign" icon="pi pi-user-plus" class="p-button-sm p-button-info p-button-outlined" (click)="transition(task, 'assigned')"></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="text-center p-4">
              <i class="pi pi-inbox text-4xl text-color-secondary mb-3" style="display:block"></i>
              <div class="text-lg font-semibold text-color-secondary">No process tasks found</div>
              <div class="text-sm text-color-secondary mt-1">Tasks will appear here when assigned via RACI orchestration</div>
            </td>
          </tr>
        </ng-template>
      </p-table>
      }
    </app-page-shell>
  `
})
export class ProcessTasksComponent implements OnInit, OnDestroy {
  loading = signal(true);
  loadError = signal(false);
  tasks = signal<ProcessTask[]>([]);
  statusCounts = signal<Record<string, number> | null>(null);
  myTasksOnly = signal(true);
  filterRole = signal<string>('');
  filterStatus = '';
  filterPriority = '';
  statusOptions = STATUS_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;
  private routeSub?: Subscription;

  private readonly TRANSITIONS: Record<string, string[]> = {
    pending: ['assigned', 'in_progress', 'cancelled'],
    open: ['in_progress', 'cancelled'],
    assigned: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'escalated', 'cancelled'],
    escalated: ['in_progress', 'completed', 'cancelled'],
  };

  statusSummary = computed(() => {
    const c = this.statusCounts() || {};
    return [
      { key: 'pending', label: 'Pending', count: c['pending'] || 0, color: '#6b7280' },
      { key: 'assigned', label: 'Assigned', count: c['assigned'] || 0, color: '#3b82f6' },
      { key: 'in_progress', label: 'In Progress', count: c['in_progress'] || 0, color: '#f59e0b' },
      { key: 'escalated', label: 'Escalated', count: c['escalated'] || 0, color: '#ef4444' },
      { key: 'completed', label: 'Completed', count: c['completed'] || 0, color: '#22c55e' },
      { key: '', label: 'Total', count: Object.values(c).reduce((a: number, b: unknown) => a + (Number(b) || 0), 0), color: '#0072c3' },
    ];
  });

  private msg = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  constructor(private auth: GrcAuthService, public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() {
    this.routeSub = this.route.queryParams.subscribe(q => {
      const role = (q['role'] as string) || '';
      this.filterRole.set(role);
      this.loadTasks();
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  retryLoad() {
    this.loadError.set(false);
    this.loadTasks();
  }

  goToWorkflows() {
    this.router.navigate(['/workflow-executions']);
  }

  loadTasks() {
    this.loading.set(true);
    this.loadError.set(false);
    if (this.myTasksOnly()) {
      const params: GrcRecord = {};
      if (this.filterStatus) params.status = this.filterStatus;
      if (this.filterPriority) params.priority = this.filterPriority;
      this.operationsSvc.getMyWorkItems(params).subscribe({
        next: (data) => {
          const list = (data.tasks || []).map((t) => this.queueTaskToProcessTask(t));
          this.tasks.set(list);
          this.statusCounts.set(this.computeStatusCounts(list));
          this.loading.set(false);
        },
        error: () => { this.loadError.set(true); this.loading.set(false); }
      });
    } else {
      const params: GrcRecord = {};
      if (this.filterStatus) params.status = this.filterStatus;
      if (this.filterPriority) params.priority = this.filterPriority;
      if (this.filterRole()) params.role = this.filterRole();
      params.assignedTo = '';
      this.operationsSvc.getProcessTasks(params).subscribe({
        next: (data) => {
          const list = (data.tasks || []).map((t) => ({ ...t, source: 'process_tasks' as const }));
          this.tasks.set(list);
          this.statusCounts.set(data.statusCounts || this.computeStatusCounts(list));
          this.loading.set(false);
        },
        error: () => { this.loadError.set(true); this.loading.set(false); }
      });
    }
  }

  private queueTaskToProcessTask(t: GrcRecord): ProcessTask {
    return {
      task_id: t.taskId,
      source: t.source || 'process_tasks',
      title: t.title || '—',
      description: t.description || '',
      task_type: t.taskType || 'task',
      status: t.status || 'open',
      priority: t.priority || 'medium',
      assigned_user_id: t.assignedTo || '',
      assigned_user_name: 'You',
      team_id: '',
      team_name: '',
      due_date: t.dueDate || '',
      sla_hours: 0,
      breached_at: null,
      escalation_level: 0,
      trigger_source: t.source === 'workflow_tasks' ? 'Workflow' : 'Process',
      workflow_execution_id: t.source === 'workflow_tasks' ? t.entityId : (t.entityType === 'workflow_instance' ? t.entityId : undefined),
      entity_id: t.entityId,
      created_at: t.createdAt || '',
      updated_at: t.createdAt || '',
    };
  }

  private computeStatusCounts(list: ProcessTask[]): Record<string, number> {
    const c: Record<string, number> = {};
    list.forEach(task => { c[task.status] = (c[task.status] || 0) + 1; });
    return c;
  }

  toggleMyTasks() {
    this.myTasksOnly.update(v => !v);
    this.loadTasks();
  }

  canTransition(task: ProcessTask, target: string): boolean {
    return (this.TRANSITIONS[task.status] || []).includes(target);
  }

  transition(task: ProcessTask, newStatus: string) {
    const showSuccess = (summary: string, detail: string) => {
      this.msg.add({ severity: 'success', summary, detail });
      this.loadTasks();
    };
    const showError = (summary: string, detail: string) => {
      this.msg.add({ severity: 'error', summary, detail });
      this.loadTasks();
    };
    if (task.source === 'workflow_tasks') {
      if (newStatus === 'in_progress') {
        this.operationsSvc.claimWorkItem(task.task_id).subscribe({
          next: () => showSuccess('Claimed', 'Task claimed and started'),
          error: () => showError(this.i18n.translate('common.error'), 'Failed to claim task'),
        });
      } else if (newStatus === 'completed') {
        const isApproval = task.task_type === 'workflow_approval';
        this.operationsSvc.completeWorkItem(task.task_id, { outcome: isApproval ? 'approved' : 'done', source: 'workflow_tasks' }).subscribe({
          next: () => showSuccess(isApproval ? 'Approved' : 'Done', isApproval ? 'Approval submitted' : 'Task completed'),
          error: () => showError(this.i18n.translate('common.error'), isApproval ? 'Failed to submit approval' : 'Failed to complete task'),
        });
      } else {
        this.operationsSvc.updateProcessTaskStatus(task.task_id, newStatus).subscribe({
          next: () => showSuccess('Updated', `Status → ${newStatus.replace(/_/g, ' ')}`),
          error: () => showError(this.i18n.translate('common.error'), 'Failed to update status'),
        });
      }
    } else {
      const label = newStatus === 'assigned' ? 'Assigned' : newStatus.replace(/_/g, ' ');
      this.operationsSvc.updateProcessTaskStatus(task.task_id, newStatus).subscribe({
        next: () => showSuccess('Updated', `Task ${label}`),
        error: () => showError(this.i18n.translate('common.error'), 'Failed to update task'),
      });
    }
  }

  getPrioritySeverity(p: string): 'danger' | 'warning' | 'info' | 'success' | undefined {
    switch (p) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  }

  getStatusSeverity(s: string): 'danger' | 'warning' | 'info' | 'success' | undefined {
    switch (s) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'escalated': return 'danger';
      case 'assigned': return 'info';
      default: return undefined;
    }
  }

  formatStatus(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatTaskType(t: string): string {
    if (!t) return '—';
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

}
