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
import { DropdownModule } from 'carbon-components-angular';
let DosCarbonSelectComponent = class DosCarbonSelectComponent {
    label = '';
    helperText = '';
    invalid = false;
    invalidText = '';
    disabled = false;
    options = [];
    selectedChange = new EventEmitter();
    onSelected(ev) {
        this.selectedChange.emit(ev?.item?.value ?? null);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSelectComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSelectComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSelectComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSelectComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSelectComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonSelectComponent.prototype, "options", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonSelectComponent.prototype, "selectedChange", void 0);
DosCarbonSelectComponent = __decorate([
    Component({
        selector: 'dos-carbon-select',
        standalone: true,
        imports: [CommonModule, DropdownModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-dropdown
      [label]="label"
      [helperText]="helperText"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [disabled]="disabled"
      (selected)="onSelected($event)"
    >
      <cds-dropdown-list [items]="options"></cds-dropdown-list>
    </cds-dropdown>
  `,
    })
], DosCarbonSelectComponent);
export { DosCarbonSelectComponent };
//# sourceMappingURL=dos-carbon-select.component.js.map