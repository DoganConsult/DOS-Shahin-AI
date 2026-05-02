import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';

export type AnalyticsDashboardSurfaceState = 'loading' | 'empty' | 'error' | 'unauthorized';

const STATE_STYLES = `
  .analytics-surface-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 280px;
    padding: 32px 24px;
    text-align: center;
    border-radius: var(--radius-lg);
    border: 1px solid var(--surface-border, var(--border-subtle));
    background: var(--surface-card, #fff);
  }
  .analytics-surface-state__icon { font-size: 40px; }
  .analytics-surface-state__title { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--text-color, var(--text-heading)); }
  .analytics-surface-state__message { margin: 0; max-width: 44rem; color: var(--text-color-secondary, var(--text-muted)); }
  .analytics-surface-state--error { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
  .analytics-surface-state--unauthorized { background: #fff7ed; color: #c2410c; }
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-analytics-dashboard-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  styles: [STATE_STYLES],
  template: `
    <section class="analytics-surface-state" [class.analytics-surface-state--error]="state === 'error'" [class.analytics-surface-state--unauthorized]="state === 'unauthorized'">
      <i class="pi analytics-surface-state__icon" [ngClass]="iconClass()"></i>
      <h3 class="analytics-surface-state__title">{{ titleText() }}</h3>
      <p class="analytics-surface-state__message">{{ messageText() }}</p>
      @if (state === 'error') {
        <button pButton [label]="i18n.currentLang()==='ar' ? 'إعادة المحاولة' : 'Retry'" icon="pi pi-refresh" class="p-button-sm p-button-outlined" (click)="retry.emit()"></button>
      }
    </section>
  `,
})
export class AnalyticsDashboardStateComponent {
  readonly i18n = inject(I18nService);

  @Input() state: AnalyticsDashboardSurfaceState = 'loading';
  @Input() message = '';

  @Output() retry = new EventEmitter<void>();

  iconClass(): string {
    switch (this.state) {
      case 'loading':
        return 'pi-spinner pi-spin';
      case 'empty':
        return 'pi-inbox';
      case 'error':
        return 'pi-exclamation-triangle';
      case 'unauthorized':
        return 'pi-lock';
    }
  }

  titleText(): string {
    if (this.i18n.currentLang() === 'ar') {
      switch (this.state) {
        case 'loading':
          return 'جارٍ تحميل التحليلات';
        case 'empty':
          return 'لا توجد بيانات تحليلات حتى الآن';
        case 'error':
          return 'تعذر تحميل التحليلات';
        case 'unauthorized':
          return 'لا تملك صلاحية الوصول';
      }
    }

    switch (this.state) {
      case 'loading':
        return 'Loading analytics';
      case 'empty':
        return 'No analytics data yet';
      case 'error':
        return 'Unable to load analytics';
      case 'unauthorized':
        return 'You do not have access';
    }
  }

  messageText(): string {
    if (this.message) {
      return this.message;
    }

    if (this.i18n.currentLang() === 'ar') {
      switch (this.state) {
        case 'loading':
          return 'يتم تجهيز المؤشرات والاتجاهات والمقارنات المرجعية لهذه المساحة.';
        case 'empty':
          return 'سيظهر هذا العرض عند توفر مؤشرات أو اتجاهات أو معايير أو بيانات نضج.';
        case 'error':
          return 'حاول إعادة التحميل بعد التحقق من توفر خدمات التحليلات.';
        case 'unauthorized':
          return 'تحتاج إلى صلاحية analytics.report.read لعرض هذه المساحة.';
      }
    }

    switch (this.state) {
      case 'loading':
        return 'Preparing KPI, trend, benchmark, and maturity data for this surface.';
      case 'empty':
        return 'This view will populate when KPI, trend, benchmark, or maturity data becomes available.';
      case 'error':
        return 'Try reloading after confirming the analytics services are available.';
      case 'unauthorized':
        return 'You need analytics.report.read to view this surface.';
    }
  }
}