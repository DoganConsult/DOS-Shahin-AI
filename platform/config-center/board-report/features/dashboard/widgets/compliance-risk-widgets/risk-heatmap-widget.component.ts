import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-heatmap-widget',
    imports: [CommonModule, WidgetShellComponent],
    template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="text-sm text-gray-600 mb-2">Total risks: {{ data()?.totalRisks ?? 0 }}</div>
      <div class="grid grid-cols-5 gap-2">
        <div
          *ngFor="let cell of data()?.cells || []"
          class="border rounded-lg p-2 text-center"
        >
          <div class="text-xs text-gray-500">L{{ cell.likelihood }} / I{{ cell.impact }}</div>
          <div class="text-lg font-semibold">{{ cell.count }}</div>
        </div>
      </div>
    </app-widget-shell>
  `
})
export class RiskHeatmapWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};
  private api = inject(WidgetsApiService);

  readonly title = signal('Risk Heatmap');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<GrcRecord | null>(null);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('risk-heatmap'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload);
    } catch {
      // API error – leave defaults in place
    }
  }

}
