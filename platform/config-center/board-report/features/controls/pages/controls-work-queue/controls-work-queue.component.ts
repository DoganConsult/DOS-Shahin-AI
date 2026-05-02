/**
 * Controls Work Queue — My Pending Items
 *
 * Tabbed view showing all action items awaiting the current user:
 * tests, reviews, evidence, certifications, deficiencies, and monitoring alerts.
 * Each tab displays a count badge and a dedicated data table.
 *
 * @module controls
 * @see ControlWorkQueueDto for the backend response shape
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

import { ControlsApiService } from '../../services/controls-api.service';
import { ControlWorkQueueDto } from '../../services/controls-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';

@Component({
    selector: 'app-controls-work-queue',
    templateUrl: './controls-work-queue.component.html',
    styleUrl: './controls-work-queue.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        GrcDataTableComponent,
        TabViewModule,
        TableModule,
        SkeletonModule,
        TagModule,
        BadgeModule,
        TooltipModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
    ]
})
export class ControlsWorkQueueComponent implements OnInit {
  private api = inject(ControlsApiService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  data = signal<ControlWorkQueueDto | null>(null);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Tab count badges */
  testsCount = computed(() => this.data()?.testsAssigned?.length ?? 0);
  reviewCount = computed(() => this.data()?.controlsAwaitingReview?.length ?? 0);
  evidenceCount = computed(() => this.data()?.evidencePending?.length ?? 0);
  certCount = computed(() => this.data()?.certificationsPending?.length ?? 0);
  defCount = computed(() => this.data()?.deficienciesAwaitingAction?.length ?? 0);
  alertCount = computed(() => this.data()?.monitoringAlerts?.length ?? 0);

  /** Total pending items across all tabs */
  totalPending = computed(() =>
    this.testsCount() + this.reviewCount() + this.evidenceCount() +
    this.certCount() + this.defCount() + this.alertCount()
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getWorkQueue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
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

  /** Check if a date is overdue (past today) */
  isOverdue(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() < Date.now();
  }
}
