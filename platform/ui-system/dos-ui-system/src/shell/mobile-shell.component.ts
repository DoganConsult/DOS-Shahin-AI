import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Mobile shell — header / main / sticky bottom-nav layout for ≤480px.
 * Slots: shellHeader (top), default (main), shellBottomNav (sticky bottom),
 *        shellDrawer (overlay slide-in menu).
 */
export interface MobileShellConfig {
  breakpoint: string;
  density: 'compact' | 'normal' | 'comfortable';
  touchEnabled: boolean;
  layout: 'stacked' | 'bottom-nav' | 'drawer';
}

@Component({
  selector: 'dos-mobile-shell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-mobile-shell" [class.dos-mobile-shell--compact]="mobileConfig?.density === 'compact'">
      <div class="dos-mobile-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      <main class="dos-mobile-shell__main"><ng-content></ng-content></main>
      <div class="dos-mobile-shell__bottom"><ng-content select="[shellBottomNav]"></ng-content></div>
      <ng-content select="[shellDrawer]"></ng-content>
    </div>
  `,
  styles: [`
    :host { display: block; min-block-size: 100dvh; }
    .dos-mobile-shell {
      display: grid; grid-template-rows: auto 1fr auto;
      min-block-size: 100dvh; background: var(--cds-background);
    }
    .dos-mobile-shell--compact {
      --mobile-padding: 8px;
    }
    .dos-mobile-shell__header { position: sticky; inset-block-start: 0; z-index: var(--dos-z-sticky); }
    .dos-mobile-shell__main   { min-width: 0; overflow-x: hidden; padding-block-end: var(--cds-spacing-14); }
    .dos-mobile-shell__bottom { position: sticky; inset-block-end: 0; z-index: var(--dos-z-sticky);
                                border-block-start: 1px solid var(--cds-border-subtle-01); }
  `],
})
export class DosMobileShellComponent {
  @Input() mobileConfig?: MobileShellConfig;
  @Output() gestureEvent = new EventEmitter<{ type: string; data: unknown }>();
}
