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
import { DropdownModule } from 'carbon-components-angular';
/**
 * Carbon-backed multi-select. Renders a dropdown with checkboxes.
 */
let DosCarbonMultiSelectComponent = class DosCarbonMultiSelectComponent {
    label = '';
    helperText = '';
    placeholder = 'Select…';
    items = [];
    size = 'md';
    theme = 'light';
    disabled = false;
    skeleton = false;
    invalid = false;
    invalidText = '';
    selected = new EventEmitter();
    onSelected(ev) {
        const arr = Array.isArray(ev?.item) ? ev.item : (ev?.item ? [ev.item] : []);
        this.selected.emit(arr);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonMultiSelectComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonMultiSelectComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonMultiSelectComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "invalidText", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonMultiSelectComponent.prototype, "selected", void 0);
DosCarbonMultiSelectComponent = __decorate([
    Component({
        selector: 'dos-carbon-multi-select',
        standalone: true,
        imports: [CommonModule, DropdownModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-dropdown
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [type]="'multi'"
      (selected)="onSelected($event)"
    >
      <cds-dropdown-list [items]="items"></cds-dropdown-list>
    </cds-dropdown>
  `,
    })
], DosCarbonMultiSelectComponent);
export { DosCarbonMultiSelectComponent };
//# sourceMappingURL=dos-carbon-multi-select.component.js.map