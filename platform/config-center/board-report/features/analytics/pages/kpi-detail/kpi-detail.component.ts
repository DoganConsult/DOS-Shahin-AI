import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '../../../../../shared/pipes';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { BootstrapStore } from '@app/core/services/platform/bootstrap.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kpi-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    PageShellComponent, StatCardComponent, StatusBadgeComponent,
    CardModule, TableModule, TagModule, ButtonModule,
    ProgressBarModule, TooltipModule, SkeletonModule, InputTextModule,
    InputTextarea, DropdownModule, DialogModule, ConfirmDialogModule,
    ToastModule, InputNumberModule, CalendarModule, AppDatePipe,],
  providers: [ConfirmationService, MessageService],
  templateUrl: './kpi-detail.component.html',
  styleUrls: ['./kpi-detail.component.css'],
})
export class KpiDetailComponent implements OnInit {
  // DB-driven landing route only (dos.tenant_landing_config via UI-OS).
  // null = operator has not seeded; template hides the "back" link
  // (NO FRONTEND INVENTION per AGENTS.md).
  private bootstrap = inject(BootstrapStore);
  readonly workspaceShellPath = this.bootstrap.landingPage();
    private operationsSvc = inject(GrcOperationsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirm = inject(ConfirmationService);
  private msg = inject(MessageService);
  i18n = inject(I18nService);

  kpiKey = '';
  loading = signal(true);
  saving = signal(false);
  kpiData = signal<GrcRecord | null>(null);
  searchTerm = '';

  showCreateDialog = signal(false);
  showEditDialog = signal(false);
  formData: Record<string, unknown> = {};
  editItemId = '';

  kpiConfig = computed(() => this.kpiData()?.config || null);
  kpiValue = computed(() => this.kpiData()?.kpiValue || null);
  kpiStats = computed(() => this.kpiData()?.stats || []);
  allItems = computed(() => this.kpiData()?.items || []);
  filteredItems = signal<GrcRecord[]>([]);
  timelineEvents = computed(() => this.kpiData()?.timeline || []);
  formFields = computed(() => this.kpiConfig()?.formFields || []);
  statusOptions = computed(() => this.kpiConfig()?.statusOptions || []);
  hubs = computed(() => this.kpiConfig()?.hubs || []);
  canCreate = computed(() => this.kpiConfig()?.canCreate ?? false);
  canEdit = computed(() => this.kpiConfig()?.canEdit ?? false);
  canDelete = computed(() => this.kpiConfig()?.canDelete ?? false);

  severityClass = computed(() => {
    const val = this.kpiValue()?.value;
    if (val === undefined || val === '—') return 'info';
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num)) return 'info';
    if (num >= 70) return 'success';
    if (num >= 40) return 'warning';
    return 'danger';
  });

  ngOnInit(): void {
    this.kpiKey = this.route.snapshot.paramMap.get('key') || '';
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.operationsSvc.getKpiDetail(this.kpiKey).subscribe({
      next: (data: any) => {
        this.kpiData.set(data);
        this.filteredItems.set(data.items || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  hasOwner(): boolean { return this.allItems().some((i: Record<string, unknown>) => i.owner); }

  filterItems(): void {
    if (!this.searchTerm) { this.filteredItems.set(this.allItems()); return; }
    const t = this.searchTerm.toLowerCase();
    this.filteredItems.set(this.allItems().filter((i: Record<string, unknown>) =>
      (i.title||'').toLowerCase().includes(t) || (i.category||'').toLowerCase().includes(t) || (i.status||'').toLowerCase().includes(t)
    ));
  }

  // ── CRUD ──
  openCreate(): void {
    this.formData = {};
    this.showCreateDialog.set(true);
  }

  submitCreate(): void {
    this.saving.set(true);
    this.operationsSvc.createKpiItem(this.kpiKey, this.formData).subscribe({
      next: () => {
        this.showCreateDialog.set(false);
        this.msg.add({ severity: 'success', summary: this.i18n.translate('kpiDetail.created'), detail: this.i18n.translate('kpiDetail.itemCreatedSuccessfully') });
        this.saving.set(false);
        this.loadData();
      },
      error: (err: unknown) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('kpiDetail.error'), detail: err?.error?.error || 'Failed' });
        this.saving.set(false);
      },
    });
  }

  openEdit(item: Record<string, unknown>): void {
    this.editItemId = item.id;
    this.formData = { ...item };
    this.showEditDialog.set(true);
  }

  submitEdit(): void {
    this.saving.set(true);
    this.operationsSvc.updateKpiItem(this.kpiKey, this.editItemId, this.formData).subscribe({
      next: () => {
        this.showEditDialog.set(false);
        this.msg.add({ severity: 'success', summary: this.i18n.translate('kpiDetail.updated'), detail: this.i18n.translate('kpiDetail.itemUpdatedSuccessfully') });
        this.saving.set(false);
        this.loadData();
      },
      error: (err: unknown) => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('kpiDetail.error'), detail: err?.error?.error || 'Failed' });
        this.saving.set(false);
      },
    });
  }

  quickStatus(item: Record<string, unknown>, status: string): void {
    this.operationsSvc.updateKpiItemStatus(this.kpiKey, item.id, status).subscribe({
      next: () => {
        this.msg.add({ severity: 'info', summary: this.i18n.translate('kpiDetail.statusUpdated'), detail: status });
        this.loadData();
      },
    });
  }

  confirmDelete(item: Record<string, unknown>): void {
    this.confirm.confirm({
      message: this.i18n.localize(`Are you sure you want to delete "${item.title}"?`, `هل أنت متأكد من حذف "${item.title}"؟`),
      header: this.i18n.translate('kpiDetail.confirmDelete'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.translate('kpiDetail.delete'),
      rejectLabel: this.i18n.translate('kpiDetail.cancel'),
      accept: () => {
        this.operationsSvc.deleteKpiItem(this.kpiKey, item.id).subscribe({
          next: () => {
            this.msg.add({ severity: 'warn', summary: this.i18n.translate('kpiDetail.deleted'), detail: this.i18n.translate('kpiDetail.itemDeleted') });
            this.loadData();
          },
          error: (err: unknown) => {
            this.msg.add({ severity: 'error', summary: this.i18n.translate('kpiDetail.error'), detail: err?.error?.error || 'Failed' });
          },
        });
      },
    });
  }

  navigateHub(route: string): void { this.router.navigate([route]); }

  valueClass(val: unknown): string {
    if (typeof val === 'string') {
      if (val.includes('%')) { const n = parseInt(val); if (n >= 70) return 'val-good'; if (n >= 40) return 'val-warn'; return 'val-bad'; }
      const lv = val.toLowerCase();
      if (['implemented','pass','passing','approved','published','verified','current','completed'].includes(lv)) return 'val-good';
      if (['in_progress','in progress','review','medium','pending'].includes(lv)) return 'val-warn';
      if (['not_started','fail','failing','stale','critical','overdue','unverified'].includes(lv)) return 'val-bad';
    }
    if (typeof val === 'number') { if (val >= 20) return 'val-bad'; if (val >= 12) return 'val-warn'; }
    return '';
  }

  actionColor(action: string): string {
    if (!action) return 'default';
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('insert') || a.includes('add')) return 'create';
    if (a.includes('update') || a.includes('edit') || a.includes('modify') || a.includes('change') || a.includes('status')) return 'update';
    if (a.includes('delete') || a.includes('remove')) return 'delete';
    return 'default';
  }

  fieldLabel(f: Record<string, unknown>): string { return this.i18n.localize(f.labelEn, f.labelAr); }
  statusLabel(opt: Record<string, unknown>): string { return this.i18n.localize(opt.label, opt.labelAr); }

}
