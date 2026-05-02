import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { TableModule } from 'primeng/table';
import { GrcRecord } from '@app/core/models/shared.types';

/** Tab 1: Vendor assessments table with completion progress */
@Component({
    selector: 'app-vendor-assessments-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, StatusBadgeComponent, AppDatePipe, TableModule],
    template: `
    <p-table [value]="assessments" [paginator]="assessments.length > 10" [rows]="10"
             styleClass="p-datatable-sm p-datatable-striped" [loading]="loading">
      <ng-template pTemplate="header">
        <tr>
          <th>Type</th>
          <th>Status</th>
          <th>Completion %</th>
          <th>Assessed At</th>
          <th>Assessor</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-a>
        <tr>
          <td>{{ a.assessment_type ?? a.type ?? '\u2014' }}</td>
          <td><app-status-badge [status]="a.status ?? 'pending'" /></td>
          <td>
            <div class="progress-cell">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="a.completion_pct ?? a.score ?? 0"></div>
              </div>
              <span>{{ a.completion_pct ?? a.score ?? 0 }}%</span>
            </div>
          </td>
          <td>{{ a.assessed_at ?? a.created_at | appDate }}</td>
          <td>{{ a.assessor ?? a.assessor_name ?? '\u2014' }}</td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="5" class="empty-msg">No assessments found</td></tr>
      </ng-template>
    </p-table>
  `,
    styles: [`
    .progress-cell { display: flex; align-items: center; gap: 8px; }
    .progress-bar {
      flex: 1; height: 6px; background: var(--surface-border, #e5e7eb);
      border-radius: 3px; overflow: hidden; min-width: 60px; max-width: 120px;
    }
    .progress-fill {
      height: 100%; background: var(--primary-500, #3b82f6);
      border-radius: inherit; transition: width 300ms ease;
    }
    .empty-msg {
      text-align: center; color: var(--text-color-secondary, #9ca3af);
      padding: var(--space-xl, 32px);
    }
  `]
})
export class VendorAssessmentsTabComponent {
  readonly i18n = inject(I18nService);

  @Input() assessments: GrcRecord[] = [];
  @Input() loading = false;
}
