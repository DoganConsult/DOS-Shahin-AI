import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TilesModule } from 'carbon-components-angular';

/**
 * Carbon Tile / ClickableTile wrapper.
 *
 * Composes the real Carbon Angular primitives (`cds-tile` /
 * `cds-clickable-tile`) so wrappers benefit from Carbon's built-in
 * keyboard/focus/hover semantics and theming. The previous hand-rolled
 * `<a class="cds--tile">` markup is removed — it skipped Carbon's
 * controller and emitted a flat anchor with no Carbon DOM.
 *
 * - `clickable=false` → `<cds-tile>`.
 * - `clickable=true`  → `<cds-clickable-tile>` with click navigation
 *   delegated to Angular Router (we deliberately do NOT bind
 *   `[route]` because Carbon's directive crashes when route is null).
 */
@Component({
  selector: 'dos-carbon-tile',
  standalone: true,
  imports: [CommonModule, TilesModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (clickable) {
      <cds-clickable-tile
        href="javascript:void(0)"
        (click)="onActivate($event)"
      >
        <ng-content></ng-content>
      </cds-clickable-tile>
    } @else {
      <cds-tile>
        <ng-content></ng-content>
      </cds-tile>
    }
  `,
})
export class DosCarbonTileComponent {
  private readonly router = inject(Router);

  @Input() clickable = false;
  @Input() route: string | null = null;
  @Output() activated = new EventEmitter<MouseEvent>();

  onActivate(ev: MouseEvent): void {
    this.activated.emit(ev);
    if (ev.defaultPrevented) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    if (this.route) {
      ev.preventDefault();
      void this.router.navigateByUrl(this.route);
    }
  }
}
