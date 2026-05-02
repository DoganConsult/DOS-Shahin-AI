/**
 * Policy Admin Page -- Configuration hub for policy module settings.
 *
 * Six tabs managed via PrimeNG TabView:
 *   1. Categories       -- CRUD for policy categories
 *   2. Review Cycles    -- Default review frequency and escalation settings
 *   3. Publication      -- Default publish channel and reminder intervals
 *   4. Exceptions       -- Exception duration, compensating controls, auto-expire
 *   5. Notifications    -- Per-event notification rules with enable/disable toggles
 *   6. Retention        -- Retention periods, archive rules, deletion controls
 *
 * Settings are loaded on tab activation via policyApi.getAdminSettings()
 * and persisted via policyApi.updateAdminSettings(data).
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PolicyApiService } from '../../services/policy-api.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { GrcDataTableComponent, GrcFormFieldComponent } from '@app/shared/components';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/* ------------------------------------------------------------------ */
/* Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface PolicyCategory {
  id?: string;
  code: string;
  name_en: string;
  name_ar: string;
  business_domain: string;
  parent_code: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface NotificationRule {
  id?: string;
  event_type: string;
  channel: string;
  enabled: boolean;
  template: string;
}

export interface ReviewCycleSettings {
  default_review_frequency: string;
  auto_transition_on_due: boolean;
  reminder_days_before: number;
  escalation_after_days: number;
}

export interface PublicationSettings {
  default_channel: string;
  default_reminder_interval_days: number;
  escalation_role: string;
  escalation_after_days: number;
}

export interface ExceptionSettings {
  max_duration_days: number;
  require_compensating_controls: boolean;
  auto_expire: boolean;
  renewal_limit: number;
}

export interface RetentionSettings {
  retention_period_days: number;
  archive_after_days: number;
  auto_archive_retired: boolean;
  require_approval_for_deletion: boolean;
}

/** Aggregate admin settings object returned by the API */
export interface AdminSettings {
  categories?: PolicyCategory[];
  reviewCycle?: ReviewCycleSettings;
  publication?: PublicationSettings;
  exceptions?: ExceptionSettings;
  notifications?: NotificationRule[];
  retention?: RetentionSettings;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-admin',
    imports: [
        CommonModule,
        FormsModule,
        GrcDataTableComponent, GrcFormFieldComponent,
        PageHeaderComponent,
        StatusBadgeComponent,
        SkeletonLoaderComponent,
        EmptyStateComponent,
        ButtonModule,
        TabViewModule,
        TableModule,
        DialogModule,
        DropdownModule,
        InputTextModule,
        InputNumberModule,
        InputSwitchModule,
        ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './policy-admin.component.html',
    styleUrls: ['./policy-admin.component.scss']
})
export class PolicyAdminComponent implements OnInit {
  private readonly policyApi = inject(PolicyApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  readonly i18n = inject(I18nService);

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  readonly dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  readonly headerActions: PageHeaderAction[] = [];

  /** Loading / saving state */
  readonly loading = signal(true);
  readonly saving = signal(false);

  /* ---------------------------------------------------------------- */
  /* Tab 1: Categories                                                 */
  /* ---------------------------------------------------------------- */

  readonly categories = signal<PolicyCategory[]>([]);
  showCategoryDialog = false;
  editingCategory: PolicyCategory = this.emptyCat();
  isNewCategory = true;

  /** Category parent dropdown derived from current categories */
  readonly parentOptions = computed(() => {
    return this.categories().map((c) => ({
      label: c.name_en,
      value: c.code,
    }));
  });

  /* ---------------------------------------------------------------- */
  /* Tab 2: Review Cycles                                              */
  /* ---------------------------------------------------------------- */

  reviewCycle: ReviewCycleSettings = {
    default_review_frequency: 'annual',
    auto_transition_on_due: true,
    reminder_days_before: 30,
    escalation_after_days: 14,
  };

  readonly frequencyOptions = [
    { label: 'Annual', value: 'annual' },
    { label: 'Semi-Annual', value: 'semi_annual' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  /* ---------------------------------------------------------------- */
  /* Tab 3: Publication Settings                                       */
  /* ---------------------------------------------------------------- */

  publication: PublicationSettings = {
    default_channel: 'portal',
    default_reminder_interval_days: 7,
    escalation_role: '',
    escalation_after_days: 14,
  };

  readonly channelOptions = [
    { label: 'Portal', value: 'portal' },
    { label: 'Email', value: 'email' },
    { label: 'Teams', value: 'teams' },
    { label: 'LMS', value: 'lms' },
    { label: 'All Channels', value: 'all' },
  ];

  /* ---------------------------------------------------------------- */
  /* Tab 4: Exception Settings                                         */
  /* ---------------------------------------------------------------- */

  exceptions: ExceptionSettings = {
    max_duration_days: 365,
    require_compensating_controls: true,
    auto_expire: true,
    renewal_limit: 2,
  };

  /* ---------------------------------------------------------------- */
  /* Tab 5: Notification Rules                                         */
  /* ---------------------------------------------------------------- */

  readonly notificationRules = signal<NotificationRule[]>([]);

  readonly eventTypeLabels: Record<string, string> = {
    review_due: 'Review Due',
    publication_new: 'New Publication',
    ack_overdue: 'Acknowledgment Overdue',
    exception_expiring: 'Exception Expiring',
    approval_pending: 'Approval Pending',
    stale_warning: 'Stale Policy Warning',
  };

  /* ---------------------------------------------------------------- */
  /* Tab 6: Retention & Compliance                                     */
  /* ---------------------------------------------------------------- */

  retention: RetentionSettings = {
    retention_period_days: 3650,
    archive_after_days: 2555,
    auto_archive_retired: true,
    require_approval_for_deletion: true,
  };

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  ngOnInit(): void {
    this.loadSettings();
  }

  /** Load all admin settings from the API */
  loadSettings(): void {
    this.loading.set(true);
    this.policyApi
      .getAdminSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res.categories) this.categories.set(res.categories);
          if (res.reviewCycle) this.reviewCycle = { ...this.reviewCycle, ...res.reviewCycle };
          if (res.publication) this.publication = { ...this.publication, ...res.publication };
          if (res.exceptions) this.exceptions = { ...this.exceptions, ...res.exceptions };
          if (res.notifications) this.notificationRules.set(res.notifications);
          if (res.retention) this.retention = { ...this.retention, ...res.retention };
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load admin settings.',
          });
        },
      });
  }

  /* ---------------------------------------------------------------- */
  /* Category CRUD                                                     */
  /* ---------------------------------------------------------------- */

  /** Open dialog to add a new category */
  addCategory(): void {
    this.editingCategory = this.emptyCat();
    this.isNewCategory = true;
    this.showCategoryDialog = true;
  }

  /** Open dialog to edit an existing category */
  editCategory(cat: PolicyCategory): void {
    this.editingCategory = { ...cat };
    this.isNewCategory = false;
    this.showCategoryDialog = true;
  }

  /** Save (create or update) the category being edited */
  saveCategory(): void {
    const cats = [...this.categories()];
    if (this.isNewCategory) {
      cats.push({ ...this.editingCategory });
    } else {
      const idx = cats.findIndex((c) => c.code === this.editingCategory.code);
      if (idx >= 0) cats[idx] = { ...this.editingCategory };
    }
    this.categories.set(cats);
    this.showCategoryDialog = false;
    this.saveSection('categories', { categories: cats });
  }

  /** Delete a category by code */
  deleteCategory(cat: PolicyCategory): void {
    const cats = this.categories().filter((c) => c.code !== cat.code);
    this.categories.set(cats);
    this.saveSection('categories', { categories: cats });
  }

  /* ---------------------------------------------------------------- */
  /* Section Save                                                      */
  /* ---------------------------------------------------------------- */

  /** Save review cycle settings */
  saveReviewCycle(): void {
    this.saveSection('reviewCycle', { reviewCycle: this.reviewCycle });
  }

  /** Save publication settings */
  savePublication(): void {
    this.saveSection('publication', { publication: this.publication });
  }

  /** Save exception settings */
  saveExceptions(): void {
    this.saveSection('exceptions', { exceptions: this.exceptions });
  }

  /** Toggle a notification rule's enabled state and persist */
  toggleNotification(rule: NotificationRule): void {
    rule.enabled = !rule.enabled;
    this.notificationRules.set([...this.notificationRules()]);
    this.saveSection('notifications', { notifications: this.notificationRules() });
  }

  /** Save retention settings */
  saveRetention(): void {
    this.saveSection('retention', { retention: this.retention });
  }

  /* ---------------------------------------------------------------- */
  /* Private helpers                                                   */
  /* ---------------------------------------------------------------- */

  /** Persist a settings section to the API */
  private saveSection(section: string, data: Partial<AdminSettings>): void {
    this.saving.set(true);
    this.policyApi
      .updateAdminSettings(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: `${section} settings updated successfully.`,
          });
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to save ${section} settings.`,
          });
        },
      });
  }

  /** Return an empty category template */
  private emptyCat(): PolicyCategory {
    return {
      code: '',
      name_en: '',
      name_ar: '',
      business_domain: '',
      parent_code: null,
      sort_order: 0,
      is_active: true,
    };
  }
}
