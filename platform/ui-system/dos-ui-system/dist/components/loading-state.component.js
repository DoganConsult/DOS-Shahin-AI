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
let DosLoadingStateComponent = class DosLoadingStateComponent {
    label = 'Loading…';
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosLoadingStateComponent.prototype, "label", void 0);
DosLoadingStateComponent = __decorate([
    Component({
        selector: 'dos-loading-state',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-loading-state" role="status" aria-live="polite">
      {{ label }}
    </div>
  `,
    })
], DosLoadingStateComponent);
export { DosLoadingStateComponent };
//# sourceMappingURL=loading-state.component.js.map