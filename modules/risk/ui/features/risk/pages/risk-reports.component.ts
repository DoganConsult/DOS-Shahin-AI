/**
 * Risk Reports Page — uses ModuleReportsTemplateComponent
 * Story: "Here's the evidence — board pack, executive summary, AI-generated insights."
 */
import {
  Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { SessionService } from '@app/dauth/session/session.service';
import {
  ModuleReportsTemplateComponent,
  ModuleReport, ModuleNotification
} from '@platform/shell/templates';

@Component({
  selector: 'app-risk-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModuleReportsTemplateComponent],
  template: `
    <dos-evidence-reports
      eyebrow="RISK / REPORTS"
      title="Risk Reports"
      [aiHeadline]="aiHeadline()"
      subtitle="Board packs, executive summaries and AI-generated risk intelligence"
      [loading]="loading()"
      [notification]="notification()"
      [reports]="reports()"
      [showAiReports]="true"
      [currentRole]="currentRole()"
      [writeRoles]="writeRoles"
      [exportActions]="exportActions"
      (reportClick)="onReportClick($event)"
      (downloadClick)="onDownload($event)">
    </dos-evidence-reports>
  `
})
export class RiskReportsPageComponent implements OnInit {
  private auth      = inject(SessionService);
  private destroyRef = inject(DestroyRef);

  loading   = signal(true);
  rawReports = signal<ModuleReport[]>([]);
  errorMsg  = signal<string | null>(null);

  currentRole = computed(() => this.auth.currentRole?.() ?? 'standard_user');
  readonly writeRoles = ['risk_manager', 'role_risk_manager', 'tenant_admin', 'role_tenant_owner', 'platform_super_admin'];

  aiHeadline = computed(() => {
    const ready = this.reports().filter(r => r.status === 'ready').length;
    return ready > 0 ? `${ready} reports ready — including AI-generated board pack` : 'AI is generating reports';
  });

  notification = computed<ModuleNotification | null>(() =>
    this.errorMsg() ? { type: 'error', title: 'Failed to load reports', subtitle: this.errorMsg() ?? '' } : null
  );

  reports = computed<ModuleReport[]>(() =>
    this.rawReports().length ? this.rawReports() : this.placeholderReports
  );

  readonly placeholderReports: ModuleReport[] = [
    { id: 'rpt-board', title: 'Board Risk Pack', description: 'Quarterly board-level risk summary with executive dashboard', status: 'ready', tag: 'Board Pack', aiGenerated: true, lastUpdated: '2026-05-03' },
    { id: 'rpt-exec', title: 'Executive Risk Summary', description: 'Management-level risk posture overview', status: 'ready', tag: 'Executive', aiGenerated: false, lastUpdated: '2026-05-02' },
    { id: 'rpt-heat', title: 'Risk Heatmap Report', description: 'Full heatmap with cluster analysis', status: 'ready', tag: 'Analytical', aiGenerated: true, lastUpdated: '2026-05-03' },
    { id: 'rpt-treat', title: 'Treatment Status Report', description: 'Progress on all open treatments by owner', status: 'generating', tag: 'Operational', aiGenerated: false },
    { id: 'rpt-trend', title: 'Risk Trend Analysis', description: 'AI-driven 12-month risk trend and predictions', status: 'ready', tag: 'AI Insights', aiGenerated: true, lastUpdated: '2026-05-03' },
    { id: 'rpt-reg', title: 'Regulatory Compliance Risk', description: 'Risks mapped to regulatory requirements', status: 'scheduled', tag: 'Compliance', aiGenerated: false },
  ];

  readonly exportActions = [
    { content: 'Export All PDF', click: () => {} },
    { content: 'Export All Excel', click: () => {} },
    { content: 'Schedule Report', click: () => {} },
  ];

  ngOnInit(): void {
    // Load from API when available
    setTimeout(() => this.loading.set(false), 1000);
  }

  onReportClick(report: ModuleReport) { console.log('Open report', report.id); }
  onDownload(report: ModuleReport) { console.log('Download', report.downloadUrl); }
}
