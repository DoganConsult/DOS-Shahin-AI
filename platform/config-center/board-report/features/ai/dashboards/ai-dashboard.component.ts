import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';

interface AiDashboardData {
  stats: Record<string, number>;
  kpis: { totalAgents: number; activeAgents: number; pendingReview: number; failedActions: number; avgResponseMs: number; guardrailHits: number; decisionsToday: number; explainabilityScore: number };
  agentBreakdown: Array<{ agentType: string; count: number; activeCount: number; errorCount: number }>;
  modelBreakdown: Array<{ modelName: string; invocations: number; avgLatencyMs: number }>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-module-dashboard',
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
      <h2 class="page-title">{{ i18n.translate('ai.dashboard') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (data()) {
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.totalAgents }}</div><div class="kpi-label">Total Agents</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--green-500)">{{ data()!.kpis.activeAgents }}</div><div class="kpi-label">Active</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--yellow-500)">{{ data()!.kpis.pendingReview }}</div><div class="kpi-label">Pending Review</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--red-500)">{{ data()!.kpis.failedActions }}</div><div class="kpi-label">Failed Actions</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.avgResponseMs }}ms</div><div class="kpi-label">Avg Response</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:var(--orange-500)">{{ data()!.kpis.guardrailHits }}</div><div class="kpi-label">Guardrail Hits</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.decisionsToday }}</div><div class="kpi-label">Decisions Today</div></div>
          <div class="kpi-card"><div class="kpi-value">{{ data()!.kpis.explainabilityScore }}%</div><div class="kpi-label">Explainability</div></div>
        </div>

        <div class="grid-2">
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Agent Type</h3>
              @for (item of data()!.agentBreakdown; track item.agentType) {
                <div class="breakdown-row">
                  <span>{{ item.agentType }}</span>
                  <span>{{ item.count }} ({{ item.activeCount }} active)</span>
                </div>
              }
            </div>
          </div>
          <div class="breakdown-section">
            <div class="breakdown-card">
              <h3 class="breakdown-title">By Model</h3>
              @for (item of data()!.modelBreakdown; track item.modelName) {
                <div class="breakdown-row">
                  <span>{{ item.modelName }}</span>
                  <span>{{ item.invocations }} calls ({{ item.avgLatencyMs }}ms)</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AiModuleDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  data = signal<AiDashboardData | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: AiDashboardData }>('/api/ai/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.data.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
