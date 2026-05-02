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
import { ButtonModule } from 'carbon-components-angular';
/**
 * @dos/ui-system Carbon wrapper — Button.
 *
 * Wraps `cds-button` from carbon-components-angular. Consumers MUST use
 * `<dos-carbon-button>` instead of importing `ButtonModule` directly so
 * the carbon-boundary-guard can enforce one-source ownership.
 */
let DosCarbonButtonComponent = class DosCarbonButtonComponent {
    kind = 'primary';
    size = 'md';
    disabled = false;
    type = 'button';
    clicked = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonButtonComponent.prototype, "kind", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonButtonComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonButtonComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonButtonComponent.prototype, "type", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonButtonComponent.prototype, "clicked", void 0);
DosCarbonButtonComponent = __decorate([
    Component({
        selector: 'dos-carbon-button',
        standalone: true,
        imports: [CommonModule, ButtonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <button
      cdsButton
      [size]="size"
      [ngClass]="'cds--btn--' + kind"
      [disabled]="disabled"
      [type]="type"
      (click)="clicked.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
    })
], DosCarbonButtonComponent);
export { DosCarbonButtonComponent };
//# sourceMappingURL=dos-carbon-button.component.js.map