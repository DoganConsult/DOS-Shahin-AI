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
import { DialogModule } from 'carbon-components-angular';
let DosAccountMenuComponent = class DosAccountMenuComponent {
    userName = '';
    userEmail = '';
    items = [];
    buttonLabel = 'Account';
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
    Input(),
    __metadata("design:type", Object)
], DosAccountMenuComponent.prototype, "buttonLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosAccountMenuComponent.prototype, "action", void 0);
DosAccountMenuComponent = __decorate([
    Component({
        selector: 'dos-account-menu',
        standalone: true,
        imports: [CommonModule, DialogModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <ibm-overflow-menu
      [flip]="true"
      [description]="buttonLabel"
      class="dos-account-menu__trigger"
      data-testid="dos-account-menu-trigger"
    >
      @if (userName) {
        <ibm-overflow-menu-option [disabled]="true">{{ userName }}</ibm-overflow-menu-option>
      }
      @if (userEmail) {
        <ibm-overflow-menu-option [disabled]="true">{{ userEmail }}</ibm-overflow-menu-option>
      }
      @for (item of items; track item.id) {
        <ibm-overflow-menu-option
          [type]="item.destructive ? 'danger' : null"
          (selected)="action.emit(item)"
        >{{ item.label }}</ibm-overflow-menu-option>
      }
    </ibm-overflow-menu>
  `,
        styles: [`
    :host {
      display: inline-flex;
      align-items: center;
    }
    .dos-account-menu__trigger {
      color: var(--cds-text-on-color, #fff);
    }
  `],
    })
], DosAccountMenuComponent);
export { DosAccountMenuComponent };
//# sourceMappingURL=account-menu.component.js.map