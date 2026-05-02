import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GovernanceApiService } from '@app/api';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleKickstartService } from '@app/modules';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { HealthStripComponent } from '@app/shared/components/status-indicators/health-strip.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { GrcRecord } from '@app/core/models/shared.types';
import { KpiCardVM, HealthAlertVM, ActivityRowVM, ModuleTabVM } from '@app/shared/models/module-overview.vm';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

import { GovernanceKpiStripComponent } from '../../components/governance-kpi-strip.component';
import { GovernanceFrameworkGridComponent, PolicyRow, ActionRow } from '../../components/governance-framework-grid.component';
import { GovernanceActivityFeedComponent } from '../../components/governance-activity-feed.component';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-overview',
    imports: [
        CommonModule, PageHeaderComponent, KpiCardGridComponent, HealthStripComponent,
        EmptyStateComponent, ModuleTabsBarComponent, SkeletonModule, ToastModule,
        GovernanceKpiStripComponent, GovernanceFrameworkGridComponent, GovernanceActivityFeedComponent,
        ModuleOverviewKitComponent,
    ],
    providers: [MessageService],
    template: `
    <div class="gov-ov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Governance Overview"
        titleAr="\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u062D\u0648\u0643\u0645\u0629"
        subtitleEn="Policies, actions, exceptions and committee health at a glance"
        subtitleAr="\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0648\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A \u0648\u0635\u062D\u0629 \u0627\u0644\u0644\u062C\u0627\u0646 \u0641\u064A \u0644\u0645\u062D\u0629"
        icon="building-2"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Overview')]"
        [actions]="headerActions()"
        [isAr]="i18n.currentLang() === 'ar'"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />

      <div class="gov-ov-body">
        <!-- Loading skeleton -->
        @if (loading()) {
          <div class="skeleton-kpi">
            @for (i of [1,2,3,4,5,6,7]; track i) { <p-skeleton height="76px" borderRadius="10px" /> }
          </div>
          <p-skeleton height="110px" borderRadius="10px" styleClass="mb-3" />
          <div class="skeleton-two-col">
            <p-skeleton height="260px" borderRadius="10px" />
            <p-skeleton height="260px" borderRadius="10px" />
          </div>
        }

        <!-- Error state -->
        @if (!loading() && error()) {
          <app-empty-state variant="error" [title]="i18n.translate('Failed to load data')" [description]="i18n.translate('Check your connection and try again')" [actionLabel]="i18n.translate('Retry')" [dir]="dir()" (action)="load()" />
        }

        <!-- Loaded content -->
        @if (!loading() && !error()) {
          <app-kpi-card-grid [cards]="kpis()" [isAr]="i18n.currentLang() === 'ar'" (cardClick)="onKpiClick($event)" />
          <app-health-strip [alerts]="healthAlerts()" [isAr]="i18n.currentLang() === 'ar'" (alertClick)="onAlertClick($event)" />

          <app-governance-kpi-strip
            [lifecycleStates]="lifecycleStates()"
            [readinessScore]="readinessScore()"
            (pillClick)="navigate('/governance/policies', {status: $event})" />

          <app-governance-framework-grid
            [recentPolicies]="recentPolicies()"
            [recentActions]="recentActions()"
            [upcomingEvents]="upcomingEvents()"
            [boardAttentionItems]="boardAttentionItems()"
            [ownershipGaps]="ownershipGaps()"
            [leadershipData]="leadershipData()"
            [dir]="dir()"
            (navigate)="navigate($event)" />

          <app-governance-activity-feed [rows]="activityRows()" />

          <app-module-overview-kit [config]="moduleKitConfig()" />
        }
      </div>
    </div>
  `,
    styles: [`
    .gov-ov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ice, var(--surface-ice)); }
    .gov-ov-body { flex: 1; padding: 20px 28px; display: flex; flex-direction: column; gap: 16px; }
    .skeleton-kpi { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
    .skeleton-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 1024px) { .skeleton-two-col { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .gov-ov-body { padding: 16px; gap: 12px; } }
  `]
})
export class GovernanceOverviewComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
    private governanceSvc = inject(GrcGovernanceService);
  readonly i18n = inject(I18nService);
  private govApi = inject(GovernanceApiService);
  private router = inject(Router);
  private kickstartSvc = inject(ModuleKickstartService);

  loading = signal(true);
  error = signal(false);
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  private policies$ = signal<GrcRecord[]>([]);
  private actions$ = signal<GrcRecord[]>([]);
  private exceptions$ = signal<GrcRecord[]>([]);
  private committees$ = signal<GrcRecord[]>([]);
  private decisions$ = signal<GrcRecord[]>([]);
  private healthScore$ = signal<number>(0);
  private activity$ = signal<GrcRecord[]>([]);
  readonly leadershipData = signal<GrcRecord | null>(null);
  private boardAttention$ = signal<GrcRecord[]>([]);
  private fireStatus = signal<string>('pending');

  readonly lifecycleStates = computed(() => {
    const p = this.policies$();
    return {
      draft: p.filter(x => x.status === 'draft').length,
      review: p.filter(x => x.status === 'review' || x.status === 'in_review').length,
      approved: p.filter(x => x.status === 'approved' || x.status === 'published').length,
      retired: p.filter(x => x.status === 'retired' || x.status === 'archived').length,
    };
  });

  readonly readinessScore = computed(() => {
    const p = this.policies$();
    if (!p.length) return 0;
    const withOwner = p.filter(x => x.owner || x.owner_id).length;
    const withReview = p.filter(x => x.next_review_date).length;
    const approved = p.filter(x => x.status === 'approved' || x.status === 'published').length;
    return Math.min(Math.round(((withOwner + withReview + approved) / (p.length * 3)) * 100), 100);
  });

  readonly tabs: ModuleTabVM[] = [
    { id: 'overview', labelEn: 'Overview', labelAr: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629', route: '/governance/overview', icon: 'home' },
    { id: 'policies', labelEn: 'Policies', labelAr: '\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A', route: '/governance/policies', icon: 'file' },
    { id: 'procedures', labelEn: 'Procedures & Standards', labelAr: '\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0645\u0639\u0627\u064A\u064A\u0631', route: '/governance/procedures', icon: 'list' },
    { id: 'committees', labelEn: 'Committees', labelAr: '\u0627\u0644\u0644\u062C\u0627\u0646', route: '/governance/committees', icon: 'users' },
    { id: 'decisions', labelEn: 'Decisions', labelAr: '\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A', route: '/governance/decisions', icon: 'check-square' },
    { id: 'actions', labelEn: 'Actions', labelAr: '\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A', route: '/governance/actions', icon: 'bolt' },
    { id: 'exceptions', labelEn: 'Exceptions', labelAr: '\u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A', route: '/governance/exceptions', icon: 'shield' },
    { id: 'calendar', labelEn: 'Calendar', labelAr: '\u0627\u0644\u062A\u0642\u0648\u064A\u0645', route: '/governance/calendar', icon: 'calendar' },
  ];

  boardAttentionItems = computed(() => this.boardAttention$().slice(0, 5));

  ownershipGaps = computed(() => {
    const policies = this.policies$();
    const actions = this.actions$();
    const gaps: GrcRecord[] = [];
    const noOwnerPolicies = policies.filter(p => !p.owner && !p.owner_id && p.status !== 'draft').length;
    if (noOwnerPolicies > 0) gaps.push({ id: 'pol-owner', descEn: 'Policies without owner', descAr: '\u0633\u064A\u0627\u0633\u0627\u062A \u0628\u062F\u0648\u0646 \u0645\u0627\u0644\u0643', count: noOwnerPolicies, route: '/governance/policies' });
    const noOwnerActions = actions.filter((a) => !a.assigned_to && a.status !== 'completed').length;
    if (noOwnerActions > 0) gaps.push({ id: 'act-owner', descEn: 'Actions without assignee', descAr: '\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0628\u062F\u0648\u0646 \u0645\u0633\u0624\u0648\u0644', count: noOwnerActions, route: '/governance/actions' });
    const noChairCommittees = this.committees$().filter((c) => !c.chair && !c.chair_id).length;
    if (noChairCommittees > 0) gaps.push({ id: 'com-chair', descEn: 'Committees without chair', descAr: '\u0644\u062C\u0627\u0646 \u0628\u062F\u0648\u0646 \u0631\u0626\u064A\u0633', count: noChairCommittees, route: '/governance/committees' });
    return gaps;
  });

  private _baseActions: PageHeaderAction[] = [
    { id: 'new-policy', labelEn: 'New Policy', labelAr: '\u0633\u064A\u0627\u0633\u0629 \u062C\u062F\u064A\u062F\u0629', icon: 'plus', primary: true },
    { id: 'new-action', labelEn: 'New Action', labelAr: '\u0645\u0647\u0645\u0629 \u062C\u062F\u064A\u062F\u0629', icon: 'bolt' },
    { id: 'new-decision', labelEn: 'New Decision', labelAr: '\u0642\u0631\u0627\u0631 \u062C\u062F\u064A\u062F', icon: 'check-square' },
    { id: 'new-exception', labelEn: 'New Exception', labelAr: '\u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u062C\u062F\u064A\u062F', icon: 'shield' },
  ];

  headerActions = computed<PageHeaderAction[]>(() => {
    const s = this.fireStatus();
    if (s === 'completed') return [...this._baseActions, { id: 'kickstart-info', labelEn: 'Module Active', labelAr: '\u0627\u0644\u0648\u062D\u062F\u0629 \u0646\u0634\u0637\u0629', icon: 'check-circle', chip: true }];
    const label = s === 'in_progress' ? 'Kickstarting...' : s === 'failed' ? 'Retry Kickstart' : 'Kickstart Governance';
    const labelAr = s === 'in_progress' ? '\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u0634\u063A\u064A\u0644...' : s === 'failed' ? '\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644' : '\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062D\u0648\u0643\u0645\u0629';
    return [...this._baseActions, { id: 'kickstart', labelEn: label, labelAr, icon: 'bolt', primary: s === 'pending' }];
  });

  kpis = computed<KpiCardVM[]>(() => {
    const policies = this.policies$();
    const actions = this.actions$();
    const exceptions = this.exceptions$();
    const committees = this.committees$();
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const in14 = new Date(now.getTime() + 14 * 86400000);
    const dueReview = policies.filter(p => p.next_review_date && new Date(p.next_review_date) <= in30).length;
    const openActions = actions.filter((a) => a.status !== 'completed' && a.status !== 'deleted').length;
    const overdueActions = actions.filter((a) => a.status !== 'completed' && a.deadline && new Date(a.deadline) < now).length;
    const activeExceptions = exceptions.filter((e) => e.status === 'approved' || e.status === 'active').length;
    const expiringExceptions = exceptions.filter((e) => e.expiry_date && new Date(e.expiry_date) <= in14 && e.status !== 'expired').length;
    const decisions = this.decisions$();
    const openDecisions = decisions.filter((d) => d.status !== 'closed' && d.status !== 'implemented').length;
    const healthVal = this.healthScore$();
    return [
      { id: 'health-score', labelEn: 'Health Score', labelAr: '\u0645\u0624\u0634\u0631 \u0627\u0644\u0635\u062D\u0629', value: healthVal, unit: '%', icon: 'heart', color: healthVal >= 75 ? '#059669' : healthVal >= 50 ? 'var(--warning)' : 'var(--error)', bg: healthVal >= 75 ? '#d1fae5' : healthVal >= 50 ? 'var(--status-warning-bg, #fcf4d6)' : '#fee2e2', route: '/governance/health', severity: healthVal < 50 ? 'danger' : healthVal < 75 ? 'warning' : 'default' },
      { id: 'total-policies', labelEn: 'Total Policies', labelAr: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A', value: policies.length, icon: 'file', color: '#1d4ed8', bg: '#dbeafe', route: '/governance/policies' },
      { id: 'due-review', labelEn: 'Due for Review', labelAr: '\u0645\u0633\u062A\u062D\u0642\u0629 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629', value: dueReview, icon: 'clock', color: 'var(--warning)', bg: 'var(--status-warning-bg, #fcf4d6)', route: '/governance/policies', queryParams: { dueReview: '1' }, severity: dueReview > 0 ? 'warning' : 'default' },
      { id: 'open-actions', labelEn: 'Open Actions', labelAr: '\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629', value: openActions, icon: 'bolt', color: '#7c3aed', bg: '#ede9fe', route: '/governance/actions' },
      { id: 'overdue-actions', labelEn: 'Overdue Actions', labelAr: '\u0645\u0647\u0627\u0645 \u0645\u062A\u0623\u062E\u0631\u0629', value: overdueActions, icon: 'exclamation-circle', color: 'var(--error)', bg: '#fee2e2', route: '/governance/actions', queryParams: { overdue: '1' }, severity: overdueActions > 0 ? 'danger' : 'default' },
      { id: 'open-decisions', labelEn: 'Open Decisions', labelAr: '\u0642\u0631\u0627\u0631\u0627\u062A \u0645\u0641\u062A\u0648\u062D\u0629', value: openDecisions, icon: 'check-square', color: '#4f46e5', bg: '#e0e7ff', route: '/governance/decisions' },
      { id: 'active-exceptions', labelEn: 'Active Exceptions', labelAr: '\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A \u0646\u0634\u0637\u0629', value: activeExceptions, icon: 'shield', color: '#059669', bg: '#d1fae5', route: '/governance/exceptions' },
      { id: 'expiring-soon', labelEn: 'Expiring Soon', labelAr: '\u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B', value: expiringExceptions, icon: 'exclamation-triangle', color: '#ea580c', bg: '#ffedd5', route: '/governance/exceptions', queryParams: { expiringSoon: '1' }, severity: expiringExceptions > 0 ? 'warning' : 'default' },
      { id: 'committees', labelEn: 'Committees', labelAr: '\u0627\u0644\u0644\u062C\u0627\u0646', value: committees.length, icon: 'users', color: '#0891b2', bg: '#cffafe', route: '/governance/committees' },
      { id: 'readiness', labelEn: 'Policy Readiness', labelAr: '\u062C\u0627\u0647\u0632\u064A\u0629 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A', value: this.readinessScore(), unit: '%', icon: 'chart-bar', color: '#6d28d9', bg: '#ede9fe', route: '/governance/policies', severity: this.readinessScore() < 50 ? 'warning' : 'default' },
    ];
  });

  healthAlerts = computed<HealthAlertVM[]>(() =>
    this.kpis().filter(k => k.severity === 'danger' || k.severity === 'warning').filter(k => (k.value as number) > 0).map(k => ({
      id: k.id, labelEn: k.labelEn, labelAr: k.labelAr, count: k.value as number, icon: k.icon, color: k.color, severity: k.severity as 'danger' | 'warning', route: k.route, queryParams: k.queryParams,
    }))
  );

  recentPolicies = computed<PolicyRow[]>(() =>
    this.policies$().slice(0, 5).map(p => ({ title: p.title || p.name || '\u2014', status: p.status || 'draft', version: p.version || 1, next_review_date: p.next_review_date }))
  );

  recentActions = computed<ActionRow[]>(() =>
    this.actions$().filter((a) => a.status !== 'completed' && a.status !== 'deleted').slice(0, 5).map(a => ({ title: a.title || a.name || '\u2014', status: a.status, deadline: a.deadline || a.due_date }))
  );

  upcomingEvents = computed<GrcRecord[]>(() => {
    const now = new Date();
    const events: GrcRecord[] = [];
    this.policies$().forEach(p => {
      if (p.next_review_date) {
        const d = new Date(p.next_review_date);
        const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 30) events.push({ id: `rev-${p.policy_id}`, type: 'review', titleEn: `Policy Review: ${p.title}`, titleAr: `\u0645\u0631\u0627\u062C\u0639\u0629: ${p.title}`, date: d, daysLeft, route: '/governance/policies' });
      }
    });
    this.exceptions$().forEach(e => {
      if (e.expiry_date) {
        const d = new Date(e.expiry_date);
        const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 14) events.push({ id: `exp-${e.exception_id}`, type: 'expiry', titleEn: `Exception Expiry: ${e.title || e.description || ''}`, titleAr: `\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0633\u062A\u062B\u0646\u0627\u0621: ${e.title || ''}`, date: d, daysLeft, route: '/governance/exceptions' });
      }
    });
    return events.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  });

  activityRows = computed<ActivityRowVM[]>(() =>
    (this.activity$() || []).slice(0, 8).map((r) => ({
      id: r.id || r.audit_id || String(Math.random()),
      timestamp: r.timestamp || r.created_at || r.occurred_at || new Date().toISOString(),
      actorLabel: r.actor_email || r.user_id || r.performed_by || '\u2014',
      action: r.action || r.event_type || '\u2014',
      entityType: r.entity_type || r.resource_type || '\u2014',
      entityLabel: r.entity_name || r.resource_id,
    }))
  );

  ngOnInit(): void {
    this.load();
    this.kickstartSvc.loadStatus().subscribe(s => { this.fireStatus.set(s['governance']?.status ?? 'pending'); });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      policies: this.governanceSvc.getGovernancePolicies().pipe(catchError(() => of([]))),
      actions: this.operationsSvc.getActionItems().pipe(catchError(() => of([]))),
      exceptions: this.apiclientSvc.get('/exceptions').pipe(catchError(() => of([]))),
      committees: this.governanceSvc.getCommittees().pipe(catchError(() => of([]))),
      decisions: this.apiclientSvc.get('/governance/decisions').pipe(catchError(() => of([]))),
      health: this.apiclientSvc.get('/governance/health').pipe(catchError(() => of({ overall_score: 0 }))),
      activity: this.operationsSvc.getActivityFeed('governance').pipe(catchError(() => of([]))),
      boardAttention: this.apiclientSvc.get('/governance/hooks/board-attention').pipe(catchError(() => of({ governance_actions: [] }))),
    }).subscribe({
      next: (res) => {
        const r = res as any;
        this.policies$.set(r.policies?.policies || r.policies || []);
        this.actions$.set(Array.isArray(r.actions) ? r.actions : r.actions?.items || r.actions?.data || []);
        const exc = r.exceptions; this.exceptions$.set(Array.isArray(exc) ? exc : (exc?.data?.exceptions ?? exc?.exceptions ?? (Array.isArray(exc?.data) ? exc.data : [])));
        this.committees$.set(r.committees?.committees || r.committees || []);
        const dec = r.decisions; this.decisions$.set(Array.isArray(dec) ? dec : dec?.decisions || dec?.data || []);
        this.healthScore$.set(r.health?.overall_score || 0);
        this.activity$.set(Array.isArray(r.activity) ? r.activity : r.activity?.items || r.activity?.events || []);
        const ba = res.boardAttention; this.boardAttention$.set(ba?.governance_actions || []);
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
    this.govApi.getLeadershipSummary().pipe(catchError(() => of(null))).subscribe(res => { if (res) this.leadershipData.set(res); });
  }

  onKpiClick(card: KpiCardVM): void { this.router.navigate([card.route], { queryParams: card.queryParams }); }
  onAlertClick(alert: HealthAlertVM): void { this.router.navigate([alert.route], { queryParams: alert.queryParams }); }

  onHeaderAction(id: string): void {
    if (id === 'kickstart') {
      const s = this.fireStatus();
      if (s === 'in_progress' || s === 'completed') return;
      this.fireStatus.set('in_progress');
      this.kickstartSvc.kickstart('governance').subscribe({ next: (r) => { this.fireStatus.set(r.status); this.load(); }, error: () => this.fireStatus.set('failed') });
      return;
    }
    const destinations: Record<string, { route: string; queryParams?: Record<string, string> }> = {
      'new-policy': { route: '/governance/policies', queryParams: { openCreate: '1' } },
      'new-action': { route: '/governance/actions', queryParams: { openCreate: '1' } },
      'new-decision': { route: '/governance/decisions', queryParams: { openCreate: '1' } },
      'new-exception': { route: '/governance/exceptions', queryParams: { openCreate: '1' } },
    };
    const dest = destinations[id];
    if (dest) this.router.navigate([dest.route], { queryParams: dest.queryParams });
  }

  navigate(path: string, queryParams?: Record<string, string>): void { this.router.navigate([path], { queryParams }); }

  readonly govAgents: AgentInfo[] = [
    { id: 'A05', name: 'Policy Reviewer', nameAr: 'مراجع السياسات', icon: 'pi-file', color: '#8b5cf6', domain: 'Governance', domainAr: 'الحوكمة', autonomyLevel: 'hybrid', status: 'active' },
  ];

  readonly govTransitions = [
    { from: 'draft', to: 'active', requiresApproval: true },
    { from: 'active', to: 'review_due' },
    { from: 'review_due', to: 'active' },
    { from: 'active', to: 'expired' },
    { from: 'expired', to: 'draft' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'governance',
    tier: 'full',
    automationLevel: 'manual',
    slaHours: 720,
    transitions: this.govTransitions,
    currentStatus: 'active',
    agents: this.govAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));
}
