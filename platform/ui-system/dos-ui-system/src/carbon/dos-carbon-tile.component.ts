import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Carbon Tile / ClickableTile wrapper.
 *
 * NOTE: emits plain `cds--tile` markup so we sidestep
 * `cds-clickable-tile`'s internal `[routerLink]` binding which crashes when
 * `route` is null and triggers the recursive `template` ContentChildren
 * resolution loop observed at runtime. Carbon CSS (`@carbon/styles`) styles
 * `.cds--tile` and `.cds--tile--clickable` directly.
 *
 * - `clickable=false` renders `<div class="cds--tile">`.
 * - `clickable=true`  renders `<a class="cds--tile cds--tile--clickable">`.
 */
@Component({
  selector: 'dos-carbon-tile',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #tileContent><ng-content></ng-content></ng-template>
    @if (clickable) {
      <a
        class="cds--tile cds--tile--clickable"
        [attr.href]="route || '#'"
        [attr.role]="route ? null : 'button'"
        (click)="onActivate($event)"
      >
        <ng-container [ngTemplateOutlet]="tileContent"></ng-container>
      </a>
    } @else {
      <div class="cds--tile">
        <ng-container [ngTemplateOutlet]="tileContent"></ng-container>
      </div>
    }
  `,
})
export class DosCarbonTileComponent {
  @Input() clickable = false;
  @Input() route: string | null = null;
  @Output() activated = new EventEmitter<MouseEvent>();

  onActivate(ev: MouseEvent): void {
    this.activated.emit(ev);
  }
}
