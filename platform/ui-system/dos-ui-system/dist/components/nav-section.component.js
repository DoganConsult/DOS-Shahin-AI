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
import { DosNavItemComponent } from './nav-item.component';
/**
 * DosNavSection — labelled group of nav items.
 * Refined to use Carbon SideNav menu policies.
 */
let DosNavSectionComponent = class DosNavSectionComponent {
    group;
    activeRoute = null;
    select = new EventEmitter();
    isGroupActive() {
        return (this.group.items ?? []).some((item) => this.isActive(item) || this.hasActiveChild(item));
    }
    isActive(item) {
        if (!this.activeRoute)
            return false;
        const itemPath = item.action?.kind === 'navigate' ? item.action.path : null;
        if (!itemPath)
            return false;
        if (this.activeRoute === itemPath)
            return true;
        return this.activeRoute.startsWith(itemPath + '/');
    }
    hasActiveChild(item) {
        return (item.children ?? []).some((child) => this.isActive(child) || this.hasActiveChild(child));
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
        imports: [CommonModule, UIShellModule, DosNavItemComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    @if (group.items?.length) {
      <cds-sidenav-menu [title]="group.label" [expanded]="isGroupActive()">
        @for (item of group.items; track item.id) {
          <dos-nav-item
            [item]="item"
            [active]="isActive(item)"
            (select)="select.emit($event)"
          ></dos-nav-item>
        }
      </cds-sidenav-menu>
    } @else {
       <!-- Flat items in a group without children are not standard in SideNav menus, 
            but we handle it as a single non-menu item if it had a route, 
            or just skip if it's an empty header. -->
    }
  `,
    })
], DosNavSectionComponent);
export { DosNavSectionComponent };
//# sourceMappingURL=nav-section.component.js.map