import { Component, ChangeDetectionStrategy, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AppShell — universal page chrome.
 *
 * Resolves to MobileShell (≤480px) or DesktopShell (≥1025px) at the
 * consumer; this component renders the canonical CSS grid wrapper and
 * exposes `<ng-content>` projection slots `shellHeader`, `shellSidebar`,
 * default = `main`, and `shellBottomNav`. RTL-safe — uses logical inset/grid.
 *
 * Desktop layout:
 *   ┌────────────────── header ──────────────────┐
 *   │ sidebar │           main                   │
 *   └─────────┴──────────────────────────────────┘
 * Mobile layout:
 *   ┌────────── header ──────────┐
 *   │           main             │
 *   ├──────── bottomNav ─────────┤
 */
@Component({
  selector: 'dos-app-shell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="dos-app-shell"
      [class.dos-app-shell--mobile]="isMobile()"
      [class.dos-app-shell--desktop]="!isMobile()"
    >
      <div class="dos-app-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      @if (!isMobile()) {
        <aside class="dos-app-shell__sidebar"><ng-content select="[shellSidebar]"></ng-content></aside>
      }
      <main class="dos-app-shell__main"><ng-content></ng-content></main>
      @if (isMobile()) {
        <div class="dos-app-shell__bottom"><ng-content select="[shellBottomNav]"></ng-content></div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .dos-app-shell { min-height: 100vh; background: var(--cds-background, #fff); }
    .dos-app-shell--desktop {
      display: grid;
      grid-template-columns: minmax(220px, 16rem) 1fr;
      grid-template-rows: auto 1fr;
      grid-template-areas:
        "header header"
        "sidebar main";
    }
    .dos-app-shell--mobile {
      display: grid;
      grid-template-rows: auto 1fr auto;
      grid-template-areas:
        "header"
        "main"
        "bottom";
    }
    .dos-app-shell__header  { grid-area: header;  position: sticky; top: 0; z-index: 30; }
    .dos-app-shell__sidebar { grid-area: sidebar; min-height: 0; overflow-y: auto;
                              border-inline-end: 1px solid var(--cds-border-subtle-01, #e0e0e0);
                              background: var(--cds-layer-01, #f4f4f4); }
    .dos-app-shell__main    { grid-area: main; min-width: 0; overflow-x: hidden; }
    .dos-app-shell__bottom  { grid-area: bottom; position: sticky; bottom: 0; z-index: 30;
                              border-block-start: 1px solid var(--cds-border-subtle-01, #e0e0e0);
                              background: var(--cds-layer-01, #f4f4f4); }
  `],
})
export class DosAppShellComponent {
  @Input() set mobile(value: boolean | null | undefined) {
    this._mobile.set(!!value);
  }
  private _mobile = signal(false);
  readonly isMobile = computed(() => this._mobile());
}
