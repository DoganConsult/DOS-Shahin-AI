import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleKickstartService } from '@app/modules';
import { EvidenceApiService } from '../../services/evidence-api.service';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { HealthStripComponent } from '@app/shared/components/status-indicators/health-strip.component';
import { RecentActivityTableComponent } from '@app/shared/components/messaging/recent-activity-table.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { FoundationDataService } from '@app/grc';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'carbon-components-angular';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { KpiCardVM, HealthAlertVM, ActivityRowVM, ModuleTabVM } from '@app/shared/models/module-overview.vm';
import { GrcRecord } from '@app/core/models/shared.types';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';
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
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, KpiCardGridComponent, HealthStripComponent,
        RecentActivityTableComponent, EmptyStateComponent, ModuleTabsBarComponent,
        SkeletonModule, ToastModule, DropdownModule,
        ModuleOverviewKitComponent,
    ],
    providers: [MessageService],
    templateUrl: './evidence-overview.component.html',
    styleUrls: ['./evidence-overview.component.scss']
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
      { id: 'total',    labelEn: 'Total Evidence',    labelAr: 'إجمالي الأدلة',       value: s.totalEvidence,    icon: 'folder-open',          color: 'var(--primary)', bg: 'var(--primary-50, color-mix(in srgb, var(--primary) 10%, transparent))', route: '/evidence/vault' },
      { id: 'reviews',  labelEn: 'Pending Reviews',   labelAr: 'مراجعات معلقة',        value: s.pendingReviews,   icon: 'eye',                  color: 'var(--warning)', bg: 'var(--warning-50, color-mix(in srgb, var(--warning) 10%, transparent))', route: '/evidence/reviews', queryParams: { status: 'pending' } as Record<string,string>, severity: s.pendingReviews > 0 ? 'warning' : 'default' },
      { id: 'overdue',  labelEn: 'Overdue Requests',  labelAr: 'طلبات متأخرة',         value: s.overdueRequests,  icon: 'clock',                color: 'var(--error)', bg: 'var(--error-50, color-mix(in srgb, var(--error) 10%, transparent))', route: '/evidence/requests', queryParams: { overdue: '1' } as Record<string,string>,       severity: s.overdueRequests > 0 ? 'danger' : 'default' },
      { id: 'expiring', labelEn: 'Expiring Soon',     labelAr: 'تنتهي قريباً',         value: s.expiringSoon,     icon: 'exclamation-triangle', color: 'var(--warning)', bg: 'var(--warning-50, color-mix(in srgb, var(--warning) 10%, transparent))', route: '/evidence/expiry',   queryParams: { expiringSoon: '1' } as Record<string,string>, severity: s.expiringSoon > 0 ? 'warning' : 'default' },
      { id: 'expired',  labelEn: 'Expired',           labelAr: 'منتهية الصلاحية',      value: s.expired,          icon: 'times-circle',         color: 'var(--error)', bg: 'var(--error-50, color-mix(in srgb, var(--error) 10%, transparent))', route: '/evidence/expiry',   queryParams: { expired: '1' } as Record<string,string>,      severity: s.expired > 0 ? 'danger' : 'default' },
      { id: 'tasks',    labelEn: 'Open Tasks',        labelAr: 'مهام مفتوحة',           value: this.taskOpen,      icon: 'check-square',         color: 'var(--success)', bg: 'var(--success-50, color-mix(in srgb, var(--success) 10%, transparent))', route: '/evidence/tasks' },
      { id: 'risks',    labelEn: 'Risk-Linked',       labelAr: 'مرتبطة بالمخاطر',       value: s.riskLinkedCount || 0, icon: 'shield',           color: 'var(--info)', bg: 'var(--info-50, color-mix(in srgb, var(--info) 10%, transparent))', route: '/evidence/vault', queryParams: {} as Record<string,string> },
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

  readonly evidenceAgents: AgentInfo[] = [
    { id: 'A03', name: 'Evidence Collector', nameAr: 'جامع الأدلة', icon: 'pi-folder-open', color: '#0ea5e9', domain: 'Evidence', domainAr: 'الأدلة', autonomyLevel: 'full', status: 'active' },
  ];

  readonly evidenceTransitions = [
    { from: 'requested', to: 'collecting' },
    { from: 'collecting', to: 'submitted' },
    { from: 'submitted', to: 'reviewing' },
    { from: 'reviewing', to: 'approved', requiresApproval: true },
    { from: 'reviewing', to: 'rejected' },
    { from: 'rejected', to: 'collecting' },
    { from: 'approved', to: 'expired' },
    { from: 'expired', to: 'requested' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'evidence',
    tier: 'full',
    automationLevel: 'full',
    slaHours: 168,
    transitions: this.evidenceTransitions,
    currentStatus: 'collecting',
    agents: this.evidenceAgents,
    lang: this.isAr() ? 'ar' : 'en',
  }));
}
