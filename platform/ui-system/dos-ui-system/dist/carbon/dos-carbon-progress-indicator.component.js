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
import { ProgressIndicatorModule } from 'carbon-components-angular';
/**
 * Carbon-backed progress indicator (stepper). Supports horizontal
 * and vertical orientation. Required on multi-step wizards.
 */
let DosCarbonProgressIndicatorComponent = class DosCarbonProgressIndicatorComponent {
    steps = [];
    current = 0;
    orientation = 'horizontal';
    skeleton = false;
    spaceEqually = false;
    stepSelected = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonProgressIndicatorComponent.prototype, "steps", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressIndicatorComponent.prototype, "current", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonProgressIndicatorComponent.prototype, "orientation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressIndicatorComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressIndicatorComponent.prototype, "spaceEqually", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonProgressIndicatorComponent.prototype, "stepSelected", void 0);
DosCarbonProgressIndicatorComponent = __decorate([
    Component({
        selector: 'dos-carbon-progress-indicator',
        standalone: true,
        imports: [CommonModule, ProgressIndicatorModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-progress-indicator
      [steps]="steps"
      [orientation]="orientation"
      [skeleton]="skeleton"
      [spacing]="spaceEqually ? 'equal' : 'default'"
      [current]="current"
      (stepSelected)="stepSelected.emit($event)"
    ></cds-progress-indicator>
  `,
    })
], DosCarbonProgressIndicatorComponent);
export { DosCarbonProgressIndicatorComponent };
//# sourceMappingURL=dos-carbon-progress-indicator.component.js.map