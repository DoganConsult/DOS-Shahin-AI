import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { DashboardStore } from '../../../../../core/dashboard/dashboard.store';
import { DashboardEditorApiService } from '../../../../../core/dashboard/dashboard-editor.api.service';
import {
  DashboardLayoutWidgetInput,
  DashboardWidgetRegistryItemDto,
} from '../../../../../core/dashboard/dashboard-editor.models';
import { DashboardWidgetPickerComponent } from './dashboard-widget-picker.component';
import { DashboardLayoutCanvasComponent } from './dashboard-layout-canvas.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-editor-page',
    imports: [
        CommonModule,
        FormsModule,
        DashboardWidgetPickerComponent,
        DashboardLayoutCanvasComponent,
    ],
    template: `
    <div class="p-6 grid grid-cols-12 gap-6">
      <div class="col-span-12 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">Dashboard Editor</h1>
          <div class="text-sm text-gray-500">{{ dashboardCode() }}</div>
        </div>

        <div class="flex gap-2">
          <button class="border rounded px-3 py-2" (click)="reload()">Reload</button>
          <button class="border rounded px-3 py-2" (click)="reset()">Reset Override</button>
          <button class="border rounded px-3 py-2 bg-black text-white" (click)="save()">Save</button>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-3 space-y-4">
        <div class="border rounded-2xl bg-white p-4 space-y-3">
          <div class="font-semibold">Settings</div>

          <label class="block text-sm">
            <div class="mb-1">Role Scope</div>
            <input
              class="w-full border rounded px-3 py-2"
              [(ngModel)]="appliesToRole"
              placeholder="e.g. executive_owner" aria-label="e.g. executive_owner"
            />
          </label>

          <label class="block text-sm">
            <div class="mb-1">Name (EN)</div>
            <input class="w-full border rounded px-3 py-2" [(ngModel)]="nameEn" />
          </label>

          <label class="block text-sm">
            <div class="mb-1">Name (AR)</div>
            <input class="w-full border rounded px-3 py-2" [(ngModel)]="nameAr" />
          </label>

          <label class="block text-sm">
            <div class="mb-1">Route</div>
            <input class="w-full border rounded px-3 py-2" [(ngModel)]="route" />
          </label>
        </div>

        <app-dashboard-widget-picker
          [widgets]="availableWidgets()"
          (add)="addWidget($event)"
        />
      </div>

      <div class="col-span-12 lg:col-span-9">
        <app-dashboard-layout-canvas
          [widgets]="widgets()"
          (widgetsChange)="widgets.set($event)"
        />
      </div>
    </div>
  `
})
export class DashboardEditorPageComponent implements OnInit {
  private routeSnap = inject(ActivatedRoute);
  private dashboardStore = inject(DashboardStore);
  private api = inject(DashboardEditorApiService);

  readonly dashboardCode = signal('agrc-executive');
  readonly availableWidgets = signal<DashboardWidgetRegistryItemDto[]>([]);
  readonly widgets = signal<DashboardLayoutWidgetInput[]>([]);

  appliesToRole = '';
  nameEn = '';
  nameAr = '';
  route = '';

  async ngOnInit(): Promise<void> {
    const code =
      this.routeSnap.snapshot.paramMap.get('dashboardCode') || 'agrc-executive';

    this.dashboardCode.set(code);
    await this.reload();
  }

  async reload(): Promise<void> {
    await this.dashboardStore.load(this.dashboardCode());
    const dash = this.dashboardStore.current();

    this.nameEn = dash?.nameEn || '';
    this.nameAr = dash?.nameAr || '';
    this.route = dash?.route || '';

    this.widgets.set(
      (dash?.widgets || []).map((w) => ({
        widgetKey: w.widgetKey,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        config: w.config ?? {},
      }))
    );

    const widgets = await firstValueFrom(this.api.listWidgets(this.dashboardCode()));
    this.availableWidgets.set(widgets);
  }

  addWidget(widget: DashboardWidgetRegistryItemDto) {
    const next = [...this.widgets()];
    next.push({
      widgetKey: widget.widget_key,
      x: 0,
      y: next.length * 3,
      w: widget.default_width ?? 6,
      h: widget.default_height ?? 3,
      config: widget.default_config ?? {},
    });
    this.widgets.set(next);
  }

  async save(): Promise<void> {
    await firstValueFrom(
      this.api.saveLayout(this.dashboardCode(), {
        appliesToRole: this.appliesToRole || null,
        nameEn: this.nameEn || null,
        nameAr: this.nameAr || null,
        route: this.route || null,
        widgets: this.widgets(),
      })
    );

    await this.reload();
  }

  async reset(): Promise<void> {
    await firstValueFrom(
      this.api.resetLayout(this.dashboardCode(), this.appliesToRole || null)
    );
    await this.reload();
  }
}
