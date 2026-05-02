/**
 * Control Scope & Ownership Tab — AGRC-OS Controls Module
 * Shows owner, operator, reviewer, business unit, entity scope, inherited/shared flags.
 */
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import type { ControlDetailDto } from '../../../services/controls-api.types';

@Component({
    selector: 'app-control-scope-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, EmptyStateComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="scope-grid" [dir]="i18n.direction()">

        <!-- Ownership -->
        <div class="scope-card">
          <h3 class="card-title">
            <i class="pi pi-users"></i>
            {{ i18n.isAr() ? 'الملكية' : 'Ownership' }}
          </h3>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'المالك' : 'Owner' }}</span>
            <span class="field-value">{{ control.owner || '--' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'معرف المالك' : 'Owner User ID' }}</span>
            <span class="field-value">{{ control.ownerUserId || '--' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'المشغل' : 'Operator' }}</span>
            <span class="field-value">{{ control.operatorUserId || '--' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'المراجع' : 'Reviewer' }}</span>
            <span class="field-value">{{ control.reviewerUserId || '--' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'الفريق المسؤول' : 'Owner Team' }}</span>
            <span class="field-value">{{ control.ownerTeamId || '--' }}</span>
          </div>
        </div>

        <!-- Scope -->
        <div class="scope-card">
          <h3 class="card-title">
            <i class="pi pi-sitemap"></i>
            {{ i18n.isAr() ? 'النطاق' : 'Scope' }}
          </h3>

          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'إطار العمل' : 'Framework' }}</span>
            <span class="field-value">{{ control.frameworkId || '--' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'العائلة' : 'Family' }}</span>
            <span class="field-value">{{ control.familyName || '--' }}</span>
          </div>
          <div class="field-row">
            <span class="field-label">{{ i18n.isAr() ? 'الفئة' : 'Category' }}</span>
            <span class="field-value">{{ control.categoryId || '--' }}</span>
          </div>
        </div>

        <!-- Flags -->
        <div class="scope-card">
          <h3 class="card-title">
            <i class="pi pi-flag"></i>
            {{ i18n.isAr() ? 'الخصائص' : 'Flags' }}
          </h3>

          <div class="flag-row">
            <i class="pi" [class.pi-check-circle]="control.keyControl" [class.pi-times-circle]="!control.keyControl"
               [style.color]="control.keyControl ? 'var(--success)' : 'var(--text-muted)'"></i>
            <span>{{ i18n.isAr() ? 'ضابط رئيسي' : 'Key Control' }}</span>
          </div>
          <div class="flag-row">
            <i class="pi" [class.pi-check-circle]="control.sharedControl" [class.pi-times-circle]="!control.sharedControl"
               [style.color]="control.sharedControl ? 'var(--success)' : 'var(--text-muted)'"></i>
            <span>{{ i18n.isAr() ? 'ضابط مشترك' : 'Shared Control' }}</span>
          </div>
        </div>

      </div>
    }
  `,
    styles: [`
    .scope-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 768px) {
      .scope-grid { grid-template-columns: 1fr; }
    }

    .scope-card {
      border: 1px solid var(--border);
      border-radius: var(--radius, 6px);
      padding: 20px;
      background: var(--bg-0);
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      font-size: var(--font-size-base, 14px);
      font-weight: 700;
      color: var(--text-body);
    }

    .card-title i {
      color: var(--primary);
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
    }

    .field-value {
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      font-weight: 600;
      text-align: end;
    }

    .flag-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      font-size: var(--font-size-sm, 13px);
      color: var(--text-body);
      border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
    }

    .flag-row i {
      font-size: var(--font-size-base, 14px);
    }
  `]
})
export class ControlScopeTabComponent {
  @Input() control: ControlDetailDto | null = null;
  i18n = inject(I18nService);
}
