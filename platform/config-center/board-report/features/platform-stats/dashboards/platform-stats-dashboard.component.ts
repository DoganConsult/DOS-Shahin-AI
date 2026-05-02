import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformStatsService, type PlatformSummary } from '@app/core/services/platform/platform-stats.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-platform-stats-dashboard',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .dashboard-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; text-align: center; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 4px; }
    @media (max-width: 768px) { .kpi-grid { grid-template-columns: 1fr 1fr; } }
  `],
  template: `
    <div class="dashboard-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('platformStats.dashboard') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="kpi-grid">
          @for (entry of kpiEntries(); track entry[0]) {
            <div class="kpi-card">
              <div class="kpi-value">{{ entry[1] }}</div>
              <div class="kpi-label">{{ entry[0] }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PlatformStatsDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private readonly platformStatsService = inject(PlatformStatsService);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<Record<string, unknown> | null>(null);
  kpiEntries = signal<Array<[string, number]>>([]);

  ngOnInit(): void {
    this.platformStatsService.getSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.data.set({
            summary: res.summary,
            serviceStats: { totalServices: res.serviceStats.totalServices },
            frontendStats: { totalPages: res.frontendStats.totalPages },
          });
          this.kpiEntries.set(this.buildKpis(res.summary, res.serviceStats.totalServices, res.frontendStats.totalPages));
          this.loading.set(false);
        },
        error: () => {
          this.data.set(null);
          this.kpiEntries.set([]);
          this.loading.set(false);
        },
      });
  }

  private buildKpis(summary: PlatformSummary, totalServices: number, totalPages: number): Array<[string, number]> {
    return [
      ['Total files', summary.totalFiles],
      ['Code lines', summary.totalCodeLines],
      ['Backend files', summary.backendFiles],
      ['Frontend files', summary.frontendFiles],
      ['Services', totalServices],
      ['Pages', totalPages],
    ];
  }
}
