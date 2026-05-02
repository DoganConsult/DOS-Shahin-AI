import { Component, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import {
  PaymentService, AdminSubscriptionOverview, TierLevel, SubscriptionAuditEntry
} from '@app/core/services/user-account/payment.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { SubscriptionAuditTimelineComponent } from '@app/shared/components/messaging/subscription-audit-timeline.component';
import { devError } from '../../../core/utils/dev-logger';
import { AppDatePipe } from '@app/shared/pipes';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-subscription-admin',
    imports: [
        CommonModule, FormsModule, PageShellComponent,
        CardModule, ButtonModule, TagModule, TableModule,
        DropdownModule, DialogModule, InputTextModule,
        InputNumberModule, InputTextarea, ToastModule,
        SubscriptionAuditTimelineComponent, AppDatePipe, TooltipModule
    ],
    providers: [MessageService, DatePipe],
    template: `
    <app-page-shell icon="pi pi-cog" title="Subscription Administration"
      subtitle="Manage all tenant subscriptions"
      [breadcrumbs]="['Admin', 'Subscriptions']" [loading]="loading()">

      <p-toast />

      <!-- Status Counts -->
      @if (overview()) {
        <div class="grid mb-4">
          @for (c of countCards; track c.key) {
            <div class="col-6 md:col-3 lg:col">
              <p-card styleClass="text-center cursor-pointer"
                [style]="statusFilter === c.key ? {'border': '2px solid var(--primary-color)'} : {}"
                (click)="filterByStatus(c.key)">
                <div class="text-3xl font-bold" [style.color]="c.color">{{ getCount(c.key) }}</div>
                <div class="text-sm text-color-secondary mt-1">{{ c.label }}</div>
              </p-card>
            </div>
          }
        </div>
      }

      <!-- Filters -->
      <div class="flex gap-3 mb-3 flex-wrap">
        <p-dropdown [options]="statusOptions" [(ngModel)]="statusFilter"
          placeholder="Filter by Status" [showClear]="true" (onChange)="loadOverview()" />
        <p-dropdown [options]="tierOptions" [(ngModel)]="tierFilter"
          placeholder="Filter by Tier" [showClear]="true" (onChange)="loadOverview()" />
      </div>

      <!-- Tenants Table -->
      @if (overview()?.tenants?.length) {
        <p-table aria-label="Data table" [value]="overview()!.tenants" [rows]="15" [paginator]="true"
          [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped"
          [globalFilterFields]="['tenant_id', 'status', 'tier']">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="tenant_id">Tenant <p-sortIcon field="tenant_id" /></th>
              <th pSortableColumn="tier">Tier <p-sortIcon field="tier" /></th>
              <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
              <th>Mode</th>
              <th>Renewal</th>
              <th pSortableColumn="current_period_end">Period End <p-sortIcon field="current_period_end" /></th>
              <th>Auto-Renew</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-t>
            <tr>
              <td class="text-xs font-mono">{{ t.tenant_id | slice:0:12 }}...</td>
              <td><p-tag [value]="t.tier | titlecase" [severity]="t.tier === 'continuous' ? 'success' : t.tier === 'scale' ? 'info' : 'warning'" /></td>
              <td><p-tag [value]="formatStatus(t.status)" [severity]="getStatusSeverity(t.status)" /></td>
              <td>{{ t.subscription_mode || '-' }}</td>
              <td>{{ t.renewal_mode }}</td>
              <td>{{ t.current_period_end ? (t.current_period_end | appDate:'short') : '-' }}</td>
              <td>
                <i class="pi" [ngClass]="t.auto_renew ? 'pi-check text-green-500' : 'pi-times text-red-500'" ></i>
              </td>
              <td>
                <div class="flex gap-1">
                  <p-button icon="pi pi-eye" size="small" [text]="true" severity="info"
                    pTooltip="View Details" (onClick)="viewTenant(t.tenant_id)" />
                  <p-button icon="pi pi-calendar-plus" size="small" [text]="true" severity="success"
                    pTooltip="Extend" (onClick)="openExtendDialog(t.tenant_id)" />
                  <p-button icon="pi pi-pencil" size="small" [text]="true" severity="warning"
                    pTooltip="Override" (onClick)="openOverrideDialog(t.tenant_id, t.status, t.tier)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="text-center text-color-secondary py-4">No tenants found</td></tr>
          </ng-template>
        </p-table>
      }

      <!-- Detail Dialog -->
      <p-dialog header="Tenant Subscription Details" [(visible)]="detailDialogVisible" [modal]="true" [style]="{width: '600px'}">
        @if (detailAuditLog().length > 0) {
          <app-subscription-audit-timeline [entries]="detailAuditLog()" title="Audit Log" />
        } @else {
          <p class="text-color-secondary text-center py-3">Loading...</p>
        }
      </p-dialog>

      <!-- Extend Dialog -->
      <p-dialog header="Extend Subscription" [(visible)]="extendDialogVisible" [modal]="true" [style]="{width: '400px'}">
        <div class="flex flex-column gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Extension Days</label>
            <p-inputNumber [(ngModel)]="extendDays" [min]="1" [max]="365" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Reason</label>
            <textarea pInputTextarea [(ngModel)]="extendReason" rows="3" class="w-full"></textarea>
          </div>
          <p-button label="Apply Extension" icon="pi pi-check" (onClick)="applyExtension()" [loading]="actionLoading()" />
        </div>
      </p-dialog>

      <!-- Override Dialog -->
      <p-dialog header="Override Subscription" [(visible)]="overrideDialogVisible" [modal]="true" [style]="{width: '400px'}">
        <div class="flex flex-column gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Override Status</label>
            <p-dropdown [options]="allStatusOptions" [(ngModel)]="overrideStatus" placeholder="Select status" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Override Tier</label>
            <p-dropdown [options]="tierOptions" [(ngModel)]="overrideTier" placeholder="Select tier" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Reason</label>
            <textarea pInputTextarea [(ngModel)]="overrideReason" rows="3" class="w-full"></textarea>
          </div>
          <div class="flex gap-2">
            <p-button label="Override Status" icon="pi pi-refresh" severity="warning"
              (onClick)="applyStatusOverride()" [loading]="actionLoading()" [disabled]="!overrideStatus" />
            <p-button label="Override Tier" icon="pi pi-arrow-up" severity="info"
              (onClick)="applyTierOverride()" [loading]="actionLoading()" [disabled]="!overrideTier" />
          </div>
        </div>
      </p-dialog>
    </app-page-shell>
  `
})
export class SubscriptionAdminComponent implements OnInit {
  loading = signal(true);
  actionLoading = signal(false);
  overview = signal<AdminSubscriptionOverview | null>(null);
  detailAuditLog = signal<SubscriptionAuditEntry[]>([]);

  statusFilter: string | null = null;
  tierFilter: string | null = null;

  detailDialogVisible = false;
  extendDialogVisible = false;
  overrideDialogVisible = false;

  selectedTenantId = '';
  extendDays = 7;
  extendReason = '';
  overrideStatus: string | null = null;
  overrideTier: string | null = null;
  overrideReason = '';

  countCards = [
    { key: 'total', label: 'Total', color: 'var(--text-color)' },
    { key: 'active', label: 'Active', color: 'var(--green-500)' },
    { key: 'trialing', label: 'Trialing', color: 'var(--blue-500)' },
    { key: 'past_due', label: 'Past Due', color: 'var(--orange-500)' },
    { key: 'grace', label: 'Grace', color: 'var(--yellow-600)' },
    { key: 'expired', label: 'Expired', color: 'var(--red-500)' },
    { key: 'paused', label: 'Paused', color: 'var(--purple-500)' },
    { key: 'cancelled', label: 'Cancelled', color: 'var(--surface-500)' },
  ];

  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Trialing', value: 'trialing' },
    { label: 'Past Due', value: 'past_due' },
    { label: 'Grace', value: 'grace_period' },
    { label: 'Expired', value: 'expired' },
    { label: 'Paused', value: 'paused' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Suspended', value: 'suspended' },
  ];

  allStatusOptions = [
    { label: 'Preview', value: 'preview' },
    { label: 'Trial Active', value: 'trial_active' },
    { label: 'Active', value: 'active' },
    { label: 'Renewal Due', value: 'renewal_due' },
    { label: 'Past Due', value: 'past_due' },
    { label: 'Grace Period', value: 'grace_period' },
    { label: 'Expired', value: 'expired' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Paused', value: 'paused' },
    { label: 'Suspended', value: 'suspended' },
  ];

  tierOptions = [
    { label: 'Starter', value: 'starter' },
    { label: 'Scale', value: 'scale' },
    { label: 'Continuous', value: 'continuous' },
  ];

  constructor(
    public i18n: I18nService,
    private paymentSvc: PaymentService,
    private msgSvc: MessageService
  ) {}

  ngOnInit() {
    this.loadOverview();
  }

  loadOverview() {
    this.loading.set(true);
    this.paymentSvc.getAdminOverview(this.statusFilter || undefined, this.tierFilter || undefined).subscribe({
      next: (data) => { this.overview.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getCount(key: string): number {
    const counts = this.overview()?.counts;
    if (!counts) return 0;
    return counts[key] || 0;
  }

  filterByStatus(key: string) {
    if (key === 'total') {
      this.statusFilter = null;
    } else {
      this.statusFilter = this.statusFilter === key ? null : key;
    }
    this.loadOverview();
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    if (status === 'active') return 'success';
    if (status === 'trialing' || status === 'trial_active' || status === 'preview') return 'info';
    if (status === 'renewal_due' || status === 'past_due' || status === 'grace_period' || status === 'paused') return 'warning';
    if (status === 'expired' || status === 'cancelled' || status === 'suspended') return 'danger';
    return 'secondary';
  }

  viewTenant(tenantId: string) {
    this.selectedTenantId = tenantId;
    this.detailDialogVisible = true;
    this.detailAuditLog.set([]);
    this.paymentSvc.getAdminTenantAuditLog(tenantId, 30).subscribe({
      next: (res) => this.detailAuditLog.set(res.auditLog),
      error: (e: unknown) => devError("[API]", e)
    });
  }

  openExtendDialog(tenantId: string) {
    this.selectedTenantId = tenantId;
    this.extendDays = 7;
    this.extendReason = '';
    this.extendDialogVisible = true;
  }

  applyExtension() {
    if (!this.extendReason) {
      this.msgSvc.add({ severity: 'warn', summary: this.i18n.translate('common.required'), detail: this.i18n.translate('admin.pleaseProvideReason') });
      return;
    }
    this.actionLoading.set(true);
    this.paymentSvc.adminExtend(this.selectedTenantId, this.extendDays, this.extendReason).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.extendDialogVisible = false;
        this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('admin.extended'), detail: this.i18n.translate('admin.daysAdded', { count: String(this.extendDays) }) });
        this.loadOverview();
      },
      error: (err: unknown) => {
        this.actionLoading.set(false);
        this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: (err as any)?.error?.error || this.i18n.translate('admin.extensionFailed') });
      }
    });
  }

  openOverrideDialog(tenantId: string, currentStatus: string, currentTier: string) {
    this.selectedTenantId = tenantId;
    this.overrideStatus = null;
    this.overrideTier = null;
    this.overrideReason = '';
    this.overrideDialogVisible = true;
  }

  applyStatusOverride() {
    if (!this.overrideStatus) return;
    this.actionLoading.set(true);
    this.paymentSvc.adminOverrideStatus(this.selectedTenantId, this.overrideStatus, this.overrideReason).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.overrideDialogVisible = false;
        this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('admin.overridden'), detail: this.i18n.translate('admin.statusSetTo', { value: this.overrideStatus || '' }) });
        this.loadOverview();
      },
      error: (err: unknown) => {
        this.actionLoading.set(false);
        this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: (err as any)?.error?.error || this.i18n.translate('admin.overrideFailed') });
      }
    });
  }

  applyTierOverride() {
    if (!this.overrideTier) return;
    this.actionLoading.set(true);
    this.paymentSvc.adminOverrideTier(this.selectedTenantId, this.overrideTier, this.overrideReason).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.overrideDialogVisible = false;
        this.msgSvc.add({ severity: 'success', summary: this.i18n.translate('admin.overridden'), detail: this.i18n.translate('admin.tierSetTo', { value: this.overrideTier || '' }) });
        this.loadOverview();
      },
      error: (err: unknown) => {
        this.actionLoading.set(false);
        this.msgSvc.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: (err as any)?.error?.error || this.i18n.translate('admin.overrideFailed') });
      }
    });
  }
}
