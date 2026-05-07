import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, inject, DestroyRef, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { getModuleTabs } from '@app/shared/contracts/module-tab-registry';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { DiffViewerComponent } from '@app/shared/diff-viewer/diff-viewer.component';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-trail',
    imports: [CommonModule, AppDatePipe, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, TableModule, TagModule, ButtonModule, ToolbarModule, DropdownModule, InputTextModule, TooltipModule, DiffViewerComponent],
    template: `
    <div class="fdn-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Audit Log" titleAr="سجل التدقيق"
        subtitleEn="Tamper-evident log of all user and system actions across the platform"
        subtitleAr="سجل كامل لجميع إجراءات المستخدمين والنظام عبر المنصة"
        icon="clock"
        [breadcrumbs]="[i18n.translate('auditTrail.dashboard'), i18n.translate('auditTrail.foundation'), i18n.translate('auditTrail.auditLog')]"
        [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()"
        (actionClick)="onHdrAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <div class="fdn-body">

      @if (!loading()) {
        <div class="at-health-strip">
          <div class="fh-card">
            <span class="fh-val">{{ totalCount() }}</span>
            <span class="fh-lbl">{{ i18n.translate('auditTrail.totalEntries') }}</span>
          </div>
          <div class="fh-card">
            <span class="fh-val">{{ actionCount('create') }}</span>
            <span class="fh-lbl">{{ i18n.translate('auditTrail.created') }}</span>
          </div>
          <div class="fh-card">
            <span class="fh-val">{{ actionCount('update') }}</span>
            <span class="fh-lbl">{{ i18n.translate('auditTrail.updated') }}</span>
          </div>
          <div class="fh-card" [class.fh-danger]="actionCount('delete') > 0">
            <span class="fh-val">{{ actionCount('delete') }}</span>
            <span class="fh-lbl">{{ i18n.translate('auditTrail.deleted') }}</span>
          </div>
        </div>

        <p-toolbar styleClass="mb-3">
          <ng-template pTemplate="start">
            <p-dropdown [options]="moduleOptions" [(ngModel)]="moduleFilter" [placeholder]="i18n.translate('auditTrail.allModules')"
              (onChange)="resetAndLoad()" [showClear]="true" styleClass="me-2" />
            <p-dropdown [options]="entityTypeOptions" [(ngModel)]="entityTypeFilter" [placeholder]="i18n.translate('auditTrail.allEntities')"
              (onChange)="resetAndLoad()" [showClear]="true" styleClass="me-2" />
            <p-dropdown [options]="actionOptions" [(ngModel)]="actionFilter" [placeholder]="i18n.translate('auditTrail.allActions')"
              (onChange)="resetAndLoad()" [showClear]="true" styleClass="me-2" />
          </ng-template>
          <ng-template pTemplate="end">
            @if (entityIdFilter) {
              <p-tag [value]="i18n.translate('auditTrail.entity') + ': ' + entityIdFilter" severity="info" styleClass="me-2" />
              <p-button icon="pi pi-times" [rounded]="true" [text]="true" size="small" (onClick)="entityIdFilter=null; resetAndLoad()" [pTooltip]="i18n.translate('auditTrail.clearEntityFilter')" styleClass="me-2" />
            }
            <span class="at-count-badge">{{ totalCount() }} {{ i18n.translate('auditTrail.entries') }}</span>
            <p-button [label]="i18n.translate('auditTrail.export')" icon="pi pi-download" severity="secondary" [outlined]="true" (onClick)="exportTrail()" styleClass="ms-2" />
          </ng-template>
        </p-toolbar>

        <p-table [attr.aria-label]="i18n.translate('auditTrail.ariaAuditTable')" [value]="entries()" [paginator]="true" [rows]="20" [lazy]="true" [totalRecords]="totalCount()"
          (onLazyLoad)="onLazyLoad($event)" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('auditTrail.timestamp') }}</th>
              <th>{{ i18n.translate('auditTrail.user') }}</th>
              <th>{{ i18n.translate('auditTrail.module') }}</th>
              <th>{{ i18n.translate('auditTrail.action') }}</th>
              <th>{{ i18n.translate('auditTrail.entityType') }}</th>
              <th>{{ i18n.translate('auditTrail.entityId') }}</th>
              <th style="width:60px"></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-e>
            <tr tabindex="0" role="button" (keyup.enter)="selectEntry(e)" (click)="selectEntry(e)" [class.at-selected]="selectedEntry() === e" style="cursor:pointer">
              <td class="ts-cell">{{ e.timestamp | appDate:'medium' }}</td>
              <td>{{ e.user_email || e.user_id || '—' }}</td>
              <td><p-tag [value]="e.module || '—'" [severity]="moduleSeverity(e.module)" /></td>
              <td><p-tag [value]="e.action || '—'" [severity]="actionSeverity(e.action)" /></td>
              <td>{{ e.entity_type || '—' }}</td>
              <td class="id-cell"><code>{{ e.entity_id || '—' }}</code></td>
              <td>
                <p-button icon="pi pi-eye" [rounded]="true" [text]="true" size="small" (onClick)="selectEntry(e); $event.stopPropagation()" [pTooltip]="i18n.translate('auditTrail.tooltipDetails')" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="at-empty-msg">{{ i18n.translate('auditTrail.noAuditTrailEntries') }}</td></tr>
          </ng-template>
        </p-table>

        @if (selectedEntry()) {
          <div class="at-detail-panel">
            <div class="atd-header">
              <h3 class="atd-title">{{ i18n.translate('auditTrail.entryDetails') }}</h3>
              <button [attr.aria-label]="i18n.translate('auditTrail.ariaClose')" class="at-btn-close" (click)="selectedEntry.set(null)"><i class="pi pi-times"></i></button>
            </div>
            <div class="atd-grid">
              <div class="atd-field"><span class="atd-label">{{ i18n.translate('auditTrail.timestamp') }}</span><span class="atd-value">{{ selectedEntry()!.timestamp | date:'full' }}</span></div>
              <div class="atd-field"><span class="atd-label">{{ i18n.translate('auditTrail.user') }}</span><span class="atd-value">{{ selectedEntry()!.user_email || selectedEntry()!.user_id || '—' }}</span></div>
              <div class="atd-field"><span class="atd-label">{{ i18n.translate('auditTrail.module') }}</span><span class="atd-value">{{ selectedEntry()!.module || '—' }}</span></div>
              <div class="atd-field"><span class="atd-label">{{ i18n.translate('auditTrail.action') }}</span><span class="atd-value">{{ selectedEntry()!.action || '—' }}</span></div>
              <div class="atd-field"><span class="atd-label">{{ i18n.translate('auditTrail.entityType') }}</span><span class="atd-value">{{ selectedEntry()!.entity_type || '—' }}</span></div>
              <div class="atd-field"><span class="atd-label">{{ i18n.translate('auditTrail.entityId') }}</span><span class="atd-value atd-mono">{{ selectedEntry()!.entity_id || '—' }}</span></div>
            </div>
            @if (selectedEntry()!.after_state || selectedEntry()!.before_state || selectedEntry()!.metadata) {
              <div class="atd-section">
                <h4 class="atd-section-h">{{ i18n.translate('auditTrail.data') }}</h4>
                @if (selectedEntry()!.before_state && selectedEntry()!.after_state) {
                  <app-diff-viewer
                    [oldText]="formatJson(selectedEntry()!.before_state)"
                    [newText]="formatJson(selectedEntry()!.after_state)"
                    oldFileName="before" newFileName="after"
                    outputFormat="side-by-side" />
                } @else {
                  <pre class="atd-json">{{ formatState(selectedEntry()!) }}</pre>
                }
              </div>
            }
            <div class="atd-actions">
              @if (selectedEntry()!.entity_type && selectedEntry()!.entity_id) {
                <button class="at-cta" (click)="filterByEntity(selectedEntry()!)">
                  <i class="pi pi-filter"></i> {{ i18n.translate('auditTrail.filterByEntity') }}
                </button>
              }
            </div>
          </div>
        }
      }
      </div>
    </div>
  `,
    styles: [`
    .fdn-page { display:flex; flex-direction:column; min-height:100%; }
    .fdn-body  { flex:1; padding:20px 28px 40px; display:flex; flex-direction:column; gap:16px; }
    .at-health-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px}
    .fh-card{background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-md);padding:12px 16px;display:flex;flex-direction:column;gap:2px}
    .fh-danger{border-color:var(--red-300,#fca5a5);background:var(--status-danger-bg, #fff1f1)}
    .fh-val{font-size: var(--font-size-2xl);font-weight:800;color:var(--text-heading)}
    .fh-lbl{font-size: var(--font-size-xs);font-weight:600;color:var(--text-muted)}

    .mb-3{margin-bottom:16px}
    .me-2{margin-inline-end:8px}
    .ms-2{margin-inline-start:8px}
    .at-count-badge{background:var(--surface-ground,var(--surface-ice));padding:6px 14px;border-radius:var(--radius-pill);font-size: var(--font-size-sm);font-weight:600;color:var(--text-muted)}

    .ts-cell{font-size: var(--font-size-sm);white-space:nowrap}
    .id-cell{font-family:monospace;font-size: var(--font-size-sm);max-width:140px;overflow:hidden;text-overflow:ellipsis}
    .at-empty-msg{text-align:center;color:var(--text-muted);padding:32px}
    .at-selected{background:var(--primary-50,#eff6ff)}

    .at-detail-panel{margin-top:20px;background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:20px 24px}
    .atd-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
    .atd-title{margin:0;font-size: var(--font-size-lg);font-weight:800;color:var(--text-heading)}
    .atd-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px 20px;margin-bottom:16px}
    .atd-field{display:flex;flex-direction:column;gap:2px}
    .atd-label{font-size: var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)}
    .atd-value{font-size: var(--font-size-sm);font-weight:500;color:var(--text-heading)}
    .atd-mono{font-family:monospace;font-size: var(--font-size-sm)}
    .atd-section{margin-bottom:16px}
    .atd-section-h{margin:0 0 8px;font-size: var(--font-size-base);font-weight:700;color:var(--text-heading)}
    .atd-json{background:var(--surface-50);border:1px solid var(--surface-border);border-radius:var(--radius);padding:12px;font-size: var(--font-size-sm);font-family:monospace;max-height:200px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--text-color);margin:0}
    .atd-actions{display:flex;gap:8px;border-top:1px solid var(--surface-border);padding-top:14px}
    .at-cta{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--surface-border);border-radius:var(--radius);background:var(--surface-card);color:var(--text-color);font-size: var(--font-size-sm);font-weight:600;cursor:pointer}
    .at-cta:hover{background:var(--surface-ice)}
    .at-btn-close{width:28px;height:28px;border:1px solid var(--surface-border);border-radius:var(--radius-sm);background:var(--surface-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted)}
    .at-btn-close:hover{background:var(--surface-ice)}
    @media(max-width:768px){.atd-grid{grid-template-columns:1fr 1fr}.at-health-strip{grid-template-columns:repeat(2,1fr)}}
  `]
})
export class AuditTrailComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  readonly tabs = getModuleTabs('foundation');
  readonly headerActions: PageHeaderAction[] = [
    { id: 'export', labelEn: 'Export CSV', labelAr: 'تصدير CSV', icon: 'download' },
  ];
  onHdrAction(_id: string): void { /* future: CSV export */ }

  breadcrumbs: string[];
  loading = signal(false);
  entries = signal<GrcRecord[]>([]);
  totalCount = signal(0);
  selectedEntry = signal<GrcRecord | null>(null);

  moduleFilter: string | null = null;
  entityTypeFilter: string | null = null;
  actionFilter: string | null = null;
  entityIdFilter: string | null = null;
  currentOffset = 0;
  private _initialLoadDone = false;
  private _loadInFlight = false;

  get moduleOptions() {
    return [
      { label: this.i18n.translate('auditTrail.moduleFoundation'), value: 'foundation' },
      { label: this.i18n.translate('auditTrail.moduleGovernance'), value: 'governance' },
      { label: this.i18n.translate('auditTrail.moduleRisks'), value: 'risks' },
      { label: this.i18n.translate('auditTrail.moduleCompliance'), value: 'compliance' },
      { label: this.i18n.translate('auditTrail.moduleAudit'), value: 'audit' },
      { label: this.i18n.translate('auditTrail.moduleEvidence'), value: 'evidence' },
      { label: this.i18n.translate('auditTrail.modulePolicies'), value: 'policies' },
      { label: this.i18n.translate('auditTrail.moduleControls'), value: 'controls' },
      { label: this.i18n.translate('auditTrail.moduleIncidents'), value: 'incidents' },
      { label: this.i18n.translate('auditTrail.moduleVendors'), value: 'vendors' },
      { label: this.i18n.translate('auditTrail.moduleWorkflows'), value: 'workflows' },
      { label: this.i18n.translate('auditTrail.moduleWorkspaces'), value: 'workspaces' },
      { label: this.i18n.translate('auditTrail.moduleUsers'), value: 'users' },
    ];
  }

  get entityTypeOptions() {
    return [
      { label: this.i18n.translate('auditTrail.entityUser'), value: 'user' },
      { label: this.i18n.translate('auditTrail.entityRole'), value: 'role' },
      { label: this.i18n.translate('auditTrail.entityDepartment'), value: 'department' },
      { label: this.i18n.translate('auditTrail.entityLocation'), value: 'location' },
      { label: this.i18n.translate('auditTrail.entityOrganization'), value: 'organization' },
      { label: this.i18n.translate('auditTrail.entityBusinessUnit'), value: 'business_unit' },
      { label: this.i18n.translate('auditTrail.entityPolicy'), value: 'policy' },
      { label: this.i18n.translate('auditTrail.entityControl'), value: 'control' },
      { label: this.i18n.translate('auditTrail.entityRisk'), value: 'risk' },
      { label: this.i18n.translate('auditTrail.entityEvidence'), value: 'evidence' },
      { label: this.i18n.translate('auditTrail.entityIncident'), value: 'incident' },
      { label: this.i18n.translate('auditTrail.entityAuditPlan'), value: 'audit_plan' },
      { label: this.i18n.translate('auditTrail.entityAuditFinding'), value: 'audit_finding' },
      { label: this.i18n.translate('auditTrail.entityVendor'), value: 'vendor' },
      { label: this.i18n.translate('auditTrail.entitySession'), value: 'session' },
      { label: this.i18n.translate('auditTrail.entityWorkspace'), value: 'workspace' },
      { label: this.i18n.translate('auditTrail.entityRoleMatrix'), value: 'role-matrix' },
      { label: this.i18n.translate('auditTrail.entityRiskModel'), value: 'risk_model' },
      { label: this.i18n.translate('auditTrail.entityCadenceOverride'), value: 'cadence_override' },
      { label: this.i18n.translate('auditTrail.entityEmailConfig'), value: 'email_config' },
      { label: this.i18n.translate('auditTrail.entityEntitlement'), value: 'entitlement' },
      { label: this.i18n.translate('auditTrail.entityOperationMode'), value: 'operation_mode' },
    ];
  }

  get actionOptions() {
    return [
      { label: this.i18n.translate('auditTrail.actionCreate'), value: 'create' },
      { label: this.i18n.translate('auditTrail.actionUpdate'), value: 'update' },
      { label: this.i18n.translate('auditTrail.actionDelete'), value: 'delete' },
      { label: this.i18n.translate('auditTrail.actionLogin'), value: 'login' },
      { label: this.i18n.translate('auditTrail.actionExport'), value: 'export' },
    ];
  }

  constructor() {
    this.breadcrumbs = this.router.url.startsWith('/foundation')
      ? [this.i18n.translate('auditTrail.foundation'), this.i18n.translate('auditTrail.auditLog')]
      : [this.i18n.translate('auditTrail.dashboard'), this.i18n.translate('auditTrail.breadcrumbAuditTrail')];
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['entityType']) this.entityTypeFilter = qp['entityType'];
    if (qp['entityId']) this.entityIdFilter = qp['entityId'];
    if (qp['module']) this.moduleFilter = qp['module'];
    if (qp['action']) this.actionFilter = qp['action'];

    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadEntries());
    this.loadEntries();
  }

  resetAndLoad(): void {
    this.currentOffset = 0;
    this.loadEntries();
  }

  loadEntries(): void {
    if (this._loadInFlight) return;
    this._loadInFlight = true;
    this.loading.set(true);
    this.operationsSvc.getAuditTrailFiltered({
      module: this.moduleFilter || undefined,
      entityType: this.entityTypeFilter || undefined,
      action: this.actionFilter || undefined,
      entityId: this.entityIdFilter || undefined,
      limit: 20,
      offset: this.currentOffset,
    }).subscribe({
      next: (d: Record<string, any>) => {
        const items = asArray(d, 'entries');
        this.entries.set(items);
        this.totalCount.set(d.totalCount ?? d.total ?? d.count ?? items.length);
        this.loading.set(false);
        this._loadInFlight = false;
        this._initialLoadDone = true;
      },
      error: () => {
        this.loading.set(false);
        this._loadInFlight = false;
        this._initialLoadDone = true;
      }
    });
  }

  onLazyLoad(event: Record<string, any>): void {
    const newOffset = event.first || 0;
    if (!this._initialLoadDone) return;
    if (newOffset === this.currentOffset && this.entries().length > 0) return;
    this.currentOffset = newOffset;
    this.loadEntries();
  }

  actionCount(action: string): number {
    return this.entries().filter(e => e.action === action).length;
  }

  selectEntry(e: Record<string, any>): void {
    this.selectedEntry.set(this.selectedEntry() === e ? null : e);
  }

  filterByEntity(e: Record<string, any>): void {
    this.entityTypeFilter = e.entity_type;
    this.entityIdFilter = e.entity_id;
    this.resetAndLoad();
  }

  formatState(e: Record<string, any>): string {
    const data = e.after_state || e.before_state || e.metadata || {};
    try { return JSON.stringify(data, null, 2); } catch { return '—'; }
  }

  formatJson(data: unknown): string {
    try { return JSON.stringify(data, null, 2); } catch { return '—'; }
  }

  moduleSeverity(mod: string): string {
    const map: Record<string, string> = { risks: 'danger', incidents: 'danger', audit: 'warning', compliance: 'info', governance: 'success', users: 'info', foundation: 'success' };
    return map[mod] || 'info';
  }

  actionSeverity(action: string): string {
    if (action === 'deleted' || action === 'delete') return 'danger';
    if (action === 'created' || action === 'create') return 'success';
    if (action === 'updated' || action === 'update') return 'warning';
    return 'info';
  }

  exportTrail(): void {
    this.apiclientSvc.getBlob(`/audit-trail/export?format=csv`).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `audit-trail.csv`;
        a.click();
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }
}
