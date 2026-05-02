var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
/**
 * DosCommandCenter — §26.2 universal "Command Center" composition.
 *
 * The Command Center is the canonical layout used by EVERY module
 * overview page (and only overview pages, per §30.4). It composes:
 *
 *   • KPI strip            — module-overview KPIs only
 *   • Work queue           — approvals + tasks for the current user
 *   • Risk / readiness     — top signals
 *   • AI recommendations   — agent-driven cards
 *   • Pending approvals    — workflow-attached
 *   • Recent activity      — module-scoped audit trail
 *   • Quick actions        — contract-derived buttons
 *
 * The component does NOT fetch data; it renders pre-resolved slots so
 * §3.4 "Render from resolved contract" stays clean. The component does
 * NOT know about modules — §1.1 shell knowledge boundary.
 *
 * Slots (transcluded in this exact order):
 *   [slot=kpi-strip]            (only when kpiScope=module-overview)
 *   [slot=work-queue]
 *   [slot=readiness]
 *   [slot=ai-recommendations]
 *   [slot=pending-approvals]
 *   [slot=recent-activity]
 *   [slot=quick-actions]
 */
let DosCommandCenterComponent = class DosCommandCenterComponent {
    moduleCode;
    kpiScope = 'module-overview';
    density = 'comfortable';
    ariaLabel = 'Command Center';
    kpiAriaLabel = 'Module KPIs';
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCommandCenterComponent.prototype, "moduleCode", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCommandCenterComponent.prototype, "kpiScope", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCommandCenterComponent.prototype, "density", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCommandCenterComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCommandCenterComponent.prototype, "kpiAriaLabel", void 0);
DosCommandCenterComponent = __decorate([
    Component({
        selector: 'dos-command-center',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div
      class="dos-cc"
      [attr.data-density]="density"
      [attr.data-module]="moduleCode"
      [attr.data-kpi-scope]="kpiScope"
      role="region"
      [attr.aria-label]="ariaLabel"
    >
      <!-- Row 1 — KPI strip. Per §30.4 / §21 #8 only renders when the
           parent route declares kpiScope=module-overview. -->
      @if (kpiScope === 'module-overview') {
        <div class="dos-cc__kpis" role="group" [attr.aria-label]="kpiAriaLabel">
          <ng-content select="[slot=kpi-strip]"></ng-content>
        </div>
      }

      <!-- Row 2 — Work queue + Readiness signals (executive-eye line). -->
      <div class="dos-cc__row dos-cc__row--exec">
        <div class="dos-cc__pane dos-cc__pane--queue">
          <ng-content select="[slot=work-queue]"></ng-content>
        </div>
        <div class="dos-cc__pane dos-cc__pane--readiness">
          <ng-content select="[slot=readiness]"></ng-content>
        </div>
      </div>

      <!-- Row 3 — AI recommendations + Pending approvals. -->
      <div class="dos-cc__row dos-cc__row--insight">
        <div class="dos-cc__pane dos-cc__pane--ai">
          <ng-content select="[slot=ai-recommendations]"></ng-content>
        </div>
        <div class="dos-cc__pane dos-cc__pane--approvals">
          <ng-content select="[slot=pending-approvals]"></ng-content>
        </div>
      </div>

      <!-- Row 4 — Recent activity (full-width). -->
      <div class="dos-cc__activity">
        <ng-content select="[slot=recent-activity]"></ng-content>
      </div>

      <!-- Row 5 — Quick actions (full-width grid; child owns layout). -->
      <div class="dos-cc__actions">
        <ng-content select="[slot=quick-actions]"></ng-content>
      </div>

      <!-- Default slot for surface-specific extras. -->
      <ng-content></ng-content>
    </div>
  `,
        styles: [`
    .dos-cc {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-5);
    }
    .dos-cc__kpis    { display: contents; }       /* lets KPI strip own its grid */
    .dos-cc__actions { display: contents; }       /* parent grid owns layout */

    .dos-cc__row {
      display: grid;
      gap: var(--dos-space-3);
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    }
    @media (max-width: 980px) {
      .dos-cc__row { grid-template-columns: minmax(0, 1fr); }
    }
    .dos-cc__pane,
    .dos-cc__activity {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
    }

    /* Empty slot: hide the wrapper so we don't render an empty band. */
    .dos-cc__pane:empty,
    .dos-cc__activity:empty,
    .dos-cc__row:empty { display: none; }

    /* Density tuning — comfortable adds breathing room between rows. */
    .dos-cc[data-density='compact']     { gap: var(--dos-space-3); }
    .dos-cc[data-density='comfortable'] { gap: var(--dos-space-6); }
  `],
    })
], DosCommandCenterComponent);
export { DosCommandCenterComponent };
//# sourceMappingURL=command-center.component.js.map