var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'carbon-components-angular';
/**
 * Carbon-backed popover wrapper.
 *
 * Carbon's popover is a DIRECTIVE (`cdsPopover`) applied to a host
 * element, not a `<cds-popover>` element. The popover content lives
 * inside the host. Inputs: align/caret/dropShadow/highContrast/
 * autoAlign/isOpen/alignmentAxisOffset.
 *
 * Slots:
 *   default     — the trigger element (rendered)
 *   [slot=content] — the popover panel (rendered inside cds-popover-content)
 */
let DosCarbonPopoverComponent = class DosCarbonPopoverComponent {
    isOpen = false;
    align = 'bottom';
    autoAlign = false;
    caret = true;
    dropShadow = true;
    highContrast = false;
    isOpenChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPopoverComponent.prototype, "isOpen", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonPopoverComponent.prototype, "align", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPopoverComponent.prototype, "autoAlign", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPopoverComponent.prototype, "caret", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPopoverComponent.prototype, "dropShadow", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPopoverComponent.prototype, "highContrast", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonPopoverComponent.prototype, "isOpenChange", void 0);
DosCarbonPopoverComponent = __decorate([
    Component({
        selector: 'dos-carbon-popover',
        standalone: true,
        imports: [CommonModule, PopoverModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <span
      cdsPopover
      [isOpen]="isOpen"
      [align]="align"
      [autoAlign]="autoAlign"
      [caret]="caret"
      [dropShadow]="dropShadow"
      [highContrast]="highContrast"
      (isOpenChange)="isOpenChange.emit($event)"
    >
      <ng-content></ng-content>
      <cds-popover-content>
        <ng-content select="[slot=content]"></ng-content>
      </cds-popover-content>
    </span>
  `,
    })
], DosCarbonPopoverComponent);
export { DosCarbonPopoverComponent };
//# sourceMappingURL=dos-carbon-popover.component.js.map