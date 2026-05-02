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
let DosMobileBottomNavComponent = class DosMobileBottomNavComponent {
    items = [];
    select = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosMobileBottomNavComponent.prototype, "items", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosMobileBottomNavComponent.prototype, "select", void 0);
DosMobileBottomNavComponent = __decorate([
    Component({
        selector: 'dos-mobile-bottom-nav',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <nav class="dos-bottom-nav" aria-label="Bottom navigation">
      @for (item of items; track item.id) {
        <button
          type="button"
          class="dos-bottom-nav__item"
          [attr.aria-current]="item.active ? 'page' : null"
          (click)="select.emit(item)"
        >
          {{ item.label }}
        </button>
      }
    </nav>
  `,
    })
], DosMobileBottomNavComponent);
export { DosMobileBottomNavComponent };
//# sourceMappingURL=mobile-bottom-nav.component.js.map