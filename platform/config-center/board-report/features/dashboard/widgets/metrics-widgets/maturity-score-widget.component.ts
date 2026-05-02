import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-maturity-score-widget',
    imports: [CommonModule, WidgetShellComponent],
    template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="grid grid-cols-2 gap-3">
        <div class="border rounded-xl p-3">
          <div class="text-xs text-gray-500">Overall Score</div>
          <div class="text-2xl font-semibold">{{ data()?.overallScore ?? 0 }}</div>
        </div>
        <div class="border rounded-xl p-3">
          <div class="text-xs text-gray-500">Domains</div>
          <div class="text-2xl font-semibold">{{ data()?.domainCount ?? 0 }}</div>
        </div>
      </div>
    </app-widget-shell>
  `
})
export class MaturityScoreWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};
  private api = inject(WidgetsApiService);

  readonly title = signal('Maturity Score');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<GrcRecord | null>(null);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('maturity-score'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload);
    } catch {
      // API error – leave defaults in place
    }
  }
}
