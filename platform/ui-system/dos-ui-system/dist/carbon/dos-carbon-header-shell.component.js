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
 * Carbon UI-Shell wrapper. Renders a `cds-header` with brand, side-nav
 * trigger, and a slot for global actions. Permission-gated rendering
 * for individual actions is delegated to *dosCanRender on the consumer.
 */
let DosCarbonHeaderShellComponent = class DosCarbonHeaderShellComponent {
    // ZERO_LEGACY: brand / brandShort / ariaLabel default to empty so the
    // parent shell MUST pipe in resolver-emitted values:
    //   brand        ← productRuntime.chrome.brand || tenantRuntime.branding.brandName
    //   brandShort   ← productRuntime.chrome.brandShort || tenantRuntime.branding.brandShort
    //   ariaLabel    ← shell.chrome.headerAriaLabel
    // Empty inputs => Carbon's <cds-header> renders without label text;
    // it never invents 'DOS Platform'.
    brand = '';
    brandShort = '';
    ariaLabel = '';
    showHamburger = true;
    showHeaderNav = false;
    sideNavOpen = false;
    sideNavToggled = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderShellComponent.prototype, "brand", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderShellComponent.prototype, "brandShort", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderShellComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderShellComponent.prototype, "showHamburger", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderShellComponent.prototype, "showHeaderNav", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderShellComponent.prototype, "sideNavOpen", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonHeaderShellComponent.prototype, "sideNavToggled", void 0);
DosCarbonHeaderShellComponent = __decorate([
    Component({
        selector: 'dos-carbon-header-shell',
        standalone: true,
        imports: [CommonModule, UIShellModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-header
      [name]="brand"
      [brand]="brandShort"
      [attr.aria-label]="ariaLabel"
    >
      <cds-hamburger
        *ngIf="showHamburger"
        (selected)="sideNavToggled.emit(!sideNavOpen)"
        [active]="sideNavOpen"
      ></cds-hamburger>
      <cds-header-navigation *ngIf="showHeaderNav">
        <ng-content select="[headerNav]"></ng-content>
      </cds-header-navigation>
      <cds-header-global>
        <ng-content select="[headerGlobal]"></ng-content>
      </cds-header-global>
      <ng-content select="[headerSideNav]"></ng-content>
    </cds-header>
  `,
    })
], DosCarbonHeaderShellComponent);
export { DosCarbonHeaderShellComponent };
//# sourceMappingURL=dos-carbon-header-shell.component.js.map