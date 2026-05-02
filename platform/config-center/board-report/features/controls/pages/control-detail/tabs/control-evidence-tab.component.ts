/**
 * Control Evidence Sources Tab — AGRC-OS Controls Module
 * Shows evidence requirements, expected types, and collection frequency.
 */
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import type { ControlDetailDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-evidence-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, EmptyStateComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="evidence-content" [dir]="i18n.direction()">

        <!-- Evidence Count Summary -->
        <div class="evidence-summary">
          <div class="evidence-stat">
            <span class="stat-value">{{ control.evidenceSourceCount ?? 0 }}</span>
            <span class="stat-label">{{ i18n.isAr() ? 'مصادر أدلة مطلوبة' : 'Evidence Sources Required' }}</span>
          </div>
        </div>

        @if ((control.evidenceSourceCount ?? 0) === 0) {
          <app-empty-state
            [title]="i18n.isAr() ? 'لا توجد مصادر أدلة' : 'No evidence sources'"
            [description]="i18n.isAr() ? 'لم يتم تحديد متطلبات أدلة لهذا الضابط بعد.' : 'No evidence requirements have been defined for this control yet.'"
            [variant]="'default'" />
        } @else {
          <div class="evidence-info-block">
            <i class="pi pi-info-circle"></i>
            <span>
              {{ i18n.isAr()
                ? 'يتم جمع الأدلة تلقائيا حسب الجدول الزمني المحدد. راجع علامة تبويب المراقبة للحصول على تفاصيل الجمع.'
                : 'Evidence is collected automatically per the defined schedule. See the Monitoring tab for collection details.' }}
            </span>
          </div>
        }

      </div>
    }
  `,
    styles: [`
    .evidence-summary {
      margin-bottom: 24px;
    }

    .evidence-stat {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 32px;
      border: 1px solid var(--border);
      border-radius: var(--radius, 6px);
      background: var(--bg-0);
    }

    .stat-value {
      font-size: var(--font-size-2xl, 24px);
      font-weight: 700;
      color: var(--primary);
    }

    .stat-label {
      font-size: var(--font-size-sm, 13px);
      color: var(--text-muted);
      margin-top: 4px;
    }

    .evidence-info-block {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 16px;
      border-radius: var(--radius, 6px);
      background: color-mix(in srgb, var(--info) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--info) 20%, transparent);
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      line-height: 1.6;
    }

    .evidence-info-block i {
      color: var(--info);
      margin-top: 2px;
      flex-shrink: 0;
    }
  `]
})
export class ControlEvidenceTabComponent {
  @Input() control: ControlDetailDto | null = null;
  i18n = inject(I18nService);
}
