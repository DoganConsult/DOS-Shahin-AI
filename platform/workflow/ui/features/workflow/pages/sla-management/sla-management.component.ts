/**
 * SLA Management Page — Dashboard for managing Service Level Agreements.
 *
 * Fetches SLA definitions from tenant-config API, displays them in a PrimeNG Table
 * with status indicators, and provides create/edit/delete SLA functionality.
 * Reuses the approval-routing dashboard layout pattern (KPI cards + table).
 * Integrates ScopeFilterBarComponent for entity/framework/period filtering.
 * GrcLiveService integration for real-time reload on mutations.
 *
 * Requirements: 7.1, 7.2, 7.4, 15.4
 */

import { Component, DestroyRef, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ScopeFilterBarComponent, ScopeFilter, OrgEntity } from '@app/shared/scope-filter-bar/scope-filter-bar.component';
import { GrcOperationsService } from '@app/api';

interface SLADefinition {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  currentValue?: number;
  status: 'normal' | 'at_risk' | 'breached';
  entityId?: string;
  framework?: string;
  createdAt?: string;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sla-management',
    imports: [
        CommonModule, FormsModule, TableModule, TagModule, SkeletonModule,
        CardModule, ProgressBarModule, ButtonModule, DialogModule,
        InputTextModule, DropdownModule, InputNumberModule,
        ScopeFilterBarComponent, PageShellComponent, AiPanelComponent,
        TooltipModule, ToastModule, AppDatePipe,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="clock"
      [title]="i18n.translate('slaManagement.title')"
      [subtitle]="i18n.translate('slaManagement.subtitle')"
      [breadcrumbs]="['Admin', 'SLA Management']"
      [loading]="loading">

      <p-toast />

      <!-- Header Actions (projected into page-shell top chrome) -->
      <div headerActions>
        <p-button
          icon="pi pi-plus"
          [label]="i18n.translate('Create SLA')"
          (onClick)="openCreateDialog()"
          [disabled]="loading"
        />
      </div>

      <!-- Scope Filter Bar -->
      <app-scope-filter-bar
        [entities]="entities"
        [frameworks]="frameworks"
        (filterChange)="onFilterChange($event)"
      />

      <!-- Skeleton Loading -->
      <ng-container *ngIf="loading">
        <div class="kpi-row">
          <p-skeleton *ngFor="let _ of [1,2,3,4]" width="100%" height="100px" styleClass="kpi-skeleton" />
        </div>
        <p-skeleton width="100%" height="300px" />
      </ng-container>

      <!-- Error State -->
      <div *ngIf="!loading && error" class="error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <p>{{ i18n.translate('common.failedToLoad') }}</p>
        <p-button [label]="i18n.translate('common.retry')" icon="pi pi-refresh" (onClick)="loadData()" [text]="true" />
      </div>

      <!-- Main Content -->
      <ng-container *ngIf="!loading && !error">
        <!-- KPI Cards (approval-routing dashboard pattern) -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-value">{{ slaDefinitions.length }}</div>
            <div class="kpi-label">{{ i18n.translate('Total SLAs') }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value good">{{ normalCount }}</div>
            <div class="kpi-label">{{ i18n.translate('On Track') }}</div>
            <p-progressBar [value]="complianceRate" [showValue]="false" [style]="{'height':'6px','margin-top':'8px'}" />
          </div>
          <div class="kpi-card">
            <div class="kpi-value warn">{{ atRiskCount }}</div>
            <div class="kpi-label">{{ i18n.translate('At Risk') }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value bad">{{ breachedCount }}</div>
            <div class="kpi-label">{{ i18n.translate('Breached') }}</div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredSLAs.length === 0" class="empty-state">
          <i class="pi pi-inbox"></i>
          <p>{{ i18n.translate('No SLA definitions found') }}</p>
          <p-button [label]="i18n.translate('Create your first SLA')" icon="pi pi-plus" (onClick)="openCreateDialog()" [text]="true" />
        </div>

        <!-- SLA Table -->
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table"
          *ngIf="filteredSLAs.length > 0"
          [value]="filteredSLAs"
          [paginator]="filteredSLAs.length > 10"
          [rows]="10"
          styleClass="p-datatable-sm p-datatable-striped"
          [scrollable]="true"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('SLA Name') }}</th>
              <th>{{ i18n.translate('Metric') }}</th>
              <th>{{ i18n.translate('Threshold') }}</th>
              <th>{{ i18n.translate('Current Value') }}</th>
              <th>{{ i18n.translate('Status') }}</th>
              <th>{{ i18n.translate('Created') }}</th>
              <th style="width:120px">{{ i18n.translate('common.actions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-sla>
            <tr>
              <td>{{ sla.name }}</td>
              <td>{{ sla.metric }}</td>
              <td class="mono">{{ sla.threshold }}</td>
              <td class="mono">{{ sla.currentValue ?? '-' }}</td>
              <td>
                <p-tag
                  [value]="sla.status"
                  [severity]="getStatusSeverity(sla.status)"
                />
              </td>
              <td>{{ sla.createdAt ? (sla.createdAt | appDate:'medium') : '-' }}</td>
              <td>
                <div class="action-btns">
                  <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(sla)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                  <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(sla)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="empty-msg">{{ i18n.translate('No SLAs match the current filter') }}</td></tr>
          </ng-template>
        </p-table>
      </ng-container>

      <!-- Create / Edit SLA Dialog -->
      <p-dialog
        [header]="editMode ? i18n.translate('slaManagement.editSla') : i18n.translate('slaManagement.createSla')"
        [(visible)]="showDialog"
        [modal]="true"
        [style]="{width:'480px'}"
      >
        <div class="form-field">
          <label>{{ i18n.translate('SLA Name') }} *</label>
          <input pInputText [(ngModel)]="newSLA.name" class="w-full" [placeholder]="i18n.translate('e.g. Approval Response Time')" [attr.aria-label]="i18n.translate('e.g. Approval Response Time')" />
        </div>
        <div class="form-field">
          <label>{{ i18n.translate('Metric') }} *</label>
          <p-dropdown
            [options]="metricOptions"
            [(ngModel)]="newSLA.metric"
            [placeholder]="i18n.translate('Select metric')"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </div>
        <div class="form-field">
          <label>{{ i18n.translate('Threshold') }} *</label>
          <p-inputNumber [(ngModel)]="newSLA.threshold" [min]="0" [placeholder]="i18n.translate('e.g. 48')" styleClass="w-full" />
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('Cancel')" [text]="true" (onClick)="showDialog = false" />
          <p-button
            [label]="editMode ? i18n.translate('Update') : i18n.translate('Create')"
            icon="pi pi-check"
            (onClick)="saveSLA()"
            [disabled]="saving || !isFormValid()"
          />
        </ng-template>
      </p-dialog>

      <!-- Delete Confirmation Dialog -->
      <p-dialog
        [header]="i18n.translate('slaManagement.confirmDelete')"
        [(visible)]="showDeleteDialog"
        [modal]="true"
        [style]="{width:'400px'}"
      >
        <p>{{ i18n.translate('slaManagement.confirmDeleteSla') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash" severity="danger" (onClick)="deleteSLA()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>

    <app-ai-panel module="sla-management" />
  `,
    styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin: 20px 0 28px; }
    .kpi-card { background: var(--surface); border-radius: var(--radius); padding: 20px; border: 1px solid var(--border-subtle); text-align: center; }
    .kpi-value { font-size: var(--font-size-4xl); font-weight: 800; color: var(--text-heading); }
    .kpi-value.good { color: var(--success); }
    .kpi-value.warn { color: var(--warning); }
    .kpi-value.bad { color: var(--error); }
    .kpi-label { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }
    .mono { font-family: monospace; font-size: var(--font-size-sm); }
    .empty-msg { text-align: center; padding: 24px; color: var(--text-muted); }
    .empty-state { text-align: center; padding: 48px 24px; color: var(--text-muted); }
    .empty-state i { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .error-state { text-align: center; padding: 48px 24px; color: var(--text-muted); }
    .error-state i { font-size: var(--font-size-6xl); color: var(--error); margin-bottom: 12px; display: block; }
    .form-field { margin-bottom: 16px; }
    .form-field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px; }
    .w-full { width: 100%; }
    .kpi-skeleton { border-radius: var(--radius); }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
  `]
})
export class SLAManagementComponent implements OnInit {
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = false;
  saving = false;

  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingIndex: number = -1;
  deleteTarget: SLADefinition | null = null;

  slaDefinitions: SLADefinition[] = [];
  filteredSLAs: SLADefinition[] = [];
  entities: OrgEntity[] = [];
  frameworks: string[] = [];
  activeFilter: ScopeFilter | null = null;

  // KPI counters
  normalCount = 0;
  atRiskCount = 0;
  breachedCount = 0;
  complianceRate = 0;

  // Create/Edit form model
  newSLA = { name: '', metric: '', threshold: 0 as number | null };

  metricOptions = [
    { label: 'Response Time (hours)', value: 'response_time_hours' },
    { label: 'Resolution Time (hours)', value: 'resolution_time_hours' },
    { label: 'Approval Turnaround (hours)', value: 'approval_turnaround_hours' },
    { label: 'Evidence Collection (days)', value: 'evidence_collection_days' },
    { label: 'Audit Completion (days)', value: 'audit_completion_days' },
    { label: 'Remediation Time (days)', value: 'remediation_time_days' },
    { label: 'Uptime (%)', value: 'uptime_percent' },
  ];

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private operationsSvc: GrcOperationsService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadData());
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = false;

    this.operationsSvc.getTenantConfig().subscribe({
      next: (config: any) => {
        const slas = Array.isArray(config?.slaDefinitions)
          ? config.slaDefinitions
          : Array.isArray(config?.sla_definitions)
            ? config.sla_definitions
            : [];
        this.slaDefinitions = slas.map((s: Record<string, any>) => this.normalizeSLA(s));

        this.entities = Array.isArray(config?.orgStructure)
          ? config.orgStructure
          : Array.isArray(config?.org_structure)
            ? config.org_structure
            : [];
        this.frameworks = Array.isArray(config?.sectors)
          ? config.sectors.filter((sector: unknown): sector is string => typeof sector === 'string')
          : [];

        this.applyFilter();
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false; this.cdr.markForCheck();
        this.error = true;
      },
    });
  }

  onFilterChange(filter: ScopeFilter): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  openCreateDialog(): void {
    this.editMode = false;
    this.editingIndex = -1;
    this.newSLA = { name: '', metric: '', threshold: 0 };
    this.showDialog = true;
  }

  openEditDialog(sla: SLADefinition): void {
    this.editMode = true;
    this.editingIndex = this.slaDefinitions.findIndex(s => s.id === sla.id);
    this.newSLA = { name: sla.name, metric: sla.metric, threshold: sla.threshold };
    this.showDialog = true;
  }

  isFormValid(): boolean {
    return !!(this.newSLA.name?.trim() && this.newSLA.metric && this.newSLA.threshold != null && this.newSLA.threshold > 0);
  }

  saveSLA(): void {
    if (!this.isFormValid()) return;
    this.saving = true;

    if (this.editMode && this.editingIndex >= 0) {
      // Update existing
      this.slaDefinitions[this.editingIndex] = {
        ...this.slaDefinitions[this.editingIndex],
        name: this.newSLA.name.trim(),
        metric: this.newSLA.metric,
        threshold: this.newSLA.threshold!,
      };
    } else {
      // Create new
      this.slaDefinitions.push(this.normalizeSLA({
        id: `sla-${Date.now()}`,
        name: this.newSLA.name.trim(),
        metric: this.newSLA.metric,
        threshold: this.newSLA.threshold,
        status: 'normal',
        createdAt: new Date().toISOString(),
      }));
    }

    const updatedSLAs = this.slaDefinitions.map(s => ({
      id: s.id, name: s.name, metric: s.metric, threshold: s.threshold,
      currentValue: s.currentValue, status: s.status, entityId: s.entityId,
      framework: s.framework, createdAt: s.createdAt,
    }));

    this.operationsSvc.updateTenantConfig({ settings: { slaDefinitions: updatedSLAs } } as any).subscribe({
      next: () => {
        this.applyFilter();
        this.showDialog = false;
        this.saving = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.editMode ? this.i18n.translate('common.slaUpdated') : this.i18n.translate('common.slaCreated'), life: 3000 });
      },
      error: () => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 });
      },
    });
  }

  confirmDelete(sla: SLADefinition): void {
    this.deleteTarget = sla;
    this.showDeleteDialog = true;
  }

  deleteSLA(): void {
    if (!this.deleteTarget) return;
    this.slaDefinitions = this.slaDefinitions.filter(s => s.id !== this.deleteTarget!.id);

    const updatedSLAs = this.slaDefinitions.map(s => ({
      id: s.id, name: s.name, metric: s.metric, threshold: s.threshold,
      currentValue: s.currentValue, status: s.status, entityId: s.entityId,
      framework: s.framework, createdAt: s.createdAt,
    }));

    this.operationsSvc.updateTenantConfig({ settings: { slaDefinitions: updatedSLAs } } as any).subscribe({
      next: () => {
        this.applyFilter();
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.slaRemoved'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 });
      },
    });
  }

  getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    if (status === 'breached') return 'danger';
    if (status === 'at_risk') return 'warning';
    if (status === 'normal') return 'success';
    return 'info';
  }

  // ── Private helpers ──────────────────────────────────────────────

  private normalizeSLA(raw: Record<string, any>): SLADefinition {
    return {
      id: asString(raw.id) || asString(raw.sla_id) || `sla-${Math.random().toString(36).slice(2, 8)}`,
      name: asString(raw.name) || asString(raw.sla_name) || 'Unnamed SLA',
      metric: asString(raw.metric) || asString(raw.sla_metric),
      threshold: asNumber(raw.threshold ?? raw.sla_threshold),
      currentValue: raw.currentValue != null || raw.current_value != null
        ? asNumber(raw.currentValue ?? raw.current_value)
        : undefined,
      status: this.deriveSLAStatus(raw),
      entityId: asOptionalString(raw.entityId) ?? asOptionalString(raw.entity_id),
      framework: asOptionalString(raw.framework),
      createdAt: asOptionalString(raw.createdAt) ?? asOptionalString(raw.created_at),
    };
  }

  private deriveSLAStatus(raw: Record<string, any>): 'normal' | 'at_risk' | 'breached' {
    if (raw.status === 'breached' || raw.status === 'at_risk' || raw.status === 'normal') {
      return raw.status;
    }
    const currentRaw = raw.currentValue ?? raw.current_value;
    const thresholdRaw = raw.threshold ?? raw.sla_threshold;
    if (currentRaw != null && thresholdRaw != null) {
      const current = asNumber(currentRaw);
      const threshold = asNumber(thresholdRaw);
      if (threshold > 0) {
        if (current > threshold) return 'breached';
        if (current > threshold * 0.8) return 'at_risk';
      }
    }
    return 'normal';
  }

  private applyFilter(): void {
    let filtered = [...this.slaDefinitions];

    if (this.activeFilter) {
      if (this.activeFilter.entityId) {
        filtered = filtered.filter(s => s.entityId === this.activeFilter!.entityId);
      }
      if (this.activeFilter.framework) {
        filtered = filtered.filter(s => s.framework === this.activeFilter!.framework);
      }
    }

    this.filteredSLAs = filtered;
    this.computeKPIs();
  }

  private computeKPIs(): void {
    this.normalCount = this.filteredSLAs.filter(s => s.status === 'normal').length;
    this.atRiskCount = this.filteredSLAs.filter(s => s.status === 'at_risk').length;
    this.breachedCount = this.filteredSLAs.filter(s => s.status === 'breached').length;
    const total = this.filteredSLAs.length || 1;
    this.complianceRate = Math.round((this.normalCount / total) * 100);
  }

}
