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
import { ContentSwitcherModule } from 'carbon-components-angular';
/**
 * Carbon-backed content switcher. Carbon's `cds-content-switcher` only
 * exposes `ariaLabel` and `size`.
 */
let DosCarbonContentSwitcherComponent = class DosCarbonContentSwitcherComponent {
    options = [];
    size = 'md';
    ariaLabel = 'Content switcher';
    selected = new EventEmitter();
    onSelected(ev) {
        const idx = typeof ev?.index === 'number' ? ev.index : 0;
        const opt = this.options[idx];
        if (opt)
            this.selected.emit(opt);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonContentSwitcherComponent.prototype, "options", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonContentSwitcherComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonContentSwitcherComponent.prototype, "ariaLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonContentSwitcherComponent.prototype, "selected", void 0);
DosCarbonContentSwitcherComponent = __decorate([
    Component({
        selector: 'dos-carbon-content-switcher',
        standalone: true,
        imports: [CommonModule, ContentSwitcherModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-content-switcher
      [size]="size"
      [ariaLabel]="ariaLabel"
      (selected)="onSelected($event)"
    >
      <button
        cdsContentOption
        *ngFor="let opt of options"
        [disabled]="opt.disabled || false"
      >{{ opt.label }}</button>
    </cds-content-switcher>
  `,
    })
], DosCarbonContentSwitcherComponent);
export { DosCarbonContentSwitcherComponent };
//# sourceMappingURL=dos-carbon-content-switcher.component.js.map