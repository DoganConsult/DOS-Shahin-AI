/**
 * Bulk Task Management Component
 *
 * Allows users to select multiple process tasks and perform bulk operations:
 * status updates, reassignment, and cancellation. Uses PrimeNG Table with
 * checkbox selection and a toolbar for bulk actions.
 */
import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ProcessTask {
  task_id: string;
  title: string;
  status: string;
  priority: string;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  entity_type: string | null;
  due_date: string | null;
  breached_at: string | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bulk-tasks',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule,
        DialogModule, DropdownModule, ToastModule, InputTextModule,
        CheckboxModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="list-check"
      [title]="i18n.translate('bulkTasks.title') || 'Bulk Task Management'"
      [subtitle]="i18n.translate('bulkTasks.subtitle') || 'Select tasks and perform bulk operations'"
      [breadcrumbs]="['Dashboard', 'Bulk Tasks']"
      [loading]="!loaded">

      <p-toast />

      <!-- Action Bar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="selected-count" *ngIf="selectedTasks.length > 0">
            {{ selectedTasks.length }} task(s) selected
          </span>
          <p-button
            label="Update Status"
            icon="pi pi-sync"
            [disabled]="selectedTasks.length === 0"
            (onClick)="openStatusDialog()"
            class="ms-2" />
          <p-button
            label="Reassign"
            icon="pi pi-user-edit"
            severity="secondary"
            [disabled]="selectedTasks.length === 0"
            (onClick)="openReassignDialog()"
            class="ms-2" />
          <p-button
            label="Cancel Selected"
            icon="pi pi-times-circle"
            severity="danger"
            [outlined]="true"
            [disabled]="selectedTasks.length === 0"
            (onClick)="openCancelDialog()"
            class="ms-2" />
        </ng-template>
        <ng-template pTemplate="end">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('common.search') || 'Search'"
                   [attr.aria-label]="i18n.translate('common.search') || 'Search'"
                   (input)="filterTasks()" class="search-input" />
          </span>
        </ng-template>
      </p-toolbar>

      <!-- Task Table -->
      <p-table
        aria-label="Process Tasks table"
        [value]="filteredTasks"
        [(selection)]="selectedTasks"
        [paginator]="filteredTasks.length > 20"
        [rows]="20"
        styleClass="p-datatable-striped p-datatable-gridlines"
        dataKey="task_id"
        *ngIf="filteredTasks.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem">
              <p-tableHeaderCheckbox />
            </th>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Module</th>
            <th>Due Date</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-task>
          <tr>
            <td>
              <p-tableCheckbox [value]="task" />
            </td>
            <td><strong>{{ task.title || '-' }}</strong></td>
            <td><app-status-badge [status]="task.status" /></td>
            <td>
              <p-tag [value]="task.priority || 'medium'"
                     [severity]="prioritySeverity(task.priority)" />
            </td>
            <td>{{ task.assigned_user_name || 'Unassigned' }}</td>
            <td>{{ task.entity_type || '-' }}</td>
            <td [class.breached]="task.breached_at">
              {{ task.due_date ? (task.due_date | date:'mediumDate') : '-' }}
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="empty-msg">No tasks found</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredTasks.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>No process tasks available</p>
      </div>

      <!-- Bulk Status Update Dialog -->
      <p-dialog
        header="Bulk Status Update"
        [(visible)]="showStatusDialog"
        [modal]="true"
        [style]="{width:'420px'}">
        <div class="dialog-form">
          <p>Update status for {{ selectedTasks.length }} task(s):</p>
          <div class="field">
            <label>New Status</label>
            <p-dropdown [(ngModel)]="bulkStatus" [options]="statusOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [text]="true"
                    (onClick)="showStatusDialog = false" />
          <p-button label="Update" icon="pi pi-check"
                    (onClick)="executeBulkStatus()" [disabled]="!bulkStatus" />
        </ng-template>
      </p-dialog>

      <!-- Bulk Reassign Dialog -->
      <p-dialog
        header="Bulk Reassign"
        [(visible)]="showReassignDialog"
        [modal]="true"
        [style]="{width:'420px'}">
        <div class="dialog-form">
          <p>Reassign {{ selectedTasks.length }} task(s) to:</p>
          <div class="field">
            <label>Assignee</label>
            <p-dropdown [(ngModel)]="reassignUserId" [options]="userOptions"
                        optionLabel="label" optionValue="value"
                        [filter]="true" filterBy="label"
                        placeholder="Select user" styleClass="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [text]="true"
                    (onClick)="showReassignDialog = false" />
          <p-button label="Reassign" icon="pi pi-check"
                    (onClick)="executeBulkReassign()" [disabled]="!reassignUserId" />
        </ng-template>
      </p-dialog>

      <!-- Bulk Cancel Confirmation Dialog -->
      <p-dialog
        header="Confirm Cancellation"
        [(visible)]="showCancelDialog"
        [modal]="true"
        [style]="{width:'400px'}">
        <p>Are you sure you want to cancel {{ selectedTasks.length }} task(s)?
           This action cannot be undone.</p>
        <ng-template pTemplate="footer">
          <p-button label="No" severity="secondary" [text]="true"
                    (onClick)="showCancelDialog = false" />
          <p-button label="Yes, Cancel Tasks" icon="pi pi-times-circle"
                    severity="danger" (onClick)="executeBulkCancel()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-2 { margin-inline-start: 8px; }
    .selected-count { font-weight: 600; color: var(--primary); padding: 0 8px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .breached { color: var(--danger); font-weight: 600; }
  `]
})
export class BulkTasksComponent implements OnInit {
  tasks: ProcessTask[] = [];
  filteredTasks: ProcessTask[] = [];
  selectedTasks: ProcessTask[] = [];
  loaded = false;
  searchTerm = '';

  // Dialog state
  showStatusDialog = false;
  showReassignDialog = false;
  showCancelDialog = false;
  bulkStatus = '';
  reassignUserId = '';

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Escalated', value: 'escalated' },
    { label: 'Blocked', value: 'blocked' },
  ];

  userOptions: { label: string; value: string }[] = [];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
    this.loadUsers();
  }

  load(): void {
    this.apiclientSvc.get<any>('/process-tasks?pageSize=500').subscribe({
      next: (res: any) => {
        const items = res?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
        this.tasks = items;
        this.filterTasks();
        this.loaded = true;
      },
      error: () => { this.loaded = true; },
    });
  }

  loadUsers(): void {
    this.apiclientSvc.get<any>('/foundation/users?pageSize=200').subscribe({
      next: (res: any) => {
        const users: any[] = res?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
        this.userOptions = users.map((u: any) => ({
          label: u.full_name || u.email || u.user_id,
          value: u.user_id,
        }));
      },
      error: () => { /* Non-critical; reassign dropdown will be empty */ },
    });
  }

  filterTasks(): void {
    let r = this.tasks;
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(task =>
        (task.title || '').toLowerCase().includes(t) ||
        (task.status || '').toLowerCase().includes(t) ||
        (task.entity_type || '').toLowerCase().includes(t) ||
        (task.assigned_user_name || '').toLowerCase().includes(t)
      );
    }
    this.filteredTasks = r;
  }

  prioritySeverity(priority: string): string {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  }

  // ── Dialog openers ─────────────────────────────────────────────────────

  openStatusDialog(): void {
    this.bulkStatus = '';
    this.showStatusDialog = true;
  }

  openReassignDialog(): void {
    this.reassignUserId = '';
    this.showReassignDialog = true;
  }

  openCancelDialog(): void {
    this.showCancelDialog = true;
  }

  // ── Bulk operations ────────────────────────────────────────────────────

  executeBulkStatus(): void {
    const taskIds = this.selectedTasks.map(t => t.task_id);
    this.apiclientSvc.post('/bulk-tasks/status', { taskIds, status: this.bulkStatus }).subscribe({
      next: (res: Record<string, unknown>) => {
        this.showStatusDialog = false;
        this.selectedTasks = [];
        this.load();
        this.msg.add({
          severity: 'success',
          summary: 'Status Updated',
          detail: `${res?.updated ?? taskIds.length} task(s) updated`,
          life: 3000,
        });
      },
      error: () => {
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update task status',
          life: 4000,
        });
      },
    });
  }

  executeBulkReassign(): void {
    const taskIds = this.selectedTasks.map(t => t.task_id);
    this.apiclientSvc.post('/bulk-tasks/reassign', { taskIds, assigneeUserId: this.reassignUserId }).subscribe({
      next: (res: Record<string, unknown>) => {
        this.showReassignDialog = false;
        this.selectedTasks = [];
        this.load();
        this.msg.add({
          severity: 'success',
          summary: 'Reassigned',
          detail: `${res?.updated ?? taskIds.length} task(s) reassigned`,
          life: 3000,
        });
      },
      error: () => {
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to reassign tasks',
          life: 4000,
        });
      },
    });
  }

  executeBulkCancel(): void {
    const taskIds = this.selectedTasks.map(t => t.task_id);
    this.apiclientSvc.post('/bulk-tasks/cancel', { taskIds }).subscribe({
      next: (res: Record<string, unknown>) => {
        this.showCancelDialog = false;
        this.selectedTasks = [];
        this.load();
        this.msg.add({
          severity: 'success',
          summary: 'Cancelled',
          detail: `${res?.updated ?? taskIds.length} task(s) cancelled`,
          life: 3000,
        });
      },
      error: () => {
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel tasks',
          life: 4000,
        });
      },
    });
  }
}
