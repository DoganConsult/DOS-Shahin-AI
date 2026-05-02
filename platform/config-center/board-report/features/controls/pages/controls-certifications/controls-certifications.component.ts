/**
 * Controls Certifications Page — AGRC-OS Controls Module
 *
 * Manages certification campaigns: summary strip, campaign list table,
 * create campaign dialog, and row-expansion for attestation requests.
 *
 * @module controls
 * @see CertificationCampaignDto, CertificationRequestDto
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
import { ProgressBarModule } from 'primeng/progressbar';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';

import { ControlsApiService } from '../../services/controls-api.service';
import {
  CertificationCampaignDto,
  CertificationRequestDto,
  ControlRowDto,
} from '../../services/controls-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';

@Component({
    selector: 'app-controls-certifications',
    templateUrl: './controls-certifications.component.html',
    styleUrl: './controls-certifications.component.scss',
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
        ProgressBarModule,
        MultiSelectModule,
        SkeletonModule,
        TooltipModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
        GrcDataTableComponent,
        GrcFormFieldComponent,
    ]
})
export class ControlsCertificationsComponent implements OnInit {
  private api = inject(ControlsApiService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  campaigns = signal<CertificationCampaignDto[]>([]);
  controls = signal<ControlRowDto[]>([]);

  /** Campaign detail expansion */
  expandedCampaignId = signal<string | null>(null);
  requestsLoading = signal(false);
  requests = signal<CertificationRequestDto[]>([]);

  /** Create dialog */
  showCreateDialog = signal(false);
  creating = signal(false);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Summary strip computed values */
  activeCampaigns = computed(() =>
    this.campaigns().filter(c => c.status === 'active').length
  );
  totalRequests = computed(() =>
    this.campaigns().reduce((sum, c) => sum + (c.totalRequests || 0), 0)
  );
  overallCompletion = computed(() => {
    const list = this.campaigns();
    if (!list.length) return 0;
    const total = list.reduce((s, c) => s + (c.completionPct || 0), 0);
    return Math.round(total / list.length);
  });
  overdueCount = computed(() =>
    this.campaigns().reduce((sum, c) => sum + (c.overdueRequests || 0), 0)
  );

  /** Control options for multi-select in create dialog */
  controlOptions = computed(() =>
    this.controls().map(c => ({ label: c.title || c.controlCode || c.id, value: c.id }))
  );

  /** Create campaign form */
  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    controlIds: [[] as string[], Validators.required],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null, Validators.required],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getCertificationCampaigns()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.campaigns.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });

    // Load controls for the create dialog multi-select
    this.api
      .getControls()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.controls.set(res.items || []),
      });
  }

  /** Toggle campaign row expansion to show attestation requests */
  toggleCampaignDetail(campaignId: string): void {
    if (this.expandedCampaignId() === campaignId) {
      this.expandedCampaignId.set(null);
      return;
    }
    this.expandedCampaignId.set(campaignId);
    this.requestsLoading.set(true);
    this.api
      .getCertificationRequests(campaignId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.requests.set(data);
          this.requestsLoading.set(false);
        },
        error: () => this.requestsLoading.set(false),
      });
  }

  /** Open create campaign dialog */
  openCreateDialog(): void {
    this.form.reset({ name: '', description: '', controlIds: [], startDate: null, endDate: null });
    this.showCreateDialog.set(true);
  }

  /** Submit new campaign */
  submitCampaign(): void {
    if (this.form.invalid) return;
    this.creating.set(true);
    const val = this.form.value;
    this.api
      .createCertificationCampaign({
        name: val.name!,
        description: val.description || undefined,
        controlIds: val.controlIds || [],
        startDate: val.startDate ? val.startDate.toISOString().split('T')[0] : '',
        endDate: val.endDate ? val.endDate.toISOString().split('T')[0] : '',
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
