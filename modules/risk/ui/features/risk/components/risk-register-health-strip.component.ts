import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Presentational component: renders the KPI health-strip cards
 * (Total Risks, Critical, High, Overdue Treatments, No Owner).
 * Emits filter/clear events upward to the parent orchestrator.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-register-health-strip',
    imports: [CommonModule],
    template: `
    <div class="health-strip">
      <div tabindex="0" role="button" (keyup.enter)="clearFilters.emit()" class="health-card" (click)="clearFilters.emit()">
        <div class="health-value">{{ total }}</div>
        <div class="health-label">{{ labels.totalRisks }}</div>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="healthFilter.emit('critical')" class="health-card" (click)="healthFilter.emit('critical')">
        <div class="health-value" style="color:var(--error)">{{ critical }}</div>
        <div class="health-label">{{ labels.criticalLabel }}</div>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="healthFilter.emit('high')" class="health-card" (click)="healthFilter.emit('high')">
        <div class="health-value" style="color:#d97706">{{ high }}</div>
        <div class="health-label">{{ labels.highLabel }}</div>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="healthFilter.emit('overdue')" class="health-card" (click)="healthFilter.emit('overdue')">
        <div class="health-value" style="color:var(--warning)">{{ overdueTreatments }}</div>
        <div class="health-label">{{ labels.overdueTreat }}</div>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="healthFilter.emit('noowner')" class="health-card" (click)="healthFilter.emit('noowner')">
        <div class="health-value" style="color:#6b7280">{{ noOwner }}</div>
        <div class="health-label">{{ labels.noOwner }}</div>
      </div>
    </div>
  `,
    styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; text-align: center; padding: 14px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: box-shadow .15s; }
    .health-card:hover { box-shadow: var(--shadow-card); }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
  `]
})
export class RiskRegisterHealthStripComponent {
  /** KPI values */
  @Input() total = 0;
  @Input() critical = 0;
  @Input() high = 0;
  @Input() overdueTreatments = 0;
  @Input() noOwner = 0;

  /** Localized label bag */
  @Input() labels: { totalRisks: string; criticalLabel: string; highLabel: string; overdueTreat: string; noOwner: string } = {
    totalRisks: 'Total Risks', criticalLabel: 'Critical', highLabel: 'High', overdueTreat: 'Overdue Treat.', noOwner: 'No Owner',
  };

  /** Emits the health filter level (critical | high | overdue | noowner) */
  @Output() healthFilter = new EventEmitter<string>();

  /** Emits when user clicks Total to clear all filters */
  @Output() clearFilters = new EventEmitter<void>();
}
