/**
 * Foundation — User Lifecycle page.
 *
 * Renders the canonical employee-lifecycle workbench backed by:
 *   GET /api/foundation/user-lifecycle/queues/onboarding
 *   GET /api/foundation/user-lifecycle/queues/probation-due
 *   GET /api/foundation/user-lifecycle/queues/by-state/:state
 *   GET /api/foundation/user-lifecycle/metrics
 *   GET /api/foundation/user-lifecycle/workflows/:code
 *   POST /api/foundation/user-lifecycle/:userId/(onboard|offboard|suspend|reactivate|transition)
 *
 * Tables: dos.foundation_employee_lifecycle_state,
 *         dos.foundation_employee_lifecycle_tasks,
 *         dos.foundation_employee_lifecycle_transitions,
 *         dos.foundation_employee_lifecycle_workflows.
 *
 * Permission: foundation.record.write (per FOUNDATION_MODULE_PERMISSIONS).
 */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'foundation-user-lifecycle-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="foundation-user-lifecycle"
      data-cds-component="grid"
      [attr.data-page-key]="pageKey"
    >
      <header data-cds-component="tile">
        <h1>User Lifecycle</h1>
        <p>Onboarding · probation · transitions · offboarding workflows.</p>
      </header>
      <div data-cds-component="tabs" data-tabs="onboarding,probation,active,offboarding">
        <ng-content></ng-content>
      </div>
    </section>
  `,
})
export class FoundationUserLifecyclePage {
  @Input() pageKey = 'foundation.user-lifecycle.page';
  @Input() locale: 'en' | 'ar' = 'en';
}
