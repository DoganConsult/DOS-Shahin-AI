import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';

interface EvidenceDashboardData {
  stats: Record<string, number>;
  kpis: { totalItems: number; verified: number; pending: number; expired: number; rejected: number; collectionRate: number; avgVerificationDays: number; reuseRate: number };
  typeBreakdown: Array<{ evidenceType: string; count: number; verifiedCount: number; expiredCount: number }>;
  sourceBreakdown: Array<{ source: string; count: number; automatedCount: number }>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-evidence-dashboard',
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
      <h2 class="page-title">{{ i18n.translate('evidence.dashboard') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.totalItems }}</div><div class="kpi-label">Total Items</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--green-500)">{{ data()!.kpis.verified }}</div><div class="kpi-label">Verified</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--yellow-500)">{{ data()!.kpis.pending }}</div><div class="kpi-label">Pending</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.expired }}</div><div class="kpi-label">Expired</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--orange-500)">{{ data()!.kpis.rejected }}</div><div class="kpi-label">Rejected</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.collectionRate }}%</div><div class="kpi-label">Collection Rate</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.avgVerificationDays }}d</div><div class="kpi-label">Avg Verification</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.reuseRate }}%</div><div class="kpi-label">Reuse Rate</div></div>
        </div>

        <div class="grid-2">
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Evidence Type</h3>
              @for (item of data()!.typeBreakdown; track item.evidenceType) {
                <div class="breakdown-row">
                  <span>{{ item.evidenceType }}</span>
                  <span>{{ item.count }} ({{ item.verifiedCount }} verified)</span>
                </div>
              }
            </div>
          </div>
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Source</h3>
              @for (item of data()!.sourceBreakdown; track item.source) {
                <div class="breakdown-row">
                  <span>{{ item.source }}</span>
                  <span>{{ item.count }} ({{ item.automatedCount }} automated)</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EvidenceDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<EvidenceDashboardData | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: EvidenceDashboardData }>('/api/evidence/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.data.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
