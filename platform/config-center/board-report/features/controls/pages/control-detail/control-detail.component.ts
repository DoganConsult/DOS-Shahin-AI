/**
 * Control Detail Page — AGRC-OS Controls Module
 *
 * Displays a single control with all its relationships across 10 tabs:
 *   Overview | Objective & Procedure | Scope & Ownership | Mapping |
 *   Evidence Sources | Testing History | Certifications |
 *   Deficiencies & Actions | Monitoring Signals | Activity Log
 *
 * Layout: Sticky header + Summary strip + TabView + Right rail
 */
import {
  Component, OnInit, signal, inject,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TabViewModule } from 'primeng/tabs';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';

import { ControlsApiService } from '../../services/controls-api.service';
import type { ControlDetailDto, MonitoringAlertDto } from '../../services/controls-api.types';

import { ControlOverviewTabComponent } from './tabs/control-overview-tab.component';
import { ControlObjectiveTabComponent } from './tabs/control-objective-tab.component';
import { ControlScopeTabComponent } from './tabs/control-scope-tab.component';
import { ControlMappingTabComponent } from './tabs/control-mapping-tab.component';
import { ControlEvidenceTabComponent } from './tabs/control-evidence-tab.component';
import { ControlTestingTabComponent } from './tabs/control-testing-tab.component';
import { ControlCertificationsTabComponent } from './tabs/control-certifications-tab.component';
import { ControlDeficienciesTabComponent } from './tabs/control-deficiencies-tab.component';
import { ControlMonitoringTabComponent } from './tabs/control-monitoring-tab.component';
import { ControlActivityTabComponent } from './tabs/control-activity-tab.component';

/** Lightweight issue reference for the right rail */
interface RelatedIssue {
  id: string;
  title: string;
}

@Component({
    selector: 'app-control-detail',
    templateUrl: './control-detail.component.html',
    styleUrl: './control-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        TabViewModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
        ControlOverviewTabComponent,
        ControlObjectiveTabComponent,
        ControlScopeTabComponent,
        ControlMappingTabComponent,
        ControlEvidenceTabComponent,
        ControlTestingTabComponent,
        ControlCertificationsTabComponent,
        ControlDeficienciesTabComponent,
        ControlMonitoringTabComponent,
        ControlActivityTabComponent,
    ]
})
export class ControlDetailComponent implements OnInit {
  /** Loading indicator */
  loading = signal(true);
  /** Error flag for load failure */
  error = signal(false);
  /** Aggregated control detail data */
  control = signal<ControlDetailDto | null>(null);
  /** Active tab index (0-based, synced with TabView) */
  activeTab = signal(0);
  /** Two-way binding helper for p-tabView activeIndex */
  activeTabIndex = 0;

  /** Right rail: related issues (loaded from alerts or separate endpoint) */
  relatedIssues = signal<RelatedIssue[]>([]);
  /** Right rail: latest alerts for this control */
  latestAlerts = signal<MonitoringAlertDto[]>([]);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ControlsApiService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.loadControl(id);
        }
      });
  }

  /** Load the aggregated control detail from the API */
  private loadControl(id: string): void {
    this.loading.set(true);
    this.error.set(false);

    this.api.getControlDetailAggregated(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.control.set(data);
          this.loading.set(false);
          this.loadSidebarData(id);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Load right rail data: alerts and related issues */
  private loadSidebarData(controlId: string): void {
    this.api.getMonitoringAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alerts) => {
          const filtered = alerts
            .filter(a => a.controlId === controlId)
            .slice(0, 5);
          this.latestAlerts.set(filtered);
        },
        error: () => { /* non-critical — silently ignore */ },
      });
  }

  /** Retry loading after error */
  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadControl(id);
    }
  }

  /** Navigate back to the controls library */
  goBack(): void {
    this.router.navigateByUrl('/controls/library');
  }

  /** Extract first character for avatar initial */
  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  // ── Quick Action Handlers ────────────────────────────────────────

  onEdit(): void {
    const id = this.control()?.id;
    if (id) {
      this.router.navigate(['/controls', id, 'edit']);
    }
  }

  onTest(): void {
    this.activeTab.set(5);
    this.activeTabIndex = 5;
  }

  onCertify(): void {
    this.activeTab.set(6);
    this.activeTabIndex = 6;
  }

  onFlagDeficiency(): void {
    this.activeTab.set(7);
    this.activeTabIndex = 7;
  }
}
