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
import { ToggletipModule } from 'carbon-components-angular';
/**
 * Carbon-backed toggle-tip (info-button + popover panel). Carbon ships
 * `<cds-toggletip>` element with `[cdsToggletipButton]` and
 * `[cdsToggletipContent]` directive slots.
 *
 * Inputs: id/isOpen.
 */
let DosCarbonToggleTipComponent = class DosCarbonToggleTipComponent {
    isOpen = false;
    buttonLabel = 'More info';
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleTipComponent.prototype, "isOpen", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleTipComponent.prototype, "buttonLabel", void 0);
DosCarbonToggleTipComponent = __decorate([
    Component({
        selector: 'dos-carbon-toggle-tip',
        standalone: true,
        imports: [CommonModule, ToggletipModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-toggletip [isOpen]="isOpen">
      <button cdsToggletipButton type="button" [attr.aria-label]="buttonLabel">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.5 11h-1v-5h1v5Zm0-7h-1V4h1v1Z"/>
        </svg>
      </button>
      <span cdsToggletipContent>
        <ng-content select="[slot=content]"></ng-content>
        <ng-content></ng-content>
      </span>
    </cds-toggletip>
  `,
    })
], DosCarbonToggleTipComponent);
export { DosCarbonToggleTipComponent };
//# sourceMappingURL=dos-carbon-toggle-tip.component.js.map