import { Component, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExecutiveSummaryWidgetComponent } from '../../../shared/widgets/components/executive/executive-summary.widget';
import { TopBreachedKrisWidgetComponent } from '../../../shared/widgets/components/executive/top-breached-kris.widget';
import { PolicyReviewDebtWidgetComponent } from '../../../shared/widgets/components/evidence/policy-review-debt.widget';
import { EngineTrendWidgetComponent } from '../../../shared/widgets/components/lifecycle-ops/engine-trend.widget';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-executive-overview-page',
    imports: [
        CommonModule,
        ExecutiveSummaryWidgetComponent,
        TopBreachedKrisWidgetComponent,
        PolicyReviewDebtWidgetComponent,
        EngineTrendWidgetComponent,
    ],
    template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-semibold">Executive Overview</h1>
        <p class="text-sm text-gray-500">Live readout from the AGRC-OS Engine.</p>
      </div>

      <app-executive-summary-widget />

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <app-top-breached-kris-widget />
        <app-policy-review-debt-widget />
      </div>

      <app-engine-trend-widget />
    </div>
  `
})
export class ExecutiveOverviewPageComponent {}
