/**
 * Framework Report Card — Single card for Report Hub grid.
 * Colored header, radial progress, sparkline trend, KPIs, View Report / Details.
 */

import { Component, Input, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProgressRingChartComponent } from '@app/shared/widgets/d3-charts/progress-ring-chart.component';
import { SparklineChartComponent } from '@app/shared/widgets/d3-charts/sparkline-chart.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';

export interface FrameworkCardModel {
  frameworkId: string;
  frameworkName: string;
  category: string;
  score: number;
  applicableControls: number;
  evidenceSubmitted: number;
  topGaps: number;
  pendingTasks: number;
  trendData: number[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-framework-report-card',
    imports: [
        CommonModule,
        RouterLink,
        CardModule,
        ButtonModule,
        ProgressRingChartComponent,
        SparklineChartComponent,
    ],
    templateUrl: './framework-report-card.component.html',
    styleUrls: ['./framework-report-card.component.scss']
})
export class FrameworkReportCardComponent {
  @Input() card!: FrameworkCardModel;
  i18n = inject(I18nService);
  auth = inject(SessionService);

  /** Map category to header CSS class for colored band */
  get headerClass(): string {
    const c = (this.card?.category || 'compliance').toLowerCase();
    if (c.includes('cyber') || c.includes('security')) return 'card-header--blue';
    if (c.includes('privacy') || c.includes('data')) return 'card-header--purple';
    if (c.includes('risk')) return 'card-header--orange';
    if (c.includes('governance')) return 'card-header--teal';
    if (c.includes('audit')) return 'card-header--red';
    return 'card-header--default';
  }

  /** Segmented bar: implemented vs gaps (for display) */
  get implementedCount(): number {
    const t = this.card;
    if (!t) return 0;
    return Math.max(0, (t.applicableControls || 0) - (t.topGaps || 0));
  }

  get gapsCount(): number {
    return this.card?.topGaps ?? 0;
  }

  get implementedPercent(): number {
    const total = this.card?.applicableControls || 0;
    if (total <= 0) return 0;
    return Math.round((this.implementedCount / total) * 100);
  }
}
