var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayerModule } from 'carbon-components-angular';
/**
 * Carbon-backed layer wrapper. `cdsLayer` is a directive that scopes
 * the surrounding `--cds-layer-*` tokens. Apply via the directive on a
 * host `<div>` — Carbon resolves the layer level from the surrounding
 * context automatically.
 */
let DosCarbonLayerComponent = class DosCarbonLayerComponent {
    level = 1;
};
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosCarbonLayerComponent.prototype, "level", void 0);
DosCarbonLayerComponent = __decorate([
    Component({
        selector: 'dos-carbon-layer',
        standalone: true,
        imports: [CommonModule, LayerModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div [cdsLayer]="level">
      <ng-content></ng-content>
    </div>
  `,
    })
], DosCarbonLayerComponent);
export { DosCarbonLayerComponent };
//# sourceMappingURL=dos-carbon-layer.component.js.map