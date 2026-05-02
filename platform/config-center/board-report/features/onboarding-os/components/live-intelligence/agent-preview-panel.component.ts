import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AgentPreview {
  agent_code: string;
  agent_name_en: string;
  agent_name_ar: string;
  status: 'idle' | 'analyzing' | 'ready';
  description_en: string;
  description_ar: string;
}

@Component({
    selector: 'app-agent-preview-panel',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="agent-preview" *ngIf="agents.length > 0" [class.rtl]="lang === 'ar'">
      <div class="agent-preview-header">
        <span class="agent-pulse" [class.active]="hasActiveAgents"></span>
        <span class="agent-title">{{ lang === 'ar' ? 'وكلاء شاهين' : "Shahin's AI Agents" }}</span>
        <span class="agent-count">{{ activeCount }}/{{ agents.length }}</span>
      </div>
      <div class="agent-list">
        <div *ngFor="let agent of agents; let i = index"
          class="agent-item"
          [class.analyzing]="agent.status === 'analyzing'"
          [class.ready]="agent.status === 'ready'"
          [style.animation-delay]="(i * 60) + 'ms'">
          <div class="agent-icon">
            <i class="pi" [ngClass]="getAgentIcon(agent.agent_code)"></i>
          </div>
          <div class="agent-info">
            <span class="agent-name">{{ lang === 'ar' ? agent.agent_name_ar : agent.agent_name_en }}</span>
            <span class="agent-status-text">
              <ng-container [ngSwitch]="agent.status">
                <span *ngSwitchCase="'analyzing'"><i class="pi pi-spin pi-spinner"></i> {{ lang === 'ar' ? 'يحلل...' : 'Analyzing...' }}</span>
                <span *ngSwitchCase="'ready'"><i class="pi pi-check-circle"></i> {{ lang === 'ar' ? 'جاهز' : 'Ready' }}</span>
                <span *ngSwitchDefault>{{ lang === 'ar' ? 'في الانتظار' : 'Standing by' }}</span>
              </ng-container>
              <span class="agent-readiness-badge" *ngIf="getAgentReadiness(agent.agent_code) as r">{{ r }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .agent-preview {
      border-top: 1px solid var(--glass-border, rgba(var(--color-gray-carbon-rgb), 0.4));
      padding: 0.75rem 1rem;
    }
    .agent-preview-header {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: var(--font-size-caption); font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--text-heading);
      margin-bottom: 0.5rem;
    }
    .agent-pulse {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--text-muted); flex-shrink: 0;
    }
    .agent-pulse.active {
      background: var(--status-success, #24a148);
      animation: agent-pulse-ring 1.5s ease infinite;
    }
    .agent-count {
      margin-inline-start: auto;
      font-size: var(--font-size-2xs); font-weight: 700;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      color: var(--primary); padding: 0.1rem 0.4rem;
      border-radius: var(--radius-pill, 20px);
    }
    .agent-list { display: flex; flex-direction: column; gap: 0.25rem; }
    .agent-item {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.35rem 0.5rem; border-radius: var(--radius-sm, 6px);
      transition: background 200ms;
      animation: agent-fade-in 0.3s ease both;
    }
    .agent-item.analyzing { background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.06)); }
    .agent-item.ready { background: rgba(var(--success-rgb), 0.04); }
    .agent-icon {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--surface-ground, #f8fafc);
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-xs); color: var(--primary); flex-shrink: 0;
    }
    .agent-item.ready .agent-icon { color: var(--status-success, #24a148); }
    .agent-info { display: flex; flex-direction: column; min-width: 0; }
    .agent-name {
      font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .agent-status-text {
      font-size: var(--font-size-2xs); color: var(--text-muted);
      display: flex; align-items: center; gap: 0.2rem;
    }
    .agent-status-text i { font-size: 0.6rem; }
    .agent-item.ready .agent-status-text { color: var(--status-success, #24a148); }
    .agent-item.analyzing .agent-status-text { color: var(--primary); }
    .agent-readiness-badge {
      font-size: 0.55rem; font-weight: 700; padding: 0.05rem 0.3rem;
      border-radius: 3px; background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      color: var(--primary); margin-inline-start: 0.25rem;
    }
    .rtl { direction: rtl; }
    @keyframes agent-pulse-ring {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.6); opacity: 0.4; }
    }
    @keyframes agent-fade-in {
      from { opacity: 0; transform: translateX(-4px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .agent-pulse.active, .agent-item { animation: none !important; }
    }
  `]
})
export class AgentPreviewPanelComponent {
  @Input() agents: AgentPreview[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() readiness: Record<string, unknown> | null = null;

  private static readonly AGENT_ICONS: Record<string, string> = {
    A01: 'pi-eye', A02: 'pi-shield', A03: 'pi-sitemap',
    A04: 'pi-list', A05: 'pi-folder', A06: 'pi-chart-bar',
    A07: 'pi-exclamation-triangle', A08: 'pi-users', A09: 'pi-bolt', A10: 'pi-android',
  };

  get hasActiveAgents(): boolean {
    return this.agents.some(a => a.status === 'analyzing' || a.status === 'ready');
  }

  get activeCount(): number {
    return this.agents.filter(a => a.status === 'analyzing' || a.status === 'ready').length;
  }

  getAgentIcon(code: string): string {
    return AgentPreviewPanelComponent.AGENT_ICONS[code] ?? 'pi-android';
  }

  getAgentReadiness(code: string): string | null {
    if (!this.readiness) return null;
    const agents = (this.readiness as any)?.agents;
    if (!Array.isArray(agents)) return null;
    const agent = agents.find((a: any) => a.agent_code === code);
    return agent?.readiness_label ?? null;
  }
}

export { AgentPreview };
