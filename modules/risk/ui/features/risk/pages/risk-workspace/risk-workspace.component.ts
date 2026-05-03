import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { Store } from '@ngrx/store';
import { RiskActions } from '@app/core/ngrx/risk/risk.actions';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { EntityDetailDrawerComponent } from '@app/shared/components/entity/entity-detail-drawer.component';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SliderModule } from 'primeng/slider';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcRecord } from '@app/core/models/shared.types';
import {
  RiskOverviewDto, RiskRegisterItemDto, RiskDetailDto,
  RiskHeatmapDto, TreatmentItemDto, TreatmentBoardDto,
  KRIItemDto, KRIBreachLogDto, ReviewCadenceDto,
  RiskAppetiteConfigDto, AppetiteBreachDto, AcceptanceQueueItemDto,
  AppetiteTrendDto,
} from './risk-workspace.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-workspace',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    GrcDataTableComponent, GrcFormFieldComponent,
    PageShellComponent, StatusBadgeComponent, StatCardComponent,
    EntityDetailDrawerComponent, AiPanelComponent,
    TabsModule, TableModule, ToolbarModule,
    InputTextModule, TextareaModule, ButtonModule, CardModule, TagModule,
    SelectModule, TooltipModule, DialogModule, SliderModule, BadgeModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './risk-workspace.component.html',
  styleUrls: ['./risk-workspace.component.scss'],
})
export class RiskWorkspaceComponent implements OnInit {
  private api = inject(RiskApiService);
  private msg = inject(MessageService);
  public i18n = inject(I18nService);
  private readonly ngrxStore = inject(Store);

  // ═══ State ═══
  loading = signal(true);
  tabIndex = 0;

  // Overview
  overview = signal<RiskOverviewDto | null>(null);
  sum = computed(() => this.overview()?.summary);

  // Register
  register = signal<RiskRegisterItemDto[]>([]);
  registerLoading = false;
  statusFilter = '';
  registerCatFilter = '';

  // Heatmap
  heatmapData = signal<RiskHeatmapDto | null>(null);
  heatmapMode: 'inherent' | 'residual' = 'inherent';
  cellDetailVisible = false;
  cellDetailRisks: GrcRecord[] = [];

  // Treatments
  treatments = signal<TreatmentItemDto[]>([]);
  treatmentBoard = signal<TreatmentBoardDto | null>(null);
  treatmentView: 'list' | 'board' = 'list';

  // KRIs
  kris = signal<KRIItemDto[]>([]);
  breachLog = signal<KRIBreachLogDto[]>([]);
  reviewCadence = signal<ReviewCadenceDto | null>(null);

  // Appetite
  appetiteConfig = signal<RiskAppetiteConfigDto | null>(null);
  appetiteBreaches = signal<AppetiteBreachDto[]>([]);
  acceptanceQueue = signal<AcceptanceQueueItemDto[]>([]);
  appetiteTrends = signal<AppetiteTrendDto[]>([]);

  // Filters
  categoryFilter = '';
  searchTerm = '';

  // Dialogs
  riskDialogVisible = false;
  editMode = false;
  editingRiskId = '';
  riskForm = { title: '', description: '', category: 'operational', likelihood: 3, impact: 3, owner: '', status: 'identified' };

  treatmentDialogVisible = false;
  treatmentForm = { title: '', owner: '', targetDate: '', linkedRiskId: '' };

  // Drawer
  drawerVisible = false;
  drawerRisk: RiskDetailDto | null = null;

  // Labels
  L = computed(() => this.i18n.currentLang() === 'ar' ? AR : EN);

  // Computed data
  registerData = computed(() => {
    let list = this.register();
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(t) || (r.category || '').toLowerCase().includes(t) || (r.owner || '').toLowerCase().includes(t));
    }
    return list;
  });

  treatmentsData = computed(() => this.treatments());
  krisData = computed(() => this.kris());

  // Options
  riskCategoryOptions = [
    { label: 'Operational', value: 'operational' },
    { label: 'Strategic', value: 'strategic' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Financial', value: 'financial' },
    { label: 'Cyber', value: 'cyber' },
    { label: 'Third Party', value: 'third_party' },
    { label: 'Reputational', value: 'reputational' },
    { label: 'Privacy', value: 'privacy' },
    { label: 'Business Continuity', value: 'business_continuity' },
  ];

  riskStatusOptions = [
    { label: 'Identified', value: 'identified' },
    { label: 'Assessed', value: 'assessed' },
    { label: 'Under Treatment', value: 'under_treatment' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Monitored', value: 'monitored' },
    { label: 'Closed', value: 'closed' },
    { label: 'Escalated', value: 'escalated' },
  ];

  categoryFilterOptions = [
    { label: 'All Categories', value: '' },
    ...this.riskCategoryOptions,
  ];

  statusFilterOptions = [
    { label: 'All Statuses', value: '' },
    ...this.riskStatusOptions,
  ];

  boardColumns: { key: string; label: string }[] = [
    { key: 'planned', label: 'Planned' },
    { key: 'approved', label: 'Approved' },
    { key: 'inProgress', label: 'In Progress' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'validation', label: 'Validation' },
    { key: 'done', label: 'Done' },
  ];

  // ═══ Lifecycle ═══
  ngOnInit(): void {
    this.loadOverview();
    // Populate centralized store for cross-module consumption
    this.ngrxStore.dispatch(RiskActions.loadOverview());
  }

  onTabChange(idx: number): void {
    this.tabIndex = idx;
    if (idx === 1 && this.register().length === 0) this.loadRegister();
    if (idx === 2 && !this.heatmapData()) this.loadHeatmap();
    if (idx === 3 && this.treatments().length === 0) this.loadTreatments();
    if (idx === 4 && this.kris().length === 0) this.loadKRIs();
    if (idx === 5 && !this.appetiteConfig()) this.loadAppetite();
  }

  // ═══ OVERVIEW ═══
  loadOverview(): void {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.categoryFilter) params['category'] = this.categoryFilter;
    this.api.getOverview(params).subscribe({
      next: (d) => { this.overview.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast('error', this.i18n.translate('common.failedToLoadRiskOverview')); },
    });
  }

  catPercent(count: number): number {
    const total = this.sum()?.totalRisks || 1;
    return Math.round((count / total) * 100);
  }

  catColor(category: string): string {
    const map: Record<string, string> = {
      cyber: '#6366f1', operational: 'var(--warning)', compliance: '#3b82f6', financial: '#10b981',
      strategic: '#8b5cf6', third_party: '#ec4899', reputational: 'var(--error)', privacy: '#14b8a6',
      business_continuity: '#f97316',
    };
    return map[category] || '#6b7280';
  }

  catSeverity(category: string): 'danger' | 'warning' | 'success' | 'info' {
    const map: Record<string, any> = { cyber: 'danger', compliance: 'info', operational: 'warning' };
    return map[category] || 'info';
  }

  filterByCategory(cat: string): void {
    this.categoryFilter = cat;
    this.tabIndex = 1;
    this.loadRegister();
  }

  // ═══ REGISTER ═══
  loadRegister(): void {
    this.registerLoading = true;
    const params: Record<string, string> = {};
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.registerCatFilter) params['category'] = this.registerCatFilter;
    if (this.searchTerm) params['search'] = this.searchTerm;
    this.api.getRegister(params).subscribe({
      next: (d) => { this.register.set(d.risks || []); this.registerLoading = false; },
      error: () => { this.registerLoading = false; this.toast('error', this.i18n.translate('common.failedToLoadRiskRegister')); },
    });
  }

  openRiskDetail(riskId: string): void {
    this.api.getRiskDetail(riskId).subscribe({
      next: (d) => { this.drawerRisk = d; this.drawerVisible = true; },
      error: () => this.toast('error', this.i18n.translate('common.failedToLoadRiskDetail')),
    });
  }

  openCreateRiskDialog(): void {
    this.editMode = false;
    this.editingRiskId = '';
    this.riskForm = { title: '', description: '', category: 'operational', likelihood: 3, impact: 3, owner: '', status: 'identified' };
    this.riskDialogVisible = true;
  }

  openEditRiskDialog(risk: RiskRegisterItemDto): void {
    this.editMode = true;
    this.editingRiskId = risk.riskId;
    this.riskForm = {
      title: risk.title, description: risk.description || '', category: risk.category,
      likelihood: risk.likelihood, impact: risk.impact, owner: risk.owner || '', status: risk.status,
    };
    this.riskDialogVisible = true;
  }

  saveRisk(): void {
    if (!this.riskForm.title) return;
    if (this.editMode && this.editingRiskId) {
      this.api.updateRisk(this.editingRiskId, this.riskForm).subscribe({
        next: () => { this.riskDialogVisible = false; this.loadRegister(); this.loadOverview(); this.toast('success', this.i18n.translate('common.riskUpdated')); },
        error: () => this.toast('error', this.i18n.translate('common.failedToUpdateRisk')),
      });
    } else {
      this.api.createRisk(this.riskForm as GrcRecord).subscribe({
        next: () => { this.riskDialogVisible = false; this.loadRegister(); this.loadOverview(); this.toast('success', this.i18n.translate('common.riskCreated')); },
        error: () => this.toast('error', this.i18n.translate('common.failedToCreateRisk')),
      });
    }
  }

  escalateRisk(risk: GrcRecord): void {
    this.api.escalateRisk(risk.riskId, { reason: 'Escalated from risk workspace', escalateTo: 'executive' }).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.riskEscalated')); this.loadRegister(); },
      error: () => this.toast('error', this.i18n.translate('common.failedToEscalateRisk')),
    });
  }

  // ═══ HEATMAP ═══
  loadHeatmap(): void {
    this.api.getHeatmap(this.heatmapMode).subscribe({
      next: (d) => this.heatmapData.set(d),
      error: () => this.toast('error', this.i18n.translate('common.failedToLoadHeatmap')),
    });
  }

  switchHeatmapMode(mode: 'inherent' | 'residual'): void {
    this.heatmapMode = mode;
    this.loadHeatmap();
  }

  getHeatmapCellColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    if (score >= 20) return 'rgba(var(--module-accent-red-rgb), 0.28)';
    if (score >= 15) return 'rgba(var(--module-accent-amber-rgb), 0.28)';
    if (score >= 10) return 'rgba(var(--module-accent-yellow-rgb), 0.22)';
    if (score >= 5) return 'rgba(var(--module-accent-green-rgb), 0.18)';
    return 'rgba(var(--module-accent-green-rgb), 0.08)';
  }

  getHeatmapCellCount(likelihood: number, impact: number): number {
    const hm = this.heatmapData();
    if (!hm) return 0;
    const cell = hm.cells.find(c => c.likelihood === likelihood && c.impact === impact);
    return cell?.count || 0;
  }

  openHeatmapCell(likelihood: number, impact: number): void {
    const hm = this.heatmapData();
    if (!hm) return;
    const cell = hm.cells.find(c => c.likelihood === likelihood && c.impact === impact);
    this.cellDetailRisks = cell?.risks || [];
    this.cellDetailVisible = true;
  }

  // ═══ TREATMENTS ═══
  loadTreatments(): void {
    this.api.getTreatments().subscribe({
      next: (d) => this.treatments.set(d.treatments || []),
      error: () => this.toast('error', this.i18n.translate('common.failedToLoadTreatments')),
    });
  }

  loadTreatmentBoard(): void {
    this.api.getTreatmentBoard().subscribe({
      next: (d) => this.treatmentBoard.set(d),
      error: () => this.toast('error', this.i18n.translate('common.failedToLoadTreatmentBoard')),
    });
  }

  openCreateTreatmentDialog(): void {
    this.treatmentForm = { title: '', owner: '', targetDate: '', linkedRiskId: '' };
    this.treatmentDialogVisible = true;
  }

  saveTreatment(): void {
    if (!this.treatmentForm.title) return;
    this.api.createTreatment(this.treatmentForm as GrcRecord).subscribe({
      next: () => { this.treatmentDialogVisible = false; this.loadTreatments(); this.toast('success', this.i18n.translate('common.treatmentCreated')); },
      error: () => this.toast('error', this.i18n.translate('common.failedToCreateTreatment')),
    });
  }

  // ═══ KRIs ═══
  loadKRIs(): void {
    this.api.getKRIs().subscribe({ next: (d) => this.kris.set(d.kris || []), error: (e) => devError("[API]", e) });
    this.api.getBreachLog().subscribe({ next: (d) => this.breachLog.set(d), error: (e) => devError("[API]", e) });
    this.api.getReviewCadence().subscribe({ next: (d) => this.reviewCadence.set(d), error: (e) => devError("[API]", e) });
  }

  openCreateKRIDialog(): void {
    this.toast('info', this.i18n.translate('common.kriCreationInfo'));
  }

  kriStatusClass(status: string): string {
    const map: Record<string, string> = { breach: 'score-danger', warning: 'score-warning', normal: 'score-success' };
    return map[status] || 'score-info';
  }

  kriTagSeverity(status: string): 'danger' | 'warning' | 'success' | 'info' {
    const map: Record<string, any> = { breach: 'danger', warning: 'warning', normal: 'success' };
    return map[status] || 'info';
  }

  // ═══ APPETITE ═══
  loadAppetite(): void {
    this.api.getAppetiteConfig().subscribe({ next: (d) => this.appetiteConfig.set(d), error: (e) => devError("[API]", e) });
    this.api.getAppetiteBreaches().subscribe({ next: (d) => this.appetiteBreaches.set(d), error: (e) => devError("[API]", e) });
    this.api.getAcceptanceQueue().subscribe({ next: (d) => this.acceptanceQueue.set(d), error: (e) => devError("[API]", e) });
    this.api.getAppetiteTrends().subscribe({ next: (d) => this.appetiteTrends.set(d), error: (e) => devError("[API]", e) });
  }

  requestAcceptance(riskId: string): void {
    this.api.requestAcceptance(riskId, { reason: 'Residual risk exceeds appetite threshold' }).subscribe({
      next: () => this.toast('success', this.i18n.translate('common.acceptanceRequested')),
      error: () => this.toast('error', this.i18n.translate('common.failedToRequestAcceptance')),
    });
  }

  approveAcceptance(riskId: string, decision: string): void {
    this.api.approveAcceptance(riskId, { decision }).subscribe({
      next: () => { this.toast('success', this.i18n.translate('common.riskDecisionApplied', { decision })); this.loadAppetite(); },
      error: () => this.toast('error', this.i18n.translate('common.failedToProcessAcceptance')),
    });
  }

  // ═══ SHARED ═══
  scoreClass(score: number): string {
    if (score >= 20) return 'score-danger';
    if (score >= 12) return 'score-warning';
    return 'score-success';
  }

  onFilterChange(): void {
    this.loadOverview();
  }

  onSearchChange(): void {
    // Triggers computed registerData filtering
  }

  launchReview(): void {
    this.toast('info', this.i18n.translate('common.riskReviewCycleInitiated'));
  }

  exportRegister(): void {
    this.api.exportRegister().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'risk-register.csv'; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast('error', this.i18n.translate('common.failedToExportRiskRegister')),
    });
  }

  private toast(severity: string, detail: string): void {
    const summary =
      severity === 'error'
        ? this.i18n.translate('common.error')
        : severity === 'warn'
          ? this.i18n.translate('common.warning')
          : severity === 'info'
            ? this.i18n.translate('common.info')
            : this.i18n.translate('common.success');
    this.msg.add({ severity, summary, detail, life: 3000 });
  }

}

// ═══ Bilingual Labels ═══
const EN = {
  pageTitle: 'Risk',
  pageSubtitle: 'Risk command workspace — identify, prioritize, treat, and govern exposure',
  overview: 'Risk Overview',
  register: 'Risk Register',
  heatmap: 'Heatmap',
  treatments: 'Treatments',
  kriTrends: 'KRIs & Trends',
  appetite: 'Risk Appetite',
  totalRisks: 'Total Risks',
  highRisks: 'High Risks',
  criticalRisks: 'Critical Risks',
  mediumRisks: 'Medium Risks',
  lowRisks: 'Low Risks',
  overdueTreatments: 'Overdue Treatments',
  appetiteBreaches: 'Appetite Breaches',
  risksWithoutOwner: 'Without Owner',
  createRisk: 'Create Risk',
  editRisk: 'Edit Risk',
  importBaseline: 'Import Baseline',
  launchReview: 'Launch Review',
  exportRegister: 'Export Register',
  filterByCategory: 'Filter by Category',
  filterByStatus: 'Filter by Status',
  search: 'Search risks...',
  distribution: 'Risk Distribution',
  topExposure: 'Top Exposure',
  escalationSummary: 'Escalation Summary',
  title: 'Title',
  description: 'Description',
  category: 'Category',
  owner: 'Owner',
  status: 'Status',
  inherent: 'Inherent',
  residual: 'Residual',
  inherentScore: 'Inherent Score',
  residualScore: 'Residual Score',
  treatment: 'Treatment',
  treatmentStatus: 'Treatment Status',
  actions: 'Actions',
  risks: 'risks',
  likelihood: 'Likelihood',
  impact: 'Impact',
  save: 'Save',
  cancel: 'Cancel',
  noData: 'No data available',
  emptyRisks: 'No risks in register yet. Create your first risk or import a baseline.',
  emptyRegister: 'No risks found. Create risks or import a baseline to get started.',
  emptyHeatmap: 'Heatmap will appear after risks are created and assessed.',
  emptyTreatments: 'No treatment plans created yet.',
  emptyKRI: 'No KRIs configured yet.',
  emptyAppetite: 'Risk appetite is not configured yet. Configure appetite to enable breach monitoring.',
  inherentView: 'Inherent',
  residualView: 'Residual',
  cellDetail: 'Cell Detail',
  listView: 'List',
  boardView: 'Board',
  createTreatment: 'Create Treatment',
  linkedRisk: 'Linked Risk',
  strategy: 'Strategy',
  targetDate: 'Target Date',
  overdue: 'Overdue',
  kriRegister: 'KRI Register',
  createKRI: 'Create KRI',
  name: 'Name',
  threshold: 'Threshold',
  currentValue: 'Value',
  trend: 'Trend',
  lastUpdated: 'Last Updated',
  breachLog: 'Breach & Alert Log',
  date: 'Date',
  value: 'Value',
  noBreaches: 'No breaches recorded.',
  reviewCadence: 'Review Cadence',
  onTime: 'On Time',
  stale: 'Stale',
  appetiteSettings: 'Appetite Settings',
  model: 'Model',
  lastApproved: 'Last Approved',
  authority: 'Authority',
  configureAppetite: 'Configure Appetite',
  risk: 'Risk',
  breach: 'Breach',
  breaches: 'breaches',
  accepted: 'accepted',
  escalation: 'Escalation',
  acceptanceQueue: 'Acceptance Queue',
  noAcceptancePending: 'No acceptance decisions pending.',
  appetiteTrend: 'Appetite Trend by Category',
  severity: 'Severity',
  coreFields: 'Core Fields',
  scoring: 'Scoring',
  linkedControls: 'Linked Controls',
  linkedEvidence: 'Linked Evidence',
  governance: 'Governance',
  noGovernanceData: 'No governance records yet.',
};

const AR: typeof EN = {
  pageTitle: 'المخاطر',
  pageSubtitle: 'مساحة عمل المخاطر — تحديد وترتيب ومعالجة وحوكمة التعرض',
  overview: 'نظرة عامة على المخاطر',
  register: 'سجل المخاطر',
  heatmap: 'خريطة الحرارة',
  treatments: 'المعالجات',
  kriTrends: 'مؤشرات المخاطر والاتجاهات',
  appetite: 'شهية المخاطر',
  totalRisks: 'إجمالي المخاطر',
  highRisks: 'المخاطر العالية',
  criticalRisks: 'المخاطر الحرجة',
  mediumRisks: 'المخاطر المتوسطة',
  lowRisks: 'المخاطر المنخفضة',
  overdueTreatments: 'المعالجات المتأخرة',
  appetiteBreaches: 'تجاوزات الشهية',
  risksWithoutOwner: 'بدون مسؤول',
  createRisk: 'إنشاء خطر',
  editRisk: 'تعديل الخطر',
  importBaseline: 'استيراد خط الأساس',
  launchReview: 'بدء المراجعة',
  exportRegister: 'تصدير السجل',
  filterByCategory: 'تصفية حسب الفئة',
  filterByStatus: 'تصفية حسب الحالة',
  search: 'بحث في المخاطر...',
  distribution: 'توزيع المخاطر',
  topExposure: 'أعلى التعرض',
  escalationSummary: 'ملخص التصعيد',
  title: 'العنوان',
  description: 'الوصف',
  category: 'الفئة',
  owner: 'المسؤول',
  status: 'الحالة',
  inherent: 'الكامن',
  residual: 'المتبقي',
  inherentScore: 'الدرجة الكامنة',
  residualScore: 'الدرجة المتبقية',
  treatment: 'المعالجة',
  treatmentStatus: 'حالة المعالجة',
  actions: 'الإجراءات',
  risks: 'مخاطر',
  likelihood: 'الاحتمالية',
  impact: 'التأثير',
  save: 'حفظ',
  cancel: 'إلغاء',
  noData: 'لا توجد بيانات',
  emptyRisks: 'لا توجد مخاطر في السجل بعد. أنشئ أول خطر أو استورد خط أساس.',
  emptyRegister: 'لم يتم العثور على مخاطر. أنشئ مخاطر أو استورد خط أساس للبدء.',
  emptyHeatmap: 'ستظهر خريطة الحرارة بعد إنشاء المخاطر وتقييمها.',
  emptyTreatments: 'لم يتم إنشاء خطط معالجة بعد.',
  emptyKRI: 'لم يتم تكوين مؤشرات المخاطر بعد.',
  emptyAppetite: 'لم يتم تكوين شهية المخاطر بعد. قم بتكوين الشهية لتمكين مراقبة التجاوزات.',
  inherentView: 'كامن',
  residualView: 'متبقي',
  cellDetail: 'تفاصيل الخلية',
  listView: 'قائمة',
  boardView: 'لوحة',
  createTreatment: 'إنشاء معالجة',
  linkedRisk: 'الخطر المرتبط',
  strategy: 'الاستراتيجية',
  targetDate: 'التاريخ المستهدف',
  overdue: 'متأخر',
  kriRegister: 'سجل مؤشرات المخاطر',
  createKRI: 'إنشاء مؤشر',
  name: 'الاسم',
  threshold: 'الحد',
  currentValue: 'القيمة',
  trend: 'الاتجاه',
  lastUpdated: 'آخر تحديث',
  breachLog: 'سجل التجاوزات والتنبيهات',
  date: 'التاريخ',
  value: 'القيمة',
  noBreaches: 'لا توجد تجاوزات مسجلة.',
  reviewCadence: 'إيقاع المراجعة',
  onTime: 'في الوقت',
  stale: 'متقادمة',
  appetiteSettings: 'إعدادات الشهية',
  model: 'النموذج',
  lastApproved: 'آخر اعتماد',
  authority: 'الجهة المعتمدة',
  configureAppetite: 'تكوين الشهية',
  risk: 'الخطر',
  breach: 'التجاوز',
  breaches: 'تجاوزات',
  accepted: 'مقبولة',
  escalation: 'التصعيد',
  acceptanceQueue: 'قائمة القبول',
  noAcceptancePending: 'لا توجد قرارات قبول معلقة.',
  appetiteTrend: 'اتجاه الشهية حسب الفئة',
  severity: 'الخطورة',
  coreFields: 'الحقول الأساسية',
  scoring: 'التسجيل',
  linkedControls: 'الضوابط المرتبطة',
  linkedEvidence: 'الأدلة المرتبطة',
  governance: 'الحوكمة',
  noGovernanceData: 'لا توجد سجلات حوكمة بعد.',

};
