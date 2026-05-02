import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';

interface PolicyDashData {
  kpis: { totalPolicies: number; published: number; overdueReviews: number; pendingApprovals: number; acknowledgementRate: number; draftCount: number; retiredCount: number; avgReviewCycleDays: number };
  statusBreakdown: Array<{ status: string; count: number }>;
  typeBreakdown: Array<{ type: string; count: number }>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-policy-dashboard',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .dashboard-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; text-align: center; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 4px; }
    .breakdown-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; }
    .breakdown-title { font-size: var(--font-size-base); font-weight: 700; margin: 0 0 12px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .breakdown-row:last-child { border-bottom: none; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="dashboard-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('policy.dashboard') }}</h2>
      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.totalPolicies }}</div><div class="kpi-label">Total Policies</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--green-500)">{{ data()!.kpis.published }}</div><div class="kpi-label">Published</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.overdueReviews }}</div><div class="kpi-label">Overdue Reviews</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--yellow-500)">{{ data()!.kpis.pendingApprovals }}</div><div class="kpi-label">Pending Approval</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.acknowledgementRate }}%</div><div class="kpi-label">Acknowledged</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.draftCount }}</div><div class="kpi-label">Drafts</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.retiredCount }}</div><div class="kpi-label">Retired</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.avgReviewCycleDays }}d</div><div class="kpi-label">Avg Review Cycle</div></div>
        </div>
        <div class="grid-2">
          <div class="breakdown-card">
            <h3 class="breakdown-title">By Status</h3>
            @for (item of data()!.statusBreakdown; track item.status) {
              <div class="breakdown-row"><span>{{ item.status }}</span><span>{{ item.count }}</span></div>
            }
          </div>
          <div class="breakdown-card">
            <h3 class="breakdown-title">By Type</h3>
            @for (item of data()!.typeBreakdown; track item.type) {
              <div class="breakdown-row"><span>{{ item.type }}</span><span>{{ item.count }}</span></div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PolicyDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);
  loading = signal(true);
  data = signal<PolicyDashData | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: PolicyDashData }>('/api/policy/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.data.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
