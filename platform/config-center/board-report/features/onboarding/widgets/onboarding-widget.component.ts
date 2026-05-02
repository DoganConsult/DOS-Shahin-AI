import { Component, Input, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { devError } from '../../../core/utils/dev-logger';

interface OnboardingWidgetData {
  sessionsInProgress: number;
  provisioningActive: number;
  completedToday: number;
}

@Component({
  selector: 'app-onboarding-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    .onboarding-widget { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 1rem; }
    .onboarding-widget__title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 0.75rem; color: var(--text-color); }
    .onboarding-widget__metrics { display: flex; gap: 1rem; flex-wrap: wrap; }
    .onboarding-widget__metric { text-align: center; flex: 1; min-width: 60px; }
    .onboarding-widget__value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--primary); }
    .onboarding-widget__label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 2px; }
    .onboarding-widget__loading { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
  `],
  template: `
    <div class="onboarding-widget" [dir]="i18n.direction()">
      <h4 class="onboarding-widget__title">{{ title }}</h4>
      @if (loading()) {
        <p class="onboarding-widget__loading">{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="onboarding-widget__metrics">
          <div class="onboarding-widget__metric">
            <div class="onboarding-widget__value">{{ data()!.sessionsInProgress }}</div>
            <div class="onboarding-widget__label">{{ i18n.translate('onboarding.widget.inProgress') }}</div>
          </div>
          <div class="onboarding-widget__metric">
            <div class="onboarding-widget__value">{{ data()!.provisioningActive }}</div>
            <div class="onboarding-widget__label">{{ i18n.translate('onboarding.widget.provisioning') }}</div>
          </div>
          <div class="onboarding-widget__metric">
            <div class="onboarding-widget__value">{{ data()!.completedToday }}</div>
            <div class="onboarding-widget__label">{{ i18n.translate('onboarding.widget.completed') }}</div>
          </div>
        </div>
      }
    </div>
  `,
})
export class OnboardingWidgetComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  @Input() title = 'Onboarding';
  loading = signal(true);
  data = signal<OnboardingWidgetData | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: OnboardingWidgetData }>('/api/onboarding/widget-summary')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.data.set(res.data); this.loading.set(false); },
        error: (e: unknown) => { devError('[onboarding-widget]', e); this.loading.set(false); },
      });
  }
}
