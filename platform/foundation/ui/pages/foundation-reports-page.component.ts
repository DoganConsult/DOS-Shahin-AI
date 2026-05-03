import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ButtonModule,
  DatePickerModule,
  DropdownModule,
  GridModule,
  InlineLoadingModule,
  SkeletonModule,
  TableHeaderItem,
  TableItem,
  TableModel,
  TableModule,
  TilesModule,
} from 'carbon-components-angular';
import { FoundationApiService, type FoundationOverviewData } from '../services/foundation-api.service';

interface ExportFormatOption {
  content: string;
  selected?: boolean;
}

interface ReportMetric {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-foundation-reports-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    GridModule,
    TilesModule,
    ButtonModule,
    DropdownModule,
    DatePickerModule,
    SkeletonModule,
    InlineLoadingModule,
    TableModule,
  ],
  template: `
    <section class="foundation-page">
      <header class="foundation-page__header">
        <div>
          <p class="foundation-page__eyebrow">Foundation</p>
          <h1 class="foundation-page__title">Reports</h1>
          <p class="foundation-page__subtitle">
            Org structure report, user-role report, permission coverage, ownership gaps, access review report, and audit export pack.
          </p>
        </div>
        <button cdsButton="primary" size="md" (click)="exportCsv()">Export CSV</button>
      </header>

      <div class="foundation-page__toolbar">
        <cds-date-picker [range]="true" [value]="dateRange()" (valueChange)="dateRange.set($event)"></cds-date-picker>
        <cds-dropdown label="Format" (selected)="onFormatSelected($event)">
          <cds-dropdown-list [items]="formatItems()"></cds-dropdown-list>
        </cds-dropdown>
      </div>

      <div cdsGrid class="foundation-page__metrics">
        @if (loading()) {
          @for (_ of [1, 2, 3, 4]; track $index) {
            <div cdsCol [columnNumbers]="{ lg: 4, md: 4, sm: 4 }">
              <cds-tile><cds-skeleton-text [lines]="2"></cds-skeleton-text></cds-tile>
            </div>
          }
        } @else {
          @for (metric of metrics(); track metric.label) {
            <div cdsCol [columnNumbers]="{ lg: 4, md: 4, sm: 4 }">
              <cds-tile class="foundation-page__metric-tile">
                <span class="foundation-page__metric-label">{{ metric.label }}</span>
                <span class="foundation-page__metric-value">{{ metric.value }}</span>
              </cds-tile>
            </div>
          }
        }
      </div>

      @if (generating()) {
        <cds-inline-loading [state]="'active'" [text]="'Preparing report package'" class="foundation-page__loading"></cds-inline-loading>
      }

      <cds-table [model]="model" [showSelectionColumn]="false" size="md"></cds-table>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .foundation-page {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-06);
      padding: var(--cds-spacing-06);
      background: var(--cds-background);
      min-height: 100%;
    }
    .foundation-page__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--cds-spacing-05);
      flex-wrap: wrap;
    }
    .foundation-page__eyebrow {
      margin: 0 0 var(--cds-spacing-02);
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-compact-01-font-size);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .foundation-page__title {
      margin: 0;
      font-size: var(--cds-heading-05-font-size, 2rem);
    }
    .foundation-page__subtitle {
      margin: var(--cds-spacing-03) 0 0;
      color: var(--cds-text-secondary);
      max-width: 72ch;
    }
    .foundation-page__toolbar {
      display: flex;
      gap: var(--cds-spacing-05);
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .foundation-page__metrics {
      row-gap: var(--cds-spacing-05);
    }
    .foundation-page__metric-tile {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-03);
      min-height: 8rem;
    }
    .foundation-page__metric-label {
      font-size: var(--cds-label-01-font-size);
      color: var(--cds-text-secondary);
    }
    .foundation-page__metric-value {
      font-size: var(--cds-heading-04-font-size, 1.75rem);
      font-weight: 600;
      color: var(--cds-text-primary);
    }
    .foundation-page__loading {
      margin-inline-start: auto;
    }
  `],
})
export class FoundationReportsPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(FoundationApiService);

  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly metrics = signal<ReportMetric[]>([]);
  readonly format = signal('csv');
  readonly dateRange = signal<string[]>([]);
  readonly formatItems = signal<ExportFormatOption[]>([
    { content: 'csv', selected: true },
    { content: 'json' },
  ]);
  readonly model = new TableModel();

  constructor() {
    this.load();
  }

  onFormatSelected(event: { item: ExportFormatOption | ExportFormatOption[] | null }): void {
    const item = Array.isArray(event?.item) ? event.item[0] : event?.item;
    if (!item) return;
    this.format.set(item.content);
    this.formatItems.update(items => items.map(entry => ({ ...entry, selected: entry.content === item.content })));
  }

  exportCsv(): void {
    const headers = this.model.header.map(header => String(header.data));
    const rows = this.model.data.map(row => row.map(cell => String(cell.data ?? '')).join(','));
    const payload = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([payload], { type: this.format() === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `foundation-reports.${this.format()}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private load(): void {
    this.loading.set(true);
    this.generating.set(true);
    forkJoin({
      overview: this.api.getOverviewData({ includeWorkflowSlices: true }).pipe(catchError(() => of(null))),
      audit: this.api.getAuditTrail({ module: 'foundation', limit: 50 }).pipe(catchError(() => of({ entries: [] }))),
      accessReviews: this.api.getAccessReviewCampaigns().pipe(catchError(() => of({ campaigns: [] }))),
      health: this.api.getFoundationHealth().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ overview, audit, accessReviews, health }) => {
        this.applyMetrics(overview, audit, accessReviews?.campaigns ?? [], health);
        this.generating.set(false);
        this.loading.set(false);
      });
  }

  private applyMetrics(overview: FoundationOverviewData | null, audit: any, accessReviews: unknown[], health: any): void {
    const arr = (value: Record<string, unknown> | undefined, ...keys: string[]): unknown[] => {
      if (!value) return [];
      for (const key of keys) {
        if (Array.isArray(value[key])) return value[key] as unknown[];
      }
      return [];
    };
    const signals = (health?.signals ?? {}) as Record<string, unknown>;
    const users = arr(overview?.users as Record<string, unknown> | undefined, 'users').length;
    const roles = arr(overview?.roles as Record<string, unknown> | undefined, 'roles', 'profiles').length;
    const ownershipGaps = Number(signals['orphaned_departments'] ?? 0) + Number(signals['unassigned_positions'] ?? 0);
    const auditEntries = Array.isArray(audit?.entries) ? audit.entries : Array.isArray(audit?.rows) ? audit.rows : [];
    const roleCoverage = roles === 0 ? 0 : Math.round((users / roles) * 100);

    this.metrics.set([
      { label: 'Org structure nodes', value: arr(overview?.organizations as Record<string, unknown> | undefined, 'organizations').length + arr(overview?.departments as Record<string, unknown> | undefined, 'departments').length },
      { label: 'User-role coverage', value: `${roleCoverage}%` },
      { label: 'Ownership gaps', value: ownershipGaps },
      { label: 'Access review campaigns', value: accessReviews.length },
    ]);

    const rows = [
      ['Org structure report', 'Organizations + departments + teams', String(arr(overview?.organizations as Record<string, unknown> | undefined, 'organizations').length)],
      ['User-role report', 'Users mapped to roles', String(users)],
      ['Permission coverage', 'Role coverage ratio', `${roleCoverage}%`],
      ['Ownership gaps', 'Orphaned departments + unassigned positions', String(ownershipGaps)],
      ['Access review report', 'Live access-review campaigns', String(accessReviews.length)],
      ['Audit export pack', 'Foundation audit rows in current window', String(auditEntries.length)],
    ];
    this.model.header = ['Report', 'Scope', 'Current value'].map(header => new TableHeaderItem({ data: header }));
    this.model.data = rows.map(row => row.map(cell => new TableItem({ data: cell })));
  }
}