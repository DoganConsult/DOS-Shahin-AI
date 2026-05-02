import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AnimatedBarChartComponent, BarItem } from '../d3-charts';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

const FRAMEWORK_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#14b8a6'];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-control-progress-widget',
    imports: [CommonModule, AnimatedBarChartComponent],
    template: `
    <div class="control-progress-widget">
      <app-animated-bar-chart
        *ngIf="items.length"
        [items]="items"
        [width]="440"
        [height]="240"
        [horizontal]="true"
        (barClicked)="onBarClick($event)">
      </app-animated-bar-chart>
      <div *ngIf="!items.length" class="empty-state">{{ i18n.translate('charts.noData') }}</div>
    </div>
  `,
    styles: [`
    .control-progress-widget { display: flex; flex-direction: column; gap: 12px; }
    .empty-state {
      text-align: center; padding: 40px; color: var(--text-muted); font-size: var(--font-size-base);
      background: var(--glass-icon-bg, rgba(var(--module-accent-sky-rgb), 0.04));
      border: 1px solid var(--glass-icon-border, rgba(var(--module-accent-sky-rgb), 0.10));
      border-radius: var(--radius, 12px);
    }
  `]
})
export class ControlProgressWidget implements OnInit {
  items: BarItem[] = [];

  constructor(public i18n: I18nService, private router: Router, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.complianceSvc.getFrameworks().subscribe({
      next: (frameworks) => {
        if (!frameworks || frameworks.length === 0) { this.items = []; return; }
        this.items = frameworks.map((f, i) => ({
          label: f.name,
          value: f.totalControls > 0 ? Math.round((f.implementedControls / f.totalControls) * 100) : 0,
          color: FRAMEWORK_COLORS[i % FRAMEWORK_COLORS.length],
          route: '/frameworks',
        }));
      },
      error: () => { this.items = []; }
    });
  }

  onBarClick(item: BarItem): void {
    if (item.route) this.router.navigateByUrl(item.route);
  }
}
