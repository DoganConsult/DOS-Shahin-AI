import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { GrcRecord } from '@app/core/models/shared.types';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

/** Tab 3: Vendor findings table with severity badges */
@Component({
    selector: 'app-vendor-findings-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, StatusBadgeComponent, AppDatePipe, TableModule, TagModule],
    template: `
    <p-table [value]="findings" [paginator]="findings.length > 10" [rows]="10"
             styleClass="p-datatable-sm p-datatable-striped" [loading]="loading">
      <ng-template pTemplate="header">
        <tr>
          <th>Title</th>
          <th>Severity</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-f>
        <tr>
          <td><strong>{{ f.title ?? f.finding_title ?? '\u2014' }}</strong></td>
          <td>
            <p-tag [value]="f.severity ?? 'info'"
                   [severity]="riskSeverity(f.severity)" />
          </td>
          <td><app-status-badge [status]="f.status ?? 'open'" /></td>
          <td>{{ f.created_at | appDate }}</td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="4" class="empty-msg">No findings recorded</td></tr>
      </ng-template>
    </p-table>
  `,
    styles: [`
    .empty-msg {
      text-align: center; color: var(--text-color-secondary, #9ca3af);
      padding: var(--space-xl, 32px);
    }
  `]
})
export class VendorFindingsTabComponent {
  readonly i18n = inject(I18nService);

  @Input() findings: GrcRecord[] = [];
  @Input() loading = false;

  riskSeverity(level: string | undefined): TagSeverity {
    switch ((level ?? '').toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  }
}
