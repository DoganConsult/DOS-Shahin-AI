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
import { devError } from '@app/runtime/utils/dev-logger';
import { StorageService } from '@app/infrastructure';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';
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
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, GrcDataTableComponent, GrcFormFieldComponent, TableModule, TagModule, ButtonModule, CardModule, ToastModule, TooltipModule, DialogModule, InputTextModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss']
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
      next: (data) => {
        const list = (data as any)?.tenants ?? (Array.isArray(data) ? data : []);
        this.tenants = list;
        this.stats = computeTenantStats(list);
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
      next: (data) => this.health = data as any,
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
    this.operationsSvc.createAdminTenant({ name: orgName } as any).subscribe({
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
        this._storage.set('grc_impersonate_token', res.token, 'session');
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
      next: (d) => { this.contentPacks = Array.isArray((d as any)?.packs) ? (d as any).packs : Array.isArray(d) ? d : []; },
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
