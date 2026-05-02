var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosModuleSwitcherComponent = class DosModuleSwitcherComponent {
    /** Module catalog. Caller filters by entitlement / readiness BEFORE handing to this component. */
    modules = [];
    /** Currently-selected module id. */
    activeId = null;
    /** Display density. */
    density = 'comfortable';
    /** Locale code; the component reads `labelAr` only when this starts with 'ar'. */
    locale = 'en';
    /** Document direction; usually inherited from `<html dir>`. */
    dir = 'ltr';
    /** Optional aria label override. */
    ariaLabel = 'Switch module';
    /** Optional localize override `(en, ar?) => string`. When provided takes precedence over `locale`. */
    localize = null;
    /** Emits the chosen module entry on click (after disabled-check). */
    select = new EventEmitter();
    visibleModules = computed(() => this.modules.filter(m => !!m && !!m.id));
    showLabel = () => this.density !== 'compact';
    label(m) {
        if (this.localize)
            return this.localize(m.labelEn, m.labelAr);
        return (this.locale.startsWith('ar') && m.labelAr) ? m.labelAr : m.labelEn;
    }
    onSelect(m) {
        if (m.disabled)
            return;
        if (m.id === this.activeId)
            return;
        this.select.emit(m);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosModuleSwitcherComponent.prototype, "modules", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosModuleSwitcherComponent.prototype, "activeId", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosModuleSwitcherComponent.prototype, "density", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosModuleSwitcherComponent.prototype, "locale", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosModuleSwitcherComponent.prototype, "dir", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosModuleSwitcherComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], DosModuleSwitcherComponent.prototype, "localize", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosModuleSwitcherComponent.prototype, "select", void 0);
DosModuleSwitcherComponent = __decorate([
    Component({
        selector: 'dos-module-switcher',
        standalone: true,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [CommonModule],
        template: `
    @if (visibleModules().length > 1) {
      <div class="dos-module-switcher dos-module-switcher--{{ density }}"
           role="tablist"
           [attr.aria-label]="ariaLabel"
           [attr.dir]="dir">
        @for (mod of visibleModules(); track mod.id) {
          <button
            type="button"
            class="dos-module-switcher__tab"
            [class.is-active]="mod.id === activeId"
            [class.is-disabled]="!!mod.disabled"
            [disabled]="!!mod.disabled"
            role="tab"
            [attr.aria-selected]="mod.id === activeId"
            [attr.title]="label(mod)"
            [style.--dos-mod-color]="mod.color || ''"
            (click)="onSelect(mod)">
            @if (mod.icon) {
              <i class="dos-module-switcher__icon {{ mod.icon }}" aria-hidden="true"></i>
            }
            @if (showLabel()) {
              <span class="dos-module-switcher__label">{{ label(mod) }}</span>
            }
            @if (mod.badge) {
              <span class="dos-module-switcher__badge">{{ mod.badge }}</span>
            }
            @if (mod.id === activeId) {
              <span class="dos-module-switcher__dot" aria-hidden="true"></span>
            }
          </button>
        }
      </div>
    }
  `,
        styles: [`
    :host { display: block; }
    .dos-module-switcher {
      display: flex; gap: 4px; padding: 6px;
      background: var(--dos-color-surface-muted, #f0f4f8);
      border-radius: var(--dos-radius-md, 8px);
    }
    .dos-module-switcher--compact .dos-module-switcher__label { display: none; }
    .dos-module-switcher--expanded { flex-direction: column; }
    .dos-module-switcher__tab {
      position: relative;
      display: inline-flex; align-items: center; gap: 6px;
      flex: 0 1 auto;
      padding: 6px 10px;
      border: 1px solid transparent;
      border-radius: var(--dos-radius-sm, 6px);
      background: transparent;
      color: var(--dos-color-text, #111827);
      font: inherit;
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
    }
    .dos-module-switcher__tab:hover:not(.is-disabled) {
      background: var(--dos-color-surface, #fff);
      border-color: var(--dos-color-border, #e5e7eb);
    }
    .dos-module-switcher__tab.is-active {
      background: var(--dos-color-surface, #fff);
      border-color: var(--dos-mod-color, var(--dos-color-primary, #1d4ed8));
      color: var(--dos-mod-color, var(--dos-color-primary, #1d4ed8));
      font-weight: 600;
    }
    .dos-module-switcher__tab.is-disabled {
      opacity: 0.4; cursor: not-allowed;
    }
    .dos-module-switcher__tab:focus-visible {
      outline: 2px solid var(--dos-color-focus, #2563eb);
      outline-offset: 2px;
    }
    .dos-module-switcher__icon { font-size: 1rem; line-height: 1; }
    .dos-module-switcher__label {
      font-size: var(--dos-font-size-sm, 0.85rem);
      white-space: nowrap;
    }
    .dos-module-switcher__badge {
      display: inline-flex;
      align-items: center;
      padding: 0 6px;
      height: 16px;
      border-radius: 8px;
      font-size: 0.7rem;
      background: var(--dos-color-accent-bg, #fffbeb);
      color: var(--dos-color-accent-text, #92400e);
    }
    .dos-module-switcher__dot {
      width: 4px; height: 4px; border-radius: 50%;
      background: var(--dos-mod-color, var(--dos-color-primary, #1d4ed8));
    }
    [dir="rtl"] .dos-module-switcher { direction: rtl; }
  `],
    })
], DosModuleSwitcherComponent);
export { DosModuleSwitcherComponent };
//# sourceMappingURL=module-switcher.component.js.map