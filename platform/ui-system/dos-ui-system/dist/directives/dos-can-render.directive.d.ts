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
export declare class DosCanRenderDirective {
    private readonly tpl;
    private readonly vcr;
    private readonly access;
    private required;
    private rendered;
    constructor();
    set dosCanRender(value: string | string[] | null | undefined);
}
