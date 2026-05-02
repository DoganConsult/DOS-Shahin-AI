var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconModule } from 'carbon-components-angular';
/**
 * Carbon icon wrapper. Accepts an icon descriptor (e.g. an imported icon
 * from `@carbon/icons/lib/<name>/<size>`) plus a size; consumers MUST keep
 * the icon imports inside @dos/ui-system rather than scattering them.
 */
let DosCarbonIconComponent = class DosCarbonIconComponent {
    icon = null;
    size = '16';
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonIconComponent.prototype, "icon", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonIconComponent.prototype, "size", void 0);
DosCarbonIconComponent = __decorate([
    Component({
        selector: 'dos-carbon-icon',
        standalone: true,
        imports: [CommonModule, IconModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<svg [cdsIcon]="icon" [size]="size"></svg>`,
    })
], DosCarbonIconComponent);
export { DosCarbonIconComponent };
//# sourceMappingURL=dos-carbon-icon.component.js.map