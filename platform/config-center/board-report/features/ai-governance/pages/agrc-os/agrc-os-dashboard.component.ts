// ============================================
// Shahin GRC — AGRC-OS Dashboard Component
// Unified command center for the Autonomous
// GRC Operating System
// ============================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { MessageService } from 'primeng/api';
import { SessionService } from '@app/dauth/session/session.service';
import { EntitlementsService } from '@app/core/services/platform/entitlements.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { WebSocketService } from '@app/websocket';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { AgUiWebSocketService, AGUIEvent } from '@app/core/services/ag-ui-websocket.service';
import { DashboardApiService } from '@app/dashboard/dashboard-api.service';
import { ProductsModulesConfigService } from '@app/runtime/config/products-modules-config.service';
import { RouteRegistryStore } from '@app/runtime/routing/route-registry.store';
import { Subscription, forkJoin, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgrcWiringStatusWidget } from '@app/shared/widgets/components/governance/agrc-wiring-status.widget';
import {
  RiskHeatmapWidgetComponent,
  ComplianceGaugeWidgetComponent,
  MaturityRadarWidgetComponent,
  FindingsBarWidgetComponent,
  EvidenceDonutWidgetComponent,
  TrendLineWidgetComponent,
  VendorBubbleWidgetComponent,
  TopRisksComponent,
} from '@app/features/dashboard';
import { ToastModule } from 'primeng/toast';
import { devError } from '@app/runtime/utils/dev-logger';
import { AppDatePipe, AppNumberPipe} from '@app/shared/pipes';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

interface TabDef { key: string; labelKey: string; icon: string; }
interface SubsystemDef { nameEn: string; nameAr: string; icon: string; route: string | undefined; active: boolean; }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-agrc-os-dashboard',
    imports: [
        CommonModule, FormsModule, RouterModule,
        AgrcWiringStatusWidget,
        RiskHeatmapWidgetComponent,
        ComplianceGaugeWidgetComponent,
        MaturityRadarWidgetComponent,
        FindingsBarWidgetComponent,
        EvidenceDonutWidgetComponent,
        TrendLineWidgetComponent,
        VendorBubbleWidgetComponent,
        TopRisksComponent, AppDatePipe, AppNumberPipe, ToastModule,
    ],
    providers: [MessageService],
    templateUrl: './agrc-os-dashboard.component.html',
    styleUrls: ['./agrc-os-dashboard.component.css']
})
export class AGRCOSDashboardComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private msg = inject(MessageService);
  private auth = inject(SessionService);
  private entitlements = inject(EntitlementsService);
  private svc = inject(AGRCOSService);
  private dashboardApi = inject(DashboardApiService);
  private ws = inject(WebSocketService);
  private live = inject(GrcLiveService);
  private agUi = inject(AgUiWebSocketService);
  pmc = inject(ProductsModulesConfigService);
  private routeRegistry = inject(RouteRegistryStore);
  private destroyRef = inject(DestroyRef);

  activeTab = signal<string>('status');
  healthStatus = signal<string>('healthy');
  cycleRunning = signal(false);
  status = signal<GrcRecord | null>(null);
  history = signal<GrcRecord[]>([]);
  events = signal<GrcRecord[]>([]);
  eventStats = signal<GrcRecord | null>(null);
  gateLog = signal<GrcRecord[]>([]);
  riskAppetite = signal<GrcRecord[]>([]);
  authorityMatrix = signal<GrcRecord[]>([]);
  ccmHistory = signal<GrcRecord[]>([]);
  sops = signal<GrcRecord[]>([]);
  runbooks = signal<GrcRecord[]>([]);
  metrics = signal<GrcRecord | null>(null);
  reportingStatus = signal<GrcRecord | null>(null);
  exporting = signal(false);
  escalating = signal(false);
  setupRunning = signal(false);
  eventSeverityFilter = '';
  loadError = signal<string | null>(null);
  loadCorrelationId = signal<string | null>(null);

  kpis = signal<{ icon: string; value: string | number; labelKey: string }[]>([]);

  // Widget data signals
  heatmapCells = signal<GrcRecord[]>([]);
  complianceScore = signal<number | null>(null);
  maturityValues = signal<{ name: string; score: number }[]>([]);
  evidenceSlices = signal<GrcRecord[]>([]);
  vendorBubbles = signal<GrcRecord[]>([]);
  topRisks = signal<GrcRecord[]>([]);
  /** True until first batch of widget API calls completes (used for widget-shell state). */
  widgetsLoading = signal(true);
  /** Subscription for the current widget load — cancelled on reload to avoid stale data. */
  private widgetSub?: Subscription;

  // Autonomous engine
  autonomousStatus = signal<GrcRecord | null>(null);
  autonomousHistory = signal<GrcRecord[]>([]);
  autonomousRunning = signal(false);

  // Agent status (Unified Squad live data)
  agentStatus = signal<GrcRecord | null>(null);

  // Constitution validation
  constitutionValidation = signal<GrcRecord | null>(null);
  validatingConstitution = signal(false);

  // AG-UI real-time agent events
  agUiConnected = this.agUi.connected;
  agUiEvents = signal<AGUIEvent[]>([]);

  // Escalation thresholds
  escalationThresholds = signal<GrcRecord[]>([]);

  // Guided experience
  setupProgress = signal<GrcRecord | null>(null);
  nextActions = signal<GrcRecord[]>([]);

  // Misalignment detection
  misalignments = signal<GrcRecord[]>([]);
  detectingMisalignment = signal(false);

  // Regulatory delta
  regulatoryDeltas = signal<GrcRecord[]>([]);
  deltaScanning = signal(false);

  // Team Hub summary
  teamCount = signal(0);
  teamMemberCount = signal(0);

  // Qiyas↔GRC Cross-module automation
  qiyasGrcTriggers = signal<GrcRecord[]>([]);
  qiyasAutoTasks = signal<GrcRecord[]>([]);
  maturitySyncs = signal<GrcRecord[]>([]);
  qiyasGrcLoading = signal(false);

  // Agent Mesh (participants, handoffs, monitoring targets, pending actions)
  meshData = signal<{
    participants?: GrcRecord[];
    handoffs?: { summary?: { pending?: number }; items?: GrcRecord[] };
    monitoringTargets?: { total?: number; targets?: GrcRecord[]; byAgent?: Record<string, number> };
    pendingActions?: { count?: number; items?: GrcRecord[] };
  } | null>(null);
  meshLoading = signal(false);
  // Monitored controls (in scope from framework_focus targets)
  monitoredControls = signal<GrcRecord[]>([]);
  monitoredControlsLoading = signal(false);
  // System topology subsystems — derived from DB module registry + entitlements
  get subsystems(): SubsystemDef[] {
    // Try DB-driven module registry first
    const reg = this.routeRegistry.moduleRegistry();
    const regEntries = Object.values(reg);
    if (regEntries.length > 0) {
      return regEntries
        .filter(m => m.isActive && m.licensed && (m.moduleCategory === 'core_grc' || m.moduleCategory === 'operational'))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(m => ({
          nameEn: m.displayNameEn,
          nameAr: m.displayNameAr || m.displayNameEn,
          icon: m.icon || 'pi-cog',
          route: m.moduleCode,
          active: this.pmc.isModuleVisible(m.moduleCode),
        }));
    }

    // Fallback: hardcoded subsystems (until route-catalog loaded)
    const qiyas = this.entitlements.qiyasEnabled();
    const agrc = this.entitlements.agrcEnabled();
    return [
      { nameEn: 'Constitution', nameAr: 'الدستور', icon: 'pi-file-edit', route: 'governance', active: agrc },
      { nameEn: 'Telemetry', nameAr: 'القياس عن بعد', icon: 'pi-wifi', route: 'risks', active: agrc },
      { nameEn: 'Enforcement Gates', nameAr: 'بوابات التنفيذ', icon: 'pi-shield', route: 'compliance', active: agrc },
      { nameEn: 'CCM Engine', nameAr: 'محرك CCM', icon: 'pi-refresh', route: 'compliance', active: agrc },
      { nameEn: 'Event Bus', nameAr: 'ناقل الأحداث', icon: 'pi-bolt', route: 'incidents', active: agrc },
      { nameEn: 'Orchestrator', nameAr: 'المنسق', icon: 'pi-microchip-ai', route: 'ai-hub', active: true },
      { nameEn: 'SOPs & Runbooks', nameAr: 'الإجراءات والتشغيل', icon: 'pi-list', route: 'workflows', active: true },
      { nameEn: 'Report Engine', nameAr: 'محرك التقارير', icon: 'pi-file-pdf', route: 'report-center', active: true },
      { nameEn: 'Audit Trail', nameAr: 'مسار التدقيق', icon: 'pi-search', route: 'audit', active: true },
      { nameEn: 'Vendor Risk', nameAr: 'مخاطر الموردين', icon: 'pi-truck', route: 'vendor-risk', active: agrc },
      { nameEn: 'Qiyas Engine', nameAr: 'محرك قياس', icon: 'pi-chart-bar', route: 'qiyas', active: qiyas },
    ];
  }

  tabs: TabDef[] = [
    { key: 'status', labelKey: 'agrcOs.tabStatus', icon: 'pi-chart-bar' },
    { key: 'events', labelKey: 'agrcOs.tabEvents', icon: 'pi-bolt' },
    { key: 'gates', labelKey: 'agrcOs.tabGates', icon: 'pi-shield' },
    { key: 'constitution', labelKey: 'agrcOs.tabConstitution', icon: 'pi-file-edit' },
    { key: 'ccm', labelKey: 'agrcOs.tabCCM', icon: 'pi-refresh' },
    { key: 'sops', labelKey: 'agrcOs.tabSOPs', icon: 'pi-list' },
    { key: 'reporting', labelKey: 'agrcOs.tabReporting', icon: 'pi-file-pdf' },
    { key: 'metrics', labelKey: 'agrcOs.tabMetrics', icon: 'pi-chart-line' },
    { key: 'regulatory-delta', labelKey: 'agrcOs.tabRegulatoryDelta', icon: 'pi-megaphone' },
    { key: 'unified-squad', labelKey: 'agrcOs.tabUnifiedSquad', icon: 'pi-users' },
    { key: 'agent-mesh', labelKey: 'agrcOs.tabAgentMesh', icon: 'pi-sitemap' },
    { key: 'qiyas-grc', labelKey: 'agrcOs.tabQiyasGrc', icon: 'pi-arrows-h' },
  ];

  objectEntries = Object.entries;

  ngOnInit(): void {
    this.loadAll();
    this.subscribeToLiveUpdates();
    // Auto-refresh every 30 seconds
    interval(30000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadStatus());
  }

  loadAll(): void {
    this.loadStatus();
    this.loadEvents();
    this.loadGates();
    this.loadConstitution();
    this.loadCCM();
    this.loadSOPs();
    this.loadReportingStatus();
    this.loadRunbooks();
    this.loadMetrics();
    this.loadTeamSummary();
    this.loadAutonomous();
    this.loadAgentStatus();
    this.loadGuidedExperience();
    this.loadMisalignments();
    this.loadRegulatoryDeltas();
    this.loadQiyasGrcAutomation();
    this.loadMesh();
    this.loadMonitoredControls();
    // Load real dashboard widget data
    this.loadDashboardWidgets();
  }

  loadMesh(): void {
    this.meshLoading.set(true);
    this.svc.getIntegrationMesh().subscribe({
      next: (data) => { this.meshData.set(data); this.meshLoading.set(false); },
      error: () => { this.meshData.set(null); this.meshLoading.set(false); },
    });
  }

  loadMonitoredControls(): void {
    this.monitoredControlsLoading.set(true);
    this.svc.getMonitoredControls(100).subscribe({
      next: (data) => { this.monitoredControls.set(data?.controls ?? []); this.monitoredControlsLoading.set(false); },
      error: () => { this.monitoredControls.set([]); this.monitoredControlsLoading.set(false); },
    });
  }

  // ── Dashboard Widget Data Loading ──────────────────────────────────────
  loadDashboardWidgets(): void {
    this.widgetsLoading.set(true);
    // Cancel any in-flight widget load to avoid stale data
    this.widgetSub?.unsubscribe();

    this.widgetSub = forkJoin({
      heatmap: this.svc.getRiskHeatmapData(),
      compliance: this.svc.getComplianceScoreData(),
      maturity: this.svc.getMaturityRadarData(),
      evidence: this.svc.getEvidenceDonutData(),
      vendor: this.svc.getVendorBubbleData(),
      topRisks: this.svc.getTopRisksData(),
    }).subscribe({
      next: (data: any) => {
        this.heatmapCells.set(data.heatmap || []);
        this.complianceScore.set(data.compliance?.overall ?? 0);
        this.maturityValues.set(data.maturity?.map((d) => ({ name: d.name, score: d.score })) || []);
        this.evidenceSlices.set(data.evidence?.map((d) => ({
          name: d.type,
          value: d.count,
          itemStyle: { color: d.staleCount > 0 ? '#ff6b6b' : '#4ecdc4' },
        })) || []);
        this.vendorBubbles.set(data.vendor?.map((d) => ({
          name: d.vendorName,
          value: [d.riskScore, d.spend],
          itemStyle: {
            color: d.criticality === 'critical' ? '#ff4757' :
              d.criticality === 'high' ? '#ff6348' :
              d.criticality === 'medium' ? '#ffa502' : '#2ed573',
          },
        })) || []);
        this.topRisks.set(data.topRisks?.map((d) => ({
          riskId: d.riskId,
          title: d.title,
          score: d.score,
          category: d.category,
          trend: d.trend,
          lastUpdated: d.lastUpdated,
        })) || []);
        this.widgetsLoading.set(false);
      },
      error: () => {
        this.heatmapCells.set([]);
        this.complianceScore.set(0);
        this.maturityValues.set([]);
        this.evidenceSlices.set([]);
        this.vendorBubbles.set([]);
        this.topRisks.set([]);
        this.widgetsLoading.set(false);
      },
    });
  }

  onWidgetRefresh(): void {
    this.loadDashboardWidgets();
  }

  loadTeamSummary(): void {
    this.operationsSvc.getTeams().subscribe({
      next: (d: any) => {
        const teams = d?.teams ?? (Array.isArray(d) ? d : []);
        this.teamCount.set(teams.length);
        const members = teams.reduce((s: number, t: any) => s + (t.memberCount ?? t.member_count ?? 0), 0);
        this.teamMemberCount.set(members);
      },
      error: (e) => devError("[API]", e),
    });
  }

  loadStatus(): void {
    this.svc.getStatus().subscribe({
      next: s => { this.status.set(s); this.updateKPIs(); this.loadError.set(null); this.loadCorrelationId.set(null); },
      error: (e) => {
        this.loadError.set('Failed to load status: ' + (e?.message || e?.error?.error || 'Unknown error'));
        this.loadCorrelationId.set(e?.error?.correlationId ?? e?.error?.correlation_id ?? null);
      },
    });
    this.svc.getHistory(20).subscribe({ next: h => this.history.set(h), error: (e) => devError("[API]", e) });
    this.svc.getHealth().subscribe({ next: (h: any) => this.healthStatus.set(h.status || 'healthy'), error: (e) => devError("[API]", e) });
  }

  loadEvents(): void {
    this.svc.getEvents({ severity: this.eventSeverityFilter || undefined, limit: 50 }).subscribe({ next: e => this.events.set(e), error: (e) => devError("[API]", e) });
    this.svc.getEventStats().subscribe({ next: s => this.eventStats.set(s), error: (e) => devError("[API]", e) });
  }

  loadGates(): void {
    this.svc.getGateLog({ limit: 50 }).subscribe({ next: g => this.gateLog.set(g), error: (e) => devError("[API]", e) });
  }

  loadConstitution(): void {
    this.svc.getRiskAppetite().subscribe({ next: r => this.riskAppetite.set(r), error: (e) => devError("[API]", e) });
    this.svc.getAuthorityMatrix().subscribe({ next: a => this.authorityMatrix.set(a), error: (e) => devError("[API]", e) });
    this.loadEscalationThresholds();
  }

  loadCCM(): void {
    this.svc.getCCMHistory(20).subscribe({ next: c => this.ccmHistory.set(c), error: (e) => devError("[API]", e) });
  }

  loadSOPs(): void {
    this.svc.getSOPs().subscribe({ next: s => this.sops.set(s), error: (e) => devError("[API]", e) });
  }

  loadRunbooks(): void {
    this.svc.getRunbooks().subscribe({ next: r => this.runbooks.set(r), error: (e) => devError("[API]", e) });
  }

  loadMetrics(): void {
    this.svc.getMetrics().subscribe({ next: m => { this.metrics.set(m); this.updateKPIs(); }, error: (e) => devError("[API]", e) });
  }

  loadReportingStatus(): void {
    this.svc.getReportingStatus(48).subscribe({ next: r => this.reportingStatus.set(r), error: (e) => devError("[API]", e) });
  }

  onExportFormatChange(ev: Event): void {
    const el = ev.target as HTMLSelectElement;
    const value = el?.value;
    if (value === 'pdf' || value === 'excel') {
      this.exportLive(value);
      if (el) el.value = '';
    }
  }

  exportLive(format: 'pdf' | 'excel'): void {
    this.exporting.set(true);
    const lang = this.i18n.currentLang() || 'en';
    this.svc.exportLiveReport(format, { language: lang }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agrc-os-live-report-${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('agrcOs.exportDownloaded'), life: 3000 });
      },
      error: () => {
        this.exporting.set(false);
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.exportFailed'), life: 4000 });
      },
    });
  }

  escalateOverdue(): void {
    this.escalating.set(true);
    this.svc.escalateOverdueReports(48).subscribe({
      next: () => { this.loadReportingStatus(); this.escalating.set(false); },
      error: () => this.escalating.set(false),
    });
  }

  runCycle(): void {
    this.cycleRunning.set(true);
    this.svc.runOrchestration().subscribe({
      next: () => { this.cycleRunning.set(false); this.loadAll(); },
      error: () => this.cycleRunning.set(false),
    });
  }

  runCCM(): void {
    this.svc.runCCM().subscribe({ next: () => this.loadCCM(), error: (e) => devError("[API]", e) });
  }

  seedSOPs(): void {
    this.svc.seedSOPs().subscribe({ next: () => this.loadSOPs(), error: (e) => devError("[API]", e) });
  }

  seedRunbooks(): void {
    this.svc.seedRunbooks().subscribe({ next: () => this.loadRunbooks(), error: (e) => devError("[API]", e) });
  }

  canSetup(): boolean {
    return this.auth.hasPermission('platform.agent.manage');
  }

  runSetup(): void {
    this.setupRunning.set(true);
    this.svc.setup().subscribe({
      next: (r) => {
        this.setupRunning.set(false);
        if (r?.ok) {
          this.loadAll();
          window.location.reload();
        }
      },
      error: () => this.setupRunning.set(false),
      complete: () => this.setupRunning.set(false),
    });
  }

  private updateKPIs(): void {
    const s = this.status();
    const m = this.metrics();
    this.kpis.set([
      { icon: 'pi-sync', value: s?.cyclesLast24h || 0, labelKey: 'agrcOs.cyclesLast24h' },
      { icon: 'pi-clock', value: (s?.avgCycleMs || 0) + 'ms', labelKey: 'agrcOs.avgCycleMs' },
      { icon: 'pi-shield', value: s?.totalEnforcementActions || 0, labelKey: 'agrcOs.totalEnforcement' },
      { icon: 'pi-exclamation-triangle', value: m?.criticalEvents || 0, labelKey: 'agrcOs.criticalEvents' },
      { icon: 'pi-percentage', value: (m?.staleControlPct || 0) + '%', labelKey: 'agrcOs.staleControlPct' },
      { icon: 'pi-bolt', value: m?.eventCount || 0, labelKey: 'agrcOs.eventCount' },
    ]);
  }

  private subscribeToLiveUpdates(): void {
    try {
      this.ws.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((msg) => {
        if (msg?.type === 'agrc_event') {
          const eventType = String(msg.data?.eventType || '');

          // Orchestrator / cycle events → refresh status + metrics
          if (eventType.startsWith('cycle.') || eventType.startsWith('automation.')) {
            this.loadStatus();
            this.loadMetrics();
          }
          // Enforcement gates
          if (eventType.startsWith('gate.')) {
            this.loadGates();
          }
          // CCM engine
          if (eventType.startsWith('ccm.')) {
            this.loadCCM();
          }
          // Risk / control / policy / compliance / evidence / framework changes → KPIs + metrics
          if (eventType.startsWith('risk.') || eventType.startsWith('control.') ||
              eventType.startsWith('policy.') || eventType.startsWith('compliance.') ||
              eventType.startsWith('evidence.') || eventType.startsWith('framework.') ||
              eventType.startsWith('delta.')) {
            this.loadMetrics();
          }
          // Escalation / constitution changes → constitution tab
          if (eventType.startsWith('escalation.') || eventType.startsWith('constitution.') ||
              eventType.startsWith('admin.')) {
            this.loadConstitution();
          }
          // Incident / audit / vendor events → status + metrics
          if (eventType.startsWith('incident.') || eventType.startsWith('audit.') ||
              eventType.startsWith('vendor.') || eventType.startsWith('advanced.')) {
            this.loadStatus();
            this.loadMetrics();
          }
          // Lifecycle phase transitions → status
          if (eventType.startsWith('lifecycle.')) {
            this.loadStatus();
          }
          // Connector sync events → status + metrics
          if (eventType.startsWith('connector.')) {
            this.loadStatus();
            this.loadMetrics();
          }
          // Workflow / approval events
          if (eventType.startsWith('workflow.')) {
            this.loadStatus();
          }
          // Reporting events
          if (eventType.startsWith('ops.')) {
            this.loadReportingStatus();
          }
          // SOP completion events
          if (eventType.startsWith('sop.')) {
            this.loadSOPs();
          }
          // Regulatory delta events
          if (eventType.startsWith('delta.') || eventType.startsWith('regulatory.')) {
            this.loadRegulatoryDeltas();
          }
          // Qiyas↔GRC automation events
          if ((msg?.type as string) === 'agent_action_queued' || (msg?.type as string) === 'qiyas_score_computed' ||
              (msg?.data?.widget === 'qiyas_grc_automation')) {
            this.loadQiyasGrcAutomation();
          }
          // Reporting escalation events
          if (eventType.startsWith('report.')) {
            this.loadReportingStatus();
          }

          // Always refresh events tab when it's active
          if (this.activeTab() === 'events') {
            this.loadEvents();
          }
        }
      });
    } catch {
      // WebSocket not available — fall back to polling only
    }

    // Also react to any HTTP mutation anywhere in the app
    this.live.debounced(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAll());

    this.agUi.connect();
    this.agUi.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ev) => {
      this.agUiEvents.update(list => [ev, ...list].slice(0, 50));
      if (ev.type === 'complete') { this.loadStatus(); this.loadAgentStatus(); }
    });
  }

  // ── Autonomous Engine ─────────────────────────────────────────────────
  loadAutonomous(): void {
    this.svc.getAutonomousStatus().subscribe({ next: s => this.autonomousStatus.set(s), error: (e) => devError("[API]", e) });
    this.svc.getAutonomousHistory(20).subscribe({ next: h => this.autonomousHistory.set(h), error: (e) => devError("[API]", e) });
  }

  runAutonomous(): void {
    this.autonomousRunning.set(true);
    this.svc.runAutonomousEngine().subscribe({
      next: (r) => { this.autonomousRunning.set(false); this.autonomousStatus.set(r); this.loadAutonomous(); },
      error: () => this.autonomousRunning.set(false),
    });
  }

  // ── Agent Status (Unified Squad) ────────────────────────────────────
  loadAgentStatus(): void {
    this.svc.getAgentStatus().subscribe({ next: s => this.agentStatus.set(s), error: (e) => devError("[API]", e) });
  }

  // ── Constitution Validation ─────────────────────────────────────────
  validateConstitutionAction(): void {
    this.validatingConstitution.set(true);
    this.svc.validateConstitution().subscribe({
      next: r => { this.constitutionValidation.set(r); this.validatingConstitution.set(false); },
      error: () => this.validatingConstitution.set(false),
    });
  }

  loadEscalationThresholds(): void {
    this.svc.getEscalationThresholds().subscribe({ next: t => this.escalationThresholds.set(t), error: (e) => devError("[API]", e) });
  }

  // ── Guided Experience ───────────────────────────────────────────────
  loadGuidedExperience(): void {
    this.svc.getSetupProgress().subscribe({ next: p => this.setupProgress.set(p), error: (e) => devError("[API]", e) });
    this.svc.getNextActions().subscribe({
      next: (r: any) => this.nextActions.set(r?.actions || []),
      error: (e) => devError("[API]", e),
    });
  }

  // ── Misalignment Detection ──────────────────────────────────────────
  loadMisalignments(): void {
    this.svc.getMisalignments().subscribe({
      next: (r: any) => this.misalignments.set(r?.misalignments || []),
      error: (e) => devError("[API]", e),
    });
  }

  detectMisalignmentAction(): void {
    this.detectingMisalignment.set(true);
    this.svc.detectMisalignment().subscribe({
      next: () => { this.detectingMisalignment.set(false); this.loadMisalignments(); },
      error: () => this.detectingMisalignment.set(false),
    });
  }

  resolveMisalignmentAction(id: string, action: 'resolved' | 'dismissed'): void {
    this.svc.resolveMisalignment(id, action).subscribe({
      next: () => this.loadMisalignments(),
      error: (e) => devError("[API]", e),
    });
  }

  // ── Regulatory Delta ────────────────────────────────────────────────
  loadRegulatoryDeltas(): void {
    this.svc.getRegulatoryDelta(undefined, 50).subscribe({
      next: d => this.regulatoryDeltas.set(d),
      error: (e) => devError("[API]", e),
    });
  }

  scanRegulatoryDelta(): void {
    this.deltaScanning.set(true);
    this.svc.scanRegulatoryDelta().subscribe({
      next: () => { this.deltaScanning.set(false); this.loadRegulatoryDeltas(); },
      error: () => this.deltaScanning.set(false),
    });
  }

  loadQiyasGrcAutomation(): void {
    this.qiyasGrcLoading.set(true);
    this.apiclientSvc.get('/qiyas/grc-triggers?limit=20').subscribe({
      next: (r) => {
        this.qiyasGrcTriggers.set(r.triggers || r || []);
        this.qiyasGrcLoading.set(false);
      },
      error: () => { this.qiyasGrcTriggers.set([]); this.qiyasGrcLoading.set(false); },
    });
    this.apiclientSvc.get('/qiyas/auto-tasks?limit=20').subscribe({
      next: (r) => this.qiyasAutoTasks.set(r.tasks || r || []),
      error: () => this.qiyasAutoTasks.set([]),
    });
    this.apiclientSvc.get('/qiyas/maturity-sync?limit=10').subscribe({
      next: (r) => this.maturitySyncs.set(r.syncs || r || []),
      error: () => this.maturitySyncs.set([]),
    });
  }

  retryLoad(): void {
    this.loadError.set(null);
    this.loadCorrelationId.set(null);
    this.loadAll();
  }

}
