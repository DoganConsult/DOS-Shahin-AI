/**
 * Controls Library — Enhanced Master List with Advanced Filtering
 *
 * Full-featured control library with multi-filter bar, view modes
 * (table, grouped by family, grouped by owner, key controls only),
 * bulk actions, configurable pagination, and export support.
 *
 * @module controls
 * @see ControlRowDto for the backend row shape
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DropdownModule, ToggleModule } from 'carbon-components-angular';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';

import { ControlsApiService } from '../../services/controls-api.service';
import { ControlRowDto, PaginatedList } from '../../services/controls-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';

/** Filter state shape */
interface LibraryFilters {
  framework: string;
  status: string;
  owner: string;
  family: string;
  controlType: string;
  automationLevel: string;
  keyControl: boolean | null;
  unmappedOnly: boolean;
  failingOnly: boolean;
}

/** View mode options */
type ViewMode = 'table' | 'family' | 'owner' | 'key-only';

@Component({
    selector: 'app-controls-library',
    templateUrl: './controls-library.component.html',
    styleUrl: './controls-library.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TableModule,
        SkeletonModule,
        TagModule,
        DropdownModule,
        ToggleModule,
        ButtonModule,
        PaginatorModule,
        TooltipModule,
        SelectButtonModule,
        CheckboxModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
        GrcDataTableComponent,
    ]
})
export class ControlsLibraryComponent implements OnInit {
  private api = inject(ControlsApiService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  controls = signal<ControlRowDto[]>([]);
  totalRecords = signal(0);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Pagination */
  page = signal(1);
  pageSize = signal(25);
  readonly pageSizeOptions = [10, 25, 50, 100];

  /** View mode */
  viewMode = signal<ViewMode>('table');
  readonly viewModeOptions = computed(() => this.isAr() ? [
    { label: 'جدول', value: 'table' },
    { label: 'حسب العائلة', value: 'family' },
    { label: 'حسب المالك', value: 'owner' },
    { label: 'رئيسية فقط', value: 'key-only' },
  ] : [
    { label: 'Table', value: 'table' },
    { label: 'By Family', value: 'family' },
    { label: 'By Owner', value: 'owner' },
    { label: 'Key Only', value: 'key-only' },
  ]);

  /** Filters */
  filters = signal<LibraryFilters>({
    framework: '',
    status: '',
    owner: '',
    family: '',
    controlType: '',
    automationLevel: '',
    keyControl: null,
    unmappedOnly: false,
    failingOnly: false,
  });

  /** Filter dropdown options (bilingual) */
  statusOptions = computed(() => {
    const ar = this.isAr();
    return [
      { label: ar ? 'الكل' : 'All', value: '' },
      { label: ar ? 'نشط' : 'Active', value: 'active' },
      { label: ar ? 'مسودة' : 'Draft', value: 'draft' },
      { label: ar ? 'قيد المراجعة' : 'Under Review', value: 'under_review' },
      { label: ar ? 'معتمد' : 'Approved', value: 'approved' },
      { label: ar ? 'متقاعد' : 'Retired', value: 'retired' },
    ];
  });

  controlTypeOptions = computed(() => {
    const ar = this.isAr();
    return [
      { label: ar ? 'الكل' : 'All', value: '' },
      { label: ar ? 'وقائي' : 'Preventive', value: 'preventive' },
      { label: ar ? 'استكشافي' : 'Detective', value: 'detective' },
      { label: ar ? 'تصحيحي' : 'Corrective', value: 'corrective' },
      { label: ar ? 'توجيهي' : 'Directive', value: 'directive' },
    ];
  });

  automationOptions = computed(() => {
    const ar = this.isAr();
    return [
      { label: ar ? 'الكل' : 'All', value: '' },
      { label: ar ? 'يدوي' : 'Manual', value: 'manual' },
      { label: ar ? 'شبه آلي' : 'Semi-Automated', value: 'semi_automated' },
      { label: ar ? 'آلي' : 'Automated', value: 'automated' },
    ];
  });

  /** Bulk selection */
  selectedControls = signal<ControlRowDto[]>([]);

  /** Grouped view helpers */
  groupedByFamily = computed(() => {
    const items = this.controls();
    const groups: Record<string, ControlRowDto[]> = {};
    for (const c of items) {
      const key = c.familyName || (this.isAr() ? 'بدون عائلة' : 'No Family');
      (groups[key] = groups[key] || []).push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  });

  groupedByOwner = computed(() => {
    const items = this.controls();
    const groups: Record<string, ControlRowDto[]> = {};
    for (const c of items) {
      const key = c.owner || (this.isAr() ? 'غير معين' : 'Unassigned');
      (groups[key] = groups[key] || []).push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  });

  keyControlsOnly = computed(() => this.controls().filter(c => c.keyControl));

  ngOnInit(): void {
    this.loadData();
  }

  /** Fetch controls with current filters and pagination */
  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    const f = this.filters();
    const vm = this.viewMode();

    // When key-only view, force keyControl filter
    const keyCtrl = vm === 'key-only' ? true : (f.keyControl ?? undefined);
    // When grouped view, pass groupBy param
    const groupBy = vm === 'family' ? 'family' as const : vm === 'owner' ? 'owner' as const : undefined;

    this.api
      .getControls(
        f.framework || undefined,
        this.page(),
        this.pageSize(),
        undefined,
        f.status || undefined,
        f.owner || undefined,
        f.family || undefined,
        f.controlType || undefined,
        f.automationLevel || undefined,
        keyCtrl,
        f.unmappedOnly || undefined,
        f.failingOnly || undefined,
        groupBy,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: PaginatedList<ControlRowDto>) => {
          this.controls.set(res.items);
          this.totalRecords.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Called when any filter changes */
  onFilterChange(): void {
    this.page.set(1);
    this.loadData();
  }

  /** Called when view mode changes */
  onViewModeChange(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.page.set(1);
    this.loadData();
  }

  /** Paginator page change */
  onPageChange(event: { page?: number; rows?: number }): void {
    if (event.page != null) this.page.set(event.page + 1);
    if (event.rows != null) this.pageSize.set(event.rows);
    this.loadData();
  }

  /** Reset all filters to defaults */
  resetFilters(): void {
    this.filters.set({
      framework: '',
      status: '',
      owner: '',
      family: '',
      controlType: '',
      automationLevel: '',
      keyControl: null,
      unmappedOnly: false,
      failingOnly: false,
    });
    this.viewMode.set('table');
    this.page.set(1);
    this.loadData();
  }

  /** Export controls to file */
  exportControls(format: 'csv' | 'xlsx'): void {
    const f = this.filters();
    this.api
      .exportControls(format, f.framework || undefined, undefined, f.status || undefined, f.owner || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `controls-export.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        },
      });
  }

  /** Bulk assign selected controls to a team */
  bulkAssign(ownerId: string): void {
    const ids = this.selectedControls().map(c => c.id);
    if (!ids.length) return;
    this.api
      .bulkAssignControls(ids, ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.selectedControls.set([]);
          this.loadData();
        },
      });
  }

  /** Format a date string for display */
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '\u2014';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(this.isAr() ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /** Design effectiveness label */
  effectivenessLabel(effective: boolean | undefined): string {
    if (effective == null) return '\u2014';
    if (this.isAr()) return effective ? 'فعّال' : 'غير فعّال';
    return effective ? 'Effective' : 'Ineffective';
  }

  /** Design effectiveness status for badge */
  effectivenessStatus(effective: boolean | undefined): string {
    if (effective == null) return 'unknown';
    return effective ? 'effective' : 'ineffective';
  }

  /** Update filters helper (used by template bindings) */
  updateFilter<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]): void {
    this.filters.update(f => ({ ...f, [key]: value }));
    this.onFilterChange();
  }
}
