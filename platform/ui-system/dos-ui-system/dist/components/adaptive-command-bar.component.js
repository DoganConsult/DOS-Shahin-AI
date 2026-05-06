var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosAdaptiveCommandBarComponent = class DosAdaptiveCommandBarComponent {
    _actions = signal([]);
    _mobile = signal(false);
    overflowOpen = signal(false);
    set actions(v) {
        this._actions.set(Array.isArray(v) ? v : []);
    }
    set mobile(v) {
        this._mobile.set(!!v);
    }
    invoke = new EventEmitter();
    primaryActions() {
        const all = this._actions();
        if (!this._mobile())
            return all.filter(a => a.mobile !== 'hidden');
        // Mobile: keep up to 3 visible, rest go to overflow.
        const visible = all.filter(a => a.mobile === 'visible' || a.priority === 'primary');
        return visible.slice(0, 3);
    }
    overflowActions() {
        const all = this._actions();
        if (!this._mobile()) {
            return all.filter(a => a.priority === 'overflow' || a.mobile === 'overflow');
        }
        const primary = new Set(this.primaryActions().map(a => a.id));
        return all.filter(a => !primary.has(a.id) && a.mobile !== 'hidden');
    }
    toggleOverflow() {
        this.overflowOpen.set(!this.overflowOpen());
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], DosAdaptiveCommandBarComponent.prototype, "actions", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], DosAdaptiveCommandBarComponent.prototype, "mobile", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosAdaptiveCommandBarComponent.prototype, "invoke", void 0);
DosAdaptiveCommandBarComponent = __decorate([
    Component({
        selector: 'dos-adaptive-command-bar',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-command-bar" role="toolbar">
      @for (a of primaryActions(); track a.id) {
        <button
          type="button"
          class="dos-command-bar__btn"
          [class.dos-command-bar__btn--primary]="a.priority === 'primary'"
          (click)="invoke.emit(a)"
        >
          {{ a.i18nKey }}
        </button>
      }
      @if (overflowActions().length > 0) {
        <button type="button" class="dos-command-bar__btn" (click)="toggleOverflow()">⋯</button>
      }
    </div>
    @if (overflowOpen() && overflowActions().length > 0) {
      <div class="dos-account-menu" role="menu">
        @for (a of overflowActions(); track a.id) {
          <button type="button" role="menuitem" class="dos-bottom-nav__item" (click)="invoke.emit(a)">
            {{ a.i18nKey }}
          </button>
        }
      </div>
    }
  `,
    })
], DosAdaptiveCommandBarComponent);
export { DosAdaptiveCommandBarComponent };
//# sourceMappingURL=adaptive-command-bar.component.js.map