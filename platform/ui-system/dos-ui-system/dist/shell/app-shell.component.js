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
 * exposes `<ng-content>` projection slots `shellHeader`, `shellSidebar`,
 * default = `main`, and `shellBottomNav`. RTL-safe — uses logical inset/grid.
 *
 * Desktop layout:
 *   ┌────────────────── header ──────────────────┐
 *   │ sidebar │           main                   │
 *   └─────────┴──────────────────────────────────┘
 * Mobile layout:
 *   ┌────────── header ──────────┐
 *   │           main             │
 *   ├──────── bottomNav ─────────┤
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
    <div
      class="dos-app-shell"
      [class.dos-app-shell--mobile]="isMobile()"
      [class.dos-app-shell--desktop]="!isMobile()"
    >
      <div class="dos-app-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      @if (!isMobile()) {
        <aside class="dos-app-shell__sidebar"><ng-content select="[shellSidebar]"></ng-content></aside>
      }
      <main class="dos-app-shell__main"><ng-content></ng-content></main>
      @if (isMobile()) {
        <div class="dos-app-shell__bottom"><ng-content select="[shellBottomNav]"></ng-content></div>
      }
    </div>
  `,
        styles: [`
    :host { display: block; min-height: 100vh; }

    /* ── Shell frame ── all tokens from @carbon/styles + carbon-shell-tokens.scss ── */
    .dos-app-shell {
      min-height: 100vh;
      background: var(--cds-background);
    }

    /* Desktop: Carbon side-nav owns its own width; we respect it via the token */
    .dos-app-shell--desktop {
      display: grid;
      grid-template-columns: var(--cds-side-nav-width) 1fr;
      grid-template-rows: var(--shell-header-stack-height) 1fr;
      grid-template-areas:
        "header header"
        "sidebar main";
    }

    .dos-app-shell--mobile {
      display: grid;
      grid-template-rows: var(--shell-header-stack-height) 1fr auto;
      grid-template-areas:
        "header"
        "main"
        "bottom";
    }

    /* Header: sticky, Carbon z-index */
    .dos-app-shell__header {
      grid-area: header;
      position: sticky;
      inset-block-start: 0;
      z-index: var(--shell-z-sticky));
    }

    /* Sidebar: Carbon layer token for background */
    .dos-app-shell__sidebar {
      grid-area: sidebar;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      border-inline-end: var(--shell-border-width) solid var(--cds-border-subtle-01);
      background: var(--cds-layer-01);
      scrollbar-width: thin;
      scrollbar-color: var(--cds-border-subtle-01) transparent;
    }

    /* Main: route-change entry animation */
    .dos-app-shell__main {
      grid-area: main;
      min-width: 0;
      overflow-x: hidden;
      background: var(--shell-page-bg));
      animation: premium-fade-up 0.2s ease-out both;
    }

    /* Bottom nav: sticky with safe-area inset */
    .dos-app-shell__bottom {
      grid-area: bottom;
      position: sticky;
      inset-block-end: 0;
      z-index: var(--shell-z-sticky);
      border-block-start: var(--shell-border-width) solid var(--cds-border-subtle-01);
      background: var(--cds-layer-01);
      padding-block-end: env(safe-area-inset-bottom, 0);
    }

    /* Entry animation — from design-tokens.css */
    @keyframes premium-fade-up {
      0%   { opacity: 0; transform: translateY(8px) scale(0.99); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
  `],
    })
], DosAppShellComponent);
export { DosAppShellComponent };
//# sourceMappingURL=app-shell.component.js.map