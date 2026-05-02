import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeverityChipComponent } from '../scoring/severity-chip.component';
import { ComplianceGapDto } from '../../models/compliance.models';
import { ComplianceLabels } from '../../config/compliance.labels.en';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-remediation-board',
  standalone: true,
  imports: [CommonModule, SeverityChipComponent],
  template: `
    <div class="rem-board">
      <div class="rem-col" *ngFor="let col of columns">
        <div class="rem-col-header" [style.borderTopColor]="col.color">
          <span class="rem-col-title">{{ col.label }}</span>
          <span class="rem-col-count">{{ col.items.length }}</span>
        </div>
        <div class="rem-col-body">
          <div tabindex="0" role="button" (keyup.enter)="openGap.emit(gap.gapId)" class="rem-card" *ngFor="let gap of col.items" (click)="openGap.emit(gap.gapId)">
            <compliance-severity-chip [severity]="gap.severity" />
            <span class="rem-card-title">{{ gap.title }}</span>
            <span class="rem-card-fw" *ngIf="gap.frameworkName">{{ gap.frameworkName }}</span>
          </div>
          <div class="rem-empty" *ngIf="col.items.length === 0">—</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rem-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; min-height: 200px; }
    @media (max-width: 900px) { .rem-board { grid-template-columns: repeat(2, 1fr); } }
    .rem-col { border-radius: var(--radius); border: 1px solid var(--surface-border, var(--border-subtle)); border-top: 3px solid var(--text-muted); background: var(--surface-50, #f9fafb); }
    .rem-col-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--surface-200, var(--border-subtle)); }
    .rem-col-title { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; color: var(--text-color, #111); }
    .rem-col-count { font-size: var(--font-size-xs); font-weight: 700; background: var(--surface-200, var(--border-subtle)); padding: 2px 8px; border-radius: var(--radius-md); }
    .rem-col-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 400px; overflow-y: auto; }
    .rem-card {
      padding: 8px 10px; border-radius: var(--radius-sm); background: var(--surface-card, #fff);
      border: 1px solid var(--surface-border, var(--border-subtle)); cursor: pointer;
      transition: box-shadow .15s;
    }
    .rem-card:hover { box-shadow: var(--shadow-card); }
    .rem-card-title { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color, #111); margin-top: 4px; }
    .rem-card-fw { display: block; font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); margin-top: 2px; }
    .rem-empty { text-align: center; padding: 16px; color: var(--text-color-secondary, #9ca3af); font-size: var(--font-size-sm); }
  `]
})
export class RemediationBoardComponent {
  @Input() gaps: ComplianceGapDto[] = [];
  @Input() groupBy: 'severity' | 'status' = 'severity';
  @Input() L!: ComplianceLabels;
  @Output() openGap = new EventEmitter<string>();

  get columns() {
    if (this.groupBy === 'severity') {
      return [
        { label: 'Critical', color: 'var(--error)', items: this.gaps.filter(g => g.severity === 'critical') },
        { label: 'High', color: '#ea580c', items: this.gaps.filter(g => g.severity === 'high') },
        { label: 'Medium', color: '#ca8a04', items: this.gaps.filter(g => g.severity === 'medium') },
        { label: 'Low', color: '#2563eb', items: this.gaps.filter(g => g.severity === 'low') },
      ];
    }
    return [
      { label: 'Open', color: 'var(--error)', items: this.gaps.filter(g => g.status === 'open') },
      { label: 'In Progress', color: '#f59e0b', items: this.gaps.filter(g => g.status === 'in_progress') },
      { label: 'Awaiting', color: '#3b82f6', items: this.gaps.filter(g => g.status === 'awaiting_validation') },
      { label: 'Closed', color: '#16a34a', items: this.gaps.filter(g => g.status === 'closed' || g.status === 'accepted') },
    ];
  }

}
