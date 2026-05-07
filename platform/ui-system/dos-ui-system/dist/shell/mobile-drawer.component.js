var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
/**
 * Mobile drawer — full-height slide-in overlay menu for the mobile shell.
 * RTL-safe: slides from logical inset-start (left in LTR, right in RTL).
 */
let DosMobileDrawerComponent = class DosMobileDrawerComponent {
    open = false;
    title = '';
    dir = 'ltr';
    closeLabel = null;
    touchTargetSize = 44;
    swipeToNavigate = false;
    hapticFeedback = true;
    closed = new EventEmitter();
    swipeEvent = new EventEmitter();
    startX = 0;
    onEscape() {
        if (this.open)
            this.handleClose();
    }
    onTouchStart(event) {
        if (this.swipeToNavigate) {
            this.startX = event.touches[0].clientX;
        }
    }
    onTouchEnd(event) {
        if (this.swipeToNavigate && this.open) {
            const endX = event.changedTouches[0].clientX;
            const diffX = endX - this.startX;
            if (Math.abs(diffX) > 50) {
                this.swipeEvent.emit({ direction: diffX > 0 ? 'right' : 'left' });
                if (diffX > 0) {
                    this.handleClose();
                }
            }
        }
    }
    handleClose() {
        if (this.hapticFeedback) {
            this.triggerHaptic();
        }
        this.closed.emit();
    }
    triggerHaptic() {
        if ('vibrate' in navigator) {
            navigator.vibrate(15);
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMobileDrawerComponent.prototype, "open", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMobileDrawerComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosMobileDrawerComponent.prototype, "dir", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosMobileDrawerComponent.prototype, "closeLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMobileDrawerComponent.prototype, "touchTargetSize", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMobileDrawerComponent.prototype, "swipeToNavigate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosMobileDrawerComponent.prototype, "hapticFeedback", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosMobileDrawerComponent.prototype, "closed", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosMobileDrawerComponent.prototype, "swipeEvent", void 0);
__decorate([
    HostListener('document:keydown.escape'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DosMobileDrawerComponent.prototype, "onEscape", null);
__decorate([
    HostListener('touchstart', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TouchEvent]),
    __metadata("design:returntype", void 0)
], DosMobileDrawerComponent.prototype, "onTouchStart", null);
__decorate([
    HostListener('touchend', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TouchEvent]),
    __metadata("design:returntype", void 0)
], DosMobileDrawerComponent.prototype, "onTouchEnd", null);
DosMobileDrawerComponent = __decorate([
    Component({
        selector: 'dos-mobile-drawer',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    @if (open) {
      <div class="dos-mobile-drawer__scrim"
           (click)="handleClose()"
           aria-hidden="true"></div>
      <aside class="dos-mobile-drawer"
             [attr.dir]="dir"
             role="dialog"
             aria-modal="true"
             [attr.aria-label]="title">
        <header class="dos-mobile-drawer__header">
          <strong>{{ title }}</strong>
          <button type="button"
                  class="dos-mobile-drawer__close"
                  (click)="handleClose()"
                  [style.min-height.px]="touchTargetSize"
                  [style.min-width.px]="touchTargetSize"
                  [attr.aria-label]="closeLabel || null">×</button>
        </header>
        <div class="dos-mobile-drawer__body"><ng-content></ng-content></div>
      </aside>
    }
  `,
        styles: [`
    :host { display: contents; }
    .dos-mobile-drawer__scrim {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: var(--dos-z-drawer);
      animation: dos-drawer-fade .15s ease-out;
    }
    .dos-mobile-drawer {
      position: fixed; inset-block: 0; inset-inline-start: 0;
      width: min(86vw, var(--dos-drawer-width)); max-width: 100vw;
      background: var(--cds-layer-01);
      box-shadow: 0 0 24px rgba(0,0,0,0.15);
      z-index: var(--dos-z-modal); display: flex; flex-direction: column;
      animation: dos-drawer-slide .18s ease-out;
    }
    .dos-mobile-drawer__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--cds-spacing-04) var(--cds-spacing-05);
      border-block-end: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-layer-02);
    }
    .dos-mobile-drawer__close {
      width: 2rem; height: 2rem; border: 0; background: transparent;
      font-size: 1.5rem; line-height: 1; cursor: pointer;
      color: var(--cds-text-primary); border-radius: 2px;
      transition: transform 0.12s ease-out;
    }
    .dos-mobile-drawer__close:active {
      transform: scale(0.9);
    }
    .dos-mobile-drawer__close:hover { background: var(--cds-layer-hover); }
    .dos-mobile-drawer__body { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
    @keyframes dos-drawer-fade  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dos-drawer-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    [dir="rtl"].dos-mobile-drawer { animation-name: dos-drawer-slide-rtl; }
    @keyframes dos-drawer-slide-rtl { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `],
    })
], DosMobileDrawerComponent);
export { DosMobileDrawerComponent };
//# sourceMappingURL=mobile-drawer.component.js.map