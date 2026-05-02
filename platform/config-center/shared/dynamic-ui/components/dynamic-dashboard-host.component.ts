import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
  signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { DashboardApiService } from '../../../../core/dashboard/dashboard-api.service';
import { DashboardWidgetInstanceDto } from '../../../../core/dashboard/dashboard-api.models';
import { WidgetRegistryService } from '../services/widget-registry.service';
import { WidgetHostDirective } from '../../dashboard/widget-host.directive';
// Wave C — runtime UI Capability allowlist (SHADOW mode). Unknown
// componentKeys still render so we don't break existing dashboards, but
// every miss is logged so we can drive registration coverage to 100%
// before flipping to ENFORCE.
import { isAllowedComponentKey } from '@dos/ui-contracts';
// Inline stub: WidgetLoaderService not present in this build slice.
class WidgetLoaderService {
  async resolveComponent(_manifest: unknown): Promise<unknown> { return null; }
}
import { SessionService } from '../../../../dauth/session/session.service';
import { isWidgetVisibleToRole } from '../../security/module-dashboard-map';
import { GrcRecord } from '@app/core/models/shared.types';

const SPAN_CLASS_MAP: Record<number, string> = {
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
  6: 'xl:col-span-6',
  12: 'xl:col-span-12',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dynamic-dashboard-host',
  standalone: true,
  imports: [CommonModule, WidgetHostDirective],
  template: `
    <div class="space-y-4">
      <div *ngIf="title()" class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">{{ title() }}</h1>
          <p *ngIf="route()" class="text-sm text-gray-500">{{ route() }}</p>
        </div>
      </div>

      <div *ngIf="loading()" class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-carbon-blue-60"></div>
      </div>

      <div *ngIf="errorMsg()" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {{ errorMsg() }}
      </div>

      <div *ngIf="!loading() && !errorMsg() && widgets().length" class="grid grid-cols-12 gap-4">
        <div
          *ngFor="let widget of widgets(); let i = index"
          [ngClass]="['col-span-12', 'md:col-span-6', spanClass(widget.w)]"
        >
          <div class="min-h-[120px]">
            <ng-template appWidgetHost></ng-template>
          </div>
        </div>
      </div>

      <div *ngIf="!loading() && !errorMsg() && !widgets().length" class="rounded-2xl border bg-white p-6 text-sm text-gray-500">
        No widgets configured for this dashboard.
      </div>
    </div>
  `,
})
export class DynamicDashboardHostComponent implements AfterViewInit, OnDestroy {
  @Input() dashboardCode?: string;
  @Input() tenantId?: string;

  @ViewChildren(WidgetHostDirective) widgetHosts!: QueryList<WidgetHostDirective>;

  private dashboardApi = inject(DashboardApiService);
  private widgetRegistry = inject(WidgetRegistryService);
  private widgetLoader = inject(WidgetLoaderService);
  private auth = inject(SessionService);
  private subscriptions: Subscription[] = [];

  readonly title = signal('');
  readonly route = signal('');
  readonly widgets = signal<DashboardWidgetInstanceDto[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal('');

  async ngAfterViewInit() {
    try {
      await this.loadDashboard();
    } catch (err: unknown) {
      this.errorMsg.set((err as GrcRecord)?.message ?? 'Failed to load dashboard');
      this.loading.set(false);
      return;
    }

    const sub = this.widgetHosts.changes.subscribe(() => {
      this.renderWidgets();
    });
    this.subscriptions.push(sub);

    this.renderWidgets();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private async loadDashboard() {
    this.loading.set(true);
    this.errorMsg.set('');

    try {
      let response: GrcRecord;
      if (this.dashboardCode) {
        response = await this.dashboardApi.getDashboard(this.dashboardCode).toPromise();
      } else {
        const resolved = await this.dashboardApi.resolveDefault().toPromise();
        if (resolved?.dashboardCode) {
          response = await this.dashboardApi.getDashboard(resolved.dashboardCode).toPromise();
        }
      }

      this.title.set(response?.nameEn ?? 'Dashboard');
      this.route.set(response?.route ?? '');

      // Filter widgets by role-based visibility rules
      const allWidgets: DashboardWidgetInstanceDto[] = response?.widgets ?? [];
      const role = this.auth.currentRole();
      const filtered = role
        ? allWidgets.filter(w => {
            const key = w.widgetKey || w.componentKey;
            // Allow widget if no visibility rule defined (backward compat)
            return !key || isWidgetVisibleToRole(key, role);
          })
        : allWidgets;
      this.widgets.set(filtered);
    } finally {
      this.loading.set(false);
    }
  }

  private renderWidgets() {
    const widgetList = this.widgets();
    const hosts = this.widgetHosts.toArray();

    widgetList.forEach(async (widget, index) => {
      const host = hosts[index];
      if (!host) return;

      const vcr = host.viewContainerRef;
      vcr.clear();

      // Wave E — UI Capability allowlist gate. Mode is controlled by the
      // build-time flag NG_UI_CAPABILITY_ENFORCE (or the runtime override
      // window.__UI_CAPABILITY_ENFORCE__). When ENFORCE is on, unregistered
      // componentKeys are skipped (route renders an empty slot rather than a
      // mystery widget); SHADOW keeps back-compat and only warns.
      const declaredKey = widget.componentKey || widget.widgetKey;
      const envProcess = (globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }).process;
      const enforceCapability =
        (typeof window !== 'undefined' && (window as unknown as { __UI_CAPABILITY_ENFORCE__?: boolean }).__UI_CAPABILITY_ENFORCE__ === true) ||
        envProcess?.env?.['NG_UI_CAPABILITY_ENFORCE'] === '1';
      if (declaredKey && !isAllowedComponentKey(declaredKey)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[ui-capability:${enforceCapability ? 'ENFORCE' : 'SHADOW'}] Unregistered componentKey="${declaredKey}". ` +
          `Add it to platform/ui-system/dos-ui-contracts/src/capability-registry.ts.`,
        );
        if (enforceCapability) return;
      }

      // Fix 4 (Phase 18) — Single resolver. Use WidgetRegistryService.getByKey
      // which already falls back to .get() so backend keys (snake_case) and
      // canonical ids (kebab-case) both resolve through one path.
      const lookupKey = widget.componentKey || widget.widgetKey;
      const manifest = this.widgetRegistry.getByKey(lookupKey);
      if (!manifest) return;

      const componentType = await this.widgetLoader.resolveComponent(manifest) as any;
      const ref = vcr.createComponent(componentType);
      const instance = ref.instance as unknown;
      if (instance && 'tenantId' in (instance as any)) (instance as any).tenantId = this.tenantId;
      if (instance && 'config' in (instance as any)) (instance as any).config = widget.config ?? {};
      if (instance && 'widgetKey' in (instance as any)) (instance as any).widgetKey = widget.widgetKey;
    });
  }

  spanClass(w: number): string {
    const normalized = this.normalizeSpan(w);
    return SPAN_CLASS_MAP[normalized] ?? 'xl:col-span-12';
  }

  private normalizeSpan(w: number): number {
    if (!w || w <= 0) return 12;
    if (w >= 12) return 12;
    if (w >= 6) return 6;
    if (w >= 4) return 4;
    if (w >= 3) return 3;
    return 12;
  }

}
