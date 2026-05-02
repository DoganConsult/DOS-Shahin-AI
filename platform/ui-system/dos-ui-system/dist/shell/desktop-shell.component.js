var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosDesktopShellComponent = class DosDesktopShellComponent {
};
DosDesktopShellComponent = __decorate([
    Component({
        selector: 'dos-desktop-shell',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-app-shell dos-app-shell--desktop">
      <aside class="dos-app-shell__sidebar"><ng-content select="[shellSidebar]"></ng-content></aside>
      <header class="dos-app-shell__header"><ng-content select="[shellHeader]"></ng-content></header>
      <main class="dos-app-shell__main"><ng-content></ng-content></main>
    </div>
  `,
    })
], DosDesktopShellComponent);
export { DosDesktopShellComponent };
//# sourceMappingURL=desktop-shell.component.js.map