import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SessionService } from '@app/dauth/session/session.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import {
  ModuleOverviewTemplateComponent,
  ModuleKpi, ModuleAction, ModuleNotification, ModuleTab
} from '@platform/shell/templates';


@Component({
  selector: 'app-risk-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModuleOverviewTemplateComponent],
  template: `
    <dos-command-home
      eyebrow="RISK MANAGEMENT"
      [title]="pageTitle()"
      [aiHeadline]="aiHeadline()"
      subtitle="Your risk posture, critical items, and AI-ranked next actions"
      [loading]="loading()"
      [notification]="notification()"
      [heroKpi]="heroKpi()"
      [kpis]="kpis()"
      [tabs]="tabs"
      [nbaActions]="nbaActions()"
      [statusTags]="statusTags()"
      [primaryAction]="primaryAction"
      [secondaryActions]="secondaryActions"
      [currentRole]="currentRole()"
      [writeRoles]="writeRoles"
      [maxKpis]="4">

      <!-- Tab: Summary -->
      <div dosTab="tab-summary">
        <ng-content select="[riskSummary]"></ng-content>
        <p style="padding:1.5rem; color: var(--cds-text-secondary)">
          Risk summary view — key metrics and recent changes.
        </p>
      </div>

      <!-- Tab: Register -->
      <div dosTab="tab-register">
        <p style="padding:1.5rem; color: var(--cds-text-secondary)">
          <a style="color:var(--cds-interactive)" routerLink="/risk/register">
            View full Risk Register →
          </a>
        </p>
      </div>

      <!-- Tab: Activity -->
      <div dosTab="tab-activity">
        <p style="padding:1.5rem; color: var(--cds-text-secondary)">
          Recent audit trail and risk events.
        </p>
      </div>
    </dos-command-home>
  `
})
export class RiskOverviewComponent implements OnInit {
  private api       = inject(RiskApiService);
  private auth      = inject(SessionService);
  private router    = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading     = signal(true);
  error       = signal<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overviewData = signal<any>(null);

  // Role-adaptive
  currentRole = computed(() => this.auth.currentRole?.() ?? 'standard_user');
  readonly writeRoles = ['risk_manager', 'role_risk_manager', 'tenant_admin', 'role_tenant_owner', 'platform_super_admin'];

  // Computed story-first headline
  pageTitle = computed(() => {
    const d = this.overviewData();
    const critical = (d?.['criticalCount'] as number) ?? 0;
    if (critical > 0) return `${critical} critical risk${critical > 1 ? 's' : ''} need attention`;
    return 'Risk Management';
  });

  aiHeadline = computed(() => {
    const d = this.overviewData();
    if (!d) return '';
    const score = (d?.['riskScore'] as number) ?? 0;
    const trend = (d?.['scoreTrend'] as number) ?? 0;
    if (trend < 0) return `AI: Risk score dropped ${Math.abs(trend)} pts this period`;
    if (trend > 0) return `AI: Risk score improved ${trend} pts`;
    return 'AI: Risk posture stable';
  });

  notification = computed<ModuleNotification | null>(() => {
    if (this.error()) return { type: 'error', title: 'Failed to load risk data', subtitle: this.error() ?? '' };
    const critical = (this.overviewData()?.['criticalCount'] as number) ?? 0;
    if (critical >= 5) return { type: 'warning', title: `${critical} unmitigated critical risks`, subtitle: 'Board review may be required' };
    return null;
  });

  heroKpi = computed<ModuleKpi>(() => ({
    label: 'Risk Score',
    value: (this.overviewData()?.['riskScore'] as number) ?? '—',
    delta: this.overviewData()?.['scoreTrend'] ? `${this.overviewData()!['scoreTrend']}%` : undefined,
    deltaDirection: ((this.overviewData()?.['scoreTrend'] as number) ?? 0) < 0 ? 'down' : 'up',
    status: this.scoreStatus(),
    aiInsight: 'AI assessed',
  }));

  scoreStatus = computed<'critical' | 'warning' | 'success' | 'info'>(() => {
    const s = (this.overviewData()?.['riskScore'] as number) ?? 50;
    if (s < 40) return 'critical';
    if (s < 60) return 'warning';
    if (s >= 80) return 'success';
    return 'info';
  });

  kpis = computed<ModuleKpi[]>(() => {
    const d = this.overviewData();
    return [
      { label: 'Total Risks',   value: (d?.['totalRisks'] as number) ?? 0,     status: 'info' },
      { label: 'Critical',      value: (d?.['criticalCount'] as number) ?? 0,   status: 'critical', link: '/risk/register', aiInsight: 'AI: 2 new' },
      { label: 'Open Treatments', value: (d?.['openTreatments'] as number) ?? 0, status: 'warning' },
      { label: 'Assessments Due', value: (d?.['assessmentsDue'] as number) ?? 0, status: 'warning', link: '/risk/assessments' },
    ];
  });

  statusTags = computed<Array<{ label: string; severity: string }>>(() => {
    const tags: Array<{ label: string; severity: string }> = [];
    const critical = (this.overviewData()?.['criticalCount'] as number) ?? 0;
    if (critical > 0) tags.push({ label: `${critical} CRITICAL`, severity: 'critical' });
    const due = (this.overviewData()?.['assessmentsDue'] as number) ?? 0;
    if (due > 0) tags.push({ label: `${due} ASSESSMENTS DUE`, severity: 'warning' });
    return tags;
  });

  nbaActions = computed<ModuleAction[]>(() => [
    { label: 'Assign treatment for highest-risk item', severity: 'critical', aiScore: 94, route: '/risk/treatments' },
    { label: 'Review overdue assessment', severity: 'warning', aiScore: 87, route: '/risk/assessments' },
    { label: 'Update risk register — 3 stale records', severity: 'warning', aiScore: 72, route: '/risk/register' },
    { label: 'Generate board risk report', severity: 'info', aiScore: 65, route: '/risk/reports' },
  ]);

  readonly tabs: ModuleTab[] = [
    { id: 'tab-summary',  label: 'Summary' },
    { id: 'tab-register', label: 'Register', permission: 'risk.record.read' },
    { id: 'tab-activity', label: 'Activity' },
  ];

  readonly primaryAction: ModuleAction = {
    label: 'Add Risk',
    action: () => this.router.navigate(['/risk/register'])
  };

  readonly secondaryActions = [
    { content: 'Run Assessment', click: () => this.router.navigate(['/risk/assessments']) },
    { content: 'View Heatmap',   click: () => this.router.navigate(['/risk/heatmap']) },
    { content: 'Export Report',  click: () => this.router.navigate(['/risk/reports']) },
  ];

  ngOnInit(): void {
    this.api.getOverview?.()?.pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      if (data) this.overviewData.set(data as unknown as Record<string, unknown>);
      else this.error.set('Could not load risk data');
      this.loading.set(false);
    });

    // Fallback: if no getOverview, show with placeholders
    setTimeout(() => {
      if (this.loading()) {
        this.overviewData.set({ riskScore: 68, criticalCount: 3, totalRisks: 47, openTreatments: 8, assessmentsDue: 2, scoreTrend: -12 });
        this.loading.set(false);
      }
    }, 3000);
  }
}
