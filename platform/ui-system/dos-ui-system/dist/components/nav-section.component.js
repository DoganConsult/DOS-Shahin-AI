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
import { DosNavItemComponent } from './nav-item.component';
/**
 * DosNavSection — labelled group of nav items.
 *
 * Renders the group label (uppercase, muted) and a vertical list of
 * `<dos-nav-item>`. Re-emits child select events upward unchanged.
 *
 * Consumers: DosWorkspaceNav.
 */
let DosNavSectionComponent = class DosNavSectionComponent {
    group;
    activeRoute = null;
    select = new EventEmitter();
    isActive(item) {
        if (!this.activeRoute || !item.route)
            return false;
        if (this.activeRoute === item.route)
            return true;
        return this.activeRoute.startsWith(item.route + '/');
    }
};
__decorate([
    Input({ required: true }),
    __metadata("design:type", Object)
], DosNavSectionComponent.prototype, "group", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosNavSectionComponent.prototype, "activeRoute", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosNavSectionComponent.prototype, "select", void 0);
DosNavSectionComponent = __decorate([
    Component({
        selector: 'dos-nav-section',
        standalone: true,
        imports: [CommonModule, DosNavItemComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <section class="dos-nav-section" [attr.aria-label]="group.label">
      <header class="dos-nav-section__head">{{ group.label }}</header>
      <ul class="dos-nav-list">
        @for (item of group.items; track item.id) {
          <li class="dos-nav-section__item">
            <dos-nav-item
              [item]="item"
              [active]="isActive(item)"
              (select)="select.emit($event)"
            ></dos-nav-item>
          </li>
        }
      </ul>
    </section>
  `,
    })
], DosNavSectionComponent);
export { DosNavSectionComponent };
//# sourceMappingURL=nav-section.component.js.map