import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { interval, Subscription } from 'rxjs';

interface AgentHealth {
  agentId: string;
  name: string;
  lastRunStatus: string | null;
  runsLast24h: number;
  errorsLast24h: number;
}

interface CockpitSnapshot {
  platformMode: string;
  temporalEnabled: boolean;
  langgraphEnabled: boolean;
  agents: AgentHealth[];
  agentSummary: { totalAgents: number; activeInLast24h: number; errorRate: number };
  sla: { openTasks: number; breachedTasks: number; warningTasks: number };
  memory: { totalMemories: number; memoriesLast24h: number };
  proposals: { pendingApproval: number; executedLast24h: number; rejectedLast24h: number };
}

@Component({
  selector: 'app-ai-cockpit-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cockpit-widget">
      <div class="cockpit-header">
        <span class="cockpit-icon">&#x1F916;</span>
        <span class="cockpit-title">{{ i18n.localize('AI OS Cockpit', 'قمرة قيادة الذكاء الاصطناعي') }}</span>
        <span class="cockpit-mode" [class]="'mode-' + (snapshot?.platformMode || 'any')">
          {{ snapshot?.platformMode || '...' }}
        </span>
      </div>

      <div class="cockpit-grid" *ngIf="snapshot; else loadingTpl">
        <!-- Agent Summary -->
        <div class="cockpit-card">
          <div class="cockpit-value">{{ snapshot.agentSummary.activeInLast24h }}/{{ snapshot.agentSummary.totalAgents }}</div>
          <div class="cockpit-label">{{ i18n.localize('Active Agents (24h)', 'الوكلاء النشطون') }}</div>
        </div>
        <div class="cockpit-card" [class.cockpit-alert]="snapshot.agentSummary.errorRate > 0.1">
          <div class="cockpit-value">{{ (snapshot.agentSummary.errorRate * 100) | number:'1.0-1' }}%</div>
          <div class="cockpit-label">{{ i18n.localize('Error Rate', 'معدل الأخطاء') }}</div>
        </div>

        <!-- Proposals -->
        <div class="cockpit-card" [class.cockpit-pending]="snapshot.proposals.pendingApproval > 0">
          <div class="cockpit-value">{{ snapshot.proposals.pendingApproval }}</div>
          <div class="cockpit-label">{{ i18n.localize('Pending Approval', 'في انتظار الموافقة') }}</div>
        </div>
        <div class="cockpit-card">
          <div class="cockpit-value">{{ snapshot.proposals.executedLast24h }}</div>
          <div class="cockpit-label">{{ i18n.localize('Executed (24h)', 'تم تنفيذها') }}</div>
        </div>

        <!-- SLA -->
        <div class="cockpit-card" [class.cockpit-alert]="snapshot.sla.breachedTasks > 0">
          <div class="cockpit-value">{{ snapshot.sla.breachedTasks }}</div>
          <div class="cockpit-label">{{ i18n.localize('SLA Breaches', 'تجاوزات SLA') }}</div>
        </div>

        <!-- Memory -->
        <div class="cockpit-card">
          <div class="cockpit-value">{{ snapshot.memory.memoriesLast24h }}</div>
          <div class="cockpit-label">{{ i18n.localize('New Memories (24h)', 'ذكريات جديدة') }}</div>
        </div>
      </div>

      <!-- Agent Status Grid -->
      <div class="agent-grid" *ngIf="snapshot">
        <div class="agent-row" *ngFor="let agent of snapshot.agents">
          <span class="agent-id">{{ agent.agentId }}</span>
          <span class="agent-name">{{ agent.name }}</span>
          <span class="agent-status" [class]="'status-' + (agent.lastRunStatus || 'idle')">
            {{ agent.lastRunStatus || 'idle' }}
          </span>
          <span class="agent-runs">{{ agent.runsLast24h }} runs</span>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="cockpit-loading">{{ i18n.localize('Loading cockpit...', 'جارٍ تحميل القمرة...') }}</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .cockpit-widget { padding: 16px; }
    .cockpit-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .cockpit-icon { font-size: var(--font-size-xl); }
    .cockpit-title { font-weight: 600; font-size: var(--font-size-base); flex: 1; }
    .cockpit-mode { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 600; text-transform: uppercase; }
    .mode-human { background: #dbeafe; color: #1d4ed8; }
    .mode-hybrid { background: #fef3c7; color: #92400e; }
    .mode-shadow_agent { background: #e0e7ff; color: #3730a3; }
    .mode-full_autonomous { background: #d1fae5; color: #065f46; }
    .cockpit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .cockpit-card { padding: 10px; border-radius: var(--radius); background: var(--surface-card, #f8f9fa); text-align: center; }
    .cockpit-value { font-size: var(--font-size-xl); font-weight: 700; color: var(--primary-color, #0ea5e9); }
    .cockpit-label { font-size: var(--font-size-nano); color: var(--text-color-secondary, #6b7280); margin-top: 2px; }
    .cockpit-alert { background: #fef2f2; }
    .cockpit-alert .cockpit-value { color: #ef4444; }
    .cockpit-pending { background: #fffbeb; }
    .cockpit-pending .cockpit-value { color: #f59e0b; }
    .agent-grid { border-top: 1px solid var(--surface-border, #e5e7eb); padding-top: 12px; }
    .agent-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: var(--font-size-sm); }
    .agent-id { font-weight: 700; width: 30px; color: var(--primary-color); }
    .agent-name { flex: 1; }
    .agent-status { font-size: var(--font-size-nano); padding: 1px 6px; border-radius: var(--radius); }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fef2f2; color: #ef4444; }
    .status-running { background: #dbeafe; color: #1d4ed8; }
    .status-idle { background: #f3f4f6; color: #6b7280; }
    .agent-runs { font-size: var(--font-size-nano); color: var(--text-color-secondary); }
    .cockpit-loading { text-align: center; padding: 24px; color: var(--text-color-secondary); }
  `],
})
export class AiCockpitWidgetComponent implements OnInit, OnDestroy {
  snapshot: CockpitSnapshot | null = null;
  private refreshSub?: Subscription;

  constructor(private http: HttpClient, public i18n: I18nService) {}

  ngOnInit(): void {
    this.loadSnapshot();
    this.refreshSub = interval(30000).subscribe(() => this.loadSnapshot());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadSnapshot(): void {
    this.http.get<CockpitSnapshot>('/api/ai-os/cockpit').subscribe({
      next: (data) => { this.snapshot = data; },
      error: () => { /* silent — widget shows loading state */ },
    });
  }
}
