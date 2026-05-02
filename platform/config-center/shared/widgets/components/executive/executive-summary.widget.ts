import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ExecutiveWidgetsApiService } from '../../../../../core/widgets/executive-widgets.api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-executive-summary-widget',
    imports: [CommonModule],
    template: `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="rounded-2xl border bg-white p-4">
        <div class="text-xs text-gray-500">Stale Controls</div>
        <div class="mt-2 text-3xl font-semibold">{{ data()?.staleControlsCount ?? 0 }}</div>
      </div>

      <div class="rounded-2xl border bg-white p-4">
        <div class="text-xs text-gray-500">Overdue Remediation</div>
        <div class="mt-2 text-3xl font-semibold">{{ data()?.overdueRemediationCount ?? 0 }}</div>
      </div>

      <div class="rounded-2xl border bg-white p-4">
        <div class="text-xs text-gray-500">Policy Review Debt</div>
        <div class="mt-2 text-3xl font-semibold">{{ data()?.policyReviewDebtCount ?? 0 }}</div>
      </div>

      <div class="rounded-2xl border bg-white p-4">
        <div class="text-xs text-gray-500">Latest Engine Status</div>
        <div class="mt-2 text-lg font-semibold">
          {{ data()?.latestEngineRun?.status || 'No runs yet' }}
        </div>
      </div>
    </div>
  `
})
export class ExecutiveSummaryWidgetComponent implements OnInit {
  @Input() tenantId?: string;
  private api = inject(ExecutiveWidgetsApiService);
  readonly data = signal<unknown>(null);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getSummary(this.tenantId));
      this.data.set(res ?? null);
    } catch {
    }
  }
}
