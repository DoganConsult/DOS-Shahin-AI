// AI Cockpit — Agent Budget page.
// Phase 2 i18n + API hardening: dynamic I18nService bindings (RTL via
// dir, EN/AR labels), real fetch via ApiClientService on init, explicit
// loading/error/empty/data states, no placeholder copy.

import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/blueprint/core/services/api-client.service';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';

interface BudgetRow {
  agentId: string;
  agentName: string;
  monthlyLimitUsd: number;
  spentUsd: number;
  remainingUsd: number;
  utilizationPct: number;
  status: 'healthy' | 'warning' | 'critical';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-agent-budget',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, TagModule, ProgressBarModule],
  templateUrl: './agent-budget.component.html',
})
export class AgentBudgetComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiClientService);

  readonly rows = signal<BudgetRow[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error' | 'empty'>('loading');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<{ data?: BudgetRow[] }>('/ai-enhanced/budgets').subscribe({
      next: (res) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        this.rows.set(data);
        this.state.set(data.length === 0 ? 'empty' : 'ready');
      },
      error: (err) => {
        this.error.set(err?.message ?? String(err));
        this.state.set('error');
      },
    });
  }

  severity(s: BudgetRow['status']): 'success' | 'warn' | 'danger' {
    return s === 'healthy' ? 'success' : s === 'warning' ? 'warn' : 'danger';
  }
}
