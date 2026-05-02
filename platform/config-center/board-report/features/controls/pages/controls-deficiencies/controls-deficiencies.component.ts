/**
 * Controls Deficiencies Page — AGRC-OS Controls Module
 *
 * Manages control deficiencies: summary strip with severity breakdown,
 * filterable deficiency table, status filter tabs, create dialog,
 * and row expansion for remediation actions.
 *
 * @module controls
 * @see ControlDeficiencyDto, RemediationActionDto
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
import { TabMenuModule } from 'primeng/tabmenu';

import { ControlsApiService } from '../../services/controls-api.service';
import {
  ControlDeficiencyDto,
  ControlRowDto,
} from '../../services/controls-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';

/** Status filter tab definition */
interface StatusTab {
  label: string;
  value: string;
}

@Component({
    selector: 'app-controls-deficiencies',
    templateUrl: './controls-deficiencies.component.html',
    styleUrl: './controls-deficiencies.component.scss',
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
        TabMenuModule,
        EmptyStateComponent,
        StatusBadgeComponent,
        GrcDataTableComponent,
        GrcFormFieldComponent,
    ]
})
export class ControlsDeficienciesComponent implements OnInit {
  private api = inject(ControlsApiService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  deficiencies = signal<ControlDeficiencyDto[]>([]);
  controls = signal<ControlRowDto[]>([]);

  /** Filters */
  activeStatusFilter = signal('all');

  /** Row expansion */
  expandedDeficiencyId = signal<string | null>(null);

  /** Dialogs */
  showCreateDialog = signal(false);
  creating = signal(false);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Status filter tabs */
  statusTabs = computed<StatusTab[]>(() => {
    const ar = this.isAr();
    return [
      { label: ar ? 'الكل' : 'All', value: 'all' },
      { label: ar ? 'مفتوح' : 'Open', value: 'open' },
      { label: ar ? 'قيد التحقيق' : 'Investigating', value: 'investigating' },
      { label: ar ? 'معالجة' : 'Remediation', value: 'remediation' },
      { label: ar ? 'إعادة اختبار' : 'Retest', value: 'retest' },
      { label: ar ? 'مغلق' : 'Closed', value: 'closed' },
    ];
  });

  /** Summary strip computed values */
  totalOpen = computed(() =>
    this.deficiencies().filter(d => d.status !== 'closed').length
  );
  criticalCount = computed(() =>
    this.deficiencies().filter(d => d.severity === 'critical' && d.status !== 'closed').length
  );
  highCount = computed(() =>
    this.deficiencies().filter(d => d.severity === 'high' && d.status !== 'closed').length
  );
  mediumCount = computed(() =>
    this.deficiencies().filter(d => d.severity === 'medium' && d.status !== 'closed').length
  );
  lowCount = computed(() =>
    this.deficiencies().filter(d => d.severity === 'low' && d.status !== 'closed').length
  );
  overdueActions = computed(() =>
    this.deficiencies().filter(d => d.dueDate && new Date(d.dueDate) < new Date() && d.status !== 'closed').length
  );

  /** Filtered deficiencies based on active tab */
  filteredDeficiencies = computed(() => {
    const filter = this.activeStatusFilter();
    const list = this.deficiencies();
    if (filter === 'all') return list;
    return list.filter(d => d.status === filter);
  });

  /** Control options for dropdown */
  controlOptions = computed(() =>
    this.controls().map(c => ({ label: c.title || c.controlCode || c.id, value: c.id }))
  );

  /** Severity options */
  severityOptions = computed(() => {
    const ar = this.isAr();
    return [
      { label: ar ? 'حرج' : 'Critical', value: 'critical' },
      { label: ar ? 'مرتفع' : 'High', value: 'high' },
      { label: ar ? 'متوسط' : 'Medium', value: 'medium' },
      { label: ar ? 'منخفض' : 'Low', value: 'low' },
    ];
  });

  /** Create deficiency form */
  form = this.fb.group({
    controlId: ['', Validators.required],
    severity: ['', Validators.required],
    description: ['', Validators.required],
    rootCause: [''],
    assignedTo: [''],
    dueDate: [null as Date | null],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getDeficiencies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.deficiencies.set(data);
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

  /** Change active status filter */
  setStatusFilter(status: string): void {
    this.activeStatusFilter.set(status);
  }

  /** Toggle row expansion */
  toggleExpansion(defId: string): void {
    this.expandedDeficiencyId.set(
      this.expandedDeficiencyId() === defId ? null : defId
    );
  }

  /** Open create dialog */
  openCreateDialog(): void {
    this.form.reset();
    this.showCreateDialog.set(true);
  }

  /** Submit new deficiency */
  submitDeficiency(): void {
    if (this.form.invalid) return;
    this.creating.set(true);
    const val = this.form.value;
    this.api
      .createDeficiency({
        controlId: val.controlId!,
        severity: val.severity!,
        description: val.description!,
        rootCause: val.rootCause || undefined,
        assignedTo: val.assignedTo || undefined,
        dueDate: val.dueDate ? val.dueDate.toISOString().split('T')[0] : undefined,
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

  /** Close a deficiency */
  closeDeficiency(defId: string): void {
    this.api
      .closeDeficiency(defId, { notes: 'Closed from deficiency page' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.loadData() });
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

  /** Map severity to token CSS class */
  severityClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'sev-critical';
      case 'high': return 'sev-high';
      case 'medium': return 'sev-medium';
      case 'low': return 'sev-low';
      default: return 'sev-info';
    }
  }
}
