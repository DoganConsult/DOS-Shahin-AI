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
import { TooltipModule } from 'carbon-components-angular';
/**
 * Carbon-backed tooltip wrapper. Carbon's tooltip is a `<cds-tooltip>`
 * element that wraps the trigger via content projection.
 *
 * Inputs: id/enterDelayMs/leaveDelayMs/disabled/description/templateContext.
 *
 * Wave 8 note: This component is currently exported but has no consumers in
 * the workspace (NG8113 warning is expected). It is intentionally retained as
 * a ready-to-use wrapper for agent-tile hover tooltips and future use cases.
 * Do NOT import AccessStore or tenant context here — this is a pure UI primitive.
 */
let DosCarbonTooltipComponent = class DosCarbonTooltipComponent {
    description = '';
    enterDelayMs = 100;
    leaveDelayMs = 100;
    disabled = false;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTooltipComponent.prototype, "description", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTooltipComponent.prototype, "enterDelayMs", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTooltipComponent.prototype, "leaveDelayMs", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTooltipComponent.prototype, "disabled", void 0);
DosCarbonTooltipComponent = __decorate([
    Component({
        selector: 'dos-carbon-tooltip',
        standalone: true,
        imports: [CommonModule, TooltipModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-tooltip
      [description]="description"
      [enterDelayMs]="enterDelayMs"
      [leaveDelayMs]="leaveDelayMs"
      [disabled]="disabled"
    >
      <ng-content></ng-content>
    </cds-tooltip>
  `,
    })
], DosCarbonTooltipComponent);
export { DosCarbonTooltipComponent };
//# sourceMappingURL=dos-carbon-tooltip.component.js.map