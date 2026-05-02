/**
 * Control Overview Tab — AGRC-OS Controls Module
 * Displays key fields, description, and objective in a clean 2-column grid.
 */
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import type { ControlDetailDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-overview-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, StatusBadgeComponent, EmptyStateComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="overview-grid" [dir]="i18n.direction()">

        <!-- Left Column: Key Fields -->
        <div class="overview-col">
          <h3 class="section-title">{{ i18n.isAr() ? 'معلومات أساسية' : 'Key Information' }}</h3>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'رمز الضابط' : 'Control Code' }}</span>
            <span class="field-value">{{ control.controlCode || '--' }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'الحالة' : 'Status' }}</span>
            <span class="field-value"><app-status-badge [status]="control.status || 'draft'" /></span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'نوع الضابط' : 'Control Type' }}</span>
            <span class="field-value">{{ control.controlType || '--' }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'مستوى الأتمتة' : 'Automation Level' }}</span>
            <span class="field-value">{{ control.automationLevel || '--' }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'التكرار' : 'Frequency' }}</span>
            <span class="field-value">{{ control.frequency || '--' }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'الأهمية' : 'Criticality' }}</span>
            <span class="field-value">{{ control.criticality || '--' }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'ضابط رئيسي' : 'Key Control' }}</span>
            <span class="field-value">{{ control.keyControl ? (i18n.isAr() ? 'نعم' : 'Yes') : (i18n.isAr() ? 'لا' : 'No') }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'ضابط مشترك' : 'Shared Control' }}</span>
            <span class="field-value">{{ control.sharedControl ? (i18n.isAr() ? 'نعم' : 'Yes') : (i18n.isAr() ? 'لا' : 'No') }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'العائلة' : 'Family' }}</span>
            <span class="field-value">{{ control.familyName || '--' }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'آخر اختبار' : 'Last Tested' }}</span>
            <span class="field-value">{{ control.lastTestedAt ? (control.lastTestedAt | date:'mediumDate') : '--' }}</span>
          </div>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'الاختبار التالي' : 'Next Test Due' }}</span>
            <span class="field-value">{{ control.nextTestDueAt ? (control.nextTestDueAt | date:'mediumDate') : '--' }}</span>
          </div>
        </div>

        <!-- Right Column: Description & Objective -->
        <div class="overview-col">
          <h3 class="section-title">{{ i18n.isAr() ? 'الوصف' : 'Description' }}</h3>
          <p class="field-text">{{ control.description || (i18n.isAr() ? 'لا يوجد وصف' : 'No description provided') }}</p>

          <h3 class="section-title" style="margin-top: 24px;">{{ i18n.isAr() ? 'الهدف' : 'Objective' }}</h3>
          <p class="field-text">{{ control.objective || (i18n.isAr() ? 'لا يوجد هدف محدد' : 'No objective defined') }}</p>

          @if (control.statement) {
            <h3 class="section-title" style="margin-top: 24px;">{{ i18n.isAr() ? 'بيان الضابط' : 'Control Statement' }}</h3>
            <p class="field-text">{{ control.statement }}</p>
          }

          <div class="timestamps">
            <div class="field-row">
              <span class="field-label">{{ i18n.isAr() ? 'تاريخ الإنشاء' : 'Created' }}</span>
              <span class="field-value">{{ control.createdAt ? (control.createdAt | date:'medium') : '--' }}</span>
            </div>
            <div class="field-row">
              <span class="field-label">{{ i18n.isAr() ? 'آخر تحديث' : 'Updated' }}</span>
              <span class="field-value">{{ control.updatedAt ? (control.updatedAt | date:'medium') : '--' }}</span>
            </div>
          </div>
        </div>

      </div>
    }
  `,
    styles: [`
    .overview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    @media (max-width: 768px) {
      .overview-grid { grid-template-columns: 1fr; }
    }

    .section-title {
      margin: 0 0 16px;
      font-size: var(--font-size-base, 14px);
      font-weight: 700;
      color: var(--text-body);
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    .field-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
    }

    .field-label {
      font-size: var(--font-size-sm, 13px);
      color: var(--text-muted);
      font-weight: 500;
    }

    .field-value {
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      font-weight: 600;
      text-align: end;
    }

    .field-text {
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      line-height: 1.7;
      margin: 0;
      white-space: pre-wrap;
    }

    .timestamps {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
  `]
})
export class ControlOverviewTabComponent {
  @Input() control: ControlDetailDto | null = null;
  i18n = inject(I18nService);
}
