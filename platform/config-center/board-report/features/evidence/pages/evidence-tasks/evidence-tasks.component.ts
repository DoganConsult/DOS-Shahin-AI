import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, inject, computed, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { EVIDENCE_TABS } from '@app/features/evidence/evidence.constants';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/textarea';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-tasks',
    imports: [
        CommonModule, FormsModule, PageHeaderComponent, ModuleTabsBarComponent,
        CardModule, TableModule, TagModule, ButtonModule,
        DropdownModule, DialogModule, InputTextarea, AppDatePipe,
        RaciPanelComponent,
    ],
    template: `
    <div class="ev-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Evidence Tasks" titleAr="مهام الأدلة"
        subtitleEn="Track evidence collection tasks, submissions and approvals by control and framework"
        subtitleAr="تتبع مهام جمع الأدلة وتقديمها والموافقة عليها حسب الضابط والإطار"
        icon="clipboard"
        [breadcrumbs]="[i18n.translate('evidenceTasks.dashboard'), i18n.translate('evidenceTasks.evidence'), i18n.translate('evidenceTasks.tasks')]"
        [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()"
        (actionClick)="onHdrAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <app-raci-panel entityType="evidence" [entityId]="''" [canEdit]="true" />
      <div class="ev-body" [class.loading-body]="loading">

      <!-- Summary stats -->
      <div class="grid mb-3">
        <div class="col-12 md:col-3"><div class="stat-box"><div class="stat-value">{{ tasks.length }}</div><div class="stat-label">{{ i18n.translate('evidenceTasks.totalTasks') }}</div></div></div>
        <div class="col-12 md:col-3"><div class="stat-box"><div class="stat-value">{{ openCount }}</div><div class="stat-label">{{ i18n.translate('evidenceTasks.open') }}</div></div></div>
        <div class="col-12 md:col-3"><div class="stat-box"><div class="stat-value">{{ approvedCount }}</div><div class="stat-label">{{ i18n.translate('evidenceTasks.approved') }}</div></div></div>
        <div class="col-12 md:col-3"><div class="stat-box warn"><div class="stat-value">{{ overdueCount }}</div><div class="stat-label">{{ i18n.translate('evidenceTasks.overdue') }}</div></div></div>
      </div>

      <!-- Filter -->
      <div class="mb-3 flex align-items-center gap-2">
        <label class="font-semibold">{{ i18n.translate('evidenceTasks.filterByStatus') }}</label>
        <p-dropdown [options]="statusFilters" [(ngModel)]="selectedStatus" optionLabel="label" optionValue="value"
          [placeholder]="i18n.translate('evidenceTasks.all')" [showClear]="true" (onChange)="applyFilter()" />
      </div>

      <!-- Tasks table -->
      <p-card>
        <p-table [attr.aria-label]="i18n.translate('evidenceTasks.ariaFilteredTasksTable')" [value]="filteredTasks" [paginator]="true" [rows]="15" styleClass="p-datatable-sm"
          [globalFilterFields]="['requirement', 'assigned_to', 'status']">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="requirement">{{ i18n.translate('evidenceTasks.requirement') }} <p-sortIcon field="requirement" /></th>
              <th pSortableColumn="due_date">{{ i18n.translate('evidenceTasks.dueDate') }} <p-sortIcon field="due_date" /></th>
              <th>{{ i18n.translate('common.status') }}</th>
              <th>{{ i18n.translate('evidenceTasks.assignedTo') }}</th>
              <th>{{ i18n.translate('common.actions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-task>
            <tr>
              <td>{{ task.requirement || task.control_name || task.title }}</td>
              <td>
                <span [ngClass]="getDueDateClass(task.due_date)">
                  {{ task.due_date | appDate:'medium' }}
                </span>
              </td>
              <td>
                <p-tag [value]="task.status" [severity]="getStatusSeverity(task.status)" />
              </td>
              <td>{{ task.assigned_to || task.assignee_name || '-' }}</td>
              <td class="flex gap-1">
                @if (task.status === 'Open' || task.status === 'Rejected' || task.status === 'Overdue') {
                  <p-button [label]="i18n.translate('evidenceTasks.submit')" icon="pi pi-upload" size="small" (onClick)="openSubmitDialog(task)" />
                }
                @if (task.status === 'Submitted') {
                  <p-button [label]="i18n.translate('evidenceTasks.approve')" icon="pi pi-check" size="small" severity="success" (onClick)="approveTask(task)" />
                  <p-button [label]="i18n.translate('evidenceTasks.reject')" icon="pi pi-times" size="small" severity="danger" (onClick)="rejectTask(task)" />
                }
                <p-button icon="pi pi-eye" [text]="true" severity="info" (onClick)="viewTask(task)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center p-4">
              <i class="pi pi-inbox" style="font-size:1.5rem; display:block; margin-bottom:8px"></i>
              {{ i18n.translate('evidenceTasks.noTasks') }}
            </td></tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Submit Dialog -->
      <p-dialog [header]="i18n.translate('evidenceTasks.submitEvidence')" [(visible)]="submitDialogVisible" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3 pt-3">
          <div class="flex flex-column gap-1">
            <label class="font-semibold">{{ i18n.translate('evidenceTasks.requirement') }}</label>
            <span>{{ submitTask?.requirement || submitTask?.title }}</span>
          </div>
          <div class="flex flex-column gap-1">
            <label class="font-semibold">{{ i18n.translate('evidenceTasks.submissionNotes') }}</label>
            <textarea pInputTextarea [(ngModel)]="submitNotes" rows="4" [placeholder]="i18n.translate('evidenceTasks.enterSubmissionNotes')" [attr.aria-label]="i18n.translate('evidenceTasks.enterSubmissionNotes')"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" [text]="true" (onClick)="submitDialogVisible = false" />
          <p-button [label]="i18n.translate('evidenceTasks.submit')" icon="pi pi-check" (onClick)="confirmSubmit()" />
        </ng-template>
      </p-dialog>
      </div>
    </div>
  `,
    styles: [`
    .ev-page { display:flex; flex-direction:column; min-height:100%; }
    .ev-body  { flex:1; padding:20px 28px 40px; display:flex; flex-direction:column; gap:16px; }
    .loading-body { opacity:.6; pointer-events:none; }
    .stat-box { text-align: center; padding: 1rem; background: var(--surface-card); border-radius: var(--radius-sm); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: var(--font-bold); color: var(--primary-color); }
    .stat-box.warn .stat-value { color: var(--orange-500); }
    .stat-label { font-size: var(--font-size-tag); color: var(--text-color-secondary); }
    .due-overdue { color: var(--red-500); font-weight: 600; }
    .due-upcoming { color: var(--orange-500); font-weight: 600; }
    .due-ok { color: var(--text-color); }
  `]
})
export class EvidenceTasksComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private live = inject(GrcLiveService);
  private cdr = inject(ChangeDetectorRef);
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  readonly tabs = EVIDENCE_TABS;
  readonly headerActions: PageHeaderAction[] = [
    { id: 'generate', labelEn: 'Generate Tasks', labelAr: 'توليد المهام', icon: 'bolt', primary: true },
    { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
  ];
  generating = false;
  onHdrAction(id: string): void {
    if (id === 'generate') this.generateTasks();
  }
  loading = false;

  tasks: Record<string, any>[] = [];
  filteredTasks: Record<string, any>[] = [];
  selectedStatus: string | null = null;

  openCount = 0;
  approvedCount = 0;
  overdueCount = 0;

  submitDialogVisible = false;
  submitTask: Record<string, any> | null = null;
  submitNotes = '';

  /** Computed dropdown options that react to language changes */
  get statusFilters() {
    return [
      { label: this.i18n.translate('common.open'), value: 'Open' },
      { label: this.i18n.translate('common.submitted'), value: 'Submitted' },
      { label: this.i18n.translate('common.approved'), value: 'Approved' },
      { label: this.i18n.translate('common.rejected'), value: 'Rejected' },
      { label: this.i18n.translate('common.overdue'), value: 'Overdue' }
    ];
  }

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadTasks());
    this.loadTasks();
  }

  private loadTasks(): void {
    this.loading = true;
    this.apiclientSvc.get('/evidence-tasks').subscribe({
      next: (d: Record<string, any>) => {
        this.tasks = asArray(d, 'tasks');
        this.markOverdue();
        this.updateStats();
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private markOverdue(): void {
    const now = new Date();
    this.tasks.forEach((t: Record<string, any>) => {
      if (t.due_date && t.status === 'Open') {
        const due = new Date(t.due_date);
        if (due < now) {
          t.status = 'Overdue';
        }
      }
    });
  }

  private updateStats(): void {
    this.openCount = this.tasks.filter((t: Record<string, any>) => t.status === 'Open').length;
    this.approvedCount = this.tasks.filter((t: Record<string, any>) => t.status === 'Approved').length;
    this.overdueCount = this.tasks.filter((t: Record<string, any>) => t.status === 'Overdue').length;
  }

  applyFilter(): void {
    if (this.selectedStatus) {
      this.filteredTasks = this.tasks.filter((t: Record<string, any>) => t.status === this.selectedStatus);
    } else {
      this.filteredTasks = [...this.tasks];
    }
  }

  getDueDateClass(dueDate: string): string {
    if (!dueDate) return 'due-ok';
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return 'due-overdue';
    if (diffDays <= 7) return 'due-upcoming';
    return 'due-ok';
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'Approved': return 'success';
      case 'Submitted': return 'info';
      case 'Open': return 'warning';
      case 'Rejected': return 'danger';
      case 'Overdue': return 'danger';
      default: return undefined;
    }
  }

  openSubmitDialog(task: Record<string, any>): void {
    this.submitTask = task;
    this.submitNotes = '';
    this.submitDialogVisible = true;
  }

  confirmSubmit(): void {
    if (!this.submitTask) return;
    this.apiclientSvc.post(`/evidence-tasks/${this.submitTask.task_id || this.submitTask.id}/submit`, { notes: this.submitNotes }).subscribe({
      next: () => { this.submitDialogVisible = false; this.loadTasks(); }
    });
  }

  approveTask(task: Record<string, any>): void {
    this.apiclientSvc.post(`/evidence-tasks/${task.task_id || task.id}/approve`, {}).subscribe({ next: () => this.loadTasks() });
  }

  rejectTask(task: Record<string, any>): void {
    this.apiclientSvc.post(`/evidence-tasks/${task.task_id || task.id}/reject`, {}).subscribe({ next: () => this.loadTasks() });
  }

  viewTask(task: Record<string, any>): void {
    this.apiclientSvc.get(`/evidence-tasks/${task.task_id || task.id}`).subscribe({
      next: (d: Record<string, any>) => {
        const detail = d.task || d;
        const idx = this.tasks.findIndex((t: Record<string, any>) => (t.task_id || t.id) === (task.task_id || task.id));
        if (idx >= 0) this.tasks[idx] = { ...this.tasks[idx], ...detail };
      }
    });
  }

  generateTasks(): void {
    this.generating = true;
    this.apiclientSvc.post('/evidence-tasks/generate', {}).subscribe({
      next: () => { this.generating = false; this.cdr.markForCheck(); this.loadTasks(); },
      error: () => { this.generating = false; this.cdr.markForCheck(); }
    });
  }
}
