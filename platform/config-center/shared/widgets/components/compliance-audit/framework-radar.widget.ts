import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RadarChartComponent, RadarAxis } from '../d3-charts';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-framework-radar-widget',
    imports: [CommonModule, RadarChartComponent],
    template: `
    <div class="framework-radar-widget">
      <app-radar-chart
        *ngIf="axes.length"
        [axes]="axes"
        [size]="320"
        color="#3b82f6"
        (axisClicked)="onAxisClick($event)">
      </app-radar-chart>
      <div *ngIf="!axes.length" class="empty-state">{{ i18n.translate('charts.noData') }}</div>
    </div>
  `,
    styles: [`
    .framework-radar-widget { display: flex; flex-direction: column; gap: 12px; }
    .empty-state {
      text-align: center; padding: 40px; color: var(--text-muted); font-size: var(--font-size-base);
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.04));
      border: 1px solid var(--glass-icon-border, rgba(var(--module-accent-sky-rgb), 0.10));
      border-radius: var(--radius, 12px);
    }
  `]
})
export class FrameworkRadarWidget implements OnInit {
  axes: RadarAxis[] = [];

  constructor(public i18n: I18nService, private router: Router, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.complianceSvc.getFrameworks().subscribe({
      next: (frameworks) => {
        if (!frameworks || frameworks.length === 0) { this.axes = []; return; }
        this.axes = frameworks.map(f => ({
          label: f.name,
          value: f.implementedControls || 0,
          max: f.totalControls || 1,
          route: '/frameworks',
        }));
      },
      error: () => { this.axes = []; }
    });
  }

  onAxisClick(axis: RadarAxis): void {
    if (axis.route) this.router.navigateByUrl(axis.route);
  }
}
