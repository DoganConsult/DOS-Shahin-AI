/**
 * Control Testing History Tab — AGRC-OS Controls Module
 * Shows test results table with date, tester, result, evidence, and notes.
 */
import { Component, Input, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ControlsApiService } from '../../../services/controls-api.service';
import type { ControlDetailDto, ControlTestDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-testing-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TableModule, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="testing-content" [dir]="i18n.direction()">

        <!-- Stats row -->
        <div class="testing-stats">
          <div class="stat-item">
            <span class="stat-value">{{ control.testCount ?? 0 }}</span>
            <span class="stat-label">{{ i18n.isAr() ? 'إجمالي الاختبارات' : 'Total Tests' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ i18n.isAr() ? 'آخر اختبار' : 'Last Tested' }}</span>
            <span class="stat-value-sm">{{ control.lastTestedAt ? (control.lastTestedAt | date:'mediumDate') : '--' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ i18n.isAr() ? 'الاختبار التالي' : 'Next Test Due' }}</span>
            <span class="stat-value-sm">{{ control.nextTestDueAt ? (control.nextTestDueAt | date:'mediumDate') : '--' }}</span>
          </div>
        </div>

        @if (loadingTests()) {
          <app-skeleton-loader [variant]="'list'" [count]="4" />
        } @else if (tests().length === 0) {
          <app-empty-state
            [title]="i18n.isAr() ? 'لا توجد اختبارات' : 'No tests recorded'"
            [description]="i18n.isAr() ? 'لم يتم تسجيل أي اختبارات لهذا الضابط بعد.' : 'No tests have been recorded for this control yet.'"
            [variant]="'default'" />
        } @else {
          <p-table [value]="tests()" [rows]="10" [paginator]="tests().length > 10"
                   styleClass="p-datatable-sm p-datatable-striped">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isAr() ? 'التاريخ' : 'Date' }}</th>
                <th>{{ i18n.isAr() ? 'النوع' : 'Type' }}</th>
                <th>{{ i18n.isAr() ? 'النتيجة' : 'Result' }}</th>
                <th>{{ i18n.isAr() ? 'المختبر' : 'Tester' }}</th>
                <th>{{ i18n.isAr() ? 'مرجع الدليل' : 'Evidence Ref' }}</th>
                <th>{{ i18n.isAr() ? 'ملاحظات' : 'Notes' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-test>
              <tr>
                <td>{{ test.testedAt ? (test.testedAt | date:'mediumDate') : '--' }}</td>
                <td>{{ test.test_type || '--' }}</td>
                <td><app-status-badge [status]="test.result || 'unknown'" /></td>
                <td>{{ test.testedBy || '--' }}</td>
                <td>{{ test.evidenceRef || '--' }}</td>
                <td class="notes-cell">{{ test.notes || '--' }}</td>
              </tr>
            </ng-template>
          </p-table>
        }

      </div>
    }
  `,
    styles: [`
    .testing-stats {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 14px 24px;
      border: 1px solid var(--border);
      border-radius: var(--radius, 6px);
      background: var(--bg-0);
      min-width: 120px;
    }

    .stat-value {
      font-size: var(--font-size-xl, 20px);
      font-weight: 700;
      color: var(--primary);
    }

    .stat-value-sm {
      font-size: var(--font-size-sm, 13px);
      font-weight: 600;
      color: var(--text-body);
      margin-top: 4px;
    }

    .stat-label {
      font-size: var(--font-size-xs, 11px);
      color: var(--text-muted);
    }

    .notes-cell {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class ControlTestingTabComponent implements OnInit {
  @Input() control: ControlDetailDto | null = null;

  i18n = inject(I18nService);
  private api = inject(ControlsApiService);

  loadingTests = signal(false);
  tests = signal<ControlTestDto[]>([]);

  ngOnInit(): void {
    if (this.control?.id) {
      this.loadingTests.set(true);
      this.api.getControlTests(this.control.id).subscribe({
        next: (data) => {
          this.tests.set(data);
          this.loadingTests.set(false);
        },
        error: () => {
          this.loadingTests.set(false);
        },
      });
    }
  }
}
