import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { ApiClientService } from "@app/core/services/api-client.service";

function asRecord(value: any): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function asRecordArray(value: any): Record<string, any>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, any> => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-remediation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
    TableModule, TagModule, ButtonModule, DialogModule,
    InputTextModule, DropdownModule, ToolbarModule, AiPanelComponent, AppDatePipe,],
  template: `
    <app-page-shell icon="wrench" [title]="'Remediation Tracker'"
      [subtitle]="'Track and manage remediation tasks across findings and risks'"
      [breadcrumbs]="['Dashboard', 'Remediation']" [loading]="loading">

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button label="New Task" icon="pi pi-plus" (onClick)="openDialog()" class="me-2" />
          <p-button label="Check Overdue" icon="pi pi-clock" severity="warning" [outlined]="true" (onClick)="checkOverdue()" />
        </ng-template>
        <ng-template pTemplate="end">
          <span *ngIf="overdueCount > 0" class="overdue-badge">{{ overdueCount }} overdue</span>
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Tasks table" [value]="tasks" [paginator]="true" [rows]="15" styleClass="p-datatable-sm"
               [globalFilterFields]="['title','status','priority','assigned_to']">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">Title <p-sortIcon field="title" /></th>
            <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
            <th pSortableColumn="priority">Priority <p-sortIcon field="priority" /></th>
            <th>Assigned To</th>
            <th pSortableColumn="due_date">Due Date <p-sortIcon field="due_date" /></th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-t>
          <tr [class.overdue-row]="isOverdue(t)">
            <td>{{ t.title }}</td>
            <td><app-status-badge [status]="t.status" /></td>
            <td><p-tag [value]="t.priority || 'medium'" [severity]="prioritySeverity(t.priority)" /></td>
            <td>{{ t.assigned_to || '—' }}</td>
            <td>
              <span [class.text-red-500]="isOverdue(t)">{{ t.due_date | appDate:'medium' }}</span>
              <i *ngIf="isOverdue(t)" class="pi pi-exclamation-triangle text-red-500 ms-1"></i>
            </td>
            <td>
              <p-button icon="pi pi-pencil" [text]="true" (onClick)="openDialog(t)" class="me-1" />
              <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="deleteTask(t.task_id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty-msg">No remediation tasks</td></tr>
        </ng-template>
      </p-table>

      <p-dialog [header]="editing ? 'Edit Task' : 'New Remediation Task'" [(visible)]="showDialog" [modal]="true" [style]="{width:'520px'}">
        <div class="form-field"><label>Title *</label><input pInputText [(ngModel)]="form.title" class="w-full" /></div>
        <div class="form-field"><label>Description</label><textarea pInputText [(ngModel)]="form.description" rows="3" class="w-full"></textarea></div>
        <div class="form-row">
          <div class="form-field flex-1"><label>Priority</label>
            <p-dropdown [options]="priorities" [(ngModel)]="form.priority" styleClass="w-full" />
          </div>
          <div class="form-field flex-1"><label>Status</label>
            <p-dropdown [options]="statuses" [(ngModel)]="form.status" styleClass="w-full" />
          </div>
        </div>
        <div class="form-field"><label>Assigned To</label><input pInputText [(ngModel)]="form.assigned_to" class="w-full" /></div>
        <div class="form-field"><label>Due Date</label><input pInputText type="date" [(ngModel)]="form.due_date" class="w-full" /></div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="editing ? 'Update' : 'Create'" icon="pi pi-check" (onClick)="save()" [disabled]="!form.title" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
    <app-ai-panel module="remediation" />
  `,
  styles: [`
    .mb-3 { margin-bottom: 16px; }
    .me-1 { margin-inline-end: 4px; }
    .me-2 { margin-inline-end: 8px; }
    .ms-1 { margin-inline-start: 4px; }
    .w-full { width: 100%; }
    .form-field { margin-bottom: 14px; }
    .form-field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px; color: var(--text-muted); }
    .form-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: 32px; }
    .overdue-badge { background: #fee2e2; color: var(--error); padding: 6px 14px; border-radius: var(--radius-pill); font-size: var(--font-size-sm); font-weight: 600; }
    .overdue-row { background: var(--status-danger-bg, #fff1f1); }
  `]
})
export class RemediationComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  tasks: Record<string, any>[] = [];
  overdueCount = 0;
  showDialog = false;
  editing = false;
  form: Record<string, any> = { title: '', description: '', priority: 'medium', status: 'open', assigned_to: '', due_date: '' };
  editingId: string | null = null;

  priorities = [
    { label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' },
  ];
  statuses = [
    { label: 'Open', value: 'open' }, { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' }, { label: 'Overdue', value: 'overdue' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/remediation').subscribe({
      next: (response: any) => {
        const payload = asRecord(response);
        this.tasks = Array.isArray(response) ? asRecordArray(response) : asRecordArray(payload['tasks']);
        this.overdueCount = this.tasks.filter(t => this.isOverdue(t)).length;
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  isOverdue(t: Record<string, any>): boolean {
    const dueDate = asString(t['due_date']);
    if (!dueDate) return false;
    return asString(t['status']) !== 'completed' && new Date(dueDate) < new Date();
  }

  prioritySeverity(p: string): 'danger' | 'warning' | 'info' | 'success' {
    if (p === 'critical') return 'danger';
    if (p === 'high') return 'warning';
    if (p === 'low') return 'success';
    return 'info';
  }

  openDialog(task?: Record<string, any>) {
    if (task) {
      this.editing = true;
      this.editingId = asString(task['task_id']) || null;
      const dueDate = asString(task['due_date']);
      this.form = { ...task, due_date: dueDate ? dueDate.substring(0, 10) : '' };
    } else {
      this.editing = false;
      this.editingId = null;
      this.form = { title: '', description: '', priority: 'medium', status: 'open', assigned_to: '', due_date: '' };
    }
    this.showDialog = true;
  }

  save() {
    const obs = this.editing && this.editingId
      ? this.apiclientSvc.put(`/remediation/${this.editingId}`, this.form)
      : this.apiclientSvc.post('/remediation', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.ngOnInit(); } });
  }

  deleteTask(id: string) {
    this.apiclientSvc.del(`/remediation/${id}`).subscribe({ next: () => this.ngOnInit() });
  }

  checkOverdue() {
    this.apiclientSvc.post('/remediation/check-overdue', {}).subscribe({
      next: (response: any) => {
        const payload = asRecord(response);
        this.overdueCount = asNumber(payload['overdueCount']);
        this.ngOnInit();
      }
    });
  }
}
