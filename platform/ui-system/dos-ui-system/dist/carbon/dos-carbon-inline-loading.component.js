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
import { InlineLoadingModule } from 'carbon-components-angular';
/**
 * Carbon-backed inline loading. Used for save/submit buttons and
 * form-level progress (active → finished/error transitions).
 */
let DosCarbonInlineLoadingComponent = class DosCarbonInlineLoadingComponent {
    state = 'active';
    loadingText = 'Loading…';
    successText = 'Success';
    errorText = 'Error';
    finished = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonInlineLoadingComponent.prototype, "state", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonInlineLoadingComponent.prototype, "loadingText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonInlineLoadingComponent.prototype, "successText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonInlineLoadingComponent.prototype, "errorText", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonInlineLoadingComponent.prototype, "finished", void 0);
DosCarbonInlineLoadingComponent = __decorate([
    Component({
        selector: 'dos-carbon-inline-loading',
        standalone: true,
        imports: [CommonModule, InlineLoadingModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-inline-loading
      [state]="state"
      [loadingText]="loadingText"
      [successText]="successText"
      [errorText]="errorText"
      (onSuccess)="finished.emit()"
    ></cds-inline-loading>
  `,
    })
], DosCarbonInlineLoadingComponent);
export { DosCarbonInlineLoadingComponent };
//# sourceMappingURL=dos-carbon-inline-loading.component.js.map