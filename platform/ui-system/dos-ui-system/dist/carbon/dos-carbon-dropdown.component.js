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
 * Carbon-backed single-select dropdown. For multi-select use
 * `dos-carbon-multi-select`.
 */
let DosCarbonDropdownComponent = class DosCarbonDropdownComponent {
    label = '';
    helperText = '';
    placeholder = 'Select…';
    items = [];
    size = 'md';
    disabled = false;
    readonly = false;
    skeleton = false;
    invalid = false;
    invalidText = '';
    warn = false;
    warnText = '';
    type = 'single';
    selected = new EventEmitter();
    onSelected(ev) {
        const item = Array.isArray(ev?.item) ? ev.item[0] : ev?.item;
        this.selected.emit(item ?? null);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonDropdownComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonDropdownComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "warn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "warnText", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonDropdownComponent.prototype, "type", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonDropdownComponent.prototype, "selected", void 0);
DosCarbonDropdownComponent = __decorate([
    Component({
        selector: 'dos-carbon-dropdown',
        standalone: true,
        imports: [CommonModule, DropdownModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-dropdown
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [readonly]="readonly"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [type]="type"
      (selected)="onSelected($event)"
    >
      <cds-dropdown-list [items]="items"></cds-dropdown-list>
    </cds-dropdown>
  `,
    })
], DosCarbonDropdownComponent);
export { DosCarbonDropdownComponent };
//# sourceMappingURL=dos-carbon-dropdown.component.js.map