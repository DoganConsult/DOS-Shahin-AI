import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrameworkSummaryDto } from '../../models/compliance.models';
import { ButtonModule, ProgressIndicatorModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-framework-card',
  standalone: true,
  imports: [CommonModule, ProgressIndicatorModule, ButtonModule],
  template: `
    <div tabindex="0" role="button" (keyup.enter)="open.emit(fw.frameworkId)" class="fw-card" (click)="open.emit(fw.frameworkId)">
      <div class="fw-card-header">
        <span class="fw-name">{{ fw.frameworkName }}</span>
        <span class="fw-status" [class]="'st-' + fw.status">{{ fw.status }}</span>
      </div>
      <div class="fw-maturity" *ngIf="fw.maturityLevel">
        <span class="fw-maturity-label">Maturity:</span>
        <span class="fw-maturity-value">{{ fw.maturityLevel }}</span>
        <span class="fw-maturity-score" *ngIf="fw.maturityScore != null">({{ fw.maturityScore }}%)</span>
      </div>
      <div class="fw-score-row">
        <cds-progress-bar [value]="fw.score" [showValue]="false" styleClass="fw-bar" />
        <span class="fw-pct" [class.good]="fw.score >= 70" [class.warn]="fw.score >= 40 && fw.score < 70" [class.bad]="fw.score < 40">{{ fw.score }}%</span>
      </div>
      <div class="fw-meta">
        <span><strong>{{ fw.totalControls }}</strong> controls</span>
        <span><strong>{{ fw.implementedControls }}</strong> implemented</span>
        <span><strong>{{ fw.evidenceCoverage }}%</strong> evidence</span>
      </div>
    </div>
  `,
  styles: [`
    .fw-card {
      padding: 16px; border-radius: var(--radius-md); cursor: pointer;
      border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff);
      transition: box-shadow .2s, transform .15s;
    }
    .fw-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .fw-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .fw-name { font-size: var(--font-size-base); font-weight: 700; color: var(--text-color, #111); }
    .fw-status { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-xs); }
    .st-active { background: rgba(var(--color-green-600-rgb), .1); color: var(--success); }
    .st-inactive { background: rgba(var(--module-accent-gray-rgb), .1); color: var(--text-muted); }
    .st-draft { background: rgba(var(--module-accent-blue-rgb), .1); color: var(--primary); }
    .fw-score-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .fw-pct { font-size: var(--font-size-sm); font-weight: 700; min-width: 36px; }
    .fw-pct.good { color: var(--success); } .fw-pct.warn { color: #ca8a04; } .fw-pct.bad { color: var(--error); }
    .fw-meta { display: flex; gap: 12px; font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
    .fw-meta strong { color: var(--text-color, #111); }
    .fw-maturity { font-size: var(--font-size-xs); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .fw-maturity-label { color: var(--text-color-secondary, var(--text-muted)); }
    .fw-maturity-value { font-weight: 700; padding: 2px 6px; border-radius: var(--radius-xs); background: rgba(var(--module-accent-blue-rgb), .12); color: var(--primary); }
    .fw-maturity-score { color: var(--text-color-secondary, var(--text-muted)); }
  `]
})
export class FrameworkStatusCardComponent {
  @Input() fw!: FrameworkSummaryDto;
  @Output() open = new EventEmitter<string>();
}
