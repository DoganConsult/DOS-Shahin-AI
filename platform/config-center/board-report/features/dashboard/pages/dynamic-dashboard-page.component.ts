import { Component, OnInit, inject, computed, ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { DashboardStore } from '../../../../../core/dashboard/dashboard.store';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { DynamicWidgetHostComponent } from '../dynamic-widget-host.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dynamic-dashboard-page',
    imports: [CommonModule, DynamicWidgetHostComponent],
    template: `
    <div class="p-6 space-y-4">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ store.current()?.nameEn || 'Dashboard' }}
        </h1>
      </div>

      <div *ngIf="store.loading()" class="text-sm text-gray-600">
        Loading dashboard...
      </div>

      <div
        *ngIf="store.current() as dashboard"
        class="grid grid-cols-12 gap-4"
      >
        <div
          *ngFor="let widget of dashboard.widgets"
          class="border rounded-2xl bg-white p-4 shadow-sm"
          [style.gridColumn]="'span ' + widget.w"
        >
          <div class="mb-3 font-medium">{{ widget.labelEn }}</div>
          <app-dynamic-widget-host
            [componentKey]="widget.componentKey"
            [config]="widget.config"
          />
        </div>
      </div>
    </div>
  `
})
export class DynamicDashboardPageComponent implements OnInit {
  route = inject(ActivatedRoute);
  store = inject(DashboardStore);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  async ngOnInit(): Promise<void> {
    const dashboardCode =
      this.route.snapshot.paramMap.get('dashboardCode') || 'agrc-executive';
    await this.store.load(dashboardCode);
    this.live.debounced(600).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const code = this.route.snapshot.paramMap.get('dashboardCode') || 'agrc-executive';
      this.store.load(code);
    });
  }

}
