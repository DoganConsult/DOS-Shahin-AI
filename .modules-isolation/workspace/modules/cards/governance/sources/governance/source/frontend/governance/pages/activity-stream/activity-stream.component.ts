import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { asArray } from '@app/runtime/utils/safe-data';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-activity-stream',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TableModule, TagModule, InputTextModule, DropdownModule, ButtonModule, ToolbarModule],
    template: `
    <app-page-shell icon="stream" [title]="i18n.translate('activityStream.title')"
      [subtitle]="i18n.translate('activityStream.subtitle')"
      [breadcrumbs]="[i18n.translate('nav.dashboard'), i18n.translate('activityStream.breadcrumb')]" [loading]="loading">

      <!-- KPI Cards -->
      <div class="kpi-row">
        <div class="kpi-card">
          <i class="pi pi-list kpi-icon"></i>
          <div class="kpi-content">
            <div class="kpi-value">{{ events.length }}</div>
            <div class="kpi-label">{{ i18n.translate('activityStream.totalEvents') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <i class="pi pi-plus-circle kpi-icon text-green"></i>
          <div class="kpi-content">
            <div class="kpi-value">{{ countByAction('create') }}</div>
            <div class="kpi-label">{{ i18n.translate('activityStream.created') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <i class="pi pi-pencil kpi-icon text-blue"></i>
          <div class="kpi-content">
            <div class="kpi-value">{{ countByAction('update') }}</div>
            <div class="kpi-label">{{ i18n.translate('activityStream.updated') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <i class="pi pi-trash kpi-icon text-red"></i>
          <div class="kpi-content">
            <div class="kpi-value">{{ countByAction('delete') }}</div>
            <div class="kpi-label">{{ i18n.translate('activityStream.deleted') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <i class="pi pi-users kpi-icon text-purple"></i>
          <div class="kpi-content">
            <div class="kpi-value">{{ uniqueUsers() }}</div>
            <div class="kpi-label">{{ i18n.translate('activityStream.activeUsers') }}</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <p-toolbar styleClass="mb-3" *ngIf="!error">
        <ng-template pTemplate="start">
          <p-dropdown [options]="moduleFilterOptions" [(ngModel)]="filterModule" [placeholder]="i18n.translate('activityStream.allModules')" [showClear]="true" appendTo="body" />
          <input pInputText [(ngModel)]="filterEntity" [placeholder]="i18n.translate('activityStream.entityType')" [attr.aria-label]="i18n.translate('activityStream.entityType')" class="ml-2" />
          <p-dropdown [options]="actionFilterOptions" [(ngModel)]="filterAction" [placeholder]="i18n.translate('activityStream.allActions')" [showClear]="true" appendTo="body" class="ml-2" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('common.apply')" icon="pi pi-filter" (onClick)="load()" />
          <p-button [label]="i18n.translate('common.reset')" icon="pi pi-filter-slash" [outlined]="true" severity="secondary" class="ml-2" (onClick)="resetFilters()" />
        </ng-template>
      </p-toolbar>

      <!-- Events Table -->
      <p-table [attr.aria-label]="i18n.translate('activityStream.ariaEventsTable')" [value]="events" [paginator]="true" [rows]="20" styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true" [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} events"
        *ngIf="!error">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="timestamp" style="width:140px">{{ i18n.translate('activityStream.colTime') }} <p-sortIcon field="timestamp" /></th>
            <th pSortableColumn="module" style="width:110px">{{ i18n.translate('activityStream.colModule') }} <p-sortIcon field="module" /></th>
            <th style="width:100px">{{ i18n.translate('activityStream.colAction') }}</th>
            <th>{{ i18n.translate('activityStream.colEntity') }}</th>
            <th>{{ i18n.translate('activityStream.colUser') }}</th>
            <th>{{ i18n.translate('activityStream.colDescription') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td class="text-sm">{{ e.timestamp || e.created_at | appDate:'short' }}</td>
            <td><p-tag [value]="e.module || '—'" severity="info" /></td>
            <td><p-tag [value]="e.event || e.action || '—'" [severity]="actionSeverity(e.event || e.action)" /></td>
            <td>
              <span class="entity-badge">{{ e.entityType || e.entity_type || '—' }}</span>
              <span class="entity-id">{{ e.entityId || e.entity_id || '' }}</span>
            </td>
            <td>{{ e.userId || e.user_id || e.user_name || '—' }}</td>
            <td class="detail-cell">{{ e.description || (e.data | json) | slice:0:100 }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-history" style="font-size: var(--font-size-4xl);color:var(--text-muted)"></i>
            <p style="margin-top:8px">{{ i18n.translate('activityStream.noEvents') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <p-button [label]="i18n.translate('common.retry')" icon="pi pi-refresh" severity="danger" [outlined]="true" (onClick)="error=''; load()" />
      </div>
    </app-page-shell>
  `,
    styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); }
    .kpi-icon { font-size: var(--font-size-2xl); color: var(--primary, #2563eb); }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.5px; }
    .text-green { color: var(--success); } .text-blue { color: var(--primary); }
    .text-red { color: var(--error); } .text-purple { color: #7c3aed; }
    .mb-3 { margin-bottom: 16px; } .ml-2 { margin-inline-start: 8px; } .text-sm { font-size: var(--font-size-sm); }
    .entity-badge { background: var(--bg-1, var(--surface-ice)); padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); font-weight: 600; }
    .entity-id { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: 4px; }
    .detail-cell { font-size: var(--font-size-sm); color: var(--text-caption, var(--text-2)); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .error-state { text-align: center; padding: 32px; color: var(--error); }
    .text-center { text-align: center; } .p-4 { padding: 16px; }
  `]
})
export class ActivityStreamComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  events: Record<string, unknown>[] = [];
  filterModule = '';
  filterEntity = '';
  filterAction = '';
  /** Computed dropdown options that react to language changes */
  get moduleFilterOptions() {
    return [
      { label: this.i18n.translate('activityStream.moduleRisks'), value: 'risks' },
      { label: this.i18n.translate('activityStream.modulePolicies'), value: 'policies' },
      { label: this.i18n.translate('activityStream.moduleControls'), value: 'controls' },
      { label: this.i18n.translate('activityStream.moduleAssessments'), value: 'assessments' },
      { label: this.i18n.translate('activityStream.moduleEvidence'), value: 'evidence' },
      { label: this.i18n.translate('activityStream.moduleWorkflows'), value: 'workflows' },
      { label: this.i18n.translate('activityStream.moduleIncidents'), value: 'incidents' },
      { label: this.i18n.translate('activityStream.moduleVendors'), value: 'vendors' },
    ];
  }
  /** Computed action filter options that react to language changes */
  get actionFilterOptions() {
    return [
      { label: this.i18n.translate('activityStream.actionCreate'), value: 'create' },
      { label: this.i18n.translate('activityStream.actionUpdate'), value: 'update' },
      { label: this.i18n.translate('activityStream.actionDelete'), value: 'delete' },
      { label: this.i18n.translate('activityStream.actionApprove'), value: 'approve' },
      { label: this.i18n.translate('activityStream.actionLogin'), value: 'login' },
    ];
  }

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const params: string[] = [];
    if (this.filterModule) params.push(`module=${this.filterModule}`);
    if (this.filterEntity) params.push(`entityType=${this.filterEntity}`);
    if (this.filterAction) params.push(`action=${this.filterAction}`);
    const qs = params.length ? '?' + params.join('&') : '';
    this.apiclientSvc.get(`/timeline${qs}`).subscribe({
      next: (d: Record<string, unknown>) => { this.events = asArray(d, 'events'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.events = []; this.error = 'Failed to load activity data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  resetFilters() {
    this.filterModule = ''; this.filterEntity = ''; this.filterAction = '';
    this.load();
  }

  countByAction(action: string): number {
    return this.events.filter(e => (e.event || e.action) === action).length;
  }

  uniqueUsers(): number {
    return new Set(this.events.map(e => e.userId || e.user_id || e.user_name).filter(Boolean)).size;
  }

  actionSeverity(action: string): 'success' | 'warning' | 'danger' | 'info' {
    const m: Record<string, unknown> = { create: 'success', update: 'info', delete: 'danger', approve: 'success', login: 'info' };
    return m[action] || 'info';
  }
}
