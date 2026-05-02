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
let DosBottomSheetComponent = class DosBottomSheetComponent {
    open = false;
    title = '';
    closed = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosBottomSheetComponent.prototype, "open", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosBottomSheetComponent.prototype, "title", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosBottomSheetComponent.prototype, "closed", void 0);
DosBottomSheetComponent = __decorate([
    Component({
        selector: 'dos-bottom-sheet',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    @if (open) {
      <div class="dos-bottom-sheet" role="dialog" aria-modal="true">
        <header class="dos-stack-h">
          @if (title) { <strong>{{ title }}</strong> }
          <button type="button" class="dos-command-bar__btn" (click)="closed.emit()">×</button>
        </header>
        <ng-content></ng-content>
      </div>
    }
  `,
    })
], DosBottomSheetComponent);
export { DosBottomSheetComponent };
//# sourceMappingURL=bottom-sheet.component.js.map