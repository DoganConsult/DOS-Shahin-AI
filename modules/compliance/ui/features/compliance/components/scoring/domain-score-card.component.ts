import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainSummaryDto } from '../../models/compliance.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-domain-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div tabindex="0" role="button" (keyup.enter)="open.emit(domain.nodeId)" class="dom-card" [style.borderLeftColor]="heatColor(domain.score)" (click)="open.emit(domain.nodeId)">
      <div class="dom-header">
        <span class="dom-title">{{ isAr ? domain.titleAr : domain.titleEn }}</span>
        <span class="dom-score" [style.color]="heatColor(domain.score)">{{ domain.score }}%</span>
      </div>
      <div class="dom-maturity" *ngIf="domain.maturityLevel">
        <span class="dom-maturity-label">Maturity:</span>
        <span class="dom-maturity-value">{{ domain.maturityLevel }}</span>
        <span class="dom-maturity-score" *ngIf="domain.maturityScore != null">({{ domain.maturityScore }}%)</span>
      </div>
      <div class="dom-fw">{{ domain.frameworkName }}</div>
      <div class="dom-meta">
        <span>{{ domain.obligationsCount }} obligations</span>
        <span>{{ domain.controlsMapped }} controls</span>
        <span *ngIf="domain.openGaps">{{ domain.openGaps }} gaps</span>
      </div>
    </div>
  `,
  styles: [`
    .dom-card {
      padding: 14px 16px; border-radius: var(--radius); cursor: pointer;
      border: 1px solid var(--surface-border, var(--border-subtle));
      border-inline-start: 4px solid var(--text-muted);
      background: var(--surface-card, #fff);
      transition: box-shadow .2s;
    }
    .dom-card:hover { box-shadow: var(--shadow-md); }
    .dom-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .dom-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-color, #111); }
    .dom-score { font-size: var(--font-size-base); font-weight: 800; }
    .dom-fw { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); margin-bottom: 8px; }
    .dom-maturity { font-size: var(--font-size-xs); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .dom-maturity-label { color: var(--text-color-secondary, var(--text-muted)); }
    .dom-maturity-value { font-weight: 700; color: var(--primary); }
    .dom-maturity-score { color: var(--text-color-secondary, var(--text-muted)); }
    .dom-meta { display: flex; gap: 10px; font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
  `]
})
export class DomainScoreCardComponent {
  @Input() domain!: DomainSummaryDto;
  @Input() isAr = false;
  @Output() open = new EventEmitter<string>();

  heatColor(score: number): string {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ca8a04';
    if (score >= 40) return '#ea580c';
    return 'var(--error)';
  }
}
