var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
/**
 * AppShell — universal page chrome.
 *
 * Resolves to MobileShell (≤480px) or DesktopShell (≥1025px) at the
 * consumer; this component renders the canonical CSS grid wrapper and
 * exposes `<ng-content>` projection slots `header`, `sidebar`, `main`,
 * and `bottomNav`. RTL-safe: uses logical inset/grid only.
 */
let DosAppShellComponent = class DosAppShellComponent {
    set mobile(value) {
        this._mobile.set(!!value);
    }
    _mobile = signal(false);
    isMobile = computed(() => this._mobile());
};
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], DosAppShellComponent.prototype, "mobile", null);
DosAppShellComponent = __decorate([
    Component({
        selector: 'dos-app-shell',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-app-shell" [class.dos-app-shell--mobile]="isMobile()" [class.dos-app-shell--desktop]="!isMobile()">
      <div class="dos-app-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      <div class="dos-app-shell__sidebar"><ng-content select="[shellSidebar]"></ng-content></div>
      <main class="dos-app-shell__main"><ng-content></ng-content></main>
      @if (isMobile()) {
        <ng-content select="[shellBottomNav]"></ng-content>
      }
    </div>
  `,
    })
], DosAppShellComponent);
export { DosAppShellComponent };
//# sourceMappingURL=app-shell.component.js.map