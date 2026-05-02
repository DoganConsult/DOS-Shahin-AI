var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DosSideDrawerComponent_1;
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, } from '@angular/core';
import { CommonModule } from '@angular/common';
/**
 * DosSideDrawer
 * -------------
 * Right- (or left-) edge sliding side panel. Filed as Wave H-2 to
 * unblock detail-drawer migrations that the original PrimeNG estate
 * shipped as <p-dialog position="right"> or <p-sidebar position="right">
 * or custom `.drawer { height:100vh; box-shadow:-4px 0 24px... }`.
 *
 * Distinct from:
 *   - DosDesktopDialog (centered modal)
 *   - DosBottomSheet   (mobile bottom edge)
 *   - DosMobileDrawer  (mobile bottom-sheet alias used by app shell)
 *
 * API
 *   open       — boolean, two-way friendly via [open] + (closed)
 *   title      — header label (aria-labelledby bound)
 *   position   — 'left' | 'right' (default 'right')
 *   width      — 'sm' | 'md' | 'lg' | 'xl' | css length string
 *                'md' (560px) is the safe default for detail panels
 *   dismissOn  — 'esc-and-overlay' | 'esc' | 'none'; default 'esc-and-overlay'
 *
 * Slots
 *   default          — body content (scrollable)
 *   [drawerFooter]   — sticky-bottom action row, auto-hidden when empty
 *
 * Accessibility
 *   - role="dialog" aria-modal="true"
 *   - title bound to aria-labelledby
 *   - focus moves to the panel container on open
 *   - ESC closes (when dismissOn permits)
 *   - body scroll-lock is intentionally NOT applied at primitive level;
 *     hosts apply it via their own service if needed.
 */
let DosSideDrawerComponent = class DosSideDrawerComponent {
    static { DosSideDrawerComponent_1 = this; }
    open = false;
    title = '';
    position = 'right';
    width = 'md';
    dismissOn = 'esc-and-overlay';
    closed = new EventEmitter();
    panel;
    titleId = `dos-side-drawer-title-${Math.random().toString(36).slice(2, 9)}`;
    static WIDTH_MAP = {
        sm: '360px',
        md: '560px',
        lg: '720px',
        xl: '900px',
    };
    resolvedWidth() {
        const w = this.width;
        if (typeof w === 'string' && DosSideDrawerComponent_1.WIDTH_MAP[w]) {
            return DosSideDrawerComponent_1.WIDTH_MAP[w];
        }
        return typeof w === 'string' ? w : '560px';
    }
    ngAfterViewInit() {
        this.maybeFocusPanel();
    }
    ngOnChanges(changes) {
        if (changes['open'] && this.open) {
            queueMicrotask(() => this.maybeFocusPanel());
        }
    }
    onEscape() {
        if (!this.open)
            return;
        if (this.dismissOn === 'none')
            return;
        this.closed.emit();
    }
    onOverlayClick(_event) {
        if (this.dismissOn !== 'esc-and-overlay')
            return;
        this.closed.emit();
    }
    maybeFocusPanel() {
        if (!this.open)
            return;
        const el = this.panel?.nativeElement;
        if (el && typeof el.focus === 'function') {
            try {
                el.focus({ preventScroll: true });
            }
            catch { /* noop */ }
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosSideDrawerComponent.prototype, "open", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosSideDrawerComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosSideDrawerComponent.prototype, "position", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosSideDrawerComponent.prototype, "width", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosSideDrawerComponent.prototype, "dismissOn", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosSideDrawerComponent.prototype, "closed", void 0);
__decorate([
    ViewChild('panel'),
    __metadata("design:type", ElementRef)
], DosSideDrawerComponent.prototype, "panel", void 0);
__decorate([
    HostListener('document:keydown.escape'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DosSideDrawerComponent.prototype, "onEscape", null);
DosSideDrawerComponent = DosSideDrawerComponent_1 = __decorate([
    Component({
        selector: 'dos-side-drawer',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    @if (open) {
      <div class="dos-side-drawer__overlay" (click)="onOverlayClick($event)" data-test="dos-side-drawer-overlay">
        <aside
          #panel
          class="dos-side-drawer"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.data-position]="position"
          [style.--dos-side-drawer-width]="resolvedWidth()"
          (click)="$event.stopPropagation()"
          tabindex="-1"
        >
          <header class="dos-side-drawer__header dos-stack-h">
            <strong [id]="titleId">{{ title }}</strong>
            <button
              type="button"
              class="dos-command-bar__btn"
              aria-label="Close"
              (click)="closed.emit()"
              data-test="dos-side-drawer-close"
            >×</button>
          </header>
          <div class="dos-side-drawer__body">
            <ng-content></ng-content>
          </div>
          <footer class="dos-side-drawer__footer">
            <ng-content select="[drawerFooter]"></ng-content>
          </footer>
        </aside>
      </div>
    }
  `,
    })
], DosSideDrawerComponent);
export { DosSideDrawerComponent };
//# sourceMappingURL=side-drawer.component.js.map