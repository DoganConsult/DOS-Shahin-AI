import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-overdue-actions-widget',
    imports: [CommonModule, AppDatePipe, WidgetShellComponent],
    template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="space-y-2">
        <div *ngFor="let item of data() || []" class="border rounded-lg p-2">
          <div class="font-medium">{{ item.title }}</div>
          <div class="text-xs text-gray-500">
            {{ item.sourceType }} · {{ item.owner }} · {{ item.dueDate | appDate:'short' }}
          </div>
        </div>
      </div>
    </app-widget-shell>
  `
})
export class OverdueActionsWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};
  private api = inject(WidgetsApiService);

  readonly title = signal('Overdue Actions');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<GrcRecord[]>([]);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('overdue-actions'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload || []);
    } catch {
      // API error – leave defaults in place
    }
  }

}
