import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Mobile shell — header / main / sticky bottom-nav layout for ≤480px.
 * Slots: shellHeader (top), default (main), shellBottomNav (sticky bottom),
 *        shellDrawer (overlay slide-in menu).
 */
@Component({
  selector: 'dos-mobile-shell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-mobile-shell">
      <div class="dos-mobile-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      <main class="dos-mobile-shell__main"><ng-content></ng-content></main>
      <div class="dos-mobile-shell__bottom"><ng-content select="[shellBottomNav]"></ng-content></div>
      <ng-content select="[shellDrawer]"></ng-content>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .dos-mobile-shell {
      display: grid; grid-template-rows: auto 1fr auto;
      min-height: 100vh; background: var(--cds-background));
    }
    .dos-mobile-shell__header { position: sticky; top: 0; z-index: var(--dos-z-sticky); }
    .dos-mobile-shell__main   { min-width: 0; overflow-x: hidden; padding-bottom: var(--cds-spacing-14); }
    .dos-mobile-shell__bottom { position: sticky; bottom: 0; z-index: var(--dos-z-sticky);
                                border-block-start: 1px solid var(--cds-border-subtle-01); }
  `],
})
export class DosMobileShellComponent {}
