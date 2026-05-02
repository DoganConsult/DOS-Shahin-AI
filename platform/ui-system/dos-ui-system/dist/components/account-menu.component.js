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
let DosAccountMenuComponent = class DosAccountMenuComponent {
    userName = '';
    userEmail = '';
    items = [];
    action = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAccountMenuComponent.prototype, "userName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAccountMenuComponent.prototype, "userEmail", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosAccountMenuComponent.prototype, "items", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosAccountMenuComponent.prototype, "action", void 0);
DosAccountMenuComponent = __decorate([
    Component({
        selector: 'dos-account-menu',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-account-menu" role="menu">
      @if (userName) { <div><strong>{{ userName }}</strong></div> }
      @if (userEmail) { <div class="dos-page-header__description">{{ userEmail }}</div> }
      @for (item of items; track item.id) {
        <button
          type="button"
          role="menuitem"
          class="dos-bottom-nav__item"
          (click)="action.emit(item)"
        >
          {{ item.label }}
        </button>
      }
    </div>
  `,
    })
], DosAccountMenuComponent);
export { DosAccountMenuComponent };
//# sourceMappingURL=account-menu.component.js.map