import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../ports/onboarding-platform.port';
import { OnboardingApiService } from '../services/onboarding-api.service';
import { devError } from '../utils/dev-logger';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-onboarding-os-dashboard',
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
      <h2 class="page-title">{{ i18n.translate('onboardingOs.dashboard') }}</h2>

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
export class OnboardingOsDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(OnboardingApiService);
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  i18n = this.platform.i18n;

  loading = signal(true);
  data = signal<Record<string, unknown> | null>(null);
  kpiEntries = signal<[string, unknown][]>([]);

  ngOnInit(): void {
    this.api.getDashboardStats()
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => {
          this.data.set(res.data);
          this.kpiEntries.set(Object.entries(res.data?.['kpis'] as Record<string, unknown> ?? {}));
          this.loading.set(false);
        },
        error: (e: unknown) => { devError('[onboarding-os-dashboard]', e); this.loading.set(false); },
      });
  }
}
