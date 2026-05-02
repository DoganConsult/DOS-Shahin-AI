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
let DosTabsComponent = class DosTabsComponent {
    items = [];
    selectedId = '';
    selectedIdChange = new EventEmitter();
    select(t) {
        this.selectedId = t.id;
        this.selectedIdChange.emit(t.id);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosTabsComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosTabsComponent.prototype, "selectedId", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosTabsComponent.prototype, "selectedIdChange", void 0);
DosTabsComponent = __decorate([
    Component({
        selector: 'dos-tabs',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-tabs" role="tablist">
      @for (t of items; track t.id) {
        <button
          type="button"
          role="tab"
          class="dos-tabs__item"
          [attr.aria-selected]="t.id === selectedId"
          (click)="select(t)"
        >
          {{ t.label }}
        </button>
      }
    </div>
  `,
    })
], DosTabsComponent);
export { DosTabsComponent };
//# sourceMappingURL=tabs.component.js.map