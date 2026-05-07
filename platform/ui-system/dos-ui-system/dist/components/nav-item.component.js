var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';
/**
 * DosNavItem — single workspace nav row.
 * Refined to use Carbon SideNav item policies.
 */
let DosNavItemComponent = class DosNavItemComponent {
    item;
    active = false;
    select = new EventEmitter();
    onClick() {
        if (!this.item?.enabled)
            return;
        this.select.emit(this.item);
    }
    disabledTitle() {
        const reason = this.item.disabledReason;
        return typeof reason === 'string' ? reason : '';
    }
};
__decorate([
    Input({ required: true }),
    __metadata("design:type", Object)
], DosNavItemComponent.prototype, "item", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosNavItemComponent.prototype, "active", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosNavItemComponent.prototype, "select", void 0);
DosNavItemComponent = __decorate([
    Component({
        selector: 'dos-nav-item',
        standalone: true,
        imports: [CommonModule, UIShellModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-sidenav-item
      [active]="active"
      (selected)="onClick()"
      [attr.aria-disabled]="!item.enabled"
      [attr.title]="!item.enabled ? disabledTitle() : null"
    >
      @if (item.icon) {
        <span class="dos-nav-item__icon" aria-hidden="true">{{ item.icon }}</span>
      }
      <span class="dos-nav-item__label">{{ item.label }}</span>
      @if (item.badge) {
        <span class="dos-nav-item__badge cds--side-nav__item-badge">{{ item.badge }}</span>
      }
    </cds-sidenav-item>
  `,
        styles: [`
    :host { display: block; }
    .dos-nav-item__icon {
      margin-inline-end: var(--cds-spacing-03, 0.5rem);
    }
  `]
    })
], DosNavItemComponent);
export { DosNavItemComponent };
//# sourceMappingURL=nav-item.component.js.map