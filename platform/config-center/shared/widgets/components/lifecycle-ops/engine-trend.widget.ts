import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ExecutiveWidgetsApiService } from '../../../../../core/widgets/executive-widgets.api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-engine-trend-widget',
    imports: [CommonModule],
    template: `
    <div class="rounded-2xl border bg-white p-4">
      <div class="mb-3 text-base font-semibold">Engine Trend</div>

      <div class="space-y-2">
        <div *ngFor="let row of rows()" class="rounded-xl border p-3">
          <div class="text-xs text-gray-500">{{ row.started_at }}</div>
          <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>Stale: <strong>{{ row.stale_controls }}</strong></div>
            <div>Remediation: <strong>{{ row.overdue_remediations }}</strong></div>
            <div>KRI: <strong>{{ row.kri_breaches }}</strong></div>
            <div>Policy: <strong>{{ row.policy_reviews_started }}</strong></div>
          </div>
        </div>
      </div>

      <div *ngIf="!rows().length" class="text-sm text-gray-400 py-4 text-center">No engine runs yet</div>
    </div>
  `
})
export class EngineTrendWidgetComponent implements OnInit {
  @Input() tenantId?: string;
  private api = inject(ExecutiveWidgetsApiService);
  readonly rows = signal<any[]>([]);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getEngineTrend(12, this.tenantId));
      this.rows.set((res as unknown[]) || []);
    } catch {
    }
  }

}
