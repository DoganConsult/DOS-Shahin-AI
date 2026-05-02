var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchModule } from 'carbon-components-angular';
/**
 * Carbon-backed search input. Carbon's `cds-search` exposes:
 *   theme/size/disabled/toolbar/expandable/skeleton/active/tableSearch/
 *   name/id/required/value/autocomplete/label/placeholder/clearButtonTitle/
 *   searchTitle/ariaLabel/fluid
 */
let DosCarbonSearchComponent = class DosCarbonSearchComponent {
    label = 'Search';
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
    onChange(value) {
        this.value = value;
        this.valueChange.emit(value);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSearchComponent.prototype, "label", void 0);
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
    <cds-search
      [size]="size"
      [theme]="theme"
      [placeholder]="placeholder"
      [label]="label"
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
  `,
    })
], DosCarbonSearchComponent);
export { DosCarbonSearchComponent };
//# sourceMappingURL=dos-carbon-search.component.js.map