import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-executive-summary-widget',
    imports: [CommonModule, WidgetShellComponent],
    template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="grid grid-cols-3 gap-3">
        <div class="border rounded-xl p-3">
          <div class="text-xs text-gray-500">Risks</div>
          <div class="text-2xl font-semibold">{{ data()?.totalRisks ?? 0 }}</div>
        </div>
        <div class="border rounded-xl p-3">
          <div class="text-xs text-gray-500">Open Findings</div>
          <div class="text-2xl font-semibold">{{ data()?.openFindings ?? 0 }}</div>
        </div>
        <div class="border rounded-xl p-3">
          <div class="text-xs text-gray-500">Open Actions</div>
          <div class="text-2xl font-semibold">{{ data()?.openActions ?? 0 }}</div>
        </div>
      </div>
    </app-widget-shell>
  `
})
export class ExecutiveSummaryWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};

  private api = inject(WidgetsApiService);

  readonly title = signal('Executive Summary');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<GrcRecord | null>(null);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('executive-summary'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload);
    } catch {
      // API error – leave defaults in place
    }
  }
}
