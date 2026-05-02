/**
 * Control Objective & Procedure Tab — AGRC-OS Controls Module
 * Shows control objective, procedure steps, expected output, and failure mode.
 */
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import type { ControlDetailDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-objective-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, EmptyStateComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="objective-content" [dir]="i18n.direction()">

        <!-- Control Objective -->
        <section class="obj-section">
          <h3 class="obj-heading">
            <i class="pi pi-bullseye"></i>
            {{ i18n.isAr() ? 'هدف الضابط' : 'Control Objective' }}
          </h3>
          <p class="obj-text">
            {{ control.objective || (i18n.isAr() ? 'لم يتم تحديد هدف بعد.' : 'No objective has been defined yet.') }}
          </p>
        </section>

        <!-- Control Statement / Procedure -->
        <section class="obj-section">
          <h3 class="obj-heading">
            <i class="pi pi-list"></i>
            {{ i18n.isAr() ? 'بيان الضابط / الإجراء' : 'Control Statement / Procedure' }}
          </h3>
          <div class="procedure-block">
            {{ control.statement || (i18n.isAr() ? 'لم يتم تحديد إجراء بعد.' : 'No procedure has been defined yet.') }}
          </div>
        </section>

        <!-- Expected Output -->
        <section class="obj-section">
          <h3 class="obj-heading">
            <i class="pi pi-check-circle"></i>
            {{ i18n.isAr() ? 'المخرجات المتوقعة' : 'Expected Output' }}
          </h3>
          <p class="obj-text muted">
            {{ i18n.isAr()
              ? 'المخرجات المتوقعة ستكون متاحة عند تكامل محرك الاختبار.'
              : 'Expected output will be available when the testing engine is integrated.' }}
          </p>
        </section>

        <!-- Failure Mode -->
        <section class="obj-section">
          <h3 class="obj-heading">
            <i class="pi pi-exclamation-triangle"></i>
            {{ i18n.isAr() ? 'وضع الفشل' : 'Failure Mode' }}
          </h3>
          <p class="obj-text muted">
            {{ i18n.isAr()
              ? 'سيتم توثيق أوضاع الفشل عند ربط سجل أوجه القصور.'
              : 'Failure modes will be documented when the deficiency log is linked.' }}
          </p>
        </section>

      </div>
    }
  `,
    styles: [`
    .objective-content {
      max-width: 800px;
    }

    .obj-section {
      margin-bottom: 28px;
    }

    .obj-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
      font-size: var(--font-size-base, 14px);
      font-weight: 700;
      color: var(--text-body);
    }

    .obj-heading i {
      color: var(--primary);
      font-size: var(--font-size-base, 14px);
    }

    .obj-text {
      margin: 0;
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .obj-text.muted {
      color: var(--text-muted);
      font-style: italic;
    }

    .procedure-block {
      padding: 16px;
      border-radius: var(--radius, 6px);
      background: var(--bg-1, var(--surface-100));
      border: 1px solid var(--border);
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      line-height: 1.7;
      white-space: pre-wrap;
    }
  `]
})
export class ControlObjectiveTabComponent {
  @Input() control: ControlDetailDto | null = null;
  i18n = inject(I18nService);
}
