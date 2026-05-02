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
import { UIShellModule } from 'carbon-components-angular';
/**
 * Carbon UI-Shell SideNav wrapper. Permission-gating per item is the host's
 * responsibility (use *dosCanRender on the consuming `<dos-carbon-side-nav>`
 * usage when filtering nav from AccessStore).
 */
let DosCarbonSideNavComponent = class DosCarbonSideNavComponent {
    items = [];
    expanded = true;
    ariaLabel = 'Side navigation';
    itemSelected = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonSideNavComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSideNavComponent.prototype, "expanded", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSideNavComponent.prototype, "ariaLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonSideNavComponent.prototype, "itemSelected", void 0);
DosCarbonSideNavComponent = __decorate([
    Component({
        selector: 'dos-carbon-side-nav',
        standalone: true,
        imports: [CommonModule, UIShellModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-sidenav [expanded]="expanded" [attr.aria-label]="ariaLabel">
      @if (items.length > 0) {
        @for (g of items; track g.id) {
          @if (g.children?.length) {
            <cds-sidenav-menu [title]="g.label">
              @for (c of g.children; track c.id) {
                <cds-sidenav-item
                  [route]="[c.route ?? '/']"
                  (selected)="itemSelected.emit(c)"
                >{{ c.label }}</cds-sidenav-item>
              }
            </cds-sidenav-menu>
          } @else {
            <cds-sidenav-item
              [route]="[g.route ?? '/']"
              (selected)="itemSelected.emit(g)"
            >{{ g.label }}</cds-sidenav-item>
          }
        }
      } @else {
        <ng-content></ng-content>
      }
    </cds-sidenav>
  `,
    })
], DosCarbonSideNavComponent);
export { DosCarbonSideNavComponent };
/**
 * Sidenav menu group wrapper — exposes `cds-sidenav-menu` for content
 * projection scenarios (e.g. routed nav items with routerLink/Active).
 */
let DosCarbonSideNavMenuComponent = class DosCarbonSideNavMenuComponent {
    title = '';
    expanded = true;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSideNavMenuComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSideNavMenuComponent.prototype, "expanded", void 0);
DosCarbonSideNavMenuComponent = __decorate([
    Component({
        selector: 'dos-carbon-side-nav-menu',
        standalone: true,
        imports: [CommonModule, UIShellModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-sidenav-menu [title]="title" [expanded]="expanded">
      <ng-content></ng-content>
    </cds-sidenav-menu>
  `,
    })
], DosCarbonSideNavMenuComponent);
export { DosCarbonSideNavMenuComponent };
/**
 * Sidenav item wrapper. For Angular Router integration, the consumer
 * applies `routerLink` / `routerLinkActive` on this host element
 * (Angular's RouterLink directive selector matches it transparently).
 */
let DosCarbonSideNavItemComponent = class DosCarbonSideNavItemComponent {
    selected = new EventEmitter();
};
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonSideNavItemComponent.prototype, "selected", void 0);
DosCarbonSideNavItemComponent = __decorate([
    Component({
        selector: 'dos-carbon-side-nav-item',
        standalone: true,
        imports: [CommonModule, UIShellModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-sidenav-item (selected)="selected.emit()">
      <ng-content></ng-content>
    </cds-sidenav-item>
  `,
    })
], DosCarbonSideNavItemComponent);
export { DosCarbonSideNavItemComponent };
//# sourceMappingURL=dos-carbon-side-nav.component.js.map