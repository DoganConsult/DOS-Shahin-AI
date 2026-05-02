/**
 * PainPointCategoryFilterComponent — Dumb presentational component
 * Renders the sticky smart selection bar that appears when 2+ pain points
 * are selected, showing count and a "Get Diagnosis Report" CTA.
 * Parent: PainPointsSectionComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-pain-point-category-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule],
  template: `
    @if (visible) {
      <div class="pp-smartbar">
        <div class="smartbar-inner">
          <div class="smartbar-left">
            <span class="smartbar-pill">
              <span class="smartbar-num">{{ selectedCount }}</span>
              <span>{{ i18n.translate('landing.painPoints.selected') }}</span>
            </span>
            <span class="smartbar-text">
              {{ i18n.translate('landing.painPoints.smartbarText') }}
            </span>
          </div>
          <p-button
            [label]="i18n.translate('landing.painPoints.getDiagnosisReport')"
            icon="pi pi-download"
            styleClass="p-button-sm"
            (onClick)="diagnosisRequested.emit()">
          </p-button>
        </div>
      </div>
    }
  `,
  styles: [`
    .pp-smartbar {
      position: sticky; top: 56px; z-index: var(--z-base);
      margin: var(--space-lg) auto;
      animation: ppSlideDown var(--duration-moderate-02) var(--ease-productive-entrance);
    }
    @keyframes ppSlideDown {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .smartbar-inner {
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-md);
      padding: var(--space-md) var(--space-lg); border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle); background: var(--surface);
      backdrop-filter: blur(12px); box-shadow: var(--shadow-card); flex-wrap: wrap;
    }
    .smartbar-left { display: flex; align-items: center; gap: var(--space-sm); }
    .smartbar-pill {
      display: inline-flex; align-items: center; gap: var(--space-xs);
      padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-pill);
      background: var(--primary-darker); color: var(--text-on-primary);
      font-weight: var(--font-black); font-size: var(--font-size-sm);
    }
    .smartbar-num { font-size: var(--font-size-base); }
    .smartbar-text { font-size: var(--font-size-sm); color: var(--text-muted); }
  `],
})
export class PainPointCategoryFilterComponent {
  i18n = inject(I18nService);

  @Input() visible = false;
  @Input() selectedCount = 0;

  @Output() diagnosisRequested = new EventEmitter<void>();
}
