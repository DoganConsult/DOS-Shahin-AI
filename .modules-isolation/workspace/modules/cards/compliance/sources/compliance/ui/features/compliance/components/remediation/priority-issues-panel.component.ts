import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { SeverityChipComponent } from '../scoring/severity-chip.component';
import { ComplianceIssueDto } from '../../models/compliance.models';
import { ComplianceLabels } from '../../config/compliance.labels.en';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-priority-issues',
  standalone: true,
  imports: [CommonModule, AppDatePipe, SeverityChipComponent],
  template: `
    <div class="pi-panel" *ngIf="issues.length > 0">
      <h4 class="pi-title">{{ L.priorityIssues }}</h4>
      <div class="pi-list">
        <div class="pi-item" *ngFor="let issue of issues">
          <compliance-severity-chip [severity]="issue.severity" />
          <div class="pi-body">
            <span class="pi-text">{{ issue.title }}</span>
            <span class="pi-meta" *ngIf="issue.dueDate">Due: {{ issue.dueDate | appDate:'medium' }}</span>
            <span class="pi-meta" *ngIf="issue.owner">{{ issue.owner }}</span>
          </div>
          <span class="pi-type">{{ issue.type.replace('_', ' ') }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pi-panel { padding: 16px 20px; border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff); }
    .pi-title { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; color: var(--text-color, #111); }
    .pi-list { display: flex; flex-direction: column; gap: 8px; }
    .pi-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface-100, var(--surface-ice)); }
    .pi-item:last-child { border-bottom: none; }
    .pi-body { flex: 1; min-width: 0; }
    .pi-text { display: block; font-size: var(--font-size-sm); font-weight: 500; color: var(--text-color, #111); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pi-meta { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); margin-inline-end: 8px; }
    .pi-type { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--text-color-secondary, #9ca3af); white-space: nowrap; }
  `]
})
export class PriorityIssuesPanelComponent {
  @Input() issues: ComplianceIssueDto[] = [];
  @Input() L!: ComplianceLabels;

}
