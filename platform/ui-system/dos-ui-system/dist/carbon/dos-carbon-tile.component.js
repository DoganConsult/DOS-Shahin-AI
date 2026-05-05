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
let DosCarbonTileComponent = class DosCarbonTileComponent {
    clickable = false;
    route = null;
    activated = new EventEmitter();
    onActivate(ev) {
        this.activated.emit(ev);
    }
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
], DosCarbonTileComponent);
export { DosCarbonTileComponent };
//# sourceMappingURL=dos-carbon-tile.component.js.map