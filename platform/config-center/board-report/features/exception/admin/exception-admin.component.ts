import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';

interface AdminOverview {
  health: string;
  config: { limits: Record<string, number>; timeouts: Record<string, number>; thresholds: Record<string, number> };
  dashboard: { totalExceptions: number; byStatus: Record<string, number> };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-admin',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .admin-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .health-badge { display: inline-block; padding: 6px 16px; border-radius: var(--radius-md); font-weight: 700; font-size: var(--font-size-base); margin-bottom: 20px; }
    .health-healthy { background: var(--green-50); color: var(--green-700); }
    .health-degraded { background: var(--yellow-50); color: var(--yellow-700); }
    .health-critical { background: var(--red-50); color: var(--red-700); }
    .config-section { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; margin-bottom: 16px; }
    .config-section h3 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; }
    .config-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
  `],
  template: `
    <div class="admin-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('exception.admin') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (overview()) {
        <span class="health-badge" [ngClass]="'health-' + overview()!.health">{{ overview()!.health | uppercase }}</span>

        <div class="config-section">
          <h3>Module Status</h3>
          <div class="config-row"><span>Total Exceptions</span><span>{{ overview()!.dashboard.totalExceptions }}</span></div>
          @for (entry of statusEntries(); track entry[0]) {
            <div class="config-row"><span>{{ entry[0] }}</span><span>{{ entry[1] }}</span></div>
          }
        </div>

        <div class="config-section">
          <h3>Limits</h3>
          @for (entry of limitEntries(); track entry[0]) {
            <div class="config-row"><span>{{ entry[0] }}</span><span>{{ entry[1] }}</span></div>
          }
        </div>

        <div class="config-section">
          <h3>Thresholds</h3>
          @for (entry of thresholdEntries(); track entry[0]) {
            <div class="config-row"><span>{{ entry[0] }}</span><span>{{ entry[1] }}</span></div>
          }
        </div>
      }
    </div>
  `,
})
export class ExceptionAdminComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  overview = signal<AdminOverview | null>(null);

  statusEntries = signal<[string, number][]>([]);
  limitEntries = signal<[string, number][]>([]);
  thresholdEntries = signal<[string, number][]>([]);

  ngOnInit(): void {
    this.http.get<{ data: AdminOverview }>('/api/exception/admin/overview')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => {
          this.overview.set(res.data);
          this.statusEntries.set(Object.entries(res.data?.dashboard?.byStatus || {}));
          this.limitEntries.set(Object.entries(res.data?.config?.limits || {}));
          this.thresholdEntries.set(Object.entries(res.data?.config?.thresholds || {}));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
