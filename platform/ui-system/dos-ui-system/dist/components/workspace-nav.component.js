var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';
import { DosNavSectionComponent } from './nav-section.component';
/**
 * DosWorkspaceNav — top-level workspace navigation.
 * Refined to use Carbon SideNav policies.
 */
let DosWorkspaceNavComponent = class DosWorkspaceNavComponent {
    set config(value) {
        this._config.set(value);
    }
    activeRoute = null;
    select = new EventEmitter();
    _config = signal({ groups: [] });
    orderedGroups = computed(() => {
        const groups = this._config().groups ?? [];
        return [...groups].sort((a, b) => {
            const ao = a.order ?? Number.MAX_SAFE_INTEGER;
            const bo = b.order ?? Number.MAX_SAFE_INTEGER;
            return ao - bo;
        });
    });
};
__decorate([
    Input({ required: true }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], DosWorkspaceNavComponent.prototype, "config", null);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWorkspaceNavComponent.prototype, "activeRoute", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosWorkspaceNavComponent.prototype, "select", void 0);
DosWorkspaceNavComponent = __decorate([
    Component({
        selector: 'dos-workspace-nav',
        standalone: true,
        imports: [CommonModule, UIShellModule, DosNavSectionComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-sidenav [expanded]="true" aria-label="Workspace navigation">
      @for (group of orderedGroups(); track group.id) {
        <dos-nav-section
          [group]="group"
          [activeRoute]="activeRoute"
          (select)="select.emit($event)"
        ></dos-nav-section>
      }
    </cds-sidenav>
  `,
        styles: [`
    :host { display: block; }
  `]
    })
], DosWorkspaceNavComponent);
export { DosWorkspaceNavComponent };
//# sourceMappingURL=workspace-nav.component.js.map