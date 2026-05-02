/**
 * Controls Admin Page — AGRC-OS Controls Module
 *
 * Administrative configuration with 7 tabs:
 *   1. Taxonomy — families/categories tree CRUD
 *   2. Test Templates — test template table with create/edit
 *   3. Scoring Rules — effectiveness scoring configuration
 *   4. Certification Settings — campaign defaults, reminder intervals
 *   5. Monitoring Rules — global monitoring configuration
 *   6. Evidence Rules — evidence type requirements
 *   7. Retention — data retention policy settings
 *
 * @module controls
 * @see ControlsApiService.getAdminSettings, ControlsApiService.updateAdminSettings
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
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { TreeModule } from 'primeng/tree';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';

import { ControlsApiService } from '../../services/controls-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';

/** Taxonomy node for tree view */
interface TaxonomyNode {
  key: string;
  label: string;
  labelAr?: string;
  data?: any;
  children?: TaxonomyNode[];
  expandedIcon?: string;
  collapsedIcon?: string;
}

/** Test template row */
interface TestTemplateRow {
  id: string;
  name: string;
  testType: string;
  methodology: string;
  description?: string;
  active: boolean;
}

@Component({
    selector: 'app-controls-admin',
    templateUrl: './controls-admin.component.html',
    styleUrl: './controls-admin.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TabViewModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        DropdownModule,
        InputSwitchModule,
        TreeModule,
        SkeletonModule,
        TooltipModule,
        DialogModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        GrcFormFieldComponent,
        GrcDataTableComponent,
    ]
})
export class ControlsAdminComponent implements OnInit {
  private api = inject(ControlsApiService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  saving = signal(false);
  settings = signal<Record<string, any>>({});
  fieldConfig = signal<Record<string, any>>({});
  activeTabIndex = signal(0);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Taxonomy tree nodes (derived from settings) */
  taxonomyNodes = computed<TaxonomyNode[]>(() => {
    const s = this.settings();
    const families = s['taxonomy']?.families || [];
    return families.map((f: any) => ({
      key: f.id || f.code,
      label: this.isAr() ? (f.nameAr || f.name) : f.name,
      data: f,
      expandedIcon: 'pi pi-folder-open',
      collapsedIcon: 'pi pi-folder',
      children: (f.categories || []).map((c: any) => ({
        key: c.id || c.code,
        label: this.isAr() ? (c.nameAr || c.name) : c.name,
        data: c,
      })),
    }));
  });

  /** Test templates (derived from settings) */
  testTemplates = computed<TestTemplateRow[]>(() => {
    const s = this.settings();
    return s['testTemplates'] || [];
  });

  /** Scoring rules */
  scoringRules = computed(() => {
    const s = this.settings();
    return s['scoringRules'] || {
      designWeight: 40,
      operatingWeight: 60,
      passingThreshold: 70,
      criticalMultiplier: 1.5,
    };
  });

  /** Certification settings */
  certificationDefaults = computed(() => {
    const s = this.settings();
    return s['certificationSettings'] || {
      defaultDurationDays: 30,
      reminderBeforeDays: 7,
      reminderFrequencyDays: 3,
      autoCloseOnExpiry: false,
    };
  });

  /** Monitoring defaults */
  monitoringDefaults = computed(() => {
    const s = this.settings();
    return s['monitoringSettings'] || {
      defaultCheckIntervalMinutes: 60,
      alertRetentionDays: 90,
      autoCreateIssueOnCritical: true,
    };
  });

  /** Evidence rules */
  evidenceRules = computed(() => {
    const s = this.settings();
    return s['evidenceRules'] || {
      requiredTypes: ['document', 'screenshot', 'log_extract'],
      maxFileSizeMb: 25,
      retentionDays: 365,
      autoCollectionEnabled: false,
    };
  });

  /** Retention settings */
  retentionSettings = computed(() => {
    const s = this.settings();
    return s['retention'] || {
      testResultsDays: 1095,
      alertsDays: 365,
      auditLogDays: 2555,
      archiveEnabled: true,
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    this.api
      .getAdminSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.settings.set(data || {});
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });

    this.api
      .getFieldConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.fieldConfig.set(data || {}),
      });
  }

  /** Save a section of admin settings */
  saveSection(section: string, data: Record<string, any>): void {
    this.saving.set(true);
    this.api
      .updateAdminSettings({ [section]: data })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          // Update local state
          const current = { ...this.settings() };
          current[section] = data;
          this.settings.set(current);
        },
        error: () => this.saving.set(false),
      });
  }

  /** Save scoring rules */
  saveScoringRules(): void {
    this.saveSection('scoringRules', this.scoringRules());
  }

  /** Save certification settings */
  saveCertificationSettings(): void {
    this.saveSection('certificationSettings', this.certificationDefaults());
  }

  /** Save monitoring settings */
  saveMonitoringSettings(): void {
    this.saveSection('monitoringSettings', this.monitoringDefaults());
  }

  /** Save evidence rules */
  saveEvidenceRules(): void {
    this.saveSection('evidenceRules', this.evidenceRules());
  }

  /** Save retention settings */
  saveRetentionSettings(): void {
    this.saveSection('retention', this.retentionSettings());
  }

  /** Update a nested setting value (for two-way binding) */
  updateSetting(section: string, key: string, value: any): void {
    const current = { ...this.settings() };
    if (!current[section]) current[section] = {};
    current[section] = { ...current[section], [key]: value };
    this.settings.set(current);
  }
}
