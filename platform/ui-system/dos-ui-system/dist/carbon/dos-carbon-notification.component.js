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
import { NotificationModule } from 'carbon-components-angular';
/**
 * Carbon Notification wrapper. Variants:
 *   - inline (default): `cds-inline-notification`
 *   - actionable:       `cds-actionable-notification` (renders an action button)
 *   - toast:            `cds-toast-notification`
 */
let DosCarbonNotificationComponent = class DosCarbonNotificationComponent {
    variant = 'inline';
    kind = 'info';
    title = '';
    subtitle = null;
    lowContrast = false;
    hideClose = false;
    actionLabel = 'Action';
    action = new EventEmitter();
    closed = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonNotificationComponent.prototype, "variant", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonNotificationComponent.prototype, "kind", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNotificationComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonNotificationComponent.prototype, "subtitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNotificationComponent.prototype, "lowContrast", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNotificationComponent.prototype, "hideClose", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNotificationComponent.prototype, "actionLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonNotificationComponent.prototype, "action", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonNotificationComponent.prototype, "closed", void 0);
DosCarbonNotificationComponent = __decorate([
    Component({
        selector: 'dos-carbon-notification',
        standalone: true,
        imports: [CommonModule, NotificationModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    @switch (variant) {
      @case ('actionable') {
        <cds-actionable-notification
          [kind]="kind"
          [title]="title"
          [subtitle]="subtitle"
          [lowContrast]="lowContrast"
          [hideCloseButton]="hideClose"
          [actionButtonLabel]="actionLabel"
          (action)="action.emit()"
          (close)="closed.emit()"
        ></cds-actionable-notification>
      }
      @case ('toast') {
        <cds-toast-notification
          [kind]="kind"
          [title]="title"
          [subtitle]="subtitle"
          [lowContrast]="lowContrast"
          [hideCloseButton]="hideClose"
          (close)="closed.emit()"
        ></cds-toast-notification>
      }
      @default {
        <cds-inline-notification
          [kind]="kind"
          [title]="title"
          [subtitle]="subtitle"
          [lowContrast]="lowContrast"
          [hideCloseButton]="hideClose"
          (close)="closed.emit()"
        ></cds-inline-notification>
      }
    }
  `,
    })
], DosCarbonNotificationComponent);
export { DosCarbonNotificationComponent };
//# sourceMappingURL=dos-carbon-notification.component.js.map