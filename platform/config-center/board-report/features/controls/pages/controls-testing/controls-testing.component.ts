/**
 * Controls Testing Page — AGRC-OS Controls Module
 *
 * Enhanced test management: plan overview strip, testing table with filters,
 * filter bar (test type, result, date range, tester), and create test dialog.
 *
 * @module controls
 * @see ControlTestDto, CreateControlTestRequest
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
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { CalendarModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';

import { ControlsApiService } from '../../services/controls-api.service';
import { ControlTestDto, ControlRowDto } from '../../services/controls-api.types';
import { TEST_METHODOLOGIES } from '../../controls.constants';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';

@Component({
    selector: 'app-controls-testing',
    templateUrl: './controls-testing.component.html',
    styleUrl: './controls-testing.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputTextarea,
        CalendarModule,
        DropdownModule,
        SkeletonModule,
        TooltipModule,
        MultiSelectModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
        GrcDataTableComponent,
        GrcFormFieldComponent,
    ]
})
export class ControlsTestingComponent implements OnInit {
  private api = inject(ControlsApiService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  tests = signal<ControlTestDto[]>([]);
  controls = signal<ControlRowDto[]>([]);

  /** Filters */
  filterTestType = signal<string | null>(null);
  filterResult = signal<string | null>(null);
  filterTester = signal<string | null>(null);

  /** Dialog */
  showCreateDialog = signal(false);
  creating = signal(false);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Test plan overview KPIs */
  scheduledThisQuarter = computed(() => this.tests().length);
  inProgressCount = computed(() =>
    this.tests().filter(t => t.result === 'in_progress' || t.result === 'pending').length
  );
  completedCount = computed(() =>
    this.tests().filter(t => t.result === 'pass' || t.result === 'fail').length
  );
  failedCount = computed(() =>
    this.tests().filter(t => t.result === 'fail').length
  );

  /** Filtered tests */
  filteredTests = computed(() => {
    let list = this.tests();
    const type = this.filterTestType();
    const result = this.filterResult();
    const tester = this.filterTester();
    if (type) list = list.filter(t => t.test_type === type);
    if (result) list = list.filter(t => t.result === result);
    if (tester) list = list.filter(t => t.testedBy === tester);
    return list;
  });

  /** Filter options */
  testTypeOptions = computed(() => {
    const ar = this.isAr();
    return TEST_METHODOLOGIES.map(m => ({
      label: ar ? m : m.charAt(0).toUpperCase() + m.slice(1),
      value: m,
    }));
  });

  resultOptions = computed(() => {
    const ar = this.isAr();
    return [
      { label: ar ? 'ناجح' : 'Pass', value: 'pass' },
      { label: ar ? 'فشل' : 'Fail', value: 'fail' },
      { label: ar ? 'قيد التنفيذ' : 'In Progress', value: 'in_progress' },
      { label: ar ? 'معلق' : 'Pending', value: 'pending' },
    ];
  });

  testerOptions = computed(() => {
    const testers = [...new Set(this.tests().map(t => t.testedBy).filter(Boolean))] as string[];
    return testers.map(t => ({ label: t, value: t }));
  });

  /** Control options for dropdown */
  controlOptions = computed(() =>
    this.controls().map(c => ({ label: c.title || c.controlCode || c.id, value: c.id }))
  );

  /** Create test form */
  form = this.fb.group({
    control_id: ['', Validators.required],
    test_type: ['', Validators.required],
    notes: [''],
    evidenceRef: [''],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getControlTests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.tests.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });

    this.api
      .getControls()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.controls.set(res.items || []),
      });
  }

  /** Clear all filters */
  clearFilters(): void {
    this.filterTestType.set(null);
    this.filterResult.set(null);
    this.filterTester.set(null);
  }

  /** Open create test dialog */
  openCreateDialog(): void {
    this.form.reset();
    this.showCreateDialog.set(true);
  }

  /** Submit new test */
  submitTest(): void {
    if (this.form.invalid) return;
    this.creating.set(true);
    const val = this.form.value;
    this.api
      .createControlTest({
        control_id: val.control_id!,
        test_type: val.test_type || undefined,
        notes: val.notes || undefined,
        evidenceRef: val.evidenceRef || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.showCreateDialog.set(false);
          this.loadData();
        },
        error: () => this.creating.set(false),
      });
  }

  /** Format date for display */
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '\u2014';
    try {
      return new Date(dateStr).toLocaleDateString(
        this.isAr() ? 'ar-SA' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric' }
      );
    } catch {
      return dateStr;
    }
  }
}
