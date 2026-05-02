import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { RiskFoundationLookupService } from '../services/risk-foundation-lookup.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { RISK_PRIMARY_TABS, RISK_TABS } from '@app/features/risk/risk.constants';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { RiskRegisterItemDto, RiskDetailDto } from './risk-workspace/risk-workspace.models';
import {
  PeerReviewDto,
  RiskPeerReviewVM,
  FoundationUserRecord,
  FoundationTeamRecord,
  ApiDataEnvelope,
  AuditFindingsApiResponse,
  AuditFindingRecord,
  StatusHistoryApiRecord,
} from '../services/risk-api.types';
import { devError } from '../../../core/utils/dev-logger';

/* ── Child components ── */
import { RiskRegisterHealthStripComponent } from '../components/risk-register-health-strip.component';
import { RiskRegisterTableComponent, RiskTableAction } from '../components/risk-register-table.component';
import { RiskRegisterDetailDrawerComponent, DrawerOwnerProfile, DrawerStatusHistoryEntry } from '../components/risk-register-detail-drawer.component';
import { GrcRecord } from '@app/core/models/shared.types';

// ── Risk Status Lifecycle ────────────────────────────────────────────────────
const RISK_TRANSITIONS: Record<string, string[]> = {
  identified: ['assessed', 'accepted', 'closed'],
  assessed: ['mitigated', 'accepted', 'transferred', 'closed'],
  mitigated: ['monitored', 'closed'],
  monitored: ['mitigated', 'closed'],
  accepted: ['identified', 'closed'],
  transferred: ['monitored', 'closed'],
  closed: [],
};

/** localStorage key for persisted visible columns */
const LS_VISIBLE_COLS_KEY = 'agrc_risk_register_visible_columns';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-register-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, ModuleTabsBarComponent, InputTextModule, InputTextarea, ButtonModule, DropdownModule, SliderModule,
    DialogModule, ToastModule, ConfirmDialogModule,
    /* Child components */
    RiskRegisterHealthStripComponent,
    RiskRegisterTableComponent,
    RiskRegisterDetailDrawerComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <app-page-shell
      icon="list"
      [title]="L().register"
      [subtitle]="L().registerSubtitle"
      [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().register]"
      [loading]="loading">

      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />

      <p-toast />
      <p-confirmDialog />

      <!-- ── Cross-module filter banner ── -->
      <div class="cross-filter-banner" *ngIf="activeQueryParamFilter()">
        <i class="pi pi-filter"></i>
        <span>{{ activeQueryParamFilter() }}</span>
        <button class="banner-clear-btn" (click)="clearQueryParamFilter()">
          <i class="pi pi-times"></i> {{ L().clearFilter }}
        </button>
      </div>

      <!-- ── KPI Health Strip (child) ── -->
      <app-risk-register-health-strip
        *ngIf="!loading"
        [total]="healthTotal()"
        [critical]="healthCritical()"
        [high]="healthHigh()"
        [overdueTreatments]="healthOverdueTreatments()"
        [noOwner]="healthNoOwner()"
        [labels]="{ totalRisks: L().totalRisks, criticalLabel: L().criticalLabel, highLabel: L().highLabel, overdueTreat: L().overdueTreat, noOwner: L().noOwner }"
        (healthFilter)="applyHealthFilter($event)"
        (clearFilters)="clearFilters()" />

      <!-- ── Table + toolbar + bulk (child) ── -->
      <app-risk-register-table
        [risks]="register()"
        [statusFilterValue]="statusFilter"
        [categoryFilterValue]="categoryFilter"
        [searchTermValue]="searchTerm"
        [statusFilterOptions]="statusFilterOptions"
        [categoryFilterOptions]="categoryFilterOptions()"
        [riskStatusOptions]="riskStatusOptions"
        [columnOptions]="columnOptionsLocalized()"
        [visibleColumnValues]="visibleColumnValues"
        [visibleColCount]="visibleColCount()"
        [selectedIds]="selectedRisks()"
        [selectAllChecked]="selectAllChecked"
        [labels]="L()"
        (create)="openCreateDialog()"
        (rowAction)="onTableAction($event)"
        (statusFilterChange)="statusFilter = $event; loadRegister()"
        (categoryFilterChange)="categoryFilter = $event; loadRegister()"
        (searchChange)="searchTerm = $event; loadRegister()"
        (columnsChanged)="onColumnsChange($event)"
        (toggleSelectAll)="onToggleSelectAll($event)"
        (toggleRiskSelection)="toggleRiskSelection($event)"
        (applyBulk)="applyBulkUpdate($event)"
        (bulkExport)="exportSelectedRisks()"
        (clearSelection)="clearSelection()" />

      <!-- ── Create / Edit dialog (kept in parent - tightly coupled to form state) ── -->
      <p-dialog [header]="editMode ? L().editRisk : L().createRisk" [(visible)]="dialogVisible" [modal]="true" [focusTrap]="true" [style]="{width:'600px'}">
        <div class="dialog-form">
          <div class="field"><label for="risk-title">{{ L().title }}</label><input id="risk-title" pInputText [(ngModel)]="form.title" class="w-full" /></div>
          <div class="field"><label for="risk-desc">{{ L().description }}</label><textarea id="risk-desc" pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>{{ L().category }}</label><p-dropdown [(ngModel)]="form.category" [options]="riskCategoryOptions()" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" /></div>
            <div class="field"><label>{{ L().owner }}</label>
              <p-dropdown [options]="foundationUsers()" optionLabel="fullName" optionValue="userId"
                          [(ngModel)]="form.owner" [placeholder]="isAr() ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u0624\u0648\u0644' : 'Select Owner'" [filter]="true" filterBy="fullName,email"
                          [showClear]="true" styleClass="w-full" appendTo="body">
                <ng-template let-user pTemplate="item">
                  <div>
                    <span>{{ user.fullName }}</span>
                    <small class="text-muted" style="margin-inline-start:8px">{{ user.departmentName || '' }}</small>
                  </div>
                </ng-template>
              </p-dropdown>
            </div>
          </div>
          <div class="field"><label>{{ isAr() ? '\u0627\u0644\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0633\u0624\u0648\u0644' : 'Responsible Team' }}</label>
            <p-dropdown [options]="foundationTeams()" optionLabel="name" optionValue="teamId"
                        [(ngModel)]="form.ownerTeamId" [placeholder]="isAr() ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0631\u064a\u0642' : 'Select Team'" [filter]="true" [showClear]="true"
                        styleClass="w-full" appendTo="body">
            </p-dropdown>
          </div>
          <div class="field-row">
            <div class="field"><label>{{ L().likelihood }}: {{ form.likelihood }}</label><p-slider [(ngModel)]="form.likelihood" [min]="1" [max]="5" [step]="1" /></div>
            <div class="field"><label>{{ L().impact }}: {{ form.impact }}</label><p-slider [(ngModel)]="form.impact" [min]="1" [max]="5" [step]="1" /></div>
          </div>
          <div class="field"><label>{{ L().status }}</label>
            <p-dropdown [(ngModel)]="form.status"
                        [options]="editMode && validTransitions().length > 0 ? lifecycleStatusOptions() : riskStatusOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body"
                        [disabled]="editMode && validTransitions().length === 0 && !!editingRiskId" />
          </div>
          <div class="field-row">
            <div class="field"><label>{{ L().controlEff }} (0\u2013100%)</label><input pInputText type="number" [(ngModel)]="form.controlEffectiveness" class="w-full" min="0" max="100" /></div>
            <div class="field"><label>{{ L().nextReviewDate }}</label><input pInputText type="date" [(ngModel)]="form.nextReviewDate" class="w-full" /></div>
          </div>
          <div class="field"><label>{{ L().businessImpact }}</label><input pInputText [(ngModel)]="form.businessImpact" class="w-full" /></div>
          <div class="field"><label>{{ L().threatContext }}</label><input pInputText [(ngModel)]="form.threatContext" class="w-full" /></div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="L().cancel" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="dialogVisible=false" />
          <p-button [label]="L().save" icon="pi pi-check" (onClick)="saveRisk()" [disabled]="!form.title.trim()" />
        </ng-template>
      </p-dialog>

      <!-- ── Detail drawer (child) ── -->
      <app-risk-register-detail-drawer
        [risk]="drawerRisk"
        [visible]="drawerVisible"
        [isAr]="isAr()"
        [userOptions]="drawerUserOptions()"
        [teamOptions]="drawerTeamOptions()"
        [availableTransitions]="drawerAvailableTransitions()"
        [selectedOwnerId]="drawerSelectedOwnerId"
        [selectedTeamId]="drawerSelectedTeamId"
        [ownerProfile]="drawerOwnerProfile()"
        [statusTimeline]="drawerStatusTimeline()"
        [peerReviews]="drawerPeerReviews()"
        [auditFindings]="drawerAuditFindings()"
        [labels]="L()"
        (visibleChange)="drawerVisible = $event"
        (ownerChange)="onDrawerOwnerChange($event)"
        (teamChange)="onDrawerTeamChange($event)"
        (statusTransition)="onDrawerStatusTransition($event)"
        (linkControl)="doLinkControl($event)"
        (linkEvidence)="doLinkEvidence($event)"
        (navigate)="navigateTo($event.path, $event.entityId)"
        (navigateToAuditFinding)="navigateToAuditFinding($event)"
        (viewAuditLog)="navigateToAudit($event)"
        (finalizePeerReview)="finalizePeerReview($event)" />
    </app-page-shell>
  `,
  styles: [`
    .w-full { width: 100%; }
    .text-muted { color: var(--text-muted); }
    .dialog-form { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
    .field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md, 12px); }

    /* ── Cross-module filter banner ── */
    .cross-filter-banner {
      display: flex; align-items: center; gap: 10px; padding: 10px 16px; margin-bottom: 12px;
      background: var(--surface-100, #f3f4f6); border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--text);
    }
    .cross-filter-banner i { color: var(--primary); }
    .banner-clear-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: var(--font-size-sm);
      display: inline-flex; align-items: center; gap: 4px; margin-inline-start: auto;
    }
    .banner-clear-btn:hover { color: var(--primary); }
  `]
})
export class RiskRegisterPageComponent implements OnInit {
  private api = inject(RiskApiService);
  private http = inject(HttpClient);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public i18n = inject(I18nService);
  private fds = inject(RiskFoundationLookupService);

  loading = false;
  allRisks = signal<RiskRegisterItemDto[]>([]);
  register = signal<RiskRegisterItemDto[]>([]);
  searchTerm = '';
  statusFilter = '';
  categoryFilter = '';
  /** Guard to prevent re-entrant query param subscription when we sync filters to URL */
  private syncingUrl = false;

  dialogVisible = false;
  editMode = false;
  editingRiskId = '';
  form: { title: string; description: string; category: string; likelihood: number; impact: number; owner: string; ownerTeamId: string; status: string; controlEffectiveness: number; nextReviewDate: string; threatContext: string; businessImpact: string } = { title: '', description: '', category: 'operational', likelihood: 3, impact: 3, owner: '', ownerTeamId: '', status: 'identified', controlEffectiveness: 50, nextReviewDate: '', threatContext: '', businessImpact: '' };

  /* ── Foundation lookups ── */
  foundationUsers = signal<FoundationUserRecord[]>([]);
  foundationTeams = signal<FoundationTeamRecord[]>([]);

  /* ── Status lifecycle ── */
  validTransitions = signal<Array<{ toStatus: string; description?: string }>>([]);
  currentRiskStatus = '';

  /* ── Drawer enrichment signals ── */
  drawerUserOptions = signal<{ label: string; value: string; email?: string; department?: string }[]>([]);
  drawerTeamOptions = signal<{ label: string; value: string }[]>([]);
  drawerOwnerProfile = signal<DrawerOwnerProfile | null>(null);
  drawerStatusTimeline = signal<DrawerStatusHistoryEntry[]>([]);
  drawerAvailableTransitions = signal<{ label: string; value: string }[]>([]);
  drawerSelectedOwnerId: string | null = null;
  drawerSelectedTeamId: string | null = null;

  /* ── Bulk operations ── */
  selectedRisks = signal<string[]>([]);
  selectAllChecked = false;

  /* ── Column toggle (with localStorage persistence) ── */
  private defaultVisibleCols = ['riskId', 'title', 'category', 'owner', 'status', 'inherentScore', 'residualScore', 'treatment', 'actions'];
  private allColumnDefs: { key: string; enLabel: string; arLabel: string }[] = [
    { key: 'riskId', enLabel: 'ID', arLabel: '\u0627\u0644\u0645\u0639\u0631\u0651\u0641' },
    { key: 'title', enLabel: 'Title', arLabel: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' },
    { key: 'category', enLabel: 'Category', arLabel: '\u0627\u0644\u0641\u0626\u0629' },
    { key: 'owner', enLabel: 'Owner', arLabel: '\u0627\u0644\u0645\u0633\u0624\u0648\u0644' },
    { key: 'status', enLabel: 'Status', arLabel: '\u0627\u0644\u062d\u0627\u0644\u0629' },
    { key: 'inherentScore', enLabel: 'Inherent', arLabel: '\u0627\u0644\u0643\u0627\u0645\u0646' },
    { key: 'residualScore', enLabel: 'Residual', arLabel: '\u0627\u0644\u0645\u062a\u0628\u0642\u064a' },
    { key: 'treatment', enLabel: 'Treatment', arLabel: '\u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629' },
    { key: 'actions', enLabel: 'Actions', arLabel: '\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a' },
    { key: 'createdAt', enLabel: 'Created At', arLabel: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621' },
    { key: 'controlEffectiveness', enLabel: 'Control Eff.', arLabel: '\u0641\u0639\u0627\u0644\u064a\u0629 \u0627\u0644\u0636\u0627\u0628\u0637' },
    { key: 'nextReviewDate', enLabel: 'Next Review', arLabel: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629' },
    { key: 'ownerTeamName', enLabel: 'Owner Team', arLabel: '\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0633\u0624\u0648\u0644' },
  ];

  columnOptionsLocalized = computed(() => {
    const ar = this.isAr();
    return this.allColumnDefs.map(c => ({ label: ar ? c.arLabel : c.enLabel, value: c.key }));
  });

  visibleColumnValues: string[] = this._loadColumnsFromStorage();
  visibleColumns = signal<Set<string>>(new Set(this.visibleColumnValues));
  visibleColCount = computed(() => this.visibleColumns().size);

  /* ── Query param cross-module filter state ── */
  private qpControlId = '';
  private qpEvidenceId = '';
  activeQueryParamFilter = signal<string>('');

  /* ── Peer review (drawer) ── */
  drawerPeerReviews = signal<RiskPeerReviewVM[]>([]);

  /* ── Audit findings (drawer) ── */
  drawerAuditFindings = signal<AuditFindingRecord[]>([]);

  drawerVisible = false;
  drawerRisk: RiskDetailDto | null = null;

  tabs = RISK_TABS;
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  L = computed(() => this.isAr() ? AR : EN);

  healthTotal = computed(() => this.allRisks().length);
  healthCritical = computed(() => this.allRisks().filter(r => r.inherentScore >= 20).length);
  healthHigh = computed(() => this.allRisks().filter(r => r.inherentScore >= 12 && r.inherentScore < 20).length);
  healthOverdueTreatments = computed(() => this.allRisks().filter(r => r.treatmentStatus === 'overdue').length);
  healthNoOwner = computed(() => this.allRisks().filter(r => !r.owner).length);

  riskCategoryOptions = computed(() => this.fds.riskCatOptions());
  get riskStatusOptions() {
    return [
      { label: this.i18n.translate('risk.identified'), value: 'identified' },
      { label: this.i18n.translate('risk.assessed'), value: 'assessed' },
      { label: this.i18n.translate('risk.underTreatment'), value: 'under_treatment' },
      { label: this.i18n.translate('risk.accepted'), value: 'accepted' },
      { label: this.i18n.translate('risk.monitored'), value: 'monitored' },
      { label: this.i18n.translate('risk.closed'), value: 'closed' },
      { label: this.i18n.translate('risk.escalated'), value: 'escalated' },
    ];
  }
  categoryFilterOptions = computed(() => [{ label: this.i18n.translate('risk.allCategories'), value: '' }, ...this.fds.riskCatOptions()]);
  get statusFilterOptions() { return [{ label: this.i18n.translate('risk.allStatuses'), value: '' }, ...this.riskStatusOptions]; }

  /** Status options derived from valid transitions (lifecycle-aware) */
  lifecycleStatusOptions = computed(() => {
    const transitions = this.validTransitions();
    const current = this.currentRiskStatus;
    const opts: { label: string; value: string }[] = [];
    if (current) {
      const currentLabel = this.riskStatusOptions.find(o => o.value === current)?.label || current;
      opts.push({ label: currentLabel, value: current });
    }
    for (const t of transitions) {
      if (t.toStatus !== current) {
        const existingLabel = this.riskStatusOptions.find(o => o.value === t.toStatus)?.label || t.toStatus;
        opts.push({ label: existingLabel + (t.description ? ` \u2014 ${t.description}` : ''), value: t.toStatus });
      }
    }
    return opts;
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.fds.load();
    this._loadFoundationData();
    this._subscribeQueryParams();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadRegister());
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadRegister(): void {
    this.loading = true;
    this.syncFiltersToUrl();
    const params: Record<string, string> = {};
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.categoryFilter) params['category'] = this.categoryFilter;
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.qpControlId) params['controlId'] = this.qpControlId;
    if (this.qpEvidenceId) params['evidenceId'] = this.qpEvidenceId;
    this.api.getRegister(params).subscribe({
      next: (d) => {
        const risks = d.risks || [];
        this.register.set(risks);
        if (!this.statusFilter && !this.categoryFilter && !this.searchTerm && !this.qpControlId && !this.qpEvidenceId) {
          this.allRisks.set(risks);
        }
        this.loading = false;
      },
      error: () => { this.loading = false; this.toast('error', this.i18n.translate('common.failedToLoadRiskRegister')); },
    });
    if (!this.statusFilter && !this.categoryFilter && !this.searchTerm && !this.qpControlId && !this.qpEvidenceId) return;
    this.api.getRegister({}).subscribe({ next: (d) => this.allRisks.set(d.risks || []), error: (e) => devError("[API]", e) });
  }

  // ── Health filter ──────────────────────────────────────────────────────────

  applyHealthFilter(level: string): void {
    this.statusFilter = '';
    this.categoryFilter = '';
    this.searchTerm = '';
    if (level === 'critical') {
      this.register.set(this.allRisks().filter(r => r.inherentScore >= 20));
    } else if (level === 'high') {
      this.register.set(this.allRisks().filter(r => r.inherentScore >= 12 && r.inherentScore < 20));
    } else if (level === 'overdue') {
      this.register.set(this.allRisks().filter(r => r.treatmentStatus === 'overdue'));
    } else if (level === 'noowner') {
      this.register.set(this.allRisks().filter(r => !r.owner));
    }
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.categoryFilter = '';
    this.searchTerm = '';
    this.qpControlId = '';
    this.qpEvidenceId = '';
    this.activeQueryParamFilter.set('');
    this.loadRegister();
  }

  clearQueryParamFilter(): void {
    this.qpControlId = '';
    this.qpEvidenceId = '';
    this.activeQueryParamFilter.set('');
    this.router.navigate([], { relativeTo: this.route, queryParams: { controlId: null, evidenceId: null }, queryParamsHandling: 'merge' });
    this.loadRegister();
  }

  // ── Table action handler ───────────────────────────────────────────────────

  onTableAction(action: RiskTableAction): void {
    switch (action.type) {
      case 'detail': this.openDetail(action.risk.riskId); break;
      case 'edit': this.openEditDialog(action.risk); break;
      case 'escalate': this.escalateRisk(action.risk); break;
      case 'delete': this.confirmDelete(action.risk); break;
    }
  }

  // ── Column toggle ──────────────────────────────────────────────────────────

  onColumnsChange(cols: string[]): void {
    this.visibleColumnValues = cols;
    this.visibleColumns.set(new Set(cols));
    this._saveColumnsToStorage();
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  onToggleSelectAll(checked: boolean): void {
    this.selectAllChecked = checked;
    this.selectedRisks.set(checked ? this.register().map(r => r.riskId) : []);
  }

  toggleRiskSelection(riskId: string): void {
    const current = this.selectedRisks();
    if (current.includes(riskId)) {
      this.selectedRisks.set(current.filter(id => id !== riskId));
    } else {
      this.selectedRisks.set([...current, riskId]);
    }
    this.selectAllChecked = this.selectedRisks().length === this.register().length && this.register().length > 0;
  }

  clearSelection(): void {
    this.selectedRisks.set([]);
    this.selectAllChecked = false;
  }

  // ── Bulk operations ────────────────────────────────────────────────────────

  applyBulkUpdate(payload: { status: string; owner: string }): void {
    const ids = this.selectedRisks();
    if (!ids.length) return;
    const body: { riskIds: string[]; status?: string; owner?: string } = { riskIds: ids };
    if (payload.status) body.status = payload.status;
    if (payload.owner) body.owner = payload.owner;
    this.api.bulkUpdateRisks(body).subscribe({
      next: (res) => { this.toast('success', this.i18n.translate('common.risksUpdatedCount', { count: String(res.updated) })); this.clearSelection(); this.loadRegister(); },
      error: () => this.toast('error', this.i18n.translate('common.bulkUpdateFailed')),
    });
  }

  exportSelectedRisks(): void {
    const ids = new Set(this.selectedRisks());
    if (!ids.size) return;
    const rows = this.register().filter(r => ids.has(r.riskId));
    if (!rows.length) return;
    const keys = ['riskId', 'title', 'category', 'owner', 'status', 'inherentScore', 'residualScore', 'treatmentStatus', 'likelihood', 'impact'];
    const header = keys.join(',');
    const csvRows = rows.map(row => keys.map(k => { const val = (row as GrcRecord)[k] ?? ''; return `"${String(val).replace(/"/g, '""')}"`; }).join(','));
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `risk-register-selection-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast('success', `${rows.length} ${this.L().risksExported}`);
  }

  // ── Create / Edit dialog ───────────────────────────────────────────────────

  openCreateDialog(): void {
    this.editMode = false; this.editingRiskId = '';
    this.form = { title: '', description: '', category: 'operational', likelihood: 3, impact: 3, owner: '', ownerTeamId: '', status: 'identified', controlEffectiveness: 50, nextReviewDate: '', threatContext: '', businessImpact: '' };
    this.validTransitions.set([]);
    this.currentRiskStatus = '';
    this.dialogVisible = true;
  }

  openEditDialog(risk: RiskRegisterItemDto): void {
    this.editMode = true; this.editingRiskId = risk.riskId;
    this.form = {
      title: risk.title, description: risk.description || '',
      category: risk.category, likelihood: risk.likelihood, impact: risk.impact,
      owner: risk.owner || '', ownerTeamId: risk.ownerTeamId || '',
      status: risk.status,
      controlEffectiveness: risk.controlEffectiveness ?? 50,
      nextReviewDate: risk.nextReviewDate || '',
      threatContext: risk.threatContext || '',
      businessImpact: risk.businessImpact || '',
    };
    this.currentRiskStatus = risk.status;
    this.validTransitions.set([]);
    this.api.getValidTransitions(risk.riskId).subscribe({
      next: (r) => { const data = (r as ApiDataEnvelope<{ validTransitions?: Array<{ toStatus: string; description?: string }>; currentStatus?: string }>)?.data ?? r; this.validTransitions.set(data?.validTransitions ?? []); this.currentRiskStatus = data?.currentStatus || risk.status; },
      error: () => this.validTransitions.set([]),
    });
    this.dialogVisible = true;
  }

  saveRisk(): void {
    if (!this.form.title) return;
    const obs = this.editMode && this.editingRiskId
      ? this.api.updateRisk(this.editingRiskId, this.form)
      : this.api.createRisk(this.form as Partial<RiskRegisterItemDto>);
    obs.subscribe({
      next: () => { this.dialogVisible = false; this.loadRegister(); this.toast('success', this.editMode ? this.i18n.translate('common.riskUpdated') : this.i18n.translate('common.riskCreated')); },
      error: () => this.toast('error', this.i18n.translate('common.saveFailed')),
    });
  }

  // ── Detail drawer ──────────────────────────────────────────────────────────

  openDetail(riskId: string): void {
    this.api.getRiskDetail(riskId).subscribe({
      next: (d) => {
        this.drawerRisk = d; this.drawerVisible = true;
        this.drawerSelectedOwnerId = d.risk.ownerId || d.risk.owner || null;
        this.drawerSelectedTeamId = d.risk.ownerTeamId || null;

        // Compute available status transitions from lifecycle map
        const currentStatus = d.risk.status || 'identified';
        const transitions = RISK_TRANSITIONS[currentStatus] || [];
        this.drawerAvailableTransitions.set(transitions.map(s => ({ label: this._formatStatusLabel(s), value: s })));

        // Load owner profile
        this.drawerOwnerProfile.set(null);
        const ownerId = d.risk.ownerId || d.risk.owner;
        if (ownerId) {
          this.api.getFoundationUserDetail(ownerId).subscribe({
            next: (u: FoundationUserRecord) => {
              if (u) {
                this.drawerOwnerProfile.set({
                  name: u.fullName || u.full_name || u.name || u.email,
                  email: u.email,
                  team: u.teamName || u.team_name,
                  department: u.departmentName || u.department_name,
                  businessUnit: u.businessUnitName || u.business_unit_name,
                });
              }
            },
            error: () => this.drawerOwnerProfile.set(null),
          });
        }

        this._loadPeerReviewsForRisk(riskId);
        this._loadStatusHistory(riskId);
        this._loadAuditFindings(riskId);
      },
      error: () => this.toast('error', this.i18n.translate('common.failedToLoadDetail')),
    });
  }

  onDrawerOwnerChange(userId: string | null): void {
    if (!this.drawerRisk || !userId) return;
    this.api.updateRisk(this.drawerRisk.risk.riskId, { owner: userId } as Partial<RiskRegisterItemDto>).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.ownerUpdated')); this.openDetail(this.drawerRisk!.risk.riskId); this.loadRegister(); },
      error: () => this.toast('error', this.i18n.translate('common.failedToUpdateOwner')),
    });
  }

  onDrawerTeamChange(teamId: string | null): void {
    if (!this.drawerRisk || !teamId) return;
    this.api.updateRisk(this.drawerRisk.risk.riskId, { ownerTeamId: teamId } as Partial<RiskRegisterItemDto>).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.teamUpdated')); this.openDetail(this.drawerRisk!.risk.riskId); this.loadRegister(); },
      error: () => this.toast('error', this.i18n.translate('common.failedToUpdateTeam')),
    });
  }

  onDrawerStatusTransition(newStatus: string | null): void {
    if (!newStatus || !this.drawerRisk) return;
    this.api.transitionStatus(this.drawerRisk.risk.riskId, { status: newStatus }).subscribe({
      next: () => {
        this.toast('success', this.i18n.translate('common.statusChangedTo', { status: this._formatStatusLabel(newStatus) }));
        this.openDetail(this.drawerRisk!.risk.riskId);
        this.loadRegister();
      },
      error: () => this.toast('error', this.i18n.translate('common.failedToUpdateStatus')),
    });
  }

  doLinkControl(controlId: string): void {
    if (!this.drawerRisk || !controlId) return;
    this.api.linkControl(this.drawerRisk.risk.riskId, controlId).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.controlLinked')); this.openDetail(this.drawerRisk!.risk.riskId); },
      error: () => this.toast('error', this.i18n.translate('common.failedToLinkControl')),
    });
  }

  doLinkEvidence(evidenceId: string): void {
    if (!this.drawerRisk || !evidenceId) return;
    this.api.linkEvidence(this.drawerRisk.risk.riskId, evidenceId).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.evidenceLinked')); this.openDetail(this.drawerRisk!.risk.riskId); },
      error: () => this.toast('error', this.i18n.translate('common.failedToLinkEvidence')),
    });
  }

  finalizePeerReview(pr: RiskPeerReviewVM): void {
    if (pr.humanScore == null) return;
    const finalScore = Math.round(((pr.agentScore ?? 0) + pr.humanScore) / 2);
    this.api.finalizePeerReview(pr.reviewId!, { finalScore, finalMethod: 'average' }).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.peerReviewFinalized')); if (this.drawerRisk) this._loadPeerReviewsForRisk(this.drawerRisk.risk.riskId); },
      error: () => this.toast('error', this.i18n.translate('common.failedToFinalizePeerReview')),
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  navigateTo(path: string, entityId?: string): void {
    this.router.navigate([path], entityId ? { queryParams: { id: entityId } } : {});
  }

  navigateToAuditFinding(findingId: string): void {
    this.router.navigate(['/audit/findings'], { queryParams: { id: findingId } });
  }

  navigateToAudit(riskId: string): void {
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'risk', entityId: riskId } });
  }

  // ── Row-level actions ──────────────────────────────────────────────────────

  private confirmDelete(risk: RiskRegisterItemDto): void {
    this.confirm.confirm({
      message: this.i18n.translate('common.confirmDeleteRiskMessage', { title: risk.title }),
      header: this.i18n.translate('common.confirmDelete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteRisk(risk.riskId).subscribe({
          next: () => { this.toast('success', this.i18n.translate('common.riskDeleted')); this.loadRegister(); },
          error: () => this.toast('error', this.i18n.translate('common.failedToDeleteRisk')),
        });
      },
    });
  }

  private escalateRisk(risk: RiskRegisterItemDto): void {
    this.api.escalateRisk(risk.riskId, { reason: 'Escalated from register', escalateTo: 'executive' }).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.riskEscalated')); this.loadRegister(); },
      error: () => this.toast('error', this.i18n.translate('common.failedToEscalateRisk')),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _loadFoundationData(): void {
    this.api.getFoundationTeams().subscribe({
      next: (r) => {
        const teams = (r as ApiDataEnvelope<FoundationTeamRecord[]>)?.data ?? r ?? [];
        this.foundationTeams.set(teams);
        this.drawerTeamOptions.set(
          (Array.isArray(teams) ? teams : []).map((t) => ({
            label: `${t.name || t.team_name || ''} (${t.teamCode || t.team_code || ''})`,
            value: t.teamId || t.team_id || t.id,
          }))
        );
      },
      error: () => { this.foundationTeams.set([]); this.drawerTeamOptions.set([]); },
    });
    this.api.getFoundationUsers().subscribe({
      next: (r) => {
        const users = (r as ApiDataEnvelope<FoundationUserRecord[]>)?.data ?? r ?? [];
        this.foundationUsers.set(users);
        this.drawerUserOptions.set(
          (Array.isArray(users) ? users : []).map((u) => ({
            label: `${u.fullName || u.full_name || u.name || u.email} (${u.email || ''})${u.departmentName || u.department_name ? ' \u2014 ' + (u.departmentName || u.department_name) : ''}`,
            value: u.userId || u.user_id || u.id,
            email: u.email,
            department: u.departmentName || u.department_name,
          }))
        );
      },
      error: () => { this.foundationUsers.set([]); this.drawerUserOptions.set([]); },
    });
  }

  private _subscribeQueryParams(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(qp => {
      if (this.syncingUrl) return;
      this.qpControlId = '';
      this.qpEvidenceId = '';
      this.activeQueryParamFilter.set('');
      if (qp['severity']) {
        const sev = qp['severity'];
        if (sev === 'critical' || sev === 'high') { this.applyHealthFilter(sev); return; }
      }
      if (qp['status']) this.statusFilter = qp['status'];
      if (qp['category']) this.categoryFilter = qp['category'];
      if (qp['search']) this.searchTerm = qp['search'];
      if (qp['controlId']) {
        this.qpControlId = qp['controlId'];
        this.activeQueryParamFilter.set(`${this.L().filterByControl}: ${this.qpControlId}`);
      }
      if (qp['evidenceId']) {
        this.qpEvidenceId = qp['evidenceId'];
        this.activeQueryParamFilter.set(`${this.L().filterByEvidence}: ${this.qpEvidenceId}`);
      }
      this.loadRegister();
    });
  }

  private syncFiltersToUrl(): void {
    this.syncingUrl = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: this.statusFilter || null, category: this.categoryFilter || null, search: this.searchTerm || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    }).then(() => { this.syncingUrl = false; }).catch(() => { this.syncingUrl = false; });
  }

  private _loadPeerReviewsForRisk(riskId: string): void {
    this.drawerPeerReviews.set([]);
    this.api.getPeerReviews().subscribe({
      next: (res: { reviews?: RiskPeerReviewVM[] }) => { this.drawerPeerReviews.set((res.reviews || []).filter((r) => r.riskId === riskId)); },
      error: () => this.drawerPeerReviews.set([]),
    });
  }

  private _loadStatusHistory(riskId: string): void {
    this.drawerStatusTimeline.set([]);
    this.api.getStatusHistory(riskId).subscribe({
      next: (r) => {
        const data = (r as ApiDataEnvelope<{ history?: StatusHistoryApiRecord[] }>)?.data ?? r;
        const history = data?.history ?? [];
        this.drawerStatusTimeline.set(
          (Array.isArray(history) ? history : []).map((h: StatusHistoryApiRecord) => ({
            historyId: h.historyId || h.history_id || '',
            fromStatus: h.fromStatus || h.from_status || '',
            toStatus: h.toStatus || h.to_status || '',
            actor: h.changedByName || h.changed_by_name || h.changedBy || h.changed_by || 'System',
            timestamp: h.changedAt || h.changed_at || h.timestamp || h.created_at,
            reason: h.reason || h.notes || '',
          }))
        );
      },
      error: () => this.drawerStatusTimeline.set([]),
    });
  }

  private _loadAuditFindings(riskId: string): void {
    this.drawerAuditFindings.set([]);
    this.http.get<AuditFindingsApiResponse>('/api/audit/findings').subscribe({
      next: (r) => {
        const findings = r?.findings || [];
        const linked = findings.filter((f) => f.source_type === 'audit' || f.linked_risk_id === riskId);
        this.drawerAuditFindings.set(linked.slice(0, 10));
      },
      error: () => this.drawerAuditFindings.set([]),
    });
  }

  private _loadColumnsFromStorage(): string[] {
    try {
      const raw = localStorage.getItem(LS_VISIBLE_COLS_KEY);
      if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length > 0) return parsed; }
    } catch { /* ignore corrupt storage */ }
    return [...this.defaultVisibleCols];
  }

  private _saveColumnsToStorage(): void {
    try { localStorage.setItem(LS_VISIBLE_COLS_KEY, JSON.stringify(this.visibleColumnValues)); } catch { /* quota exceeded */ }
  }

  private _formatStatusLabel(s: string): string {
    return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  }

  private toast(severity: string, detail: string): void {
    const summary = severity === 'error' ? this.i18n.translate('common.error')
      : severity === 'warn' ? this.i18n.translate('common.warning')
      : severity === 'info' ? this.i18n.translate('common.info')
      : this.i18n.translate('common.success');
    this.msg.add({ severity, summary, detail, life: 3000 });
  }
}

const EN = {
  register: 'Risk Register', registerSubtitle: 'Full risk register \u2014 CRUD, filters, and detail drawer',
  createRisk: 'Create Risk', editRisk: 'Edit Risk', exportRegister: 'Export',
  filterByCategory: 'Filter by Category', filterByStatus: 'Filter by Status', search: 'Search risks...',
  title: 'Title', description: 'Description', category: 'Category', owner: 'Owner', status: 'Status',
  inherent: 'Inherent', residual: 'Residual', treatment: 'Treatment', actions: 'Actions',
  likelihood: 'Likelihood', impact: 'Impact', save: 'Save', cancel: 'Cancel',
  controlEff: 'Control Eff.', nextReviewDate: 'Next Review Date',
  noData: 'No data available', emptyRegister: 'No risks found. Create risks or import a baseline.',
  totalRisks: 'Total Risks', criticalLabel: 'Critical', highLabel: 'High', overdueTreat: 'Overdue Treat.', noOwner: 'No Owner',
  overviewTab: 'Overview', controlsTab: 'Controls', evidenceTab: 'Evidence', treatmentsTab: 'Treatments',
  governanceTab: 'Governance', auditTab: 'Audit',
  businessImpact: 'Business Impact', threatContext: 'Threat Context',
  noLinkedControls: 'No linked controls.', noLinkedEvidence: 'No linked evidence.',
  noTreatments: 'No treatments assigned.', overdueLabel: 'OVERDUE',
  openControl: 'Open control', openEvidence: 'Open evidence', openTreatment: 'Open treatment',
  acceptance: 'Acceptance', escalationHistory: 'Escalation History', noEscalations: 'No escalation history.',
  viewAuditLog: 'View Audit Log',
  linkControl: 'Link Control', linkEvidence: 'Link Evidence',
  controlIdPlaceholder: 'Control ID', evidenceIdPlaceholder: 'Evidence ID',
  selected: 'selected', bulkStatus: 'Bulk Status', bulkOwner: 'Bulk Owner', applyBulk: 'Apply', clearSelection: 'Clear',
  bulkExport: 'Export Selected', risksExported: 'risks exported',
  columns: 'Columns', createdAt: 'Created At', ownerTeam: 'Owner Team',
  peerReviewTab: 'Peer Review', agentScore: 'Agent Score', humanScore: 'Human Score',
  finalScore: 'Final Score', dialogue: 'Dialogue', agent: 'Agent', human: 'Human',
  finalize: 'Finalize', noPeerReviews: 'No peer reviews for this risk.',
  filterByControl: 'Filtered by control', filterByEvidence: 'Filtered by evidence',
  clearFilter: 'Clear filter',
  responsibleTeam: 'Responsible Team', selectOwner: 'Select Owner', selectTeam: 'Select Team',
  ownership: 'Ownership', statusHistory: 'Status History', noStatusHistory: 'No status changes recorded yet',
  ownerDetails: 'Owner Details', changeStatus: 'Change Status',
};

const AR: typeof EN = {
  register: '\u0633\u062c\u0644 \u0627\u0644\u0645\u062e\u0627\u0637\u0631', registerSubtitle: '\u0633\u062c\u0644 \u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u0643\u0627\u0645\u0644 \u2014 \u0625\u0646\u0634\u0627\u0621 \u0648\u062a\u0639\u062f\u064a\u0644 \u0648\u062d\u0630\u0641 \u0648\u062a\u0635\u0641\u064a\u0629',
  createRisk: '\u0625\u0646\u0634\u0627\u0621 \u062e\u0637\u0631', editRisk: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062e\u0637\u0631', exportRegister: '\u062a\u0635\u062f\u064a\u0631',
  filterByCategory: '\u062a\u0635\u0641\u064a\u0629 \u062d\u0633\u0628 \u0627\u0644\u0641\u0626\u0629', filterByStatus: '\u062a\u0635\u0641\u064a\u0629 \u062d\u0633\u0628 \u0627\u0644\u062d\u0627\u0644\u0629', search: '\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0645\u062e\u0627\u0637\u0631...',
  title: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646', description: '\u0627\u0644\u0648\u0635\u0641', category: '\u0627\u0644\u0641\u0626\u0629', owner: '\u0627\u0644\u0645\u0633\u0624\u0648\u0644', status: '\u0627\u0644\u062d\u0627\u0644\u0629',
  inherent: '\u0627\u0644\u0643\u0627\u0645\u0646', residual: '\u0627\u0644\u0645\u062a\u0628\u0642\u064a', treatment: '\u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629', actions: '\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a',
  likelihood: '\u0627\u0644\u0627\u062d\u062a\u0645\u0627\u0644\u064a\u0629', impact: '\u0627\u0644\u062a\u0623\u062b\u064a\u0631', save: '\u062d\u0641\u0638', cancel: '\u0625\u0644\u063a\u0627\u0621',
  controlEff: '\u0641\u0639\u0627\u0644\u064a\u0629 \u0627\u0644\u0636\u0627\u0628\u0637', nextReviewDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629',
  noData: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a', emptyRegister: '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u062e\u0627\u0637\u0631. \u0623\u0646\u0634\u0626 \u0645\u062e\u0627\u0637\u0631 \u0623\u0648 \u0627\u0633\u062a\u0648\u0631\u062f \u062e\u0637 \u0623\u0633\u0627\u0633.',
  totalRisks: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062e\u0627\u0637\u0631', criticalLabel: '\u062d\u0631\u062c', highLabel: '\u0639\u0627\u0644\u064a', overdueTreat: '\u0645\u0639\u0627\u0644\u062c\u0627\u062a \u0645\u062a\u0623\u062e\u0631\u0629', noOwner: '\u0628\u062f\u0648\u0646 \u0645\u0633\u0624\u0648\u0644',
  overviewTab: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629', controlsTab: '\u0627\u0644\u0636\u0648\u0627\u0628\u0637', evidenceTab: '\u0627\u0644\u0623\u062f\u0644\u0629', treatmentsTab: '\u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0627\u062a',
  governanceTab: '\u0627\u0644\u062d\u0648\u0643\u0645\u0629', auditTab: '\u0627\u0644\u062a\u062f\u0642\u064a\u0642',
  businessImpact: '\u0627\u0644\u0623\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0623\u0639\u0645\u0627\u0644', threatContext: '\u0633\u064a\u0627\u0642 \u0627\u0644\u062a\u0647\u062f\u064a\u062f',
  noLinkedControls: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0648\u0627\u0628\u0637 \u0645\u0631\u062a\u0628\u0637\u0629.', noLinkedEvidence: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u062f\u0644\u0629 \u0645\u0631\u062a\u0628\u0637\u0629.',
  noTreatments: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u0627\u0644\u062c\u0627\u062a \u0645\u062e\u0635\u0635\u0629.', overdueLabel: '\u0645\u062a\u0623\u062e\u0631',
  openControl: '\u0641\u062a\u062d \u0627\u0644\u0636\u0627\u0628\u0637', openEvidence: '\u0641\u062a\u062d \u0627\u0644\u062f\u0644\u064a\u0644', openTreatment: '\u0641\u062a\u062d \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629',
  acceptance: '\u0627\u0644\u0642\u0628\u0648\u0644', escalationHistory: '\u0633\u062c\u0644 \u0627\u0644\u062a\u0635\u0639\u064a\u062f', noEscalations: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0633\u062c\u0644 \u062a\u0635\u0639\u064a\u062f.',
  viewAuditLog: '\u0639\u0631\u0636 \u0633\u062c\u0644 \u0627\u0644\u062a\u062f\u0642\u064a\u0642',
  linkControl: '\u0631\u0628\u0637 \u0636\u0627\u0628\u0637', linkEvidence: '\u0631\u0628\u0637 \u062f\u0644\u064a\u0644',
  controlIdPlaceholder: '\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0636\u0627\u0628\u0637', evidenceIdPlaceholder: '\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u062f\u0644\u064a\u0644',
  selected: '\u0645\u062d\u062f\u062f', bulkStatus: '\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629', bulkOwner: '\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0633\u0624\u0648\u0644', applyBulk: '\u062a\u0637\u0628\u064a\u0642', clearSelection: '\u0645\u0633\u062d',
  bulkExport: '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u062d\u062f\u062f', risksExported: '\u0645\u062e\u0627\u0637\u0631 \u062a\u0645 \u062a\u0635\u062f\u064a\u0631\u0647\u0627',
  columns: '\u0627\u0644\u0623\u0639\u0645\u062f\u0629', createdAt: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621', ownerTeam: '\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0633\u0624\u0648\u0644',
  peerReviewTab: '\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0623\u0642\u0631\u0627\u0646', agentScore: '\u062f\u0631\u062c\u0629 \u0627\u0644\u0648\u0643\u064a\u0644', humanScore: '\u0627\u0644\u062f\u0631\u062c\u0629 \u0627\u0644\u0628\u0634\u0631\u064a\u0629',
  finalScore: '\u0627\u0644\u062f\u0631\u062c\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629', dialogue: '\u0627\u0644\u062d\u0648\u0627\u0631', agent: '\u0648\u0643\u064a\u0644', human: '\u0628\u0634\u0631\u064a',
  finalize: '\u0625\u0646\u0647\u0627\u0621', noPeerReviews: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0631\u0627\u062c\u0639\u0627\u062a \u0623\u0642\u0631\u0627\u0646 \u0644\u0647\u0630\u0627 \u0627\u0644\u062e\u0637\u0631.',
  filterByControl: '\u062a\u0635\u0641\u064a\u0629 \u062d\u0633\u0628 \u0627\u0644\u0636\u0627\u0628\u0637', filterByEvidence: '\u062a\u0635\u0641\u064a\u0629 \u062d\u0633\u0628 \u0627\u0644\u062f\u0644\u064a\u0644',
  clearFilter: '\u0645\u0633\u062d \u0627\u0644\u062a\u0635\u0641\u064a\u0629',
  responsibleTeam: '\u0627\u0644\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0633\u0624\u0648\u0644', selectOwner: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u0624\u0648\u0644', selectTeam: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0631\u064a\u0642',
  ownership: '\u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0629', statusHistory: '\u0633\u062c\u0644 \u0627\u0644\u062d\u0627\u0644\u0629', noStatusHistory: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0633\u062c\u0644 \u0628\u0639\u062f',
  ownerDetails: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0633\u0624\u0648\u0644', changeStatus: '\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u062d\u0627\u0644\u0629',
};
