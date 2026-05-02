import { Component, ChangeDetectionStrategy} from '@angular/core';
import { DynamicDashboardHostComponent } from '../dashboard/shared/dynamic-dashboard-host.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-executive-dynamic-page',
  standalone: true,
  imports: [DynamicDashboardHostComponent],
  template: `
    <div class="p-6">
      <app-dynamic-dashboard-host dashboardCode="agrc-executive" />
    </div>
  `,
})
export class ExecutiveDynamicPageComponent {}
