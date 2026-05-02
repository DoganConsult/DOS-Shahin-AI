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
@Directive({
  selector: '[dosCanRender]',
  standalone: true,
})
export class DosCanRenderDirective {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly access = inject(AccessStore);

  private required: string[] = [];
  private rendered = false;

  constructor() {
    effect(() => {
      // Touch reactive state so the effect re-runs on session change.
      const perms = this.access.snapshot().permissions;
      const ok =
        this.required.length === 0 ||
        this.required.every((p) => perms.includes(p));
      if (ok && !this.rendered) {
        this.vcr.createEmbeddedView(this.tpl);
        this.rendered = true;
      } else if (!ok && this.rendered) {
        this.vcr.clear();
        this.rendered = false;
      }
    });
  }

  @Input()
  set dosCanRender(value: string | string[] | null | undefined) {
    if (value === null || value === undefined) {
      this.required = [];
    } else if (Array.isArray(value)) {
      this.required = value.filter((s) => typeof s === 'string' && s.length > 0);
    } else {
      this.required = [value];
    }
    // The effect above will re-evaluate on next change-detection tick
    // because `required` does not feed it directly — force one pass:
    const perms = this.access.snapshot().permissions;
    const ok =
      this.required.length === 0 ||
      this.required.every((p) => perms.includes(p));
    if (ok && !this.rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this.rendered = true;
    } else if (!ok && this.rendered) {
      this.vcr.clear();
      this.rendered = false;
    }
  }
}
