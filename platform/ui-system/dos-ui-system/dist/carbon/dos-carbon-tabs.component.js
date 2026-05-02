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
import { TabsModule } from 'carbon-components-angular';
let DosCarbonTabsComponent = class DosCarbonTabsComponent {
    items = [];
    selectedId = '';
    selectedIdChange = new EventEmitter();
    onSelected(idx) {
        const item = this.items[idx];
        if (!item || item.disabled)
            return;
        this.selectedId = item.id;
        this.selectedIdChange.emit(item.id);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonTabsComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTabsComponent.prototype, "selectedId", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTabsComponent.prototype, "selectedIdChange", void 0);
DosCarbonTabsComponent = __decorate([
    Component({
        selector: 'dos-carbon-tabs',
        standalone: true,
        imports: [CommonModule, TabsModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-tabs (selected)="onSelected($event)">
      @for (t of items; track t.id) {
        <cds-tab
          [heading]="t.label"
          [disabled]="!!t.disabled"
          [active]="t.id === selectedId"
        >
          @if (t.id === selectedId) {
            <ng-content></ng-content>
          }
        </cds-tab>
      }
    </cds-tabs>
  `,
    })
], DosCarbonTabsComponent);
export { DosCarbonTabsComponent };
//# sourceMappingURL=dos-carbon-tabs.component.js.map