import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { ProactiveLeadershipApiService } from '../services/proactive-leadership-api.service';
import type { ProactiveLeadershipDashboardContract } from '../contracts/proactive-leadership.contracts';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-proactive-leadership-module-dashboard',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .dashboard-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; text-align: center; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 4px; }
    .content-panel { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 18px; margin-bottom: 16px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 10px; }
    .summary-copy { margin: 0; line-height: 1.6; color: var(--text-color); }
    .priority-list { margin: 0; padding-inline-start: 18px; display: grid; gap: 10px; }
    .priority-title { font-weight: 600; display: block; margin-bottom: 4px; }
    .priority-rationale { color: var(--text-color-secondary); font-size: var(--font-size-sm); }
    .empty-state { color: var(--text-color-secondary); }
    @media (max-width: 768px) { .kpi-grid { grid-template-columns: 1fr 1fr; } }
  `],
  template: `
    <div class="dashboard-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('proactiveLeadership.dashboard') }}</h2>
      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data(); as dashboard) {
        <div class="kpi-grid">
          @for (entry of kpiEntries(); track entry[0]) {
            <div class="kpi-card">
              <div class="kpi-value">{{ entry[1] }}</div>
              <div class="kpi-label">{{ entry[0] }}</div>
            </div>
          }
        </div>

        <section class="content-panel">
          <h3 class="section-title">{{ executiveSummaryLabel() }}</h3>
          <p class="summary-copy">{{ dashboard.executiveSummary }}</p>
        </section>

        @if (dashboard.topPriorities.length) {
          <section class="content-panel">
            <h3 class="section-title">{{ topPrioritiesLabel() }}</h3>
            <ul class="priority-list">
              @for (priority of dashboard.topPriorities.slice(0, 4); track priority.priority) {
                <li>
                  <span class="priority-title">{{ priority.priority }}</span>
                  <span class="priority-rationale">{{ priority.rationale }}</span>
                </li>
              }
            </ul>
          </section>
        }

        @if (dashboard.boardAttentionItems.length) {
          <section class="content-panel">
            <h3 class="section-title">{{ boardAttentionLabel() }}</h3>
            <ul class="priority-list">
              @for (item of dashboard.boardAttentionItems.slice(0, 4); track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </section>
        }
      } @else {
        <p class="empty-state">{{ emptyStateLabel() }}</p>
      }
    </div>
  `,
})
export class ProactiveLeadershipModuleDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private proactiveLeadershipApi = inject(ProactiveLeadershipApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<ProactiveLeadershipDashboardContract | null>(null);
  kpiEntries = signal<[string, number][]>([]);

  ngOnInit(): void {
    this.proactiveLeadershipApi.getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: dashboard => {
          this.data.set(dashboard);
          this.kpiEntries.set(this.buildKpis(dashboard));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  executiveSummaryLabel(): string {
    return this.isRtl() ? 'الملخص التنفيذي' : 'Executive Summary';
  }

  topPrioritiesLabel(): string {
    return this.isRtl() ? 'الأولويات العليا' : 'Top Priorities';
  }

  boardAttentionLabel(): string {
    return this.isRtl() ? 'يتطلب انتباه المجلس' : 'Board Attention';
  }

  emptyStateLabel(): string {
    return this.isRtl() ? 'لا توجد بيانات قيادية استباقية متاحة حالياً.' : 'No proactive leadership data is available yet.';
  }

  private buildKpis(dashboard: ProactiveLeadershipDashboardContract): [string, number][] {
    const signalCount = dashboard.signalBreakdown.reduce((total, entry) => total + Number(entry.cnt ?? 0), 0);

    return this.isRtl()
      ? [
          ['إجمالي الأولويات', dashboard.topPriorities.length],
          ['الإشارات النشطة', signalCount],
          ['المتأخر الحرج', dashboard.overdueSummary.critical],
          ['اختلال الحمل', Number(dashboard.workloadBalance.imbalanceRatio.toFixed(2))],
        ]
      : [
          ['Top Priorities', dashboard.topPriorities.length],
          ['Active Signals', signalCount],
          ['Critical Overdue', dashboard.overdueSummary.critical],
          ['Load Imbalance', Number(dashboard.workloadBalance.imbalanceRatio.toFixed(2))],
        ];
  }

  private isRtl(): boolean {
    return this.i18n.direction() === 'rtl';
  }
}
