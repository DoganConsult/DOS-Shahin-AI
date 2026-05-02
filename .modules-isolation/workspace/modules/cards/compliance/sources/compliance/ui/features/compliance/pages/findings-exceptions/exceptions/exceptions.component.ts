import { Component, OnInit, inject, DestroyRef, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe, AppNumberPipe } from '@app/shared/pipes';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, TableModule, TagModule, TooltipModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exceptions',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, AiPanelComponent, RaciPanelComponent,
    GrcDataTableComponent, GrcFormFieldComponent,
    TableModule, TagModule, ButtonModule, DialogModule,
    InputModule, InputModule, DropdownModule, TooltipModule, NotificationModule, RouterModule, AppDatePipe, AppNumberPipe,],
  providers: [],
  templateUrl: './exceptions.component.html',
  styleUrls: ['./exceptions.component.scss']
})
export class ExceptionsComponent implements OnInit {
  private msg = inject(MessageService);

    private complianceSvc = inject(GrcComplianceService);
  items: GrcRecord[] = [];
  filteredItems: GrcRecord[] = [];
  loaded = false;
  searchTerm = '';
  statusFilter = '';
  healthFilter = '';
  isComplianceScoped = false;
  showDialog = false;
  showDeleteDialog = false;
  showRejectDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: GrcRecord | null = null;
  rejectTarget: GrcRecord | null = null;
  rejectReason = '';
  form: GrcRecord = { title: '', description: '', control_id: '', risk_level: 'medium', expiry_date: '', status: 'pending', compensating_controls: '' };
  drawerVisible = false;
  selectedItem: GrcRecord | null = null;
  showRenewDialog = false;
  renewTarget: GrcRecord | null = null;
  renewExpiry = '';

  readonly tabs: GrcRecord[] = [];
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'New Exception', labelAr: 'استثناء جديد', icon: 'plus', primary: true },
    { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
  ];
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  onHeaderAction(id: string): void { if (id === 'add') this.openCreateDialog(); }

  pendingCount = 0;
  approvedCount = 0;
  expiringSoonCount = 0;
  expiredCount = 0;
  missingControlsCount = 0;
  renewalHistory: GrcRecord[] = [];

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Expired', value: 'expired' },
    { label: 'Rejected', value: 'rejected' },
  ];

  statusFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Expired', value: 'expired' },
    { label: 'Rejected', value: 'rejected' },
  ];

  riskLevelOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  /** Route query params as a signal via toSignal() */
  private readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} as Record<string, string> });

  constructor(
    public i18n: I18nService,
    private apiclientSvc: ApiClientService
  ) {}

  /** React to query param changes for filters */
  private readonly queryParamEffect = effect(() => {
    const params = this.queryParams();
    if (params['expiringSoon'] === '1') this.healthFilter = 'expiring';
    if (params['status']) this.statusFilter = params['status'];
    if (params['openCreate'] === '1') setTimeout(() => this.openCreateDialog(), 100);
  });

  ngOnInit(): void {
    this.isComplianceScoped = this.route.snapshot.data?.['complianceScoped'] === true;
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.apiclientSvc.get('/exceptions').subscribe({
      next: (res) => {
        let data = Array.isArray(res) ? res : (res.data?.exceptions ?? res.exceptions ?? (Array.isArray(res.data) ? res.data : []));
        if (this.isComplianceScoped) {
          data = data.filter((e) => e.control_id && e.control_id.trim() !== '');
        }
        this.items = data;
        this.computeHealth();
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  computeHealth(): void {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 86400000);
    this.pendingCount = this.items.filter(e => e.status === 'pending').length;
    this.approvedCount = this.items.filter(e => e.status === 'approved' || e.status === 'active').length;
    this.expiringSoonCount = this.items.filter(e => e.expiry_date && new Date(e.expiry_date) <= in14 && new Date(e.expiry_date) >= now && e.status !== 'expired').length;
    this.expiredCount = this.items.filter(e => (e.status === 'expired') || (e.expiry_date && new Date(e.expiry_date) < now && e.status !== 'rejected')).length;
    this.missingControlsCount = this.items.filter(e => !e.compensating_controls || e.compensating_controls.trim() === '').length;
  }

  isExpired(item: GrcRecord): boolean {
    return item.status === 'expired' || (item.expiry_date && new Date(item.expiry_date) < new Date());
  }

  isExpiringSoon(item: GrcRecord): boolean {
    if (!item.expiry_date || this.isExpired(item)) return false;
    const in14 = new Date(new Date().getTime() + 14 * 86400000);
    return new Date(item.expiry_date) <= in14;
  }

  applyHealthFilter(filter: string): void {
    this.healthFilter = filter;
    this.statusFilter = '';
    this.filterItems();
  }

  clearHealthFilter(): void {
    this.healthFilter = '';
    this.statusFilter = '';
    this.filterItems();
  }

  filterItems(): void {
    let r = this.items;
    if (this.healthFilter === 'pending') r = r.filter(e => e.status === 'pending');
    else if (this.healthFilter === 'approved') r = r.filter(e => e.status === 'approved' || e.status === 'active');
    else if (this.healthFilter === 'expiring') r = r.filter(e => this.isExpiringSoon(e));
    else if (this.healthFilter === 'expired') r = r.filter(e => this.isExpired(e));
    else if (this.healthFilter === 'no_controls') r = r.filter(e => !e.compensating_controls || e.compensating_controls.trim() === '');
    if (this.statusFilter) r = r.filter(e => e.status === this.statusFilter);
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(i => (i.title ?? i.name ?? '').toLowerCase().includes(t) || (i.description ?? '').toLowerCase().includes(t));
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { title: '', description: '', control_id: '', risk_level: 'medium', expiry_date: '', status: 'pending', compensating_controls: '' };
    this.showDialog = true;
  }

  openEditDialog(item: GrcRecord): void {
    this.editMode = true; this.editingId = item.exception_id ?? item.id;
    this.form = {
      title: item.title ?? item.name,
      description: item.description ?? '',
      control_id: item.control_id ?? '',
      risk_level: item.risk_level ?? 'medium',
      expiry_date: item.expiry_date ?? '',
      status: item.status ?? 'pending',
      compensating_controls: item.compensating_controls ?? '',
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.title) return;
    const obs = this.editMode && this.editingId
      ? this.complianceSvc.updateException(this.editingId, this.form)
      : this.complianceSvc.createException(this.form as any);
    obs.subscribe({
      next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.editMode ? this.i18n.translate('common.updated') : this.i18n.translate('common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 }); }
    });
  }

  approveException(item: GrcRecord): void {
    const id = item.exception_id ?? item.id;
    this.apiclientSvc.put(`/exceptions/${id}`, { status: 'approved' }).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.approved'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.approvalFailed'), life: 4000 }); },
    });
  }

  rejectException(item: GrcRecord): void {
    this.rejectTarget = item;
    this.rejectReason = '';
    this.showRejectDialog = true;
  }

  confirmReject(): void {
    if (!this.rejectTarget || !this.rejectReason) return;
    const id = this.rejectTarget.exception_id ?? this.rejectTarget.id;
    this.apiclientSvc.put(`/exceptions/${id}`, { status: 'rejected', reject_reason: this.rejectReason }).subscribe({
      next: () => { this.showRejectDialog = false; this.rejectTarget = null; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.rejected'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.rejectionFailed'), life: 4000 }); },
    });
  }

  confirmDelete(item: GrcRecord): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.exception_id ?? this.deleteTarget.id;
    this.complianceSvc.deleteException(id).subscribe({
      next: () => { this.showDeleteDialog = false; this.deleteTarget = null; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.recordRemoved'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 }); }
    });
  }

  openDetail(item: GrcRecord): void {
    this.selectedItem = item;
    this.renewalHistory = item.renewal_history || item.renewalHistory || [];
    this.drawerVisible = true;
  }

  openRenewDialog(item: GrcRecord): void {
    this.renewTarget = item;
    this.renewExpiry = '';
    this.showRenewDialog = true;
  }

  confirmRenew(): void {
    if (!this.renewTarget || !this.renewExpiry) return;
    const id = this.renewTarget.exception_id ?? this.renewTarget.id;
    this.apiclientSvc.put(`/exceptions/${id}`, { status: 'approved', expiry_date: this.renewExpiry }).subscribe({
      next: () => { this.showRenewDialog = false; this.renewTarget = null; this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.renewed'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.renewFailed'), life: 4000 }); },
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'exceptions.csv'; a.click();
    this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('exceptions.exported') || 'Export downloaded', life: 3000 });
  }

}
