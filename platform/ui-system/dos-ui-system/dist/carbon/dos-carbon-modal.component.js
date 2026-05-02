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
import { ModalModule } from 'carbon-components-angular';
let DosCarbonModalComponent = class DosCarbonModalComponent {
    open = false;
    title = '';
    subtitle = null;
    size = 'md';
    hasScrollingContent = false;
    showFooter = true;
    closed = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonModalComponent.prototype, "open", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonModalComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonModalComponent.prototype, "subtitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonModalComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonModalComponent.prototype, "hasScrollingContent", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonModalComponent.prototype, "showFooter", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonModalComponent.prototype, "closed", void 0);
DosCarbonModalComponent = __decorate([
    Component({
        selector: 'dos-carbon-modal',
        standalone: true,
        imports: [CommonModule, ModalModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-modal
      [open]="open"
      [size]="size"
      [hasScrollingContent]="hasScrollingContent"
      (close)="closed.emit()"
    >
      <cds-modal-header (closeSelect)="closed.emit()">
        <h3 cdsModalHeaderHeading>{{ title }}</h3>
        @if (subtitle) {
          <p cdsModalHeaderLabel>{{ subtitle }}</p>
        }
      </cds-modal-header>
      <section cdsModalContent>
        <ng-content></ng-content>
      </section>
      @if (showFooter) {
        <cds-modal-footer>
          <ng-content select="[modalFooter]"></ng-content>
        </cds-modal-footer>
      }
    </cds-modal>
  `,
    })
], DosCarbonModalComponent);
export { DosCarbonModalComponent };
//# sourceMappingURL=dos-carbon-modal.component.js.map