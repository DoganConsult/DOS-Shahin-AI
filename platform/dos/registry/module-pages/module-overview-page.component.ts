import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ButtonModule,
  GridModule,
  NotificationModule,
  SkeletonModule,
  StructuredListModule,
  TagModule,
  TilesModule,
  UIShellModule,
} from 'carbon-components-angular';
import { AccessStore } from '@dos/access-store';
import { moduleApi, modulePerms, withScope } from './module-api';

interface SummaryDto {
  kpis?: Array<{ label: string; value: number | string; trend?: 'up' | 'down' | 'flat' }>;
  alerts?: Array<{ severity: 'info' | 'warning' | 'error'; title: string; message?: string }>;
  recentActivity?: Array<{ id: string; ts: string; actor?: string; summary: string }>;
}
interface HealthDto { status?: 'up' | 'degraded' | 'down'; module?: string; }

@Component({
  selector: 'app-module-overview-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, GridModule, TilesModule, TagModule, ButtonModule,
    NotificationModule, SkeletonModule, StructuredListModule, UIShellModule,
  ],
  template: `
    <section cdsGrid class="cds--css-grid">
      <div cdsRow>
        <div cdsCol [columnNumbers]="{ lg: 16 }">
          <h1 class="cds--type-productive-heading-04">{{ moduleCode() }}</h1>
          <cds-tag [type]="healthTone()">{{ health()?.status || 'pending' }}</cds-tag>
          <button *ngIf="canCreate()" cdsButton="primary" size="md">New Record</button>
          <button *ngIf="canExport()" cdsButton="ghost" size="md">Export</button>
        </div>
      </div>

      <div cdsRow>
        <ng-container *ngIf="loading(); else kpis">
          <div cdsCol [columnNumbers]="{ lg: 4 }" *ngFor="let _ of [1,2,3,4]">
            <cds-tile><cds-skeleton-text [lines]="2"></cds-skeleton-text></cds-tile>
          </div>
        </ng-container>
        <ng-template #kpis>
          <div cdsCol [columnNumbers]="{ lg: 4 }" *ngFor="let k of summary()?.kpis || []">
            <cds-tile>
              <p class="cds--label">{{ k.label }}</p>
              <p class="cds--type-productive-heading-05">{{ k.value }}</p>
              <cds-tag *ngIf="k.trend" [type]="k.trend === 'up' ? 'green' : k.trend === 'down' ? 'red' : 'gray'">
                {{ k.trend }}
              </cds-tag>
            </cds-tile>
          </div>
        </ng-template>
      </div>

      <div cdsRow *ngFor="let a of summary()?.alerts || []">
        <div cdsCol [columnNumbers]="{ lg: 16 }">
          <cds-notification
            [notificationObj]="{ type: a.severity, title: a.title, message: a.message || '' }">
          </cds-notification>
        </div>
      </div>

      <div cdsRow>
        <div cdsCol [columnNumbers]="{ lg: 16 }">
          <h2 class="cds--type-productive-heading-03">Recent Activity</h2>
          <cds-structured-list>
            <cds-list-row *ngFor="let r of summary()?.recentActivity || []">
              <cds-list-column>{{ r.ts }}</cds-list-column>
              <cds-list-column>{{ r.actor || '—' }}</cds-list-column>
              <cds-list-column>{{ r.summary }}</cds-list-column>
            </cds-list-row>
          </cds-structured-list>
          <p *ngIf="(summary()?.recentActivity?.length || 0) === 0 && !loading()"
             class="cds--type-helper-text-01">No activity yet.</p>
        </div>
      </div>
    </section>
  `,
})
export class ModuleOverviewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);

  readonly moduleCode = signal<string>(this.route.snapshot.data['moduleCode'] || 'unknown');
  readonly summary = signal<SummaryDto | null>(null);
  readonly health = signal<HealthDto | null>(null);
  readonly loading = signal(true);
  readonly healthTone = computed(() => {
    const s = this.health()?.status;
    return s === 'up' ? 'green' : s === 'degraded' ? 'magenta' : s === 'down' ? 'red' : 'gray';
  });
  readonly canCreate = computed(() => {
    const p = modulePerms(this.moduleCode()); return !!p && this.access.hasPermission(p.create);
  });
  readonly canExport = computed(() => {
    const p = modulePerms(this.moduleCode()); return !!p && this.access.hasPermission(p.export);
  });

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    const api = moduleApi(this.moduleCode());
    if (!api) { this.loading.set(false); return; }
    const ctx = { tenantId: this.access.tenantId() };
    try {
      const [s, h] = await Promise.all([
        firstValueFrom(this.http.get<SummaryDto>(withScope(api.summary, ctx), { withCredentials: true })),
        firstValueFrom(this.http.get<HealthDto>(withScope(api.health, ctx),  { withCredentials: true })),
      ]);
      this.summary.set(s);
      this.health.set(h);
    } finally { this.loading.set(false); }
  }
}
