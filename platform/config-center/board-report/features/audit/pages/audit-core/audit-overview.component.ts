import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { ModuleKickstartService } from '@app/modules';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { HealthStripComponent } from '@app/shared/components/status-indicators/health-strip.component';
import { RecentActivityTableComponent } from '@app/shared/components/messaging/recent-activity-table.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { KpiCardVM, HealthAlertVM, ActivityRowVM } from '@app/shared/models/module-overview.vm';
import { AUDIT_TABS } from '../../audit.constants';
import { GrcRecord } from '@app/core/models/shared.types';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import { EChartComponent } from '@app/shared/charts/echart.component';
import { buildFindingsBarOptions } from '@app/shared/charts/echarts/findings/findings-bar.options';
import { buildGanttTimelineOptions } from '@app/shared/charts/echarts/workflow-timeline/gantt-timeline.options';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-overview',
    imports: [
        CommonModule, RouterLink,
        PageHeaderComponent, KpiCardGridComponent, HealthStripComponent,
        RecentActivityTableComponent, EmptyStateComponent, ModuleTabsBarComponent,
        SkeletonModule, ToastModule,
        ModuleOverviewKitComponent, EChartComponent,
    ],
    providers: [MessageService],
    template: `
    <div class="audit-ov-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Audit Overview"
        titleAr="نظرة عامة على التدقيق"
        subtitleEn="Audit engagements, findings, CAPA and closure rate at a glance"
        subtitleAr="عمليات التدقيق والنتائج والإجراءات التصحيحية ومعدل الإغلاق في لمحة"
        icon="search-check"
        [breadcrumbs]="[i18n.translate('audit.bcDashboard'), i18n.translate('audit.bcAudit'), i18n.translate('audit.bcOverview')]"
        [actions]="headerActions()"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="audit-ov-body">

        @if (loading()) {
          <div class="skeleton-kpi">
            @for (i of [1,2,3,4,5,6]; track i) {
              <p-skeleton height="76px" borderRadius="10px" />
            }
          </div>
          <p-skeleton height="110px" borderRadius="10px" styleClass="mb-3" />
          <p-skeleton height="220px" borderRadius="10px" />
        }

        @if (!loading() && error()) {
          <app-empty-state
            variant="error"
            [title]="i18n.translate('audit.failedToLoadData')"
            [description]="i18n.translate('audit.checkConnectionRetry')"
            [actionLabel]="i18n.translate('audit.retry')"
            [dir]="dir()"
            (action)="load()" />
        }

        @if (!loading() && !error()) {
          <app-kpi-card-grid
            [cards]="kpis()"
            [isAr]="i18n.isAr()"
            (cardClick)="onKpiClick($event)" />

          <app-health-strip
            [alerts]="healthAlerts()"
            [isAr]="i18n.isAr()"
            (alertClick)="onAlertClick($event)" />

          <!-- Findings by Severity (clickable) -->
          @if (data()?.findingsBySeverity) {
            <div class="audit-section-card">
              <div class="audit-section-header">
                <i class="pi pi-search" aria-hidden="true"></i>
                <span>{{ i18n.translate('audit.findingsBySeverity') }}</span>
                <a class="section-view-all" [routerLink]="'/audit/findings'">
                  {{ i18n.translate('audit.viewAll') }}
                  <i class="pi pi-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
              <div class="severity-grid">
                <div tabindex="0" role="button" (keyup.enter)="navigateFindings('critical')" class="sev-card critical" (click)="navigateFindings('critical')">
                  <span class="sev-count">{{ findingsBySeverity()['critical'] || 0 }}</span>
                  <span class="sev-label">{{ i18n.translate('audit.critical') }}</span>
                </div>
                <div tabindex="0" role="button" (keyup.enter)="navigateFindings('high')" class="sev-card high" (click)="navigateFindings('high')">
                  <span class="sev-count">{{ findingsBySeverity()['high'] || 0 }}</span>
                  <span class="sev-label">{{ i18n.translate('audit.high') }}</span>
                </div>
                <div tabindex="0" role="button" (keyup.enter)="navigateFindings('medium')" class="sev-card medium" (click)="navigateFindings('medium')">
                  <span class="sev-count">{{ findingsBySeverity()['medium'] || 0 }}</span>
                  <span class="sev-label">{{ i18n.translate('audit.medium') }}</span>
                </div>
                <div tabindex="0" role="button" (keyup.enter)="navigateFindings('low')" class="sev-card low" (click)="navigateFindings('low')">
                  <span class="sev-count">{{ findingsBySeverity()['low'] || 0 }}</span>
                  <span class="sev-label">{{ i18n.translate('audit.low') }}</span>
                </div>
              </div>
            </div>
          }

          <!-- Cross-Module Summary Strip -->
          <div class="cross-module-strip">
            <div tabindex="0" role="button" (keyup.enter)="navigate('/risk/register')" class="cross-chip" (click)="navigate('/risk/register')">
              <i class="pi pi-shield" aria-hidden="true"></i>
              <span>{{ i18n.isAr() ? 'سجل المخاطر' : 'Risk Register' }}</span>
              <i class="pi pi-arrow-right cross-arrow" aria-hidden="true"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigate('/compliance/controls')" class="cross-chip" (click)="navigate('/compliance/controls')">
              <i class="pi pi-verified" aria-hidden="true"></i>
              <span>{{ i18n.isAr() ? 'الضوابط' : 'Controls' }}</span>
              <i class="pi pi-arrow-right cross-arrow" aria-hidden="true"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigate('/foundation/evidence')" class="cross-chip" (click)="navigate('/foundation/evidence')">
              <i class="pi pi-folder" aria-hidden="true"></i>
              <span>{{ i18n.isAr() ? 'الأدلة' : 'Evidence' }}</span>
              <i class="pi pi-arrow-right cross-arrow" aria-hidden="true"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigate('/compliance/overview')" class="cross-chip" (click)="navigate('/compliance/overview')">
              <i class="pi pi-check-square" aria-hidden="true"></i>
              <span>{{ i18n.isAr() ? 'الامتثال' : 'Compliance' }}</span>
              <i class="pi pi-arrow-right cross-arrow" aria-hidden="true"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigate('/governance/overview')" class="cross-chip" (click)="navigate('/governance/overview')">
              <i class="pi pi-building" aria-hidden="true"></i>
              <span>{{ i18n.isAr() ? 'الحوكمة' : 'Governance' }}</span>
              <i class="pi pi-arrow-right cross-arrow" aria-hidden="true"></i>
            </div>
            <div tabindex="0" role="button" (keyup.enter)="navigate('/incidents/register')" class="cross-chip" (click)="navigate('/incidents/register')">
              <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
              <span>{{ i18n.isAr() ? 'الحوادث' : 'Incidents' }}</span>
              <i class="pi pi-arrow-right cross-arrow" aria-hidden="true"></i>
            </div>
          </div>

          <!-- Recent Activity -->
          <app-recent-activity-table
            [rows]="activityRows()"
            titleEn="Recent Audit Activity"
            titleAr="نشاط التدقيق الأخير"
            viewAllRoute="/audit/findings"
            [isAr]="i18n.isAr()" />

          <app-module-overview-kit [config]="moduleKitConfig()">
            @if (findingsBarOptions()) {
              <div class="audit-section-card">
                <div class="audit-section-header">
                  <i class="pi pi-chart-bar" aria-hidden="true"></i>
                  <span>{{ i18n.isAr() ? 'توزيع النتائج' : 'Findings Distribution' }}</span>
                </div>
                <app-echart [options]="findingsBarOptions()!" height="260px" />
              </div>
            }
          </app-module-overview-kit>
        }
      </div>

      <p-toast />
    </div>
  `,
    styles: [`
    .audit-ov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .audit-ov-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
    .skeleton-kpi { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px,1fr)); gap: 12px; }

    .audit-section-card {
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .audit-section-header {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border-subtle, var(--surface-ice));
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--text-heading, var(--text-heading));
    }
    .audit-section-header .pi { color: var(--primary-600, #2563eb); font-size: var(--font-size-base); }

    .section-view-all {
      margin-inline-start: auto;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--primary-600, #2563eb);
      text-decoration: none;
    }
    .section-view-all:hover { text-decoration: underline; }
    .section-view-all .pi { font-size: var(--font-size-xs); }
    [dir="rtl"] .section-view-all .pi { transform: scaleX(-1); }

    .severity-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 16px;
      text-align: center;
    }
    @media (max-width: 600px) { .severity-grid { grid-template-columns: repeat(2, 1fr); } }

    .sev-card { padding: 18px 12px; border-radius: var(--radius); }
    .sev-card.critical { background: rgba(var(--module-accent-red-rgb), .08); }
    .sev-card.high     { background: rgba(var(--module-accent-orange-rgb), .08); }
    .sev-card.medium   { background: rgba(var(--module-accent-amber-rgb), .08); }
    .sev-card.low      { background: rgba(var(--module-accent-green-rgb), .08); }
    .sev-count { display: block; font-size: var(--font-size-3xl); font-weight: 800; }
    .sev-card.critical .sev-count { color: var(--error); }
    .sev-card.high     .sev-count { color: var(--risk-high); }
    .sev-card.medium   .sev-count { color: var(--warning); }
    .sev-card.low      .sev-count { color: var(--success); }
    .sev-label { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-top: 4px; font-weight: 600; }
    .sev-card { cursor: pointer; transition: all .15s; }
    .sev-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }

    .cross-module-strip { display: flex; gap: 8px; flex-wrap: wrap; }
    .cross-chip { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--surface-card); border: 1px solid var(--border-subtle, var(--surface-border)); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-chip:hover { box-shadow: var(--shadow-sm); border-color: var(--primary-200, #93c5fd); background: var(--primary-50, #eff6ff); }
    .cross-chip .pi { font-size: var(--font-size-sm); color: var(--primary); }
    .cross-arrow { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: 2px; }
    [dir="rtl"] .cross-arrow { transform: scaleX(-1); }
  `]
})
export class AuditOverviewComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private api    = inject(AuditApiService);
  private router = inject(Router);
  readonly i18n  = inject(I18nService);
  private kickstartSvc = inject(ModuleKickstartService);

  loading  = signal(true);
  error    = signal(false);
  dir      = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  private data$     = signal<GrcRecord | null>(null);
  private activity$ = signal<Record<string, any>[]>([]);

  data = computed(() => this.data$());
  findingsBySeverity = computed<Record<string, number>>(() => this.data$()?.findingsBySeverity ?? {});

  readonly tabs = AUDIT_TABS;

  private fireStatus = signal<string>('pending');

  private _baseActions: PageHeaderAction[] = [
    { id: 'new-audit',   labelEn: 'New Audit',   labelAr: 'تدقيق جديد',    icon: 'plus',   primary: true },
    { id: 'new-finding', labelEn: 'New Finding', labelAr: 'نتيجة جديدة',   icon: 'search' },
  ];

  headerActions = computed<PageHeaderAction[]>(() => {
    const s = this.fireStatus();
    if (s === 'completed') return [...this._baseActions, { id: 'kickstart-info', labelEn: 'Module Active ✓', labelAr: 'الوحدة نشطة ✓', icon: 'check-circle', chip: true }];
    const label = s === 'in_progress' ? 'Kickstarting…' : s === 'failed' ? 'Retry Kickstart' : 'Kickstart Audit';
    const labelAr = s === 'in_progress' ? 'جارٍ التشغيل…' : s === 'failed' ? 'إعادة التشغيل' : 'تشغيل التدقيق';
    return [...this._baseActions, { id: 'kickstart', labelEn: label, labelAr, icon: 'bolt', primary: s === 'pending' }];
  });

  kpis = computed<KpiCardVM[]>(() => {
    const d = this.data$();
    if (!d) return [];
    return [
      { id: 'active',    labelEn: 'Active Audits',    labelAr: 'تدقيقات نشطة',            value: d.activeAudits ?? 0,             icon: 'briefcase',    color: '#1d4ed8', bg: '#dbeafe', route: '/audit/engagements' },
      { id: 'findings',  labelEn: 'Open Findings',    labelAr: 'نتائج مفتوحة',             value: d.openFindings ?? 0,             icon: 'search',       color: 'var(--error)', bg: '#fee2e2', route: '/audit/findings',   severity: (d.openFindings ?? 0) > 0 ? 'danger' : 'default' },
      { id: 'capa',      labelEn: 'Open CAPA',        labelAr: 'إجراءات تصحيحية مفتوحة',  value: d.capaByStatus?.open ?? 0,       icon: 'wrench',       color: '#d97706', bg: 'var(--status-warning-bg, #fcf4d6)', route: '/audit/capa',       severity: (d.capaByStatus?.open ?? 0) > 0 ? 'warning' : 'default' },
      { id: 'closure',   labelEn: 'Closure Rate',     labelAr: 'معدل الإغلاق',             value: (d.closureRate ?? 0) + '%',      icon: 'check-circle', color: '#059669', bg: '#d1fae5', route: '/audit/findings' },
      { id: 'planned',   labelEn: 'Planned Audits',   labelAr: 'تدقيقات مخططة',           value: d.plannedAudits ?? 0,            icon: 'calendar',     color: '#7c3aed', bg: '#ede9fe', route: '/audit/plan' },
      { id: 'completed', labelEn: 'Completed Audits', labelAr: 'تدقيقات مكتملة',           value: d.completedAudits ?? 0,          icon: 'flag',         color: '#0891b2', bg: '#cffafe', route: '/audit/engagements' },
    ];
  });

  healthAlerts = computed<HealthAlertVM[]>(() =>
    this.kpis()
      .filter(k => (k.severity === 'danger' || k.severity === 'warning') && (k.value as number) > 0)
      .map(k => ({
        id: k.id, labelEn: k.labelEn, labelAr: k.labelAr,
        count: typeof k.value === 'number' ? k.value : parseInt(String(k.value)) || 0,
        icon: k.icon, color: k.color,
        severity: k.severity as 'danger' | 'warning',
        route: k.route, queryParams: k.queryParams,
      }))
  );

  activityRows = computed<ActivityRowVM[]>(() =>
    (this.activity$() || []).slice(0, 8).map((r: Record<string, any>) => ({
      id:          r.id || String(Math.random()),
      timestamp:   r.timestamp || r.created_at || new Date().toISOString(),
      actorLabel:  r.actor_email || r.user_id || '—',
      action:      r.action || r.event_type || '—',
      entityType:  r.entity_type || 'Audit',
      entityLabel: r.entity_name || r.resource_id,
    }))
  );

  ngOnInit(): void {
    this.load();
    this.kickstartSvc.loadStatus().subscribe(s => {
      this.fireStatus.set(s['audit']?.status ?? 'pending');
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      overview: this.api.getOverview().pipe(catchError(() => of(null))),
      activity: this.operationsSvc.getActivityFeed('audit').pipe(catchError(() => of([]))),
    }).subscribe({
      next: (res) => {
        this.data$.set(res.overview);
        this.activity$.set(Array.isArray(res.activity) ? res.activity : (res.activity as any)?.items || (res.activity as any)?.events || []);
        if (!res.overview) this.error.set(true);
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
      this.kickstartSvc.kickstart('audit').subscribe({
        next: (r) => { this.fireStatus.set(r.status); this.load(); },
        error: () => this.fireStatus.set('failed'),
      });
      return;
    }
    const routes: Record<string, string> = {
      'new-audit':   '/audit/engagements',
      'new-finding': '/audit/findings',
    };
    if (routes[id]) this.router.navigate([routes[id]]);
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  navigateFindings(severity: string): void {
    this.router.navigate(['/audit/findings'], { queryParams: { severity } });
  }

  readonly auditAgents: AgentInfo[] = [
    { id: 'A10', name: 'Audit Reporting', nameAr: 'تقارير التدقيق', icon: 'pi-search', color: '#8b5cf6', domain: 'Audit', domainAr: 'التدقيق', autonomyLevel: 'hybrid', status: 'active' },
  ];

  readonly auditTransitions = [
    { from: 'planned', to: 'fieldwork' },
    { from: 'fieldwork', to: 'reporting' },
    { from: 'reporting', to: 'review', requiresApproval: true },
    { from: 'review', to: 'issued' },
    { from: 'review', to: 'rework' },
    { from: 'rework', to: 'reporting' },
    { from: 'issued', to: 'closed' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'audit',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 504,
    transitions: this.auditTransitions,
    currentStatus: 'planned',
    agents: this.auditAgents,
    lang: this.i18n.isAr() ? 'ar' : 'en',
  }));

  findingsBarOptions = computed(() => {
    const d = this.data$();
    if (!d?.findingsBySeverity) return null;
    const categories = Object.entries(d.findingsBySeverity).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      critical: name === 'critical' ? (count as number) : 0,
      high: name === 'high' ? (count as number) : 0,
      medium: name === 'medium' ? (count as number) : 0,
      low: name === 'low' ? (count as number) : 0,
    }));
    return buildFindingsBarOptions(categories);
  });
}
