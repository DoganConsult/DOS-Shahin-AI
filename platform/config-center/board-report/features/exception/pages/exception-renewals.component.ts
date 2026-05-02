import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService, ExceptionRequestDto } from '../services/exception-api.service';
import { EmptyStateComponent } from '@app/shared/components';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-renewals',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent],
  styles: [`
    .renewals-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .renewal-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 18px; margin-bottom: 10px; }
    .renewal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .renewal-title { font-weight: 600; font-size: 0.9375rem; }
    .expiry-tag { padding: 3px 10px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); font-weight: 600; }
    .expiry-warning { background: var(--orange-50); color: var(--orange-700); }
    .expiry-critical { background: var(--red-50); color: var(--red-700); }
    .renewal-meta { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); margin-bottom: 12px; }
    .btn { padding: 6px 14px; border-radius: var(--radius); border: none; font-size: var(--font-size-xs-plus); cursor: pointer; font-weight: 500; background: var(--primary-500); color: #fff; }
  `],
  template: `
    <div class="renewals-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('exception.renewals') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (expiringItems().length === 0) {
        <app-empty-state variant="default" title="No renewals needed" description="No exceptions are approaching expiry." [dir]="i18n.direction()" />
      } @else {
        @for (item of expiringItems(); track item.id) {
          <div class="renewal-card">
            <div class="renewal-header">
              <span class="renewal-title">{{ item.title }}</span>
              <span class="expiry-tag" [class.expiry-warning]="!isCritical(item)" [class.expiry-critical]="isCritical(item)">
                Expires: {{ item.effectiveTo | date:'mediumDate' }}
              </span>
            </div>
            <div class="renewal-meta">
              <span>Risk: {{ item.riskLevel }}</span> ·
              <span>Requester: {{ item.requesterName }}</span>
            </div>
            <button class="btn" (click)="requestRenewal(item.id)">Request Renewal</button>
          </div>
        }
      }
    </div>
  `,
})
export class ExceptionRenewalsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  expiringItems = signal<ExceptionRequestDto[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.list({ status: 'approved' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => {
          const now = Date.now();
          const expiring = (res.data || []).filter(e =>
            e.effectiveTo && (new Date(e.effectiveTo).getTime() - now) < 30 * 24 * 60 * 60 * 1000
          );
          this.expiringItems.set(expiring);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  isCritical(item: ExceptionRequestDto): boolean {
    if (!item.effectiveTo) return false;
    return (new Date(item.effectiveTo).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
  }

  requestRenewal(id: string): void {
    this.api.renew(id, { additionalDays: 30, justification: 'Renewal requested from expiry tracking' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }
}
