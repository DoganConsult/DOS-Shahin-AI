import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface RiskDashboardData {
  stats: Record<string, number>;
  kpis: { totalRisks: number; criticalRisks: number; highRisks: number; breachedKris: number; overdueTreatments: number; avgResidualScore: number; acceptedRisks: number; pendingAssessments: number };
  zoneBreakdown: Array<{ zone: string; count: number; percentChange: number }>;
  categoryBreakdown: Array<{ category: string; count: number; avgScore: number }>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-dashboard',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .dashboard-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; text-align: center; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 4px; }
    .breakdown-section { margin-bottom: 24px; }
    .breakdown-title { font-size: var(--font-size-base); font-weight: 700; margin: 0 0 12px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .breakdown-row:last-child { border-bottom: none; }
    .breakdown-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="dashboard-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('risk.dashboard') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.totalRisks }}</div><div class="kpi-label">Total Risks</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.criticalRisks }}</div><div class="kpi-label">Critical</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--orange-500)">{{ data()!.kpis.highRisks }}</div><div class="kpi-label">High</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.breachedKris }}</div><div class="kpi-label">Breached KRIs</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--yellow-500)">{{ data()!.kpis.overdueTreatments }}</div><div class="kpi-label">Overdue Treatments</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.avgResidualScore }}</div><div class="kpi-label">Avg Residual Score</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--green-500)">{{ data()!.kpis.acceptedRisks }}</div><div class="kpi-label">Accepted</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--yellow-500)">{{ data()!.kpis.pendingAssessments }}</div><div class="kpi-label">Pending Assessment</div></div>
        </div>

        <div class="grid-2">
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Risk Zone</h3>
              @for (item of data()!.zoneBreakdown; track item.zone) {
                <div class="breakdown-row">
                  <span>{{ item.zone }}</span>
                  <span>{{ item.count }} ({{ item.percentChange > 0 ? '+' : '' }}{{ item.percentChange }}%)</span>
                </div>
              }
            </div>
          </div>
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Category</h3>
              @for (item of data()!.categoryBreakdown; track item.category) {
                <div class="breakdown-row">
                  <span>{{ item.category }}</span>
                  <span>{{ item.count }} (avg {{ item.avgScore }})</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RiskDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<RiskDashboardData | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: RiskDashboardData }>('/api/risk/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.data.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
