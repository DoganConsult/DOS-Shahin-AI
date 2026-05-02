import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { HealthStripComponent } from '@app/shared/components/status-indicators/health-strip.component';
import { RecentActivityTableComponent } from '@app/shared/components/messaging/recent-activity-table.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { KpiCardVM, HealthAlertVM, ActivityRowVM } from '@app/shared/models/module-overview.vm';
import { RiskOverviewDto, RiskTrendDto } from '@app/features/risk/pages/risk-workspace/risk-workspace.models';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { AiEntityContextPanelComponent } from '@app/shared/components/ai/ai-entity-context-panel.component';
import { RISK_PRIMARY_TABS } from '@app/features/risk/risk.constants';
import { GrcRecord } from '@app/core/models/shared.types';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import { EChartComponent } from '@app/shared/charts/echart.component';
import { buildRiskHeatmapOptions } from '@app/shared/charts/echarts/risk/risk-heatmap.options';
import { buildRiskAppetiteGaugeOptions } from '@app/shared/charts/echarts/risk/risk-appetite-gauge.options';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';
import { GrcOperationsService } from '@app/grc/services/grc-operations.service';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-overview',
    imports: [
        CommonModule, RouterModule,
        PageHeaderComponent, KpiCardGridComponent, HealthStripComponent,
        RecentActivityTableComponent, EmptyStateComponent, ModuleTabsBarComponent,
        StatusBadgeComponent,
        GrcDataTableComponent,
        SkeletonModule, TagModule, TableModule, ToastModule,
        AiEntityContextPanelComponent,
        ModuleOverviewKitComponent, EChartComponent,
    ],
    providers: [MessageService],
    templateUrl: './risk-overview.component.html',
    styleUrls: ['./risk-overview.component.scss']
})
export class RiskOverviewComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private api    = inject(RiskApiService);
  private live   = inject(GrcLiveService);
  private auth   = inject(SessionService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  readonly i18n  = inject(I18nService);

  loading  = signal(true);
  error    = signal(false);
  isAr     = computed(() => this.i18n.currentLang() === 'ar');
  dir      = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  private overview$ = signal<RiskOverviewDto | null>(null);
  private activity$ = signal<GrcRecord[]>([]);

  overview = computed(() => this.overview$());

  readonly tabs = RISK_PRIMARY_TABS;

  /** Header actions filtered by RBAC -- only show create buttons when user has risk:write */
  readonly headerActions = computed<PageHeaderAction[]>(() => {
    // Re-evaluate when role changes
    const _role = this.auth.currentRole();
    const all: PageHeaderAction[] = [
      { id: 'new-risk',      labelEn: 'New Risk',       labelAr: 'مخاطرة جديدة',    icon: 'plus',  primary: true },
      { id: 'new-treatment', labelEn: 'New Treatment',  labelAr: 'خطة معالجة جديدة', icon: 'wrench' },
    ];
    return this.auth.hasPermission('risk.record.write') ? all : [];
  });

  // ── Trend data extracted from overview ──────────────────────────
  private trends = computed<RiskTrendDto[]>(() => this.overview$()?.trends ?? []);

  /** Extract sparkline points from trend data for a given KPI metric */
  private trendSparkline(extractor: (t: RiskTrendDto) => number): number[] {
    const t = this.trends();
    if (!t || t.length < 2) return [];
    return t.map(extractor);
  }

  kpis = computed<KpiCardVM[]>(() => {
    const s = this.overview$()?.summary;
    if (!s) return [];
    const highSparkline = this.trendSparkline(t => t.highCount);
    const residualSparkline = this.trendSparkline(t => t.residualAvg);
    const breachSparkline = this.trendSparkline(t => t.appetiteBreaches);
    const treatmentSparkline = this.trendSparkline(t => t.treatmentCompletion);

    return [
      { id: 'total',     labelEn: 'Total Risks',         labelAr: 'إجمالي المخاطر',      value: s.totalRisks,          icon: 'list',                color: '#1d4ed8', bg: '#dbeafe', route: '/risk/register',
        sparklinePoints: residualSparkline },
      { id: 'high',      labelEn: 'High Risks',          labelAr: 'المخاطر العالية',      value: s.highRisks,           icon: 'arrow-up',            color: '#d97706', bg: 'var(--status-warning-bg, #fcf4d6)', route: '/risk/register',   queryParams: { severity: 'high' },     severity: s.highRisks > 0 ? 'warning' : 'default',
        sparklinePoints: highSparkline },
      { id: 'critical',  labelEn: 'Critical Risks',      labelAr: 'المخاطر الحرجة',       value: s.criticalRisks,       icon: 'exclamation-circle',  color: 'var(--error)', bg: '#fee2e2', route: '/risk/register',   queryParams: { severity: 'critical' }, severity: s.criticalRisks > 0 ? 'danger' : 'default',
        sparklinePoints: highSparkline },
      { id: 'overdue',   labelEn: 'Overdue Treatments',  labelAr: 'معالجات متأخرة',       value: s.overdueTreatments,   icon: 'clock',               color: '#ea580c', bg: '#ffedd5', route: '/risk/treatment', queryParams: { overdue: '1' } as Record<string,string>,         severity: s.overdueTreatments > 0 ? 'warning' : 'default',
        sparklinePoints: treatmentSparkline },
      { id: 'breaches',  labelEn: 'Appetite Breaches',   labelAr: 'تجاوزات الشهية',       value: s.appetiteBreaches,    icon: 'ban',                 color: '#7c3aed', bg: '#ede9fe', route: '/risk/scoring',                                         severity: s.appetiteBreaches > 0 ? 'danger' : 'default',
        sparklinePoints: breachSparkline },
      { id: 'no-owner',  labelEn: 'Without Owner',       labelAr: 'بدون مسؤول',           value: s.risksWithoutOwner,   icon: 'user-minus',          color: '#0891b2', bg: '#cffafe', route: '/risk/register',                                         severity: s.risksWithoutOwner > 0 ? 'warning' : 'default' },
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

  /** Risk velocity computed from actual trend data when available, with heuristic fallback */
  velocity = computed<{ status: string; icon: string; labelEn: string; labelAr: string } | null>(() => {
    const s = this.overview$()?.summary;
    if (!s) return null;

    const t = this.trends();
    // Use actual trend data when we have at least 2 data points
    if (t && t.length >= 2) {
      const recent = t.slice(-3); // last 3 periods
      const older = t.slice(0, Math.max(1, t.length - 3));
      const recentAvg = recent.reduce((acc, r) => acc + r.highCount, 0) / recent.length;
      const olderAvg = older.reduce((acc, r) => acc + r.highCount, 0) / older.length;
      const delta = recentAvg - olderAvg;

      if (delta < -0.5) {
        return { status: 'improving', icon: 'pi-arrow-down', labelEn: 'Improving', labelAr: 'تحسن' };
      }
      if (delta > 0.5) {
        return { status: 'worsening', icon: 'pi-arrow-up', labelEn: 'Worsening', labelAr: 'تدهور' };
      }
      return { status: 'stable', icon: 'pi-minus', labelEn: 'Stable', labelAr: 'مستقر' };
    }

    // Heuristic fallback when no trend data
    const critHigh = (s.criticalRisks ?? 0) + (s.highRisks ?? 0);
    if (s.criticalRisks === 0) {
      return { status: 'improving', icon: 'pi-arrow-down', labelEn: 'Improving', labelAr: 'تحسن' };
    }
    if (critHigh > 0 && (s.criticalRisks / critHigh) > 0.3) {
      return { status: 'worsening', icon: 'pi-arrow-up', labelEn: 'Worsening', labelAr: 'تدهور' };
    }
    return { status: 'stable', icon: 'pi-minus', labelEn: 'Stable', labelAr: 'مستقر' };
  });

  /** Sparkline data for velocity trend (highCount over time) */
  velocitySparkline = computed<number[]>(() => this.trendSparkline(t => t.highCount + t.appetiteBreaches));

  crossModuleCounts = computed<{ controls: number; evidence: number; treatments: number; incidents: number }>(() => {
    const ov = this.overview$();
    const topRisks = ov?.topRisks || [];
    const controlIds = new Set<string>();
    let evidenceCount = 0;
    topRisks.forEach((r) => {
      if (r.control_ids?.length) r.control_ids.forEach((id: string) => controlIds.add(id));
      if (r.evidence_count != null) evidenceCount += r.evidence_count;
    });
    return {
      controls: controlIds.size || topRisks.length,
      evidence: evidenceCount || topRisks.length,
      treatments: ov?.summary?.overdueTreatments ?? 0,
      incidents: (ov?.summary as GrcRecord)?.incidentCount ?? 0,
    };
  });

  activityRows = computed<ActivityRowVM[]>(() =>
    (this.activity$() || []).slice(0, 8).map((r) => ({
      id:          r.id || String(Math.random()),
      timestamp:   r.timestamp || r.created_at || new Date().toISOString(),
      actorLabel:  r.actor_email || r.user_id || '—',
      action:      r.action || r.event_type || '—',
      entityType:  r.entity_type || 'Risk',
      entityLabel: r.entity_name || r.resource_id,
    }))
  );

  ngOnInit(): void {
    this.load();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      overview: this.api.getOverview().pipe(catchError(() => of(null))),
      activity: this.operationsSvc.getActivityFeed('risk').pipe(catchError(() => of([]))),
    }).subscribe({
      next: (res) => {
        this.overview$.set(res.overview);
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
    const routes: Record<string, string> = {
      'new-risk':      '/risk/register',
      'new-treatment': '/risk/treatment',
    };
    if (routes[id]) this.router.navigate([routes[id]]);
  }

  navigate(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  catPercent(count: number): number {
    const total = this.overview$()?.summary?.totalRisks || 1;
    return Math.round((count / total) * 100);
  }

  catColor(category: string): string {
    const map: Record<string, string> = {
      cyber: '#6366f1', operational: 'var(--warning)', compliance: '#3b82f6',
      financial: '#10b981', strategic: '#8b5cf6', third_party: '#ec4899',
      reputational: 'var(--error)', privacy: '#14b8a6', business_continuity: '#f97316',
    };
    return map[category] || '#6b7280';
  }

  scoreClass(score: number): string {
    if (score >= 20) return 'danger';
    if (score >= 12) return 'warning';
    return 'success';
  }

  readonly riskAgents: AgentInfo[] = [
    { id: 'A07', name: 'Risk Register', nameAr: 'سجل المخاطر', icon: 'pi-exclamation-triangle', color: '#06b6d4', domain: 'Risk Scoring', domainAr: 'تقييم المخاطر', autonomyLevel: 'hybrid', status: 'active' },
  ];

  readonly riskTransitions = [
    { from: 'identified', to: 'assessed' },
    { from: 'assessed', to: 'mitigating', requiredPermission: 'risk.record.manage' },
    { from: 'mitigating', to: 'accepted', requiresApproval: true },
    { from: 'mitigating', to: 'mitigated' },
    { from: 'accepted', to: 'closed' },
    { from: 'mitigated', to: 'closed' },
    { from: 'identified', to: 'rejected' },
    { from: 'closed', to: 'identified' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'risk',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 168,
    transitions: this.riskTransitions,
    currentStatus: 'assessed',
    agents: this.riskAgents,
    trendSeries: this.trends().length >= 2 ? [
      { name: 'High Risks', data: this.trends().map(t => ({ date: (t as any).period || '', value: t.highCount })), color: '#ef4444' },
      { name: 'Residual Avg', data: this.trends().map(t => ({ date: (t as any).period || '', value: t.residualAvg })), color: '#3b82f6' },
    ] : undefined,
    crossModuleLinks: [
      { entityType: 'risk', entityId: '*', targetType: 'control', count: this.crossModuleCounts().controls, icon: 'pi pi-shield' },
      { entityType: 'risk', entityId: '*', targetType: 'evidence', count: this.crossModuleCounts().evidence, icon: 'pi pi-file' },
      { entityType: 'risk', entityId: '*', targetType: 'incident', count: this.crossModuleCounts().incidents, icon: 'pi pi-bolt' },
    ],
    lang: this.isAr() ? 'ar' : 'en',
  }));

  heatmapOptions = computed(() => {
    const ov = this.overview$();
    if (!ov?.distribution?.bySeverity) return null;
    const cells = ov.distribution.bySeverity.map((s: any, i: number) => ({
      impact: i % 5, likelihood: Math.floor(i / 5), count: s.count || 0,
    }));
    return buildRiskHeatmapOptions(cells);
  });

  appetiteGaugeOptions = computed(() => {
    const s = this.overview$()?.summary;
    if (!s) return null;
    const current = (s.criticalRisks ?? 0) + (s.highRisks ?? 0);
    const appetite = (s as any).riskAppetite ?? 10;
    return buildRiskAppetiteGaugeOptions(current, appetite);
  });

  /** Build SVG polyline points string for an arbitrary viewBox width/height. */
  buildSparklineSvg(points: number[], width: number, height: number): string {
    if (!points || points.length < 2) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);
    const pad = 1;
    return points.map((v, i) => {
      const x = (i * stepX).toFixed(1);
      const y = ((height - pad) - ((v - min) / range) * (height - 2 * pad) + pad).toFixed(1);
      return `${x},${y}`;
    }).join(' ');
  }
}
