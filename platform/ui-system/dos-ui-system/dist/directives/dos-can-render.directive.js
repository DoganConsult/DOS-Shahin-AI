var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AccessStore } from '@dos/access-store';
/**
 * `*dosCanRender="'permission:code'"` — structural directive that
 * physically removes its host template from the DOM when the active
 * AccessStore session does not include the required permission.
 *
 * Why this matters (one-source rule):
 *  - DOM removal (vs CSS hiding) prevents inspector-bypass on
 *    privileged actions (e.g. Carbon "Trigger Workflow" buttons).
 *  - All visibility decisions go through @dos/access-store — products
 *    must NEVER read roles directly from a token or ad-hoc API.
 *  - When permission set changes (login/logout, tenant switch),
 *    the effect re-evaluates and the template is added/removed.
 *
 * Usage:
 *   <dos-carbon-button *dosCanRender="'workflow:trigger'">
 *     Trigger Agent
 *   </dos-carbon-button>
 *
 * Multi-permission (ALL required):
 *   <ng-container *dosCanRender="['report:view','report:export']">
 *     ...
 *   </ng-container>
 */
let DosCanRenderDirective = class DosCanRenderDirective {
    tpl = inject((TemplateRef));
    vcr = inject(ViewContainerRef);
    access = inject(AccessStore);
    required = [];
    rendered = false;
    constructor() {
        effect(() => {
            // Touch reactive state so the effect re-runs on session change.
            const perms = this.access.snapshot().permissions;
            const ok = this.required.length === 0 ||
                this.required.every((p) => perms.includes(p));
            if (ok && !this.rendered) {
                this.vcr.createEmbeddedView(this.tpl);
                this.rendered = true;
            }
            else if (!ok && this.rendered) {
                this.vcr.clear();
                this.rendered = false;
            }
        });
    }
    set dosCanRender(value) {
        if (value === null || value === undefined) {
            this.required = [];
        }
        else if (Array.isArray(value)) {
            this.required = value.filter((s) => typeof s === 'string' && s.length > 0);
        }
        else {
            this.required = [value];
        }
        // The effect above will re-evaluate on next change-detection tick
        // because `required` does not feed it directly — force one pass:
        const perms = this.access.snapshot().permissions;
        const ok = this.required.length === 0 ||
            this.required.every((p) => perms.includes(p));
        if (ok && !this.rendered) {
            this.vcr.createEmbeddedView(this.tpl);
            this.rendered = true;
        }
        else if (!ok && this.rendered) {
            this.vcr.clear();
            this.rendered = false;
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], DosCanRenderDirective.prototype, "dosCanRender", null);
DosCanRenderDirective = __decorate([
    Directive({
        selector: '[dosCanRender]',
        standalone: true,
    }),
    __metadata("design:paramtypes", [])
], DosCanRenderDirective);
export { DosCanRenderDirective };
//# sourceMappingURL=dos-can-render.directive.js.map