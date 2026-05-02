import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosWhyChipComponent } from './why-chip.component';

/**
 * DosPageMasthead — §26.1 universal page hero.
 *
 * Every page in the platform must use this component as its top-level
 * surface (overview / list / object / workflow / analytics / audit /
 * settings). It enforces the required §26.1 layout slots:
 *
 *   • module name (eyebrow chip)
 *   • page title (display-md)
 *   • page subtitle (one-line purpose)
 *   • breadcrumb (optional)
 *   • status / readiness badge (optional)
 *   • primary actions (slot)
 *   • agent quick actions (slot)
 *   • "Why am I seeing this?" chip (uses dos-why-chip)
 *
 * The masthead also paints the §24 mesh + hairline signature surface
 * when `signature=true` so any page can opt into the cornerstone hero
 * treatment without re-implementing it.
 *
 * Inputs are pre-resolved strings (not i18n keys) — the resolver is
 * the only thing that knows how to translate. This keeps the component
 * presentation-pure.
 */
@Component({
  selector: 'dos-page-masthead',
  standalone: true,
  imports: [CommonModule, DosWhyChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="dos-mast"
      [class.dos-mast--signature]="signature"
      [attr.data-density]="density"
      [attr.data-page-type]="pageType"
    >
      @if (signature) {
        <div class="dos-mast__mesh" aria-hidden="true"></div>
        <div class="dos-mast__hairline" aria-hidden="true"></div>
      }

      <div class="dos-mast__row">
        <div class="dos-mast__text">
          @if (eyebrow) {
            <p class="dos-eyebrow dos-mast__eyebrow">
              @if (moduleName) {
                <span class="dos-mast__module">{{ moduleName }}</span>
                <span class="dos-mast__sep" aria-hidden="true">·</span>
              }
              {{ eyebrow }}
              @if (statusBadge) {
                <span class="dos-mast__status" [attr.data-tone]="statusTone">
                  {{ statusBadge }}
                </span>
              }
            </p>
          }

          <h1 class="dos-mast__title dos-display-md">{{ title }}</h1>

          @if (subtitle) {
            <p class="dos-mast__subtitle" [attr.dir]="'auto'" [innerHTML]="subtitle"></p>
          }

          @if (breadcrumb && breadcrumb.length > 0) {
            <nav class="dos-mast__breadcrumb" [attr.aria-label]="breadcrumbAria">
              @for (crumb of breadcrumb; track crumb.label; let last = $last) {
                <a class="dos-mast__crumb"
                   [class.dos-mast__crumb--last]="last"
                   [attr.href]="last ? null : crumb.route"
                >{{ crumb.label }}</a>
                @if (!last) { <span class="dos-mast__crumb-sep" aria-hidden="true">›</span> }
              }
            </nav>
          }
        </div>

        <div class="dos-mast__actions">
          <ng-content select="[slot=actions]"></ng-content>
          <ng-content select="[slot=agent-actions]"></ng-content>
          @if (whyVisible) {
            <dos-why-chip
              [reason]="whyVisible"
              [label]="whyLabel"
              [showLabel]="true"
              [size]="'sm'"
            ></dos-why-chip>
          }
        </div>
      </div>

      <ng-content></ng-content>
    </header>
  `,
  styles: [`
    .dos-mast {
      position: relative;
      padding: var(--dos-space-6) var(--dos-space-6) var(--dos-space-5);
      border-radius: var(--dos-radius-card);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      box-shadow: var(--dos-shadow-xs);
      overflow: hidden;
    }
    .dos-mast--signature {
      background: var(--dos-gradient-brand-soft);
      box-shadow: var(--dos-shadow-sm);
    }
    .dos-mast__mesh {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 1;
      background:
        var(--dos-gradient-mesh-1),
        var(--dos-gradient-mesh-2),
        var(--dos-gradient-mesh-3);
    }
    .dos-mast__hairline {
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      background: var(--dos-gradient-kpi-line);
      opacity: 1;
    }

    .dos-mast__row {
      position: relative;
      display: flex;
      gap: var(--dos-space-4);
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .dos-mast__text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 380px;
      min-width: 0;
    }
    .dos-mast__actions {
      display: flex;
      gap: var(--dos-space-2);
      align-items: center;
      flex-wrap: wrap;
    }

    .dos-mast__eyebrow {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: baseline;
      margin: 0 0 var(--dos-space-2) 0;
    }
    .dos-mast__module { color: var(--dos-color-text); font-weight: 600; }
    .dos-mast__sep    { opacity: .5; }
    .dos-mast__status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
      margin-inline-start: 4px;
      border-radius: var(--dos-radius-pill);
      font-size: var(--dos-caption-size);
      font-weight: 600;
      letter-spacing: 0;
      background: var(--dos-color-success-soft);
      color: var(--dos-color-success-text);
      text-transform: none;
    }
    .dos-mast__status[data-tone='warning'] { background: var(--dos-color-warning-soft); color: var(--dos-color-warning-text); }
    .dos-mast__status[data-tone='danger']  { background: var(--dos-color-danger-soft);  color: var(--dos-color-danger-text); }
    .dos-mast__status[data-tone='info']    { background: var(--dos-color-info-soft);    color: var(--dos-color-info-text); }

    .dos-mast__title { position: relative; margin: 0; }
    .dos-mast__subtitle {
      position: relative;
      margin: var(--dos-space-2) 0 0 0;
      color: var(--dos-color-text-muted);
      font-size: var(--dos-font-size-md);
      max-width: 60ch;
    }

    .dos-mast__breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: var(--dos-space-3);
      font-size: var(--dos-caption-size);
    }
    .dos-mast__crumb {
      color: var(--dos-color-text-link);
      text-decoration: none;
    }
    .dos-mast__crumb--last { color: var(--dos-color-text); pointer-events: none; }
    .dos-mast__crumb:hover { text-decoration: underline; }
    .dos-mast__crumb-sep { color: var(--dos-color-text-subtle); }
  `],
})
export class DosPageMastheadComponent {
  @Input() moduleName?: string;
  @Input() eyebrow?: string;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() breadcrumb?: { label: string; route?: string }[];
  @Input() breadcrumbAria = 'Breadcrumb';
  @Input() statusBadge?: string;
  @Input() statusTone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' = 'neutral';
  @Input() signature = false;
  @Input() density: 'compact' | 'cozy' | 'comfortable' = 'comfortable';
  @Input() pageType: 'overview' | 'list' | 'object' | 'workflow' | 'analytics' | 'audit' | 'settings' | 'report' = 'overview';
  @Input() whyVisible?: string;
  @Input() whyLabel = 'why?';

  @Output() openHelp = new EventEmitter<void>();
}
