/**
 * Control Deficiencies & Actions Tab — AGRC-OS Controls Module
 * Shows linked deficiencies, remediation actions, and retest queue.
 */
import { Component, Input, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ControlsApiService } from '../../../services/controls-api.service';
import type { ControlDetailDto, ControlDeficiencyDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-deficiencies-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TableModule, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="deficiencies-content" [dir]="i18n.direction()">

        <!-- Open Deficiency Count -->
        <div class="def-summary">
          <span class="def-count" [class.has-open]="(control.openDeficiencyCount ?? 0) > 0">
            {{ control.openDeficiencyCount ?? 0 }}
          </span>
          <span class="def-label">{{ i18n.isAr() ? 'أوجه قصور مفتوحة' : 'Open Deficiencies' }}</span>
        </div>

        @if (loadingDefs()) {
          <app-skeleton-loader [variant]="'list'" [count]="3" />
        } @else if (deficiencies().length === 0) {
          <app-empty-state
            [title]="i18n.isAr() ? 'لا توجد أوجه قصور' : 'No deficiencies'"
            [description]="i18n.isAr() ? 'لم يتم تسجيل أوجه قصور لهذا الضابط.' : 'No deficiencies have been recorded for this control.'"
            [variant]="'default'" />
        } @else {
          <p-table [value]="deficiencies()" [rows]="10" [paginator]="deficiencies().length > 10"
                   styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'المعرف' : 'ID' }}</th>
                <th>{{ i18n.isAr() ? 'الخطورة' : 'Severity' }}</th>
                <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isAr() ? 'السبب الجذري' : 'Root Cause' }}</th>
                <th>{{ i18n.isAr() ? 'المسند إليه' : 'Assigned To' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ الاستحقاق' : 'Due Date' }}</th>
                <th>{{ i18n.isAr() ? 'تاريخ الإنشاء' : 'Created' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-d>
              <tr>
                <td>{{ d.id | slice:0:8 }}</td>
                <td>
                  <span class="severity-badge" [attr.data-severity]="d.severity">
                    {{ d.severity }}
                  </span>
                </td>
                <td><app-status-badge [status]="d.status" /></td>
                <td class="truncate-cell">{{ d.rootCause || '--' }}</td>
                <td>{{ d.assignedTo || '--' }}</td>
                <td>{{ d.dueDate ? (d.dueDate | date:'mediumDate') : '--' }}</td>
                <td>{{ d.createdAt ? (d.createdAt | date:'mediumDate') : '--' }}</td>
              </tr>
            </ng-template>
          </p-table>
        }

      </div>
    }
  `,
    styles: [`
    .def-summary {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 32px;
      border: 1px solid var(--border);
      border-radius: var(--radius, 6px);
      margin-bottom: 24px;
    }

    .def-count {
      font-size: var(--font-size-2xl, 24px);
      font-weight: 700;
      color: var(--text-body);
    }

    .def-count.has-open {
      color: var(--error);
    }

    .def-label {
      font-size: var(--font-size-xs, 11px);
      color: var(--text-muted);
      margin-top: 4px;
    }

    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-xl, 16px);
      font-size: var(--font-size-xs, 11px);
      font-weight: 700;
      text-transform: capitalize;
    }

    .severity-badge[data-severity="critical"] {
      background: color-mix(in srgb, var(--severity-critical) 12%, transparent);
      color: var(--severity-critical);
    }

    .severity-badge[data-severity="high"] {
      background: color-mix(in srgb, var(--severity-high) 12%, transparent);
      color: var(--severity-high);
    }

    .severity-badge[data-severity="medium"] {
      background: color-mix(in srgb, var(--severity-medium) 12%, transparent);
      color: var(--severity-medium);
    }

    .severity-badge[data-severity="low"] {
      background: color-mix(in srgb, var(--severity-low) 12%, transparent);
      color: var(--severity-low);
    }

    .truncate-cell {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class ControlDeficienciesTabComponent implements OnInit {
  @Input() control: ControlDetailDto | null = null;

  i18n = inject(I18nService);
  private api = inject(ControlsApiService);

  loadingDefs = signal(false);
  deficiencies = signal<ControlDeficiencyDto[]>([]);

  ngOnInit(): void {
    if (this.control?.id) {
      this.loadingDefs.set(true);
      this.api.getDeficiencies().subscribe({
        next: (data) => {
          // Filter deficiencies for this control
          const filtered = data.filter(d => d.controlId === this.control!.id);
          this.deficiencies.set(filtered);
          this.loadingDefs.set(false);
        },
        error: () => {
          this.loadingDefs.set(false);
        },
      });
    }
  }
}
