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
import { AccordionModule } from 'carbon-components-angular';
/**
 * Carbon-backed accordion. Pass `[items]` for simple text content; for
 * rich content, project per-panel templates inside the component.
 */
let DosCarbonAccordionComponent = class DosCarbonAccordionComponent {
    items = [];
    size = 'md';
    align = 'end';
    skeleton = false;
    opened = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonAccordionComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonAccordionComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonAccordionComponent.prototype, "align", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonAccordionComponent.prototype, "skeleton", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonAccordionComponent.prototype, "opened", void 0);
DosCarbonAccordionComponent = __decorate([
    Component({
        selector: 'dos-carbon-accordion',
        standalone: true,
        imports: [CommonModule, AccordionModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-accordion [size]="size" [align]="align" [skeleton]="skeleton">
      <cds-accordion-item
        *ngFor="let item of items; let i = index"
        [title]="item.title"
        [expanded]="item.open"
        [disabled]="item.disabled || false"
        (selected)="opened.emit(i)"
      >
        {{ item.content }}
        <ng-content [select]="'[slot=item-' + i + ']'"></ng-content>
      </cds-accordion-item>
    </cds-accordion>
  `,
    })
], DosCarbonAccordionComponent);
export { DosCarbonAccordionComponent };
//# sourceMappingURL=dos-carbon-accordion.component.js.map