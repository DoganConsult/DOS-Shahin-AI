var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * Phase WS-2 — workspace.mobile-nav wrapper.
 * Selector: dos-mobile-bottom-nav
 * Carbon primitive: side-nav (mobile, ≤480px); replaces dos-workspace-sidebar.
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosIconComponent } from '../components/icon.component';
let DosMobileBottomNavComponent = class DosMobileBottomNavComponent {
    items = [];
    dir = 'ltr';
    ariaLabel = null;
    select = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosMobileBottomNavComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosMobileBottomNavComponent.prototype, "dir", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosMobileBottomNavComponent.prototype, "ariaLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosMobileBottomNavComponent.prototype, "select", void 0);
DosMobileBottomNavComponent = __decorate([
    Component({
        selector: 'dos-mobile-bottom-nav',
        standalone: true,
        imports: [CommonModule, DosIconComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <nav class="dos-bottom-nav" [attr.dir]="dir" [attr.aria-label]="ariaLabel || null">
      @for (item of items; track item.id) {
        <button
          type="button"
          class="dos-bottom-nav__item"
          [class.dos-bottom-nav__item--active]="item.active"
          [attr.aria-current]="item.active ? 'page' : null"
          [attr.data-nav-id]="item.id"
          (click)="select.emit(item)"
        >
          @if (item.icon) {
            <dos-icon class="dos-bottom-nav__icon"
                      [name]="item.icon"
                      [size]="22"></dos-icon>
          }
          <span class="dos-bottom-nav__label">{{ item.label }}</span>
          @if (item.badgeCount && item.badgeCount > 0) {
            <span class="dos-bottom-nav__badge">{{ item.badgeCount }}</span>
          }
        </button>
      }
    </nav>
  `,
        styles: [`
    :host { display: block; }
    .dos-bottom-nav {
      display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
      align-items: stretch; min-height: var(--cds-spacing-14);
      background: var(--cds-layer-01);
    }
    .dos-bottom-nav__item {
      display: flex; flex-direction: column; gap: .125rem;
      align-items: center; justify-content: center;
      border: 0; background: transparent; cursor: pointer; padding: .5rem .25rem;
      color: var(--cds-text-secondary); position: relative;
      border-block-start: 2px solid transparent;
      transition: color .12s, border-color .12s, background .12s;
    }
    .dos-bottom-nav__item:hover { background: var(--cds-layer-hover); }
    .dos-bottom-nav__item--active {
      color: var(--cds-link-primary);
      border-block-start-color: var(--cds-link-primary);
    }
    .dos-bottom-nav__icon { color: currentColor; }
    .dos-bottom-nav__label { font-size: .6875rem; line-height: 1; }
    .dos-bottom-nav__badge {
      position: absolute; top: .25rem; inset-inline-end: 25%;
      min-width: 1rem; padding: 0 .25rem; border-radius: 999px;
      font-size: .625rem; line-height: 1rem; text-align: center;
      background: var(--cds-support-error); color: var(--cds-text-on-color));
    }
  `],
    })
], DosMobileBottomNavComponent);
export { DosMobileBottomNavComponent };
//# sourceMappingURL=mobile-bottom-nav.component.js.map