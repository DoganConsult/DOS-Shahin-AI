import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';

interface GovernanceDashboardData {
  stats: Record<string, number>;
  kpis: { totalCommittees: number; activeCharters: number; pendingDecisions: number; overdueActions: number; delegationsActive: number; maturityScore: number; openReviews: number; sodConflicts: number };
  committeeBreakdown: Array<{ committeeName: string; memberCount: number; pendingDecisions: number }>;
  actionBreakdown: Array<{ status: string; count: number; overdueCount: number }>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-governance-dashboard',
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
      <h2 class="page-title">{{ i18n.translate('governance.dashboard') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.totalCommittees }}</div><div class="kpi-label">Committees</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--green-500)">{{ data()!.kpis.activeCharters }}</div><div class="kpi-label">Active Charters</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--yellow-500)">{{ data()!.kpis.pendingDecisions }}</div><div class="kpi-label">Pending Decisions</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.overdueActions }}</div><div class="kpi-label">Overdue Actions</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.delegationsActive }}</div><div class="kpi-label">Delegations</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.maturityScore }}%</div><div class="kpi-label">Maturity Score</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--orange-500)">{{ data()!.kpis.openReviews }}</div><div class="kpi-label">Open Reviews</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.sodConflicts }}</div><div class="kpi-label">SoD Conflicts</div></div>
        </div>

        <div class="grid-2">
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Committee</h3>
              @for (item of data()!.committeeBreakdown; track item.committeeName) {
                <div class="breakdown-row">
                  <span>{{ item.committeeName }}</span>
                  <span>{{ item.memberCount }} members ({{ item.pendingDecisions }} pending)</span>
                </div>
              }
            </div>
          </div>
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">Actions by Status</h3>
              @for (item of data()!.actionBreakdown; track item.status) {
                <div class="breakdown-row">
                  <span>{{ item.status }}</span>
                  <span>{{ item.count }} ({{ item.overdueCount }} overdue)</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class GovernanceDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<GovernanceDashboardData | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: GovernanceDashboardData }>('/api/governance/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.data.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
