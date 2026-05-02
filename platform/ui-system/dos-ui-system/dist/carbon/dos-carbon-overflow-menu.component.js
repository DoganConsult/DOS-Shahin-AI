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
import { DialogModule } from 'carbon-components-angular';
/**
 * Carbon-backed overflow (kebab) menu wrapper.
 *
 * Carbon's overflow-menu is a directive (`cdsOverflowMenu`) attached to
 * a trigger button; the menu options live in `cds-overflow-menu-pane`.
 * This wrapper composes both with a sensible default trigger.
 */
let DosCarbonOverflowMenuComponent = class DosCarbonOverflowMenuComponent {
    items = [];
    flip = false;
    offset = { x: 0, y: 0 };
    buttonLabel = 'Options';
    selected = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonOverflowMenuComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonOverflowMenuComponent.prototype, "flip", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonOverflowMenuComponent.prototype, "offset", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonOverflowMenuComponent.prototype, "buttonLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonOverflowMenuComponent.prototype, "selected", void 0);
DosCarbonOverflowMenuComponent = __decorate([
    Component({
        selector: 'dos-carbon-overflow-menu',
        standalone: true,
        imports: [CommonModule, DialogModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <button
      type="button"
      class="cds--overflow-menu"
      [cdsOverflowMenu]="menuPane"
      [flip]="flip"
      [offset]="offset"
      [attr.aria-label]="buttonLabel"
    >
      <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
        <circle cx="16" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="16" cy="24" r="2"/>
      </svg>
    </button>
    <ng-template #menuPane>
      <cds-overflow-menu-pane>
        <ng-container *ngFor="let item of items">
          <cds-overflow-menu-option
            *ngIf="!item.divider"
            [disabled]="item.disabled || false"
            [type]="item.danger ? 'danger' : null"
            (selected)="selected.emit(item.id)"
          >{{ item.label }}</cds-overflow-menu-option>
        </ng-container>
      </cds-overflow-menu-pane>
    </ng-template>
  `,
    })
], DosCarbonOverflowMenuComponent);
export { DosCarbonOverflowMenuComponent };
//# sourceMappingURL=dos-carbon-overflow-menu.component.js.map