/**
 * SoD Analytics Tab — Dumb sub-component
 * Renders the trends chart, days selector, and conflict patterns accordion
 * for the SoD Conflicts "Trends & Analytics" tab.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { ChartModule } from 'primeng/chart';
import { AccordionModule } from 'primeng/accordion';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sod-analytics-tab',
    imports: [CommonModule, FormsModule, ButtonModule, DropdownModule, ChartModule, AccordionModule],
    template: `
    <div class="analytics-section">
      <div class="analytics-controls">
        <p-button
          [label]="i18n.translate('Load Trends')"
          icon="pi pi-chart-line"
          (onClick)="loadTrends.emit()"
          [loading]="loadingTrends" />
        <p-dropdown
          [ngModel]="trendDays"
          [options]="trendDaysOptions"
          (onChange)="trendDaysChange.emit($event.value)"
          styleClass="trend-days-dropdown" />
      </div>
      <div class="trend-chart" *ngIf="trendsData">
        <p-chart type="line" [data]="trendsData" [options]="chartOptions" />
      </div>
      <div class="patterns-section" *ngIf="patterns.length > 0">
        <h3>{{ i18n.translate('Conflict Patterns') }}</h3>
        <p-accordion>
          <p-accordionTab *ngFor="let pattern of patterns" [header]="pattern.description">
            <div class="pattern-details">
              <p><strong>{{ i18n.translate('Pattern Type') }}:</strong> {{ pattern.patternType }}</p>
              <p><strong>{{ i18n.translate('Severity') }}:</strong> {{ pattern.severity }}</p>
              <p><strong>{{ i18n.translate('Affected Conflicts') }}:</strong> {{ pattern.affectedConflicts.length }}</p>
            </div>
          </p-accordionTab>
        </p-accordion>
      </div>
    </div>
  `,
    styles: [`
    .analytics-section { display: flex; flex-direction: column; gap: 16px; }
    .analytics-controls { display: flex; gap: 10px; align-items: center; }
    .trend-chart { padding: 16px; background: var(--surface-card, #fff); border-radius: var(--radius-md); }
    .patterns-section { margin-top: 16px; }
    .pattern-details { display: flex; flex-direction: column; gap: 8px; }
  `]
})
export class SodAnalyticsTabComponent {
  readonly i18n = inject(I18nService);

  @Input() loadingTrends = false;
  @Input() trendDays = 30;
  @Input() trendsData: GrcRecord | null = null;
  @Input() patterns: GrcRecord[] = [];
  @Input() trendDaysOptions: { label: string; value: number }[] = [];
  @Input() chartOptions: Record<string, unknown> = {};

  @Output() loadTrends = new EventEmitter<void>();
  @Output() trendDaysChange = new EventEmitter<number>();
}
