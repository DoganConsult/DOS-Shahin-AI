import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { devError } from '../../core/utils/dev-logger';
import { StorageService } from '@app/infrastructure';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

export interface Tenant {
  tenant_id: string;
  org_name: string;
  industry: string;
  org_size: string;
  plan: string;
  status: string;
  created_at: string;
}

export interface SystemHealth {
  uptime: number;
  dbPoolStatus: string;
  timestamp: string;
}

interface BackgroundJob {
  job_name: string;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

interface EditionLimit {
  plan: string;
  max_users: number;
  max_frameworks: number;
  max_assessments: number;
  features: Record<string, any>;
}

/** Compute summary stats from a tenant list — exported for testability */
export function computeTenantStats(tenants: Tenant[]): { total: number; active: number; suspended: number } {
  const total = tenants.length;
  const suspended = tenants.filter(t => t.status === 'suspended').length;
  const active = tenants.filter(t => !t.status || t.status === 'active').length;
  return { total, active, suspended };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TableModule, TagModule, ButtonModule, CardModule, ToastModule, TooltipModule, DialogModule, InputTextModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  template: `
    <app-page-shell
      icon="cog"
      [title]="i18n.translate('admin.title') || 'Admin'"
      [subtitle]="i18n.translate('admin.subtitle') || 'Platform administration'"
      [breadcrumbs]="[i18n.translate('dashboard.title') || 'Dashboard', i18n.translate('admin.title') || 'Admin']"
      [loading]="loading()">
      @if (error()) {
        <p-card>
          <p class="error-msg">{{ error() }}</p>
          <button pButton icon="pi pi-refresh" [label]="i18n.translate('common.retry') || 'Retry'" (click)="retry()"></button>
        </p-card>
      } @else {
    <div class="admin-page">

      <!-- Summary Stats -->
      <div class="cards-row">
        <div class="stat-card">
          <div class="stat-label">{{ i18n.translate('admin.totalTenants') }}</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ i18n.translate('admin.activeTenants') }}</div>
          <div class="stat-value active">{{ stats.active }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ i18n.translate('admin.suspendedTenants') }}</div>
          <div class="stat-value suspended">{{ stats.suspended }}</div>
        </div>
      </div>

      <!-- System Health Card -->
      <div class="cards-row">
        <div class="stat-card">
          <div class="stat-label">{{ i18n.translate('admin.serverUptime') }}</div>
          <div class="stat-value">{{ formatUptime(health?.uptime || 0) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ i18n.translate('admin.dbPoolStatus') }}</div>
          <div class="stat-value" [class.ok]="health?.dbPoolStatus === 'ok'">{{ health?.dbPoolStatus || '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ i18n.translate('admin.serverTime') }}</div>
          <div class="stat-value small">{{ health?.timestamp || '—' }}</div>
        </div>
      </div>

      <!-- Tenant List Table -->
      <div class="section">
        <div class="section-header">
          <h2>{{ i18n.translate('admin.tenants') }}</h2>
          <button pButton [label]="i18n.translate('admin.createTenant')" icon="pi pi-plus" class="p-button-sm p-button-success" (click)="createTenant()"></button>
        </div>
        <p-table [attr.aria-label]="i18n.translate('admin.ariaTenantsTable')" [value]="tenants" [paginator]="true" [rows]="10" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('admin.id') }}</th>
              <th>{{ i18n.translate('admin.organization') }}</th>
              <th>{{ i18n.translate('admin.industry') }}</th>
              <th>{{ i18n.translate('admin.plan') }}</th>
              <th>{{ i18n.translate('admin.status') }}</th>
              <th>{{ i18n.translate('admin.created') }}</th>
              <th>{{ i18n.translate('admin.actions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-t>
            <tr>
              <td><code>{{ t.tenant_id }}</code></td>
              <td>{{ t.org_name }}</td>
              <td>{{ t.industry }}</td>
              <td><p-tag [value]="t.plan" [severity]="planSeverity(t.plan)" /></td>
              <td><p-tag [value]="t.status || 'active'" [severity]="statusSeverity(t.status)" /></td>
              <td>{{ t.created_at | appDate:'short' }}</td>
              <td class="actions-cell">
                <button pButton icon="pi pi-user" class="p-button-sm p-button-text p-button-info" [pTooltip]="i18n.translate('admin.impersonate')" (click)="impersonate(t.tenant_id)"></button>
                <button pButton icon="pi pi-ban" class="p-button-sm p-button-text p-button-warning" [pTooltip]="i18n.translate('admin.suspend')" (click)="suspendTenant(t.tenant_id)"></button>
                <button pButton icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger" [pTooltip]="i18n.translate('admin.delete')" (click)="deleteTenant(t.tenant_id)"></button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="empty-msg">{{ i18n.translate('admin.noTenants') }}</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Background Jobs -->
      <div class="section">
        <h2>{{ i18n.translate('admin.jobs') }}</h2>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('admin.ariaJobsTable')" [value]="jobs" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('admin.jobName') }}</th>
              <th>{{ i18n.translate('admin.schedule') }}</th>
              <th>{{ i18n.translate('admin.enabled') }}</th>
              <th>{{ i18n.translate('admin.lastStatus') }}</th>
              <th>{{ i18n.translate('admin.lastRun') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-j>
            <tr>
              <td>{{ j.job_name }}</td>
              <td><code>{{ j.cron_expression }}</code></td>
              <td><p-tag [value]="j.enabled ? i18n.translate('common.yes') : i18n.translate('common.no')" [severity]="j.enabled ? 'success' : 'danger'" /></td>
              <td><p-tag [value]="j.last_status || 'pending'" [severity]="jobStatusSeverity(j.last_status)" /></td>
              <td>{{ j.last_run_at ? (j.last_run_at | appDate:'short') : '—' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="empty-msg">{{ i18n.translate('admin.noJobs') }}</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Content Packs -->
      <div class="section">
        <div class="section-header">
          <h2>{{ i18n.translate('admin.contentPacks') }}</h2>
        </div>
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('admin.ariaContentPacksTable')" [value]="contentPacks" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>{{ i18n.translate('admin.packId') }}</th><th>{{ i18n.translate('admin.version') }}</th><th>{{ i18n.translate('admin.status') }}</th><th>{{ i18n.translate('admin.installed') }}</th><th>{{ i18n.translate('admin.actions') }}</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td><strong>{{ p.pack_id || p.packId }}</strong></td>
              <td><code>{{ p.version || p.installed_version || '—' }}</code></td>
              <td><p-tag [value]="p.status || 'installed'" [severity]="p.status === 'error' ? 'danger' : 'success'" /></td>
              <td>{{ p.installed_at | appDate:'short' }}</td>
              <td class="actions-cell">
                <button pButton icon="pi pi-refresh" class="p-button-sm p-button-text p-button-info" [pTooltip]="i18n.translate('admin.upgrade')" (click)="upgradePack(p)"></button>
                <button pButton icon="pi pi-undo" class="p-button-sm p-button-text p-button-warning" [pTooltip]="i18n.translate('admin.rollback')" (click)="rollbackPack(p)"></button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="empty-msg">{{ i18n.translate('admin.noContentPacks') }}</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Edition Feature Limits -->
      <div class="section">
        <h2>{{ i18n.translate('admin.featureLimits') }}</h2>
        <div class="limits-grid" *ngIf="editionLimits.length > 0; else noLimits">
          <div class="limit-card" *ngFor="let el of editionLimits">
            <div class="limit-plan">{{ el.plan }}</div>
            <div class="limit-detail">{{ i18n.translate('admin.users') }}: {{ el.max_users }}</div>
            <div class="limit-detail">{{ i18n.translate('admin.frameworks') }}: {{ el.max_frameworks }}</div>
            <div class="limit-detail">{{ i18n.translate('admin.assessments') }}: {{ el.max_assessments }}</div>
          </div>
        </div>
        <ng-template #noLimits>
          <div class="limits-grid">
            <div class="limit-card" *ngFor="let plan of ['free','starter','professional','enterprise']">
              <div class="limit-plan">{{ plan }}</div>
              <div class="limit-detail">{{ i18n.translate('admin.noLimitsConfigured') }}</div>
            </div>
          </div>
        </ng-template>
      </div>
    </div>
      }
    </app-page-shell>
    <p-toast />
    <p-confirmDialog />
    <p-dialog [header]="i18n.translate('admin.createTenant') || 'Create Tenant'" [(visible)]="createDialogVisible" [modal]="true" [style]="{ width: '400px' }">
      <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
        <label for="new-org-name">{{ i18n.translate('admin.organizationName') || 'Organization Name' }}</label>
        <input pInputText id="new-org-name" [(ngModel)]="newOrgName" [placeholder]="i18n.translate('admin.enterOrgName') || 'Enter organization name'" [attr.aria-label]="i18n.translate('admin.enterOrgName') || 'Enter organization name'" />
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel') || 'Cancel'" icon="pi pi-times" class="p-button-text" (click)="createDialogVisible = false"></button>
        <button pButton [label]="i18n.translate('common.create') || 'Create'" icon="pi pi-check" [disabled]="!newOrgName.trim()" (click)="submitCreateTenant()"></button>
      </ng-template>
    </p-dialog>
    <p-dialog [header]="i18n.translate('admin.rollbackPack') || 'Rollback Content Pack'" [(visible)]="rollbackDialogVisible" [modal]="true" [style]="{ width: '400px' }">
      <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
        <label for="rollback-version">{{ i18n.translate('admin.targetVersion') || 'Target version' }}</label>
        <input pInputText id="rollback-version" [(ngModel)]="rollbackVersion" [placeholder]="i18n.translate('admin.versionPlaceholder')" [attr.aria-label]="i18n.translate('admin.versionPlaceholder')" />
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.translate('common.cancel') || 'Cancel'" icon="pi pi-times" class="p-button-text" (click)="rollbackDialogVisible = false"></button>
        <button pButton [label]="i18n.translate('common.confirm') || 'Confirm'" icon="pi pi-check" [disabled]="!rollbackVersion.trim()" (click)="submitRollbackPack()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .admin-page { padding: 32px; max-width: 1200px; margin: 0 auto; }
    .error-msg { color: var(--red-500); margin-bottom: var(--space-md); }
    .page-title { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading); margin: 0 0 28px; letter-spacing: -0.02em; }
    .cards-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .stat-card {
      background: var(--surface); border-radius: var(--radius); padding: 22px;
      border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-card);
      transition: box-shadow 200ms, transform 200ms;
    }
    .stat-card:hover { box-shadow: var(--shadow-card-hover); transform: translateY(-2px); }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-caption); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 8px; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading); }
    .stat-value.ok { color: var(--status-success); }
    .stat-value.active { color: var(--status-success); }
    .stat-value.suspended { color: var(--status-danger, #e74c3c); }
    .stat-value.small { font-size: var(--font-size-base); font-weight: 500; color: var(--text-body); }
    .section { margin-bottom: 32px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .section h2, .section-header h2 { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading); margin: 0 0 14px; }
    .section-header h2 { margin: 0; }
    .actions-cell { display: flex; gap: 4px; }
    .empty-msg { text-align: center; color: var(--text-caption); padding: 32px; }
    .limits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .limit-card {
      background: var(--surface); border-radius: var(--radius-sm); padding: 18px;
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);
      transition: box-shadow 200ms, transform 200ms;
    }
    .limit-card:hover { box-shadow: var(--shadow-card-hover); transform: translateY(-2px); }
    .limit-plan { font-size: var(--font-size-base); font-weight: 700; color: var(--primary); text-transform: capitalize; margin-bottom: 6px; }
    .limit-detail { font-size: var(--font-size-sm); color: var(--text-muted); }
  `],
})
export class AdminDashboardComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  private msg = inject(MessageService);
  private confirmSvc = inject(ConfirmationService);
  private _storage = inject(StorageService);
  i18n = inject(I18nService);

  tenants: Tenant[] = [];
  health: SystemHealth | null = null;
  jobs: BackgroundJob[] = [];
  editionLimits: EditionLimit[] = [];
  contentPacks: GrcRecord[] = [];
  stats = { total: 0, active: 0, suspended: 0 };
  loading = signal(false);
  error = signal<string | null>(null);
  createDialogVisible = false;
  newOrgName = '';
  rollbackDialogVisible = false;
  rollbackVersion = '';
  private rollbackTargetPack: GrcRecord | null = null;

  ngOnInit(): void {
    this.loadAll();
  }

  retry(): void {
    this.error.set(null);
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadTenants();
    this.loadHealth();
    this.loadJobs();
    this.loadEditionLimits();
    this.loadContentPacks();
  }

  loadTenants(): void {
    this.operationsSvc.getAdminTenants().subscribe({
      next: (data: any) => {
        this.tenants = data;
        this.stats = computeTenantStats(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(((err as GrcRecord).error)?.error || this.i18n.translate('admin.errorLoadTenants') || 'Failed to load tenants');
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('admin.errorLoadTenants'), life: 4000 });
      },
    });
  }

  loadHealth(): void {
    this.operationsSvc.getAdminHealth().subscribe({
      next: (data: any) => this.health = data,
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('admin.errorLoadHealth'), life: 4000 });
      },
    });
  }

  loadJobs(): void {
    this.apiclientSvc.get('/jobs').subscribe({
      next: (data: BackgroundJob[]) => this.jobs = data,
      error: () => this.jobs = [],
    });
  }

  loadEditionLimits(): void {
    this.apiclientSvc.get('/admin/edition-limits').subscribe({
      next: (data: EditionLimit[]) => this.editionLimits = data,
      error: () => this.editionLimits = [],
    });
  }

  createTenant(): void {
    this.newOrgName = '';
    this.createDialogVisible = true;
  }

  submitCreateTenant(): void {
    const orgName = this.newOrgName.trim();
    if (!orgName) return;
    this.createDialogVisible = false;
    const tenantId = crypto.randomUUID().slice(0, 8);
    this.operationsSvc.createAdminTenant({ tenant_id: tenantId, org_name: orgName } as any).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('admin.tenantCreated'), detail: `"${orgName}"`, life: 3000 });
        this.loadTenants();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('admin.errorCreateTenant'), life: 4000 });
      },
    });
  }

  suspendTenant(id: string): void {
    this.confirmSvc.confirm({
      message: `Suspend tenant ${id}?`,
      header: this.i18n.translate('admin.suspend') || 'Suspend',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.operationsSvc.suspendAdminTenant(id).subscribe({
          next: () => {
            this.msg.add({ severity: 'warning', summary: this.i18n.translate('admin.tenantSuspended'), detail: id, life: 3000 });
            this.loadTenants();
          },
          error: (err) => {
            this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('admin.errorSuspendTenant'), life: 4000 });
          },
        });
      },
    });
  }

  deleteTenant(id: string): void {
    this.confirmSvc.confirm({
      message: `DELETE tenant ${id}? This will drop the schema and all data.`,
      header: this.i18n.translate('admin.delete') || 'Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.operationsSvc.deleteAdminTenant(id).subscribe({
          next: () => {
            this.msg.add({ severity: 'success', summary: this.i18n.translate('admin.tenantDeleted'), detail: id, life: 3000 });
            this.loadTenants();
          },
          error: (err) => {
            this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('admin.errorDeleteTenant'), life: 4000 });
          },
        });
      },
    });
  }

  impersonate(tenantId: string): void {
    this.apiclientSvc.post('/admin/impersonate/' + tenantId, {}).subscribe({
      next: (res) => {
        // Store impersonation token in sessionStorage (not localStorage) for security
        // SessionStorage is cleared when the tab closes, reducing risk of token persistence
        this._storage.set('grc_impersonate_token', res.token);
        this.msg.add({ severity: 'info', summary: this.i18n.translate('admin.impersonate'), detail: tenantId, life: 3000 });
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('admin.errorImpersonate'), life: 4000 });
      },
    });
  }

  formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  planSeverity(plan: string): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | undefined {
    const map: Record<string, "success" | "info" | "warning" | "danger"> = { enterprise: 'success', professional: 'info', starter: 'warning', free: 'danger' };
    return map[plan] || 'info';
  }

  statusSeverity(status: string): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | undefined {
    if (status === 'suspended') return 'danger';
    if (status === 'active' || !status) return 'success';
    return 'info';
  }

  jobStatusSeverity(status: string | null): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | undefined {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'running') return 'info';
    return 'warning';
  }

  loadContentPacks(): void {
    this.operationsSvc.getInstalledPacks().subscribe({
      next: (d: any) => { this.contentPacks = Array.isArray(d?.packs) ? d.packs : Array.isArray(d) ? d : []; },
      error: (e) => devError("[API]", e),
    });
  }

  upgradePack(pack: GrcRecord): void {
    const packId = pack.pack_id || pack.packId;
    this.operationsSvc.upgradeContentPack(packId, pack as any).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('admin.packUpgraded'), detail: packId, life: 3000 }); this.loadContentPacks(); },
      error: (err) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('admin.upgradeFailed'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.unknownError'), life: 4000 }); },
    });
  }

  rollbackPack(pack: GrcRecord): void {
    this.rollbackTargetPack = pack;
    this.rollbackVersion = '';
    this.rollbackDialogVisible = true;
  }

  submitRollbackPack(): void {
    const pack = this.rollbackTargetPack;
    if (!pack) return;
    const packId = pack.pack_id || pack.packId;
    const version = this.rollbackVersion.trim();
    if (!version) return;
    this.rollbackDialogVisible = false;
    this.operationsSvc.rollbackContentPack(packId, version).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('admin.packRolledBack'), detail: `${packId} → ${version}`, life: 3000 }); this.loadContentPacks(); },
      error: (err) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('admin.rollbackFailed'), detail: ((err as GrcRecord).error)?.error || this.i18n.translate('common.unknownError'), life: 4000 }); },
    });
  }

}
