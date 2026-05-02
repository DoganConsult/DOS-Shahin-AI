import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { devError } from '../../../core/utils/dev-logger';

interface OnboardingDashboardData {
  stats: Record<string, number>;
  kpis: Record<string, number>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-onboarding-module-dashboard',
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
      <h2 class="page-title">{{ i18n.translate('onboarding.dashboard') }}</h2>
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
export class OnboardingModuleDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<OnboardingDashboardData | null>(null);
  kpiEntries = signal<[string, number][]>([]);

  ngOnInit(): void {
    this.http.get<{ data: OnboardingDashboardData }>(`/api/onboarding/dashboard`)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => {
          this.data.set(res.data);
          this.kpiEntries.set(Object.entries(res.data.kpis));
          this.loading.set(false);
        },
        error: (e: unknown) => { devError('[onboarding-dashboard]', e); this.loading.set(false); },
      });
  }
}
