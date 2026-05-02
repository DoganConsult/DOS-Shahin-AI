var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosMobileShellComponent = class DosMobileShellComponent {
};
DosMobileShellComponent = __decorate([
    Component({
        selector: 'dos-mobile-shell',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-app-shell dos-app-shell--mobile">
      <div class="dos-app-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      <main class="dos-app-shell__main"><ng-content></ng-content></main>
      <ng-content select="[shellBottomNav]"></ng-content>
    </div>
  `,
    })
], DosMobileShellComponent);
export { DosMobileShellComponent };
//# sourceMappingURL=mobile-shell.component.js.map