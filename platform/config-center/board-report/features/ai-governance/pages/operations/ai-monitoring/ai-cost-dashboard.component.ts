import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, forkJoin } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components';
import { AiBadgeComponent } from '@app/shared/components/ai/ai-badge.component';
import { environment } from '@env/environment';

interface CostEntry {
  agentId: string;
  agentName: string;
  model: string;
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

interface TenantCostSummary {
  totalCostUsd: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  periodStart: string;
  periodEnd: string;
  byAgent: CostEntry[];
  byModel: { model: string; calls: number; costUsd: number; tokens: number }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-cost-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, AiBadgeComponent],
  template: `
    <div class="cost-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-dollar"></i></div>
          <div>
            <h1>{{ i18n.translate('ai.cost.title') }}</h1>
            <p class="subtitle">{{ i18n.translate('ai.cost.subtitle') }}</p>
          </div>
        </div>
        <div class="header-actions">
          <div class="period-toggle">
            @for (p of periods; track p.value) {
              <button class="period-btn" [class.active]="period() === p.value" (click)="onPeriodChange(p.value)">{{ p.label }}</button>
            }
          </div>
          <button class="btn btn-primary" (click)="loadCostData()"><i class="pi pi-refresh"></i> Refresh</button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-state"><i class="pi pi-spin pi-spinner"></i> Loading cost data...</div>
      } @else if (!summary()) {
        <app-empty-state icon="pi-dollar" title="No Cost Data" message="AI cost tracking will populate once AI agents are active." />
      } @else {
        <div class="stats-strip">
          <div class="stat-card">
            <div class="stat-value cost-primary">{{ formatCurrency(summary()!.totalCostUsd) }}</div>
            <div class="stat-label">Total Cost</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(summary()!.totalCalls) }}</div>
            <div class="stat-label">Total Calls</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(summary()!.totalInputTokens) }}</div>
            <div class="stat-label">Input Tokens</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(summary()!.totalOutputTokens) }}</div>
            <div class="stat-label">Output Tokens</div>
          </div>
          @if (budgetLimit() > 0) {
            <div class="stat-card">
              <div class="stat-value" [class.over-budget]="budgetPercent() >= 90">{{ budgetPercent() }}%</div>
              <div class="stat-label">Budget Used</div>
              <div class="budget-bar"><div class="budget-fill" [style.width.%]="budgetPercent()" [class.warning]="budgetPercent() >= 75" [class.danger]="budgetPercent() >= 90"></div></div>
            </div>
          }
        </div>

        <div class="section">
          <h2 class="section-title">Cost by Agent <app-ai-badge variant="subtle" label="AI" /></h2>
          <table class="cost-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Model</th>
                <th>Calls</th>
                <th>Input Tokens</th>
                <th>Output Tokens</th>
                <th>Avg Latency</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of summary()!.byAgent; track entry.agentId) {
                <tr>
                  <td class="agent-name">{{ entry.agentName || entry.agentId }}</td>
                  <td><span class="model-badge">{{ entry.model }}</span></td>
                  <td>{{ formatNumber(entry.totalCalls) }}</td>
                  <td>{{ formatNumber(entry.inputTokens) }}</td>
                  <td>{{ formatNumber(entry.outputTokens) }}</td>
                  <td>{{ entry.avgLatencyMs }}ms</td>
                  <td class="cost-cell">{{ formatCurrency(entry.costUsd) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (summary()!.byModel?.length) {
          <div class="section">
            <h2 class="section-title">Cost by Model</h2>
            <div class="model-cards">
              @for (m of summary()!.byModel; track m.model) {
                <div class="model-card">
                  <div class="model-name">{{ m.model }}</div>
                  <div class="model-stats">
                    <span>{{ formatNumber(m.calls) }} calls</span>
                    <span>{{ formatNumber(m.tokens) }} tokens</span>
                  </div>
                  <div class="model-cost">{{ formatCurrency(m.costUsd) }}</div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .cost-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--green-50, #f0fdf4); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--green-600); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .period-toggle { display: flex; border: 1px solid var(--surface-border); border-radius: var(--radius); overflow: hidden; }
    .period-btn { padding: 6px 14px; border: none; background: var(--surface-card); cursor: pointer; font-size: var(--font-size-xs-plus); }
    .period-btn.active { background: var(--primary-500); color: #fff; }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .loading-state { text-align: center; padding: 60px; color: var(--text-color-secondary); font-size: var(--font-size-base); }
    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px 18px; text-align: center; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 2px; }
    .cost-primary { color: var(--green-600); }
    .over-budget { color: var(--red-600); }
    .budget-bar { width: 100%; height: 4px; background: var(--surface-200); border-radius: 2px; margin-top: 6px; overflow: hidden; }
    .budget-fill { height: 100%; background: var(--green-500); border-radius: 2px; transition: width .3s; }
    .budget-fill.warning { background: var(--yellow-500); }
    .budget-fill.danger { background: var(--red-500); }
    .section { margin-bottom: 24px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
    .cost-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .cost-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .cost-table td { padding: 12px 16px; font-size: var(--font-size-base); border-bottom: 1px solid var(--surface-50); }
    .cost-table tr:hover td { background: var(--surface-50); }
    .agent-name { font-weight: 600; }
    .model-badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--font-size-2xs); background: var(--primary-50); color: var(--primary-700); font-weight: 500; }
    .cost-cell { font-weight: 700; color: var(--green-700); }
    .model-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .model-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; }
    .model-name { font-weight: 600; font-size: 0.9375rem; margin-bottom: 8px; }
    .model-stats { display: flex; gap: 12px; font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-bottom: 6px; }
    .model-cost { font-size: var(--font-size-xl); font-weight: 700; color: var(--green-600); }
  `],
})
export class AiCostDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly summary = signal<TenantCostSummary | null>(null);
  readonly period = signal<'7d' | '30d' | '90d'>('30d');
  readonly budgetLimit = signal<number>(0);

  readonly periods = [
    { value: '7d' as const, label: '7 Days' },
    { value: '30d' as const, label: '30 Days' },
    { value: '90d' as const, label: '90 Days' },
  ];

  ngOnInit(): void {
    this.loadCostData();
  }

  loadCostData(): void {
    this.loading.set(true);
    const base = environment.apiUrl;

    forkJoin({
      costs: this.http.get<{ success: boolean; data: TenantCostSummary }>(`${base}/ai-governance/ops/cost-summary`, {
        params: { period: this.period() },
      }).pipe(catchError(() => of({ success: false, data: null }))),
      budget: this.http.get<{ success: boolean; data: { monthlyLimit: number } }>(`${base}/ai-governance/ops/budget`).pipe(
        catchError(() => of({ success: false, data: { monthlyLimit: 0 } })),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res.costs.data) {
          this.summary.set(res.costs.data);
        }
        if (res.budget.data) {
          this.budgetLimit.set(res.budget.data.monthlyLimit);
        }
        this.loading.set(false);
      });
  }

  onPeriodChange(p: '7d' | '30d' | '90d'): void {
    this.period.set(p);
    this.loadCostData();
  }

  budgetPercent(): number {
    const s = this.summary();
    const limit = this.budgetLimit();
    if (!s || !limit) return 0;
    return Math.min(100, Math.round((s.totalCostUsd / limit) * 100));
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
  }

  formatNumber(val: number): string {
    return new Intl.NumberFormat('en-US').format(val);
  }
}
