import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Shape of a single AI agent card entry. */
export interface AgentCard {
  id: string;
  name: string;
  nameAr: string;
  domain: string;
  domainAr: string;
  icon: string;
  color: string;
}

/**
 * Dumb component: renders the AI Agent Toolkit grid on the dashboard.
 * Receives the agent list via @Input and renders linked cards.
 */
@Component({
  selector: 'app-dashboard-agent-cards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="section-title"><i class="pi pi-microchip-ai"></i> {{ i18n.translate('dashboard.aiAgentNetwork') }}</div>
    <div class="agents-grid">
      <a *ngFor="let agent of agents" [routerLink]="'/ai-hub'" class="agent-card" [style.--agent-color]="agent.color">
        <img loading="eager" [src]="agent.icon" [alt]="agent.name" class="agent-avatar" />
        <div class="agent-info">
          <div class="agent-name">{{ i18n.localize(agent.name, agent.nameAr) }}</div>
          <div class="agent-domain">{{ i18n.localize(agent.domain, agent.domainAr) }}</div>
        </div>
        <div class="agent-id">{{ agent.id }}</div>
      </a>
    </div>
  `,
  styles: [`
    /* Section Title */
    .section-title {
      font-size: var(--font-size-lg); font-weight: var(--font-black); color: var(--text-heading);
      margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);
      letter-spacing: -0.01em;
    }
    .section-title .pi {
      color: var(--primary); font-size: var(--font-size-lg); width: 36px; height: 36px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md); background: var(--glass-icon-bg);
      backdrop-filter: blur(var(--glass-icon-blur)); -webkit-backdrop-filter: blur(var(--glass-icon-blur));
      border: 1px solid var(--glass-icon-border); box-shadow: var(--glass-icon-shadow);
    }

    /* Agent Toolkit Grid */
    .agents-grid {
      display: grid; grid-template-columns: repeat(5, 1fr);
      gap: var(--space-md); margin-bottom: 28px;
    }
    .agent-card {
      display: flex; align-items: center; gap: 10px; padding: var(--space-md);
      background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);
      text-decoration: none; color: inherit; position: relative; overflow: hidden;
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .agent-card::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, var(--agent-color, var(--primary)) 0%, transparent 60%);
      opacity: 0; transition: opacity 250ms;
    }
    .agent-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
    .agent-card:hover::after { opacity: 0.04; }
    .agent-avatar {
      width: 36px; height: 36px; border-radius: var(--radius-pill); object-fit: cover; flex-shrink: 0; position: relative; z-index: var(--z-base);
      border: 2px solid color-mix(in srgb, var(--agent-color, var(--primary)) 20%, transparent);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: var(--shadow-md), inset 0 1px 0 rgba(var(--color-white-rgb), 0.2);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .agent-card:hover .agent-avatar {
      box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(var(--color-white-rgb), 0.3);
      transform: scale(1.1);
    }
    .agent-info { flex: 1; min-width: 0; position: relative; z-index: var(--z-base); }
    .agent-name { font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .agent-domain { font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .agent-id {
      font-size: var(--font-size-xs); font-weight: var(--font-bold); color: var(--agent-color, var(--primary));
      background: color-mix(in srgb, var(--agent-color, var(--primary)) 8%, transparent);
      padding: 2px 6px; border-radius: var(--space-xs); flex-shrink: 0; position: relative; z-index: var(--z-base);
    }

    @media (max-width: 1200px) {
      .agents-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 768px) {
      .agents-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class DashboardAgentCardsComponent {
  readonly i18n = inject(I18nService);

  @Input() agents: AgentCard[] = [];
}
