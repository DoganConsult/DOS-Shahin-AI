import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EChartComponent } from '../../../charts/echart.component';
import { LifecycleProcessChartComponent, type LifecycleTransitionInput } from '../../../charts/lifecycle-process-chart.component';
import { AgentStatusBadgeComponent, type AgentInfo } from '../../status-indicators/badges/agent-status-badge.component';
import { WorkflowTierIndicatorComponent } from '../../status-indicators/workflow-tier-indicator.component';
import { EntityWorkflowPanelComponent } from '../../entity/entity-workflow-panel.component';
import { ConfidenceHeatmapComponent, type HeatmapDimension } from '../../status-indicators/confidence-heatmap.component';
import { ModuleAiPulseComponent } from '../../../widgets/presentation/pulse-refresh/module-ai-pulse.component';
import { QuickLinkChipComponent } from '../../grc-core/quick-link-chip.component';
import { buildGrcTimelineOptions, type TimelineEvent } from '../../../charts/echarts/workflow-timeline/grc-timeline.options';
import { buildTrendLineOptions, type TrendSeries } from '../../../charts/echarts/kpi-misc/trend-line.options';
import { buildWorkflowSankeyOptions, type SankeyNode, type SankeyLink } from '../../../charts/echarts/workflow-timeline/workflow-sankey.options';

export interface ModuleOverviewKitConfig {
  moduleCode: string;
  tier: 'full' | 'domain' | 'platform';
  automationLevel: 'full' | 'semi' | 'manual' | null;
  slaHours: number | null;
  transitions: LifecycleTransitionInput[];
  currentStatus?: string;
  agents: AgentInfo[];
  confidenceDimensions?: HeatmapDimension[];
  timelineEvents?: TimelineEvent[];
  trendSeries?: TrendSeries[];
  sankeyNodes?: SankeyNode[];
  sankeyLinks?: SankeyLink[];
  crossModuleLinks?: Array<{ entityType: string; entityId: string; targetType: string; count: number; icon: string }>;
  lang?: 'en' | 'ar';
}

@Component({
    selector: 'app-module-overview-kit',
    imports: [
        CommonModule, EChartComponent, LifecycleProcessChartComponent,
        AgentStatusBadgeComponent, WorkflowTierIndicatorComponent,
        EntityWorkflowPanelComponent, ConfidenceHeatmapComponent,
        ModuleAiPulseComponent, QuickLinkChipComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="mok" [attr.dir]="config.lang === 'ar' ? 'rtl' : 'ltr'">

      <div class="mok-meta-strip">
        <app-workflow-tier-indicator
          [tier]="config.tier"
          [automationLevel]="config.automationLevel"
          [slaHours]="config.slaHours" />
        <div class="mok-agents" *ngIf="config.agents.length > 0">
          <app-agent-status-badge
            *ngFor="let agent of config.agents; trackBy: trackAgent"
            [agent]="agent"
            [isAr]="config.lang === 'ar'" />
        </div>
      </div>

      <div class="mok-grid">
        <div class="mok-col mok-col--main">
          <ng-content></ng-content>

          <div class="mok-section" *ngIf="config.transitions.length > 0">
            <app-lifecycle-process-chart
              [label]="(config.lang === 'ar' ? 'دورة حياة ' : 'Lifecycle: ') + config.moduleCode"
              [transitions]="config.transitions"
              [currentStatus]="config.currentStatus"
              height="260px" />
          </div>

          <div class="mok-section" *ngIf="timelineOptions && hasTimelineData">
            <div class="mok-section-header">
              <i class="pi pi-calendar"></i>
              <span>{{ config.lang === 'ar' ? 'الجدول الزمني' : 'Timeline' }}</span>
            </div>
            <app-echart [options]="timelineOptions" height="240px" />
          </div>

          <div class="mok-section" *ngIf="trendOptions && hasTrendData">
            <div class="mok-section-header">
              <i class="pi pi-chart-line"></i>
              <span>{{ config.lang === 'ar' ? 'الاتجاهات' : 'Trends' }}</span>
            </div>
            <app-echart [options]="trendOptions" height="240px" />
          </div>

          <div class="mok-section" *ngIf="sankeyOptions && hasSankeyData">
            <div class="mok-section-header">
              <i class="pi pi-share-alt"></i>
              <span>{{ config.lang === 'ar' ? 'تدفق العمليات' : 'Process Flow' }}</span>
            </div>
            <app-echart [options]="sankeyOptions" height="280px" />
          </div>
        </div>

        <aside class="mok-col mok-col--rail" *ngIf="config.tier !== 'platform'">
          <app-module-ai-pulse [moduleCode]="config.moduleCode" [lang]="config.lang || 'en'" />

          <div class="mok-section" *ngIf="config.confidenceDimensions?.length">
            <app-confidence-heatmap
              [dimensions]="config.confidenceDimensions!"
              layout="compact"
              [lang]="config.lang || 'en'" />
          </div>

          <app-entity-workflow-panel [moduleCode]="config.moduleCode" />

          <div class="mok-links" *ngIf="config.crossModuleLinks?.length">
            <div class="mok-section-header">
              <i class="pi pi-link"></i>
              <span>{{ config.lang === 'ar' ? 'روابط الوحدات' : 'Cross-Module Links' }}</span>
            </div>
            <div class="mok-link-chips">
              <app-quick-link-chip
                *ngFor="let link of config.crossModuleLinks"
                [entityType]="link.entityType"
                [entityId]="link.entityId"
                [targetType]="link.targetType"
                [count]="link.count"
                [icon]="link.icon" />
            </div>
          </div>

          <ng-content select="[railContent]"></ng-content>
        </aside>
      </div>
    </div>
  `,
    styles: [`
    .mok { display: flex; flex-direction: column; gap: var(--cds-spacing-05); }
    .mok-meta-strip {
      display: flex; align-items: center; gap: var(--cds-spacing-04); flex-wrap: wrap;
      padding: var(--cds-spacing-03) 0; border-bottom: 1px solid var(--shell-card-border);
    }
    .mok-agents { display: flex; gap: var(--cds-spacing-02); flex-wrap: wrap; margin-inline-start: auto; }
    .mok-grid { display: grid; grid-template-columns: 1fr 300px; gap: var(--cds-spacing-05); }
    .mok-col--main { display: flex; flex-direction: column; gap: var(--cds-spacing-05); min-width: 0; }
    .mok-col--rail { display: flex; flex-direction: column; gap: var(--cds-spacing-04); }
    .mok-section {
      background: var(--shell-card-bg);
      border: 1px solid var(--shell-card-border);
      border-radius: var(--radius);
      padding: var(--cds-spacing-04);
    }
    .mok-section-header {
      display: flex; align-items: center; gap: var(--cds-spacing-02);
      font-size: var(--font-size-tag); font-weight: 700; margin-bottom: var(--cds-spacing-03);
      color: var(--shell-text-primary);
    }
    .mok-section-header .pi { color: var(--cds-interactive); font-size: var(--font-size-tag); }
    .mok-links { }
    .mok-link-chips { display: flex; flex-wrap: wrap; gap: var(--cds-spacing-02); margin-top: var(--cds-spacing-02); }
    @media (max-width: 1024px) {
      .mok-grid { grid-template-columns: 1fr; }
      .mok-col--rail { order: -1; }
    }
    @media (max-width: 768px) {
      .mok-meta-strip { flex-direction: column; align-items: flex-start; }
      .mok-agents { margin-inline-start: 0; }
    }
  `]
})
export class ModuleOverviewKitComponent {
  @Input() config: ModuleOverviewKitConfig = {
    moduleCode: '', tier: 'platform', automationLevel: null,
    slaHours: null, transitions: [], agents: [],
  };

  trackAgent = (_: number, a: AgentInfo) => a.id;

  get timelineOptions(): Record<string, any> | null {
    if (!this.config.timelineEvents?.length) return null;
    return buildGrcTimelineOptions(this.config.timelineEvents);
  }

  get hasTimelineData(): boolean {
    return !!(this.config.timelineEvents?.length);
  }

  get trendOptions(): Record<string, any> | null {
    if (!this.config.trendSeries?.length) return null;
    return buildTrendLineOptions(this.config.trendSeries);
  }

  get hasTrendData(): boolean {
    return !!(this.config.trendSeries?.length);
  }

  get sankeyOptions(): Record<string, any> | null {
    if (!this.config.sankeyNodes?.length || !this.config.sankeyLinks?.length) return null;
    return buildWorkflowSankeyOptions(this.config.sankeyNodes, this.config.sankeyLinks);
  }

  get hasSankeyData(): boolean {
    return !!(this.config.sankeyNodes?.length && this.config.sankeyLinks?.length);
  }
}
