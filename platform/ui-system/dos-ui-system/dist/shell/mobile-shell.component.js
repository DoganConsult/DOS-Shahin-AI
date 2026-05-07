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
let DosMobileShellComponent = class DosMobileShellComponent {
    mobileConfig;
    gestureEvent = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMobileShellComponent.prototype, "mobileConfig", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosMobileShellComponent.prototype, "gestureEvent", void 0);
DosMobileShellComponent = __decorate([
    Component({
        selector: 'dos-mobile-shell',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-mobile-shell" [class.dos-mobile-shell--compact]="mobileConfig?.density === 'compact'">
      <div class="dos-mobile-shell__header"><ng-content select="[shellHeader]"></ng-content></div>
      <main class="dos-mobile-shell__main"><ng-content></ng-content></main>
      <div class="dos-mobile-shell__bottom"><ng-content select="[shellBottomNav]"></ng-content></div>
      <ng-content select="[shellDrawer]"></ng-content>
    </div>
  `,
        styles: [`
    :host { display: block; min-height: 100vh; }
    .dos-mobile-shell {
      display: grid; grid-template-rows: auto 1fr auto;
      min-height: 100vh; background: var(--cds-background);
    }
    .dos-mobile-shell--compact {
      --mobile-padding: 8px;
    }
    .dos-mobile-shell__header { position: sticky; top: 0; z-index: var(--dos-z-sticky); }
    .dos-mobile-shell__main   { min-width: 0; overflow-x: hidden; padding-bottom: var(--cds-spacing-14); }
    .dos-mobile-shell__bottom { position: sticky; bottom: 0; z-index: var(--dos-z-sticky);
                                border-block-start: 1px solid var(--cds-border-subtle-01); }
  `],
    })
], DosMobileShellComponent);
export { DosMobileShellComponent };
//# sourceMappingURL=mobile-shell.component.js.map