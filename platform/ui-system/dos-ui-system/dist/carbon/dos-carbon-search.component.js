var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchModule } from 'carbon-components-angular';
import { CHROME_ARIA_LABEL_RESOLVER } from '../shell/chrome-aria-label-resolver';
/**
 * Carbon-backed search input. Carbon's `cds-search` exposes:
 *   theme/size/disabled/toolbar/expandable/skeleton/active/tableSearch/
 *   name/id/required/value/autocomplete/label/placeholder/clearButtonTitle/
 *   searchTitle/ariaLabel/fluid
 *
 * Fail-closed: the wrapper renders nothing unless an aria-label is
 * resolved from the host's runtime chrome bag (DB → UI-OS → resolver)
 * via `CHROME_ARIA_LABEL_RESOLVER`. No hardcoded English/Arabic
 * placeholder, no static `'Search'` literal. The `ariaLabelKey`
 * defaults to the wrapper's own DB-seeded chrome key
 * (`shell.dos-carbon-search.search.ariaLabel`).
 */
let DosCarbonSearchComponent = class DosCarbonSearchComponent {
    chromeAriaResolver = inject(CHROME_ARIA_LABEL_RESOLVER, { optional: true });
    _ariaLabelInput = signal(null);
    _ariaLabelKey = signal('shell.dos-carbon-search.search.ariaLabel');
    /** Direct aria-label override — used only when host already has the resolved string. */
    set ariaLabel(value) { this._ariaLabelInput.set(value && value.trim() ? value.trim() : null); }
    /** Runtime chrome key. Defaults to the wrapper's own DB-seeded key. */
    set ariaLabelKey(value) {
        this._ariaLabelKey.set(value && value.trim() ? value.trim() : '');
    }
    placeholder = '';
    value = '';
    size = 'md';
    theme = 'light';
    disabled = false;
    skeleton = false;
    autocomplete = 'off';
    name = '';
    toolbar = false;
    expandable = false;
    valueChange = new EventEmitter();
    cleared = new EventEmitter();
    resolvedAriaLabel = computed(() => {
        const direct = this._ariaLabelInput();
        if (direct)
            return direct;
        const key = this._ariaLabelKey();
        if (!key || !this.chromeAriaResolver)
            return '';
        const resolved = this.chromeAriaResolver.resolve(key);
        return typeof resolved === 'string' ? resolved.trim() : '';
    });
    onChange(value) {
        this.value = value;
        this.valueChange.emit(value);
    }
};
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], DosCarbonSearchComponent.prototype, "ariaLabel", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], DosCarbonSearchComponent.prototype, "ariaLabelKey", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonSearchComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonSearchComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonSearchComponent.prototype, "autocomplete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "name", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "toolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "expandable", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "valueChange", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "cleared", void 0);
DosCarbonSearchComponent = __decorate([
    Component({
        selector: 'dos-carbon-search',
        standalone: true,
        imports: [CommonModule, SearchModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    @if (resolvedAriaLabel()) {
      <cds-search
        [size]="size"
        [theme]="theme"
        [placeholder]="placeholder"
        [label]="resolvedAriaLabel()"
        [ariaLabel]="resolvedAriaLabel()"
        [disabled]="disabled"
        [skeleton]="skeleton"
        [autocomplete]="autocomplete"
        [name]="name"
        [value]="value"
        [toolbar]="toolbar"
        [expandable]="expandable"
        (valueChange)="onChange($event)"
        (clear)="cleared.emit()"
      ></cds-search>
    }
  `,
    })
], DosCarbonSearchComponent);
export { DosCarbonSearchComponent };
//# sourceMappingURL=dos-carbon-search.component.js.map