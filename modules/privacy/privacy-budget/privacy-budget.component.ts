import { inject, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ApiClientService } from "@app/core/services/api-client.service";

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function asRecordArray(value: unknown): Record<string, any>[] {
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
  selector: 'app-privacy-budget',
  standalone: true,
  imports: [CommonModule, AppDatePipe, AppNumberPipe, FormsModule, PageShellComponent, CardModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, TableModule, ToolbarModule, ProgressBarModule, ConfirmDialogModule, TooltipModule],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />
    <app-page-shell icon="shield" [title]="'Privacy Budget'"
      [subtitle]="'Differential privacy budget tracking, allocation, and threshold management'"
      [breadcrumbs]="['Dashboard', 'Privacy Budget']" [loading]="loading">

      <!-- Summary Cards -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">{{ budgets.length }}</div>
          <div class="kpi-label">Total Budgets</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-green">{{ activeCount }}</div>
          <div class="kpi-label">Active</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-red">{{ exhaustedCount }}</div>
          <div class="kpi-label">Exhausted</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-orange">{{ nearThresholdCount }}</div>
          <div class="kpi-label">Near Threshold</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value text-blue">{{ avgUsage() | appNumber:'decimal':'1.0-0' }}%</div>
          <div class="kpi-label">Avg Usage</div>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button label="New Budget" icon="pi pi-plus" (onClick)="openCreate()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-dropdown [options]="statusOptions" [(ngModel)]="filterStatus" placeholder="All Statuses" [showClear]="true" (onChange)="applyFilter()" />
        </ng-template>
      </p-toolbar>

      <!-- Budget Cards Grid -->
      <div class="budget-grid">
        @for (b of filteredBudgets(); track b.budget_id || b.name) {
          <div class="budget-card" [class.exhausted]="b.status === 'exhausted'" [class.warning]="usagePercent(b) >= 80 && b.status !== 'exhausted'">
            <div class="budget-header">
              <h3>{{ b.name || b.budget_id }}</h3>
              <p-tag [value]="b.status || 'active'" [severity]="statusSeverity(b.status)" />
            </div>
            <p class="budget-desc" *ngIf="b.description">{{ b.description }}</p>
            <div class="budget-bar-bg">
              <div class="budget-bar" [style.width.%]="usagePercent(b)"
                [class.bar-green]="usagePercent(b) < 60"
                [class.bar-orange]="usagePercent(b) >= 60 && usagePercent(b) < 80"
                [class.bar-red]="usagePercent(b) >= 80"></div>
            </div>
            <div class="budget-meta">
              <span>Used: {{ b.used || 0 }} / {{ b.total || 100 }} ε</span>
              <span class="usage-pct" [class.text-red]="usagePercent(b) >= 80">{{ usagePercent(b) | appNumber:'decimal':'1.0-0' }}%</span>
            </div>
            <div class="budget-details">
              <span *ngIf="b.category"><i class="pi pi-tag"></i> {{ b.category }}</span>
              <span *ngIf="b.owner"><i class="pi pi-user"></i> {{ b.owner }}</span>
              <span *ngIf="b.expires_at"><i class="pi pi-calendar"></i> {{ b.expires_at | appDate:'medium' }}</span>
            </div>
            <div class="budget-actions">
              <p-button icon="pi pi-pencil" [text]="true" size="small" (onClick)="editBudget(b)" pTooltip="Edit" />
              <p-button icon="pi pi-refresh" [text]="true" size="small" severity="success" (onClick)="resetBudget(b)" pTooltip="Reset" />
              <p-button icon="pi pi-trash" [text]="true" size="small" severity="danger" (onClick)="deleteBudget(b)" pTooltip="Delete" />
            </div>
          </div>
        }
      </div>

      <!-- Allocation Table -->
      @if (allocations.length > 0) {
        <h3 class="section-title">Recent Allocations</h3>
        <p-table aria-label="Allocations table" [value]="allocations" [rows]="10" [paginator]="true" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Time</th><th>Budget</th><th>Query</th><th>ε Spent</th><th>Remaining</th><th>Status</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-a>
            <tr>
              <td>{{ a.allocated_at | appDate:'short' }}</td>
              <td>{{ a.budget_name }}</td>
              <td class="truncate">{{ a.query_description }}</td>
              <td class="font-mono">{{ a.epsilon_spent | appNumber:'decimal':'1.2-4' }}</td>
              <td class="font-mono">{{ a.remaining | appNumber:'decimal':'1.2-4' }}</td>
              <td><p-tag [value]="a.status || 'allocated'" severity="info" /></td>
            </tr>
          </ng-template>
        </p-table>
      }

      <div *ngIf="budgets.length === 0 && !loading" class="empty-state">
        <i class="pi pi-shield empty-icon"></i>
        <p>No privacy budgets configured</p>
        <p-button label="Create First Budget" icon="pi pi-plus" (onClick)="openCreate()" class="mt-2" />
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <p-button label="Retry" icon="pi pi-refresh" severity="danger" [outlined]="true" (onClick)="error=''; ngOnInit()" />
      </div>

      <!-- Create/Edit Dialog -->
      <p-dialog [header]="editingBudget ? 'Edit Budget' : 'New Privacy Budget'" [(visible)]="showDialog" [modal]="true" [style]="{ width: '480px' }">
        <div class="form-grid">
          <div class="form-field">
            <label>Budget Name</label>
            <input pInputText [(ngModel)]="form.name" placeholder="e.g. Analytics ε-budget Q1" aria-label="e.g. Analytics ε-budget Q1" class="w-full" />
          </div>
          <div class="form-row">
            <div class="form-field flex-1">
              <label>Total Epsilon (ε)</label>
              <input pInputText type="number" [(ngModel)]="form.total" placeholder="100" aria-label="100" class="w-full" />
            </div>
            <div class="form-field flex-1">
              <label>Category</label>
              <p-dropdown [options]="categoryOptions" [(ngModel)]="form.category" placeholder="Select" appendTo="body" class="w-full" />
            </div>
          </div>
          <div class="form-field">
            <label>Description</label>
            <input pInputText [(ngModel)]="form.description" placeholder="Purpose of this budget" aria-label="Purpose of this budget" class="w-full" />
          </div>
          <div class="form-field">
            <label>Owner</label>
            <input pInputText [(ngModel)]="form.owner" placeholder="Data team / individual" aria-label="Data team / individual" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="editingBudget ? 'Update' : 'Create'" icon="pi pi-check" (onClick)="saveBudget()" [disabled]="!form.name || !form.total" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
    <p-confirmDialog />
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { padding: 18px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); text-align: center; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .text-green { color: var(--success); } .text-red { color: var(--error); } .text-orange { color: var(--warning); } .text-blue { color: var(--primary); }
    .mb-3 { margin-bottom: 16px; } .mt-2 { margin-top: 8px; }
    .budget-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .budget-card { padding: 20px; border-radius: var(--radius-lg); background: var(--bg-0, #fff); border: 1px solid var(--border, var(--border-subtle)); transition: all 200ms; }
    .budget-card:hover { border-color: var(--primary, #2563eb); box-shadow: var(--shadow-card); }
    .budget-card.exhausted { border-color: var(--status-danger-bg, #fff1f1); background: var(--status-danger-bg, #fff1f1); }
    .budget-card.warning { border-color: #fed7aa; }
    .budget-header { display: flex; justify-content: space-between; align-items: center; }
    .budget-header h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .budget-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin: 6px 0; }
    .budget-bar-bg { height: 10px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-sm); margin: 12px 0; overflow: hidden; }
    .budget-bar { height: 100%; border-radius: var(--radius-sm); transition: width 300ms; }
    .bar-green { background: var(--success); } .bar-orange { background: #ea580c; } .bar-red { background: var(--error); }
    .budget-meta { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .usage-pct { font-weight: 700; }
    .budget-details { display: flex; gap: 12px; margin-top: 10px; font-size: var(--font-size-sm); color: var(--text-muted); flex-wrap: wrap; }
    .budget-details i { margin-inline-end: 4px; font-size: var(--font-size-xs); }
    .budget-actions { display: flex; gap: 4px; margin-top: 10px; justify-content: flex-end; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 24px 0 12px; color: var(--text-0); }
    .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .font-mono { font-family: monospace; font-size: var(--font-size-sm); }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); display: block; margin-bottom: 12px; }
    .error-state { text-align: center; padding: 32px; color: var(--error); }
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-1); }
    .form-row { display: flex; gap: 12px; } .flex-1 { flex: 1; } .w-full { width: 100%; }
  `]
})
export class PrivacyBudgetComponent implements OnInit {
  private confirmSvc = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; budgets: Record<string, any>[] = []; allocations: Record<string, any>[] = [];
  showDialog = false; editingBudget: Record<string, any> | null = null; filterStatus = '';
  form: Record<string, any> = { name: '', total: 100, category: '', description: '', owner: '' };
  statusOptions = [
    { label: 'Active', value: 'active' }, { label: 'Exhausted', value: 'exhausted' },
    { label: 'Paused', value: 'paused' },
  ];
  categoryOptions = [
    { label: 'Analytics', value: 'analytics' }, { label: 'ML Training', value: 'ml_training' },
    { label: 'Reporting', value: 'reporting' }, { label: 'Research', value: 'research' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/privacy-budget').subscribe({
      next: (response: unknown) => {
        const payload = asRecord(response);
        this.budgets = Array.isArray(response) ? asRecordArray(response) : asRecordArray(payload['budgets']);
        this.allocations = asRecordArray(payload['allocations']);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get activeCount(): number { return this.budgets.filter(b => asString(b['status']) !== 'exhausted').length; }
  get exhaustedCount(): number { return this.budgets.filter(b => asString(b['status']) === 'exhausted').length; }
  get nearThresholdCount(): number { return this.budgets.filter(b => this.usagePercent(b) >= 80 && asString(b['status']) !== 'exhausted').length; }

  filteredBudgets(): Record<string, any>[] {
    if (!this.filterStatus) return this.budgets;
    return this.budgets.filter(b => (asString(b['status']) || 'active') === this.filterStatus);
  }

  applyFilter() {}

  usagePercent(b: Record<string, any>): number {
    const total = asNumber(b['total']);
    const used = asNumber(b['used']);
    return total ? Math.min((used / total) * 100, 100) : 0;
  }

  avgUsage(): number {
    if (!this.budgets.length) return 0;
    return this.budgets.reduce((s, b) => s + this.usagePercent(b), 0) / this.budgets.length;
  }

  statusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    const m: Record<string, 'success' | 'warning' | 'danger'> = { active: 'success', exhausted: 'danger', paused: 'warning' };
    return m[status] || 'info';
  }

  openCreate() {
    this.editingBudget = null;
    this.form = { name: '', total: 100, category: '', description: '', owner: '' };
    this.showDialog = true;
  }

  editBudget(b: Record<string, any>) {
    this.editingBudget = b;
    this.form = { ...b };
    this.showDialog = true;
  }

  saveBudget() {
    const obs = this.editingBudget
      ? this.apiclientSvc.put(`/privacy-budget/${this.editingBudget.budget_id || this.editingBudget.id}`, this.form)
      : this.apiclientSvc.post('/privacy-budget', this.form);
    obs.subscribe({ next: () => { this.showDialog = false; this.ngOnInit(); } });
  }

  resetBudget(b: Record<string, any>) {
    this.confirmSvc.confirm({
      message: 'Reset this budget usage to zero?',
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.apiclientSvc.post(`/privacy-budget/${b.budget_id || b.id}/reset`, {}).subscribe({ next: () => this.ngOnInit() });
      },
    });
  }

  deleteBudget(b: Record<string, any>) {
    this.confirmSvc.confirm({
      message: 'Delete this privacy budget?',
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.apiclientSvc.del(`/privacy-budget/${b.budget_id || b.id}`).subscribe({ next: () => this.ngOnInit() });
      },
    });
  }
}
