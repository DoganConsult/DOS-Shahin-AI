import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilesModule } from 'carbon-components-angular';

/**
 * Carbon Tile / ClickableTile wrapper.
 * - `clickable=false` renders `cds-tile`.
 * - `clickable=true` renders `cds-clickable-tile` with optional `route`.
 */
@Component({
  selector: 'dos-carbon-tile',
  standalone: true,
  imports: [CommonModule, TilesModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (clickable) {
      <cds-clickable-tile [route]="route" (click)="activated.emit($event)">
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
  @Input() clickable = false;
  @Input() route: string | null = null;
  @Output() activated = new EventEmitter<MouseEvent>();
}
