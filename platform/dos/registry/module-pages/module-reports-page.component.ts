import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ButtonModule, DatePickerModule, DropdownModule, GridModule,
  InlineLoadingModule, SkeletonModule, TilesModule,
} from 'carbon-components-angular';
import { AccessStore } from '@dos/access-store';
import { moduleApi, modulePerms, withScope } from './module-api';

interface ReportKpi { label: string; value: number | string; }
interface ReportsDto { kpis?: ReportKpi[]; }

@Component({
  selector: 'app-module-reports-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, GridModule, TilesModule, ButtonModule, DropdownModule,
    DatePickerModule, SkeletonModule, InlineLoadingModule,
  ],
  template: `
    <section cdsGrid class="cds--css-grid">
      <div cdsRow>
        <div cdsCol [columnNumbers]="{ lg: 12 }">
          <h1 class="cds--type-productive-heading-04">{{ moduleCode() }} — Reports</h1>
        </div>
        <div cdsCol [columnNumbers]="{ lg: 4 }">
          <button *ngIf="canExport()" cdsButton="primary" size="md" (click)="exportCsv()">Export CSV</button>
        </div>
      </div>

      <div cdsRow>
        <ng-container *ngIf="loading(); else cards">
          <div cdsCol [columnNumbers]="{ lg: 4 }" *ngFor="let _ of [1,2,3,4]">
            <cds-tile><cds-skeleton-text [lines]="2"></cds-skeleton-text></cds-tile>
          </div>
        </ng-container>
        <ng-template #cards>
          <div cdsCol [columnNumbers]="{ lg: 4 }" *ngFor="let k of report()?.kpis || []">
            <cds-tile>
              <p class="cds--label">{{ k.label }}</p>
              <p class="cds--type-productive-heading-05">{{ k.value }}</p>
            </cds-tile>
          </div>
        </ng-template>
      </div>
    </section>
  `,
})
export class ModuleReportsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);

  readonly moduleCode = signal<string>(this.route.snapshot.data['moduleCode'] || 'unknown');
  readonly report = signal<ReportsDto | null>(null);
  readonly loading = signal(true);
  readonly canExport = (): boolean => {
    const p = modulePerms(this.moduleCode()); return !!p && this.access.hasPermission(p.export);
  };

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    const api = moduleApi(this.moduleCode());
    if (!api) { this.loading.set(false); return; }
    try {
      const r = await firstValueFrom(
        this.http.get<ReportsDto>(withScope(api.summary, { tenantId: this.access.tenantId() }), { withCredentials: true }),
      );
      this.report.set(r);
    } finally { this.loading.set(false); }
  }

  exportCsv(): void {
    const api = moduleApi(this.moduleCode());
    if (!api || !this.canExport()) return;
    const url = withScope(api.records, { tenantId: this.access.tenantId() });
    window.location.href = `${url}${url.includes('?') ? '&' : '?'}format=csv`;
  }
}
