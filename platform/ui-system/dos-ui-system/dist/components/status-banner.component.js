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
import { DosCarbonNotificationComponent } from '../carbon/dos-carbon-notification.component';
/**
 * DosStatusBanner — inline notification.
 * Refined to use Carbon InlineNotification policies.
 */
let DosStatusBannerComponent = class DosStatusBannerComponent {
    kind = 'info';
    title = '';
    subtitle = null;
    mapKind(k) {
        switch (k) {
            case 'danger': return 'error';
            default: return k;
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosStatusBannerComponent.prototype, "kind", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosStatusBannerComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosStatusBannerComponent.prototype, "subtitle", void 0);
DosStatusBannerComponent = __decorate([
    Component({
        selector: 'dos-status-banner',
        standalone: true,
        imports: [CommonModule, DosCarbonNotificationComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <dos-carbon-notification
      variant="inline"
      [kind]="mapKind(kind)"
      [title]="title"
      [subtitle]="subtitle"
      [hideClose]="true"
    >
      <ng-content></ng-content>
    </dos-carbon-notification>
  `,
    })
], DosStatusBannerComponent);
export { DosStatusBannerComponent };
//# sourceMappingURL=status-banner.component.js.map