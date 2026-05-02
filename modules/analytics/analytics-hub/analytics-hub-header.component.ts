import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AgentBadgeComponent } from '../../shared/agent-badge/agent-badge.component';

const HUB_HEADER_STYLES = `
  .hub-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 28px 0}
  .hub-title-row{display:flex;align-items:center;gap:14px}
  .hub-icon-wrap{width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .hub-icon{font-size: var(--font-size-2xl)}
  .hub-phase{display:inline-block;font-size: var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:var(--radius-xl);margin-bottom:4px}
  h1{margin:0;font-size: var(--font-size-2xl);font-weight:600;color:var(--text-heading,#111)}
  .hub-subtitle{margin:2px 0 0;font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
  .hub-icon-wrap--improve{background:color-mix(in srgb, var(--primary) 12%, transparent)}
  .hub-icon--improve{color:var(--primary)}
  .hub-phase--improve{background:color-mix(in srgb, var(--primary) 12%, transparent);color:var(--primary)}
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-analytics-hub-header',
  standalone: true,
  imports: [CommonModule, AgentBadgeComponent],
  styles: [HUB_HEADER_STYLES],
  template: `
    <header class="hub-header">
      <div class="hub-title-row">
        <div class="hub-icon-wrap hub-icon-wrap--improve"><i class="pi pi-chart-bar hub-icon hub-icon--improve"></i></div>
        <div>
          <div class="hub-phase hub-phase--improve">{{ i18n.currentLang()==='ar' ? 'التحسين' : 'Improve' }}</div>
          <h1>{{ i18n.currentLang()==='ar' ? 'مركز التحليلات' : 'Analytics Hub' }}</h1>
          <p class="hub-subtitle">{{ i18n.currentLang()==='ar' ? 'التحليلات، لوحات المعلومات المشتركة، مشاركة اللوحات واستكشاف البيانات.' : 'Analytics, shared dashboards, dashboard sharing and data explorer.' }}</p>
        </div>
      </div>
      <app-agent-badge [agentId]="agentId" />
    </header>
  `,
})
export class AnalyticsHubHeaderComponent {
  protected readonly i18n = inject(I18nService);

  @Input() agentId = 'A01';
}