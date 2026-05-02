import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-privacy-dashboard',
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
      <h2 class="page-title">{{ i18n.translate('privacy.dashboard') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.totalRecords }}</div><div class="kpi-label">Total Records</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--green-500)">{{ data()!.kpis.dsarOpen }}</div><div class="kpi-label">DSARs Open</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.dsarOverdue }}</div><div class="kpi-label">DSARs Overdue</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.consentActive }}</div><div class="kpi-label">Consents Active</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--orange-500)">{{ data()!.kpis.breachesReported }}</div><div class="kpi-label">Breaches Reported</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.dpiasCompleted }}</div><div class="kpi-label">DPIAs Done</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.avgResponseDays }}</div><div class="kpi-label">Avg Response (d)</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.complianceRate }}</div><div class="kpi-label">Compliance %</div></div>
        </div>

        <div class="grid-2">
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Request Type</h3>
              @for (item of data()!.breakdownA; track item.requestType) {
                <div class="breakdown-row">
                  <span>{{ item.requestType }}</span>
                  <span>{{ item.count }}</span>
                </div>
              }
            </div>
          </div>
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Region</h3>
              @for (item of data()!.breakdownB; track item.region) {
                <div class="breakdown-row">
                  <span>{{ item.region }}</span>
                  <span>{{ item.count }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PrivacyDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<Record<string, unknown> | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: Record<string, unknown> }>('/api/privacy/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.data.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
