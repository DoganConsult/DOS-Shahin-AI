var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilesModule } from 'carbon-components-angular';
/**
 * Carbon Tile / ClickableTile wrapper.
 * - `clickable=false` renders `cds-tile`.
 * - `clickable=true` renders `cds-clickable-tile` with optional `route`.
 */
let DosCarbonTileComponent = class DosCarbonTileComponent {
    clickable = false;
    route = null;
    activated = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTileComponent.prototype, "clickable", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTileComponent.prototype, "route", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTileComponent.prototype, "activated", void 0);
DosCarbonTileComponent = __decorate([
    Component({
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
], DosCarbonTileComponent);
export { DosCarbonTileComponent };
//# sourceMappingURL=dos-carbon-tile.component.js.map