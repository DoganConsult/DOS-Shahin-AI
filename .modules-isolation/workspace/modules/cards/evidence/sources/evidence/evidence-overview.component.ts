import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleKickstartService } from '@app/modules';
import { EvidenceApiService } from '@app/core/services/api-clients/grc-domain/evidence-api.service';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { HealthStripComponent } from '@app/shared/components/status-indicators/health-strip.component';
import { RecentActivityTableComponent } from '@app/shared/components/messaging/recent-activity-table.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { FoundationDataService } from '@app/grc';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { KpiCardVM, HealthAlertVM, ActivityRowVM, ModuleTabVM } from '@app/shared/models/module-overview.vm';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

// ── Status Lifecycle ──────────────────────────────────────────────────────────
const EVIDENCE_TRANSITIONS: Record<string, string[]> = {
  pending: ['collected', 'expired'],
  collected: ['under_review', 'expired'],
  under_review: ['approved', 'rejected'],
  approved: ['expired'],
  rejected: ['collected'],
  expired: ['collected'],
};

interface UserOption { label: string; value: string; email?: string; department?: string }
interface TeamOption { label: string; value: string }
interface StatusHistoryEntry { fromStatus: string; toStatus: string; actor: string; timestamp: string; reason?: string }
interface OwnerProfile { name: string; email: string; team?: string; department?: string; businessUnit?: string }

interface EvidenceStats {
  totalEvidence: number;
  expiringSoon: number;
  expired: number;
  pendingReviews: number;
  overdueRequests: number;
  riskLinkedCount: number;
  taskStats: Record<string, number>;
  statusBreakdown: Record<string, number>;
  frameworkBreakdown: Array<{ framework_code: string; count: number }>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-evidence-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, KpiCardGridComponent, HealthStripComponent,
    RecentActivityTableComponent, EmptyStateComponent, ModuleTabsBarComponent,
    SkeletonModule, ToastModule, DropdownModule,
  ],
  providers: [MessageService],
  template: `
    <div class="ev-ov-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Evidence Overview"
        titleAr="نظرة عامة على الأدلة"
        subtitleEn="Evidence vault, requests, reviews, expiry and task status at a glance"
        subtitleAr="خزينة الأدلة والطلبات والمراجعات والانتهاء وحالة المهام في لمحة"
        icon="folder-open"
        [breadcrumbs]="[i18n.translate('evidenceOverview.dashboard'), i18n.translate('evidenceOverview.evidence'), i18n.translate('evidenceOverview.overview')]"
        [actions]="headerActions()"
        [isAr]="isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />

      <!-- Foundation Filter Bar -->
      <div class="ev-filter-bar" [attr.dir]="dir()">
        <p-dropdown [options]="departments()" [(ngModel)]="filterDept" optionLabel="label" optionValue="value"
          [placeholder]="isAr() ? 'القسم' : 'Department'" [showClear]="true" (onChange)="loadData()" styleClass="ev-filter" />
        <p-dropdown [options]="businessUnits()" [(ngModel)]="filterBU" optionLabel="label" optionValue="value"
          [placeholder]="isAr() ? 'وحدة الأعمال' : 'Business Unit'" [showClear]="true" (onChange)="loadData()" styleClass="ev-filter" />
        <p-dropdown [options]="locations()" [(ngModel)]="filterLoc" optionLabel="label" optionValue="value"
          [placeholder]="isAr() ? 'الموقع' : 'Location'" [showClear]="true" (onChange)="loadData()" styleClass="ev-filter" />
        <p-dropdown [options]="roles()" [(ngModel)]="filterRole" optionLabel="label" optionValue="value"
          [placeholder]="isAr() ? 'الدور' : 'Role'" [showClear]="true" (onChange)="loadData()" styleClass="ev-filter" />
      </div>

      <div class="ev-ov-body">

        @if (loading()) {
          <div class="skeleton-kpi">
            @for (i of [1,2,3,4,5,6]; track i) {
              <p-skeleton height="76px" borderRadius="10px" />
            }
          </div>
          <p-skeleton height="110px" borderRadius="10px" styleClass="mb-3" />
        }

        @if (!loading() && error()) {
          <app-empty-state
            variant="error"
            [title]="i18n.translate('evidenceOverview.failedToLoadData')"
            [description]="i18n.translate('evidenceOverview.checkYourConnectionAndTryAgain')"
            [actionLabel]="i18n.translate('evidenceOverview.retry')"
            [dir]="dir()"
            (action)="loadData()" />
        }

        @if (!loading() && !error()) {
          <app-kpi-card-grid
            [cards]="kpis()"
            [isAr]="isAr()"
            (cardClick)="onKpiClick($event)" />

          <app-health-strip
            [alerts]="healthAlerts()"
            [isAr]="isAr()"
            (alertClick)="onAlertClick($event)" />

          @if (stats()?.totalEvidence === 0) {
            <app-empty-state
              variant="default"
              [title]="i18n.translate('evidenceOverview.noEvidenceYet')"
              [description]="i18n.translate('gettingStarted.addEvidence')"
              [actionLabel]="i18n.translate('evidenceOverview.uploadEvidence')"
              [dir]="dir()"
              (action)="navigate('/evidence/vault')" />
          }

          <app-recent-activity-table
            [rows]="activityRows()"
            titleEn="Recent Evidence Activity"
            titleAr="نشاط الأدلة الأخير"
            viewAllRoute="/evidence/vault"
            [isAr]="isAr()"
            (rowClick)="onActivityRowClick($event)" />
        }
      </div>

      <!-- Detail Drawer -->
      @if (selectedEvidence()) {
        <div tabindex="0" role="button" (keyup.enter)="closeDetail()" class="drawer-overlay" (click)="closeDetail()"></div>
        <aside class="detail-drawer" [dir]="dir()">
          <div class="drawer-header">
            <h3>{{ isAr() ? 'تفاصيل الدليل' : 'Evidence Detail' }}</h3>
            <button aria-label="Close" class="close-btn" (click)="closeDetail()"><i class="pi pi-times"></i></button>
          </div>
          <div class="drawer-body">
            <div class="detail-section">
              <label>{{ isAr() ? 'العنوان' : 'Title' }}</label>
              <p>{{ selectedEvidence()!.title || selectedEvidence()!.entity_name || '\u2014' }}</p>
            </div>
            @if (selectedEvidence()!.description) {
              <div class="detail-section">
                <label>{{ isAr() ? 'الوصف' : 'Description' }}</label>
                <p>{{ selectedEvidence()!.description }}</p>
              </div>
            }
            <div class="detail-row">
              <div class="detail-section half">
                <label>{{ isAr() ? 'النوع' : 'Type' }}</label>
                <p>{{ selectedEvidence()!.evidence_type_code || selectedEvidence()!.type || '\u2014' }}</p>
              </div>
              <div class="detail-section half">
                <label>{{ isAr() ? 'الحالة' : 'Status' }}</label>
                <span class="status-badge" [attr.data-status]="selectedEvidence()!.status">{{ formatStatus(selectedEvidence()!.status) }}</span>
              </div>
            </div>

            <!-- Owner Dropdown (PrimeNG) -->
            <div class="detail-section">
              <label><i class="pi pi-user"></i> {{ isAr() ? 'المالك' : 'Owner' }}</label>
              <p-dropdown
                [options]="userOptions()"
                [(ngModel)]="selectedOwnerId"
                [filter]="true"
                filterBy="label"
                [showClear]="true"
                [placeholder]="isAr() ? 'اختيار المالك...' : 'Select owner...'"
                styleClass="w-full"
                (onChange)="onOwnerChange($event.value)">
              </p-dropdown>
            </div>

            <!-- Team Dropdown (PrimeNG) -->
            <div class="detail-section">
              <label><i class="pi pi-users"></i> {{ isAr() ? 'الفريق' : 'Team' }}</label>
              <p-dropdown
                [options]="teamOptions()"
                [(ngModel)]="selectedTeamId"
                [filter]="true"
                filterBy="label"
                [showClear]="true"
                [placeholder]="isAr() ? 'اختيار الفريق...' : 'Select team...'"
                styleClass="w-full"
                (onChange)="onTeamChange($event.value)">
              </p-dropdown>
            </div>

            <!-- Ownership Context -->
            @if (ownerProfile()) {
              <div class="detail-section owner-context">
                <label>{{ isAr() ? 'بيانات المالك' : 'Owner Details' }}</label>
                <div class="owner-card">
                  <div class="owner-row"><i class="pi pi-user"></i><span>{{ ownerProfile()!.name }}</span></div>
                  <div class="owner-row"><i class="pi pi-envelope"></i><span>{{ ownerProfile()!.email }}</span></div>
                  @if (ownerProfile()!.team) {
                    <div class="owner-row"><i class="pi pi-users"></i><span>{{ ownerProfile()!.team }}</span></div>
                  }
                  @if (ownerProfile()!.department) {
                    <div class="owner-row"><i class="pi pi-building"></i><span>{{ ownerProfile()!.department }}</span></div>
                  }
                  @if (ownerProfile()!.businessUnit) {
                    <div class="owner-row"><i class="pi pi-sitemap"></i><span>{{ ownerProfile()!.businessUnit }}</span></div>
                  }
                </div>
              </div>
            }

            <!-- Status Lifecycle Dropdown -->
            @if (availableTransitions().length > 0) {
              <div class="detail-section">
                <label><i class="pi pi-arrows-h"></i> {{ isAr() ? 'تغيير الحالة' : 'Change Status' }}</label>
                <p-dropdown
                  [options]="availableTransitions()"
                  [(ngModel)]="pendingStatusChange"
                  [placeholder]="isAr() ? 'الانتقال إلى...' : 'Transition to...'"
                  styleClass="w-full"
                  (onChange)="onStatusTransition($event.value)">
                </p-dropdown>
              </div>
            }

            <!-- Status Timeline -->
            @if (statusHistory().length > 0) {
              <div class="detail-section">
                <label><i class="pi pi-clock"></i> {{ isAr() ? 'سجل الحالة' : 'Status History' }}</label>
                <div class="status-timeline">
                  @for (entry of statusHistory(); track $index) {
                    <div class="timeline-entry">
                      <div class="timeline-dot"></div>
                      <div class="timeline-content">
                        <div class="timeline-statuses">
                          <span class="status-badge" [attr.data-status]="entry.fromStatus">{{ formatStatus(entry.fromStatus) }}</span>
                          <i class="pi pi-arrow-right timeline-arrow"></i>
                          <span class="status-badge" [attr.data-status]="entry.toStatus">{{ formatStatus(entry.toStatus) }}</span>
                        </div>
                        <div class="timeline-meta">{{ entry.actor }} &middot; {{ entry.timestamp | date:'medium' }}</div>
                        @if (entry.reason) {
                          <div class="timeline-reason">{{ entry.reason }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="drawer-actions">
              <button class="action-btn primary" (click)="navigate('/evidence/vault')">
                <i class="pi pi-folder-open"></i> {{ isAr() ? 'خزينة الأدلة' : 'Evidence Vault' }}
              </button>
              <button class="action-btn secondary" (click)="closeDetail()">
                <i class="pi pi-times"></i> {{ isAr() ? 'إغلاق' : 'Close' }}
              </button>
            </div>
          </div>
        </aside>
      }

      <p-toast />
    </div>
  `,
  styles: [`
    .ev-ov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .ev-ov-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
    .skeleton-kpi { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px,1fr)); gap: 12px; }
    .ev-filter-bar { display: flex; gap: 10px; padding: 12px 24px; flex-wrap: wrap; background: var(--surface-card); border-bottom: 1px solid var(--surface-border); }
    :host .ev-filter { min-width: 160px; }

    /* Drawer */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), .3); z-index: var(--z-modal-backdrop, 1040); }
    .detail-drawer { position: fixed; top: 0; right: 0; width: 560px; max-width: 90vw; height: 100vh; background: var(--surface-card, #fff); z-index: var(--z-modal, 1050); box-shadow: -4px 0 20px rgba(var(--color-black-rgb), .15); overflow-y: auto; }
    [dir="rtl"] .detail-drawer { right: auto; left: 0; box-shadow: 4px 0 20px rgba(var(--color-black-rgb), .15); }
    .drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--surface-border); }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-md, 16px); font-weight: 600; }
    .close-btn { background: none; border: none; cursor: pointer; font-size: var(--font-size-lg, 18px); color: var(--text-color-secondary); }
    .drawer-body { padding: 20px; }
    .detail-section { margin-bottom: 16px; }
    .detail-section.half { flex: 1; }
    .detail-row { display: flex; gap: 16px; }
    .detail-section label { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs, 11px); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); margin-bottom: 4px; }
    .detail-section label i { font-size: var(--font-size-xs, 11px); }
    .detail-section p { margin: 0; font-size: var(--font-size-base, 14px); line-height: 1.5; }
    .w-full { width: 100%; }

    /* Status badges */
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md, 6px); font-size: var(--font-size-xs, 11px); font-weight: 600; text-transform: capitalize; }
    .status-badge[data-status="pending"] { background: #fef9c3; color: #a16207; }
    .status-badge[data-status="collected"] { background: #dbeafe; color: #1d4ed8; }
    .status-badge[data-status="under_review"] { background: #fef3c7; color: #d97706; }
    .status-badge[data-status="approved"] { background: #dcfce7; color: #15803d; }
    .status-badge[data-status="rejected"] { background: #fee2e2; color: #b91c1c; }
    .status-badge[data-status="expired"] { background: var(--surface-200, #e5e7eb); color: var(--text-color-secondary, #6b7280); }

    /* Owner context card */
    .owner-card { background: var(--surface-50, #f9fafb); border-radius: var(--radius-sm, 4px); padding: 10px 14px; }
    .owner-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: var(--font-size-sm, 13px); }
    .owner-row i { color: var(--text-color-secondary); width: 16px; text-align: center; font-size: var(--font-size-xs, 11px); }

    /* Status timeline */
    .status-timeline { position: relative; padding-left: 20px; }
    .timeline-entry { position: relative; padding-bottom: 14px; }
    .timeline-entry:not(:last-child)::before { content: ''; position: absolute; left: -14px; top: 12px; bottom: 0; width: 2px; background: var(--surface-300, #d1d5db); }
    .timeline-dot { position: absolute; left: -18px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-500, var(--primary, #3b82f6)); border: 2px solid var(--surface-card, #fff); }
    .timeline-content { font-size: var(--font-size-sm, 13px); }
    .timeline-statuses { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .timeline-arrow { font-size: var(--font-size-nano); color: var(--text-color-secondary); }
    .timeline-meta { color: var(--text-color-secondary); font-size: var(--font-size-xs, 11px); margin-top: 2px; }
    .timeline-reason { color: var(--text-color-secondary); font-size: var(--font-size-xs, 11px); font-style: italic; margin-top: 2px; }

    /* Drawer actions */
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--surface-border); }
    .action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius-sm, 4px); font-size: var(--font-size-sm, 13px); font-weight: 600; cursor: pointer; }
    .action-btn.primary { background: var(--primary-500, var(--primary, #3b82f6)); color: #fff; }
    .action-btn.primary:hover { background: var(--primary-600, #2563eb); }
    .action-btn.secondary { background: var(--surface-200, #e5e7eb); color: var(--text-color); }
    .action-btn.secondary:hover { background: var(--surface-300, #d1d5db); }
  `]
})
export class EvidenceOverviewComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  readonly i18n  = inject(I18nService);
  private live   = inject(GrcLiveService);
  private router = inject(Router);
  private kickstartSvc = inject(ModuleKickstartService);
  private foundationData = inject(FoundationDataService);
  private evidenceApi = inject(EvidenceApiService);
  private msg = inject(MessageService);

  loading  = signal(true);
  error    = signal(false);
  isAr     = computed(() => this.i18n.currentLang() === 'ar');
  dir      = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  // Detail drawer data
  selectedEvidence = signal<GrcRecord | null>(null);
  userOptions = signal<UserOption[]>([]);
  teamOptions = signal<TeamOption[]>([]);
  ownerProfile = signal<OwnerProfile | null>(null);
  statusHistory = signal<StatusHistoryEntry[]>([]);
  availableTransitions = signal<{ label: string; value: string }[]>([]);

  selectedOwnerId: string | null = null;
  selectedTeamId: string | null = null;
  pendingStatusChange: string | null = null;

  // Foundation filters
  filterDept = '';
  filterBU = '';
  filterLoc = '';
  filterRole = '';

  departments = computed(() => this.foundationData.deptOptions());
  businessUnits = computed(() => this.foundationData.deptOptions().map(d => ({ label: d.label, value: d.buId || d.value })));
  locations = computed(() => this.foundationData.locOptions());
  roles = computed(() => this.foundationData.roleOptions());

  private stats$    = signal<EvidenceStats | null>(null);
  private activity$ = signal<GrcRecord[]>([]);
  private sub?: Subscription;

  stats = computed(() => this.stats$());

  get taskOpen(): number {
    const ts = this.stats$()?.taskStats || {};
    return ts['Open'] || ts['open'] || ts['pending'] || 0;
  }

  readonly tabs: ModuleTabVM[] = [
    { id: 'overview',   labelEn: 'Overview',             labelAr: 'نظرة عامة',         route: '/evidence/overview',             icon: 'home' },
    { id: 'vault',      labelEn: 'Evidence Vault',       labelAr: 'خزينة الأدلة',      route: '/evidence/vault',                icon: 'folder' },
    { id: 'requests',   labelEn: 'Requests',             labelAr: 'الطلبات',             route: '/evidence/requests',             icon: 'inbox' },
    { id: 'reviews',    labelEn: 'Reviews',              labelAr: 'المراجعات',           route: '/evidence/reviews',              icon: 'eye' },
    { id: 'expiry',     labelEn: 'Expiry & Coverage',    labelAr: 'الانتهاء والتغطية',  route: '/evidence/expiry',               icon: 'clock' },
    { id: 'automated',  labelEn: 'Automated Collection', labelAr: 'التجميع التلقائي',   route: '/evidence/automated-collection', icon: 'cog' },
    { id: 'mappings',   labelEn: 'Mappings',             labelAr: 'الربط',               route: '/evidence/mappings',             icon: 'share-alt' },
    { id: 'catalog',    labelEn: 'Catalog',              labelAr: 'الفهرس',              route: '/evidence/catalog',              icon: 'book' },
    { id: 'tasks',      labelEn: 'Tasks',                labelAr: 'المهام',              route: '/evidence/tasks',                icon: 'list-check' },
  ];

  private fireStatus = signal<string>('pending');

  private _baseActions: PageHeaderAction[] = [
    { id: 'upload', labelEn: 'Upload Evidence', labelAr: 'رفع دليل',  icon: 'upload', primary: true },
    { id: 'request', labelEn: 'New Request',   labelAr: 'طلب جديد',   icon: 'inbox' },
  ];

  headerActions = computed<PageHeaderAction[]>(() => {
    const s = this.fireStatus();
    if (s === 'completed') return [...this._baseActions, { id: 'kickstart-info', labelEn: 'Module Active ✓', labelAr: 'الوحدة نشطة ✓', icon: 'check-circle', chip: true }];
    const label = s === 'in_progress' ? 'Kickstarting…' : s === 'failed' ? 'Retry Kickstart' : 'Kickstart Evidence';
    const labelAr = s === 'in_progress' ? 'جارٍ التشغيل…' : s === 'failed' ? 'إعادة التشغيل' : 'تشغيل الأدلة';
    return [...this._baseActions, { id: 'kickstart', labelEn: label, labelAr, icon: 'bolt', primary: s === 'pending' }];
  });

  kpis = computed<KpiCardVM[]>(() => {
    const s = this.stats$();
    if (!s) return [];
    return [
      { id: 'total',    labelEn: 'Total Evidence',    labelAr: 'إجمالي الأدلة',       value: s.totalEvidence,    icon: 'folder-open',          color: '#1d4ed8', bg: '#dbeafe', route: '/evidence/vault' },
      { id: 'reviews',  labelEn: 'Pending Reviews',   labelAr: 'مراجعات معلقة',        value: s.pendingReviews,   icon: 'eye',                  color: '#d97706', bg: 'var(--status-warning-bg, #fcf4d6)', route: '/evidence/reviews', queryParams: { status: 'pending' } as Record<string,string>, severity: s.pendingReviews > 0 ? 'warning' : 'default' },
      { id: 'overdue',  labelEn: 'Overdue Requests',  labelAr: 'طلبات متأخرة',         value: s.overdueRequests,  icon: 'clock',                color: 'var(--error)', bg: '#fee2e2', route: '/evidence/requests', queryParams: { overdue: '1' } as Record<string,string>,       severity: s.overdueRequests > 0 ? 'danger' : 'default' },
      { id: 'expiring', labelEn: 'Expiring Soon',     labelAr: 'تنتهي قريباً',         value: s.expiringSoon,     icon: 'exclamation-triangle', color: '#ca8a04', bg: '#fef9c3', route: '/evidence/expiry',   queryParams: { expiringSoon: '1' } as Record<string,string>, severity: s.expiringSoon > 0 ? 'warning' : 'default' },
      { id: 'expired',  labelEn: 'Expired',           labelAr: 'منتهية الصلاحية',      value: s.expired,          icon: 'times-circle',         color: '#b91c1c', bg: 'var(--status-danger-bg, #fff1f1)', route: '/evidence/expiry',   queryParams: { expired: '1' } as Record<string,string>,      severity: s.expired > 0 ? 'danger' : 'default' },
      { id: 'tasks',    labelEn: 'Open Tasks',        labelAr: 'مهام مفتوحة',           value: this.taskOpen,      icon: 'check-square',         color: '#059669', bg: '#d1fae5', route: '/evidence/tasks' },
      { id: 'risks',    labelEn: 'Risk-Linked',       labelAr: 'مرتبطة بالمخاطر',       value: s.riskLinkedCount || 0, icon: 'shield',           color: '#7c3aed', bg: '#ede9fe', route: '/evidence/vault', queryParams: {} as Record<string,string> },
    ];
  });

  healthAlerts = computed<HealthAlertVM[]>(() =>
    this.kpis()
      .filter(k => (k.severity === 'danger' || k.severity === 'warning') && (k.value as number) > 0)
      .map(k => ({
        id: k.id, labelEn: k.labelEn, labelAr: k.labelAr,
        count: k.value as number, icon: k.icon, color: k.color,
        severity: k.severity as 'danger' | 'warning',
        route: k.route, queryParams: k.queryParams,
      }))
  );

  activityRows = computed<ActivityRowVM[]>(() =>
    (this.activity$() || []).slice(0, 8).map((r) => ({
      id:          r.id || String(Math.random()),
      timestamp:   r.timestamp || r.created_at || new Date().toISOString(),
      actorLabel:  r.actor_email || r.user_id || '—',
      action:      r.action || r.event_type || '—',
      entityType:  r.entity_type || 'Evidence',
      entityLabel: r.entity_name || r.resource_id,
    }))
  );

  ngOnInit(): void {
    this.loadFoundationOptions();
    this.loadLookups();
    this.loadData();
    this.sub = this.live.evidence$.subscribe(() => this.loadData());
    this.kickstartSvc.loadStatus().subscribe(s => {
      this.fireStatus.set(s['evidence']?.status ?? 'pending');
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private loadFoundationOptions(): void {
    this.foundationData.load();
  }

  private buildFilterParams(): Record<string, string> {
    const p: Record<string, string> = {};
    if (this.filterDept) p['department_id'] = this.filterDept;
    if (this.filterBU) p['business_unit_id'] = this.filterBU;
    if (this.filterLoc) p['location_id'] = this.filterLoc;
    if (this.filterRole) p['owner_role_id'] = this.filterRole;
    return p;
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    const params = this.buildFilterParams();
    const qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    const url = '/evidence/overview/stats' + (qs ? `?${qs}` : '');

    this.apiclientSvc.get(url).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (data) => {
        if (data) {
          this.stats$.set(data);
          this.activity$.set(data.recentActivity || []);
        } else {
          this.error.set(true);
        }
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  onKpiClick(card: KpiCardVM): void {
    this.router.navigate([card.route], { queryParams: card.queryParams });
  }

  onAlertClick(alert: HealthAlertVM): void {
    this.router.navigate([alert.route], { queryParams: alert.queryParams });
  }

  onHeaderAction(id: string): void {
    if (id === 'kickstart') {
      const s = this.fireStatus();
      if (s === 'in_progress' || s === 'completed') return;
      this.fireStatus.set('in_progress');
      this.kickstartSvc.kickstart('evidence').subscribe({
        next: (r) => { this.fireStatus.set(r.status); this.loadData(); },
        error: () => this.fireStatus.set('failed'),
      });
      return;
    }
    const routes: Record<string, string> = {
      'upload':  '/evidence/vault',
      'request': '/evidence/requests',
    };
    if (routes[id]) this.router.navigate([routes[id]]);
  }

  navigate(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  // ── Detail Drawer ──────────────────────────────────────────────────────────

  private loadLookups(): void {
    this.evidenceApi.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(users => {
      this.userOptions.set(
        (Array.isArray(users) ? users : []).map((u) => ({
          label: `${u.full_name || u.name || u.email} (${u.email || ''})${u.department_name ? ' \u2014 ' + u.department_name : ''}`,
          value: u.user_id || u.id,
          email: u.email,
          department: u.department_name,
        }))
      );
    });
    this.evidenceApi.getFoundationTeams().pipe(catchError(() => of([]))).subscribe(teams => {
      this.teamOptions.set(
        (Array.isArray(teams) ? teams : []).map((t) => ({
          label: `${t.team_name || t.name} (${t.team_code || t.code || ''})`,
          value: t.team_id || t.id,
        }))
      );
    });
  }

  onActivityRowClick(row: GrcRecord): void {
    const evidenceId = row?.id || row?.resource_id || row?.entity_id;
    if (!evidenceId) return;
    this.openDetail({ id: evidenceId });
  }

  openDetail(evidence: GrcRecord): void {
    const id = evidence.id || evidence.evidence_id;
    if (!id) return;

    // Set basic data immediately
    this.selectedEvidence.set(evidence);
    this.selectedOwnerId = evidence.owner_id || evidence.ownerId || null;
    this.selectedTeamId = evidence.team_id || evidence.teamId || null;
    this.pendingStatusChange = null;

    // Compute available transitions
    const currentStatus = evidence.status || 'pending';
    const transitions = EVIDENCE_TRANSITIONS[currentStatus] || [];
    this.availableTransitions.set(
      transitions.map((s: string) => ({ label: this.formatStatus(s), value: s }))
    );

    // Load owner profile
    this.ownerProfile.set(null);
    const ownerId = evidence.owner_id || evidence.ownerId;
    if (ownerId) {
      this.evidenceApi.getFoundationUserDetail(ownerId).pipe(catchError(() => of(null))).subscribe(u => {
        if (u) {
          this.ownerProfile.set({
            name: u.full_name || u.name || u.email,
            email: u.email,
            team: u.team_name,
            department: u.department_name,
            businessUnit: u.business_unit_name,
          });
        }
      });
    }

    // Load status history
    this.statusHistory.set([]);
    this.evidenceApi.getEvidenceHistory(id).pipe(catchError(() => of([]))).subscribe(history => {
      this.statusHistory.set(
        (Array.isArray(history) ? history : []).map((h) => ({
          fromStatus: h.from_status || h.fromStatus || '',
          toStatus: h.to_status || h.toStatus || '',
          actor: h.actor_name || h.actor || h.changed_by || 'System',
          timestamp: h.changed_at || h.timestamp || h.created_at,
          reason: h.reason || h.notes || '',
        }))
      );
    });

    // Also try to fetch full evidence detail
    this.evidenceApi.getStatusHistory(id).pipe(catchError(() => of(null))).subscribe();
  }

  closeDetail(): void {
    this.selectedEvidence.set(null);
    this.ownerProfile.set(null);
    this.statusHistory.set([]);
    this.availableTransitions.set([]);
  }

  onOwnerChange(userId: string | null): void {
    const ev = this.selectedEvidence();
    if (!ev || !userId) return;
    const id = ev.id || ev.evidence_id;
    this.evidenceApi.updateEvidence(id, { owner_id: userId }).pipe(catchError(() => of(null))).subscribe(res => {
      if (res) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.ownerUpdated'), life: 3000 });
        this.openDetail({ ...ev, owner_id: userId });
        this.loadData();
      }
    });
  }

  onTeamChange(teamId: string | null): void {
    const ev = this.selectedEvidence();
    if (!ev || !teamId) return;
    const id = ev.id || ev.evidence_id;
    this.evidenceApi.updateEvidence(id, { team_id: teamId }).pipe(catchError(() => of(null))).subscribe(res => {
      if (res) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.teamUpdated'), life: 3000 });
        this.openDetail({ ...ev, team_id: teamId });
        this.loadData();
      }
    });
  }

  onStatusTransition(newStatus: string | null): void {
    if (!newStatus) return;
    const ev = this.selectedEvidence();
    if (!ev) return;
    const id = ev.id || ev.evidence_id;
    this.evidenceApi.transitionStatus(id, newStatus).pipe(catchError(() => of(null))).subscribe(res => {
      if (res) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.statusChangedTo', { status: this.formatStatus(newStatus) }), life: 3000 });
        this.pendingStatusChange = null;
        this.openDetail({ ...ev, status: newStatus });
        this.loadData();
      }
    });
  }

  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }
}
