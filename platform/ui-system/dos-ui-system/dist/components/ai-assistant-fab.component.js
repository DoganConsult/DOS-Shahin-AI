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
/**
 * AI Assistant FAB. There MUST be only one FAB per shell. Consumers
 * must not render their own page-local fixed-position buttons.
 */
let DosAiAssistantFabComponent = class DosAiAssistantFabComponent {
    label = 'Open AI Assistant';
    open = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosAiAssistantFabComponent.prototype, "label", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosAiAssistantFabComponent.prototype, "open", void 0);
DosAiAssistantFabComponent = __decorate([
    Component({
        selector: 'dos-ai-assistant-fab',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <button
      type="button"
      class="dos-fab"
      [attr.aria-label]="label"
      (click)="open.emit()"
    >
      AI
    </button>
  `,
    })
], DosAiAssistantFabComponent);
export { DosAiAssistantFabComponent };
//# sourceMappingURL=ai-assistant-fab.component.js.map