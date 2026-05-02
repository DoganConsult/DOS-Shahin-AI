var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridModule } from 'carbon-components-angular';
/**
 * Carbon Grid system primitives. The Carbon Grid is a 16-column
 * responsive layout with five breakpoints (sm/md/lg/xl/max). All
 * column widths and offsets are declared via the `columnNumbers` /
 * `offsets` Records, e.g. `{ sm: 4, md: 8, lg: 12 }`.
 *
 * Subgrid lets a column inherit its parent grid's tracks — useful for
 * nested layouts that should align to the same gutter rhythm.
 */
let DosCarbonGridComponent = class DosCarbonGridComponent {
    condensed = false;
    narrow = false;
    fullWidth = false;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonGridComponent.prototype, "condensed", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonGridComponent.prototype, "narrow", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonGridComponent.prototype, "fullWidth", void 0);
DosCarbonGridComponent = __decorate([
    Component({
        selector: 'dos-carbon-grid',
        standalone: true,
        imports: [CommonModule, GridModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div
      cdsGrid
      [condensed]="condensed"
      [narrow]="narrow"
      [fullWidth]="fullWidth"
    ><ng-content></ng-content></div>
  `,
    })
], DosCarbonGridComponent);
export { DosCarbonGridComponent };
let DosCarbonRowComponent = class DosCarbonRowComponent {
    condensed = false;
    narrow = false;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRowComponent.prototype, "condensed", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRowComponent.prototype, "narrow", void 0);
DosCarbonRowComponent = __decorate([
    Component({
        selector: 'dos-carbon-row',
        standalone: true,
        imports: [CommonModule, GridModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div cdsRow [condensed]="condensed" [narrow]="narrow"><ng-content></ng-content></div>`,
    })
], DosCarbonRowComponent);
export { DosCarbonRowComponent };
/**
 * Carbon `cdsCol` wrapper. Both `columnNumbers` and `offsets` accept
 * breakpoint records. Example:
 *   <dos-carbon-col [columnNumbers]="{ sm: 4, md: 8, lg: 12 }"
 *                   [offsets]="{ md: 0, lg: 2 }">
 */
let DosCarbonColComponent = class DosCarbonColComponent {
    columnNumbers = {};
    offsets = {};
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonColComponent.prototype, "columnNumbers", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonColComponent.prototype, "offsets", void 0);
DosCarbonColComponent = __decorate([
    Component({
        selector: 'dos-carbon-col',
        standalone: true,
        imports: [CommonModule, GridModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div
      cdsCol
      [columnNumbers]="columnNumbers"
      [offsets]="offsets"
    ><ng-content></ng-content></div>
  `,
    })
], DosCarbonColComponent);
export { DosCarbonColComponent };
/**
 * Subgrid wrapper — a Carbon Grid that inherits column tracks from its
 * parent grid context. Carbon's class is `cds--subgrid`. Used for
 * nested layouts that should respect the outer gutter.
 */
let DosCarbonSubgridComponent = class DosCarbonSubgridComponent {
    wide = false;
    narrow = false;
    condensed = false;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSubgridComponent.prototype, "wide", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSubgridComponent.prototype, "narrow", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSubgridComponent.prototype, "condensed", void 0);
DosCarbonSubgridComponent = __decorate([
    Component({
        selector: 'dos-carbon-subgrid',
        standalone: true,
        imports: [CommonModule, GridModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div
      cdsGrid
      class="cds--subgrid"
      [class.cds--subgrid--wide]="wide"
      [class.cds--subgrid--narrow]="narrow"
      [class.cds--subgrid--condensed]="condensed"
    ><ng-content></ng-content></div>
  `,
    })
], DosCarbonSubgridComponent);
export { DosCarbonSubgridComponent };
//# sourceMappingURL=dos-carbon-grid.component.js.map