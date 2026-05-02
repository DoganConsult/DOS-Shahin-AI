import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule, DialogModule, InputModule, NotificationModule, TableModule, TabsModule, TagModule, TooltipModule } from 'carbon-components-angular';

import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { catchError, of } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';
import { MessageService } from '@app/services/toast.service';

interface MonitoringData {
  failedControls: GrcRecord[];
  overdueTests: GrcRecord[];
  remediationActions: GrcRecord[];
  counts: { failed: number; overdue: number; pendingActions: number };
}

interface ControlMonitoringWs {
  approachingSla: GrcRecord[];
  pastSla: GrcRecord[];
  expiringEvidence: GrcRecord[];
  items: GrcRecord[];
  counts: { approaching: number; past: number; expiring: number };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-controls-monitoring',
    imports: [
        CommonModule, FormsModule, RouterModule,
        GrcDataTableComponent, PageShellComponent, StatusBadgeComponent, ExportButtonComponent,
        TabsModule, TableModule, TagModule, ButtonModule, TooltipModule, NotificationModule,
        DialogModule, InputModule, AppDatePipe,
    ],
    providers: [],
    templateUrl: './controls-monitoring-page.component.html',
    styleUrls: ['./controls-monitoring-page.component.scss']
})
export class ControlsMonitoringPageComponent implements OnInit {
  private complianceApi = inject(ComplianceFeatureApiService);
  private msg = inject(MessageService);
  i18n = inject(I18nService);

  loading = signal(true);
  loadError = signal<string | null>(null);
  data = signal<MonitoringData | null>(null);
  auditTestResults = signal<GrcRecord[]>([]);
  wsMonitoring = signal<ControlMonitoringWs | null>(null);
  wsLoadError = signal<string | null>(null);
  activeTab = 0;
  resolveDialogVisible = false;
  resolutionNote = '';
  private selectedFailure: GrcRecord | null = null;

  totalIssues = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.counts.failed + d.counts.overdue + d.counts.pendingActions;
  });

  ngOnInit(): void {
    this.loadData();
    this.loadAuditTestResults();
    this.loadWsMonitoring();
  }

  loadWsMonitoring(): void {
    this.wsLoadError.set(null);
    this.complianceApi.getControlMonitoringWs().pipe(
      catchError(() => {
        this.wsLoadError.set(this.i18n.translate('common.failedToLoad'));
        return of(null);
      })
    ).subscribe((d) => {
      if (d) this.wsMonitoring.set(d);
    });
  }

  loadData(): void {
    this.loadError.set(null);
    this.loading.set(true);
    this.complianceApi.getControlsMonitoring().pipe(
      catchError(() => {
        this.loadError.set(this.i18n.translate('common.failedToLoad'));
        return of({ failedControls: [], overdueTests: [], remediationActions: [], counts: { failed: 0, overdue: 0, pendingActions: 0 } });
      })
    ).subscribe((d) => {
      const dd = d as any;
      this.data.set({
        failedControls: dd?.failedControls ?? [],
        overdueTests: dd?.overdueTests ?? [],
        remediationActions: dd?.remediationActions ?? [],
        counts: dd?.counts ?? { failed: 0, overdue: 0, pendingActions: 0 },
      });
      this.loading.set(false);
    });
  }

  loadAuditTestResults(): void {
    this.complianceApi.getAuditRatingsSummary().pipe(
      catchError(() => of(null))
    ).subscribe();

    this.complianceApi.getAuditFindingTrendsBySeverity().pipe(
      catchError(() => of(null))
    ).subscribe();

    this.complianceApi.getAuditOverview().pipe(
      catchError(() => of(null))
    ).subscribe(overview => {
      if (!overview) return;
      this.complianceApi.getAuditCrossModuleStatus().pipe(
        catchError(() => of(null))
      ).subscribe(status => {
        if (status) {
          const results: GrcRecord[] = [];
          if ((status as any).findingsLinkedToRisks > 0) {
            results.push({
              control_name: this.i18n.translate('controlsMonitoring.auditTestRiskLinkedFindings'),
              test_type: 'cross_module',
              status: 'linked',
              tested_by: 'system',
              tested_at: new Date().toISOString(),
            });
          }
          this.auditTestResults.set(results);
        }
      });
    });
  }


  isOverdue(item: GrcRecord): boolean {
    if (!item.due_date) return false;
    return new Date(item.due_date) < new Date();
  }

  openResolve(item: GrcRecord): void {
    this.selectedFailure = item;
    this.resolutionNote = '';
    this.resolveDialogVisible = true;
  }

  submitResolve(): void {
    if (!this.selectedFailure?.failure_id) return;
    this.complianceApi.resolveControlFailure(this.selectedFailure.failure_id, {
      resolution_note: this.resolutionNote,
    }).subscribe({
      next: () => {
        this.msg.add({
          severity: 'success',
          summary: this.i18n.translate('controlsMonitoring.failureResolvedSummary'),
          detail: this.i18n.translate('controlsMonitoring.failureResolvedDetail'),
        });
        this.resolveDialogVisible = false;
        this.loadData();
      },
      error: () => {
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('common.error'),
          detail: this.i18n.translate('controlsMonitoring.failedToResolve'),
        });
      },
    });
  }
}
