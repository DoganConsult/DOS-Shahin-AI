import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceApiService } from '@compliance-module/ui/features/compliance/services/compliance-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import {  ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, ProgressIndicatorModule, TableModule, TabsModule, TagModule, TilesModule, TooltipModule, UIShellModule  } from 'carbon-components-angular';
import {
  ComplianceOverviewDto, FrameworkSummaryDto, FrameworkDetailDto,
  FrameworkComparisonDto, DomainSummaryDto, DomainDetailDto,
  ObligationRowDto, ObligationDetailDto, ComplianceGapDto,
  GapDetailDto, ComplianceRoadmapDto, AuditReadinessDto,
  CoverageMatrixDto, ComplianceIssueDto,
} from './compliance.models';
import { GrcFormFieldComponent } from '@app/widgets';
import { MessageService } from '@app/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-compliance',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, GrcDataTableComponent, StatusBadgeComponent, StatCardComponent,
    TabsModule, TableModule, ProgressIndicatorModule,
    UIShellModule, InputModule, ButtonModule, TilesModule, TagModule,
    DropdownModule, TooltipModule, DialogModule, TagModule,
    AiPanelComponent, NotificationModule, GrcFormFieldComponent,
  ],
  providers: [],
  templateUrl: './compliance.component.html',
  styleUrls: ['./compliance.component.scss'],
})
export class ComplianceComponent implements OnInit {
  private api = inject(ComplianceApiService);
  private msg = inject(MessageService);
  public i18n = inject(I18nService);

  // ═══ State ═══
  loading = signal(true);
  tabIndex = 0;

  // Overview
  overview = signal<ComplianceOverviewDto | null>(null);
  sum = computed(() => this.overview()?.summary);

  // Frameworks
  frameworks = signal<FrameworkSummaryDto[]>([]);
  selectedFw = signal<FrameworkDetailDto | null>(null);
  fwComparison = signal<FrameworkComparisonDto[]>([]);
  fwDetailLoading = false;
  fwCompareVisible = false;

  // Domains
  domains = signal<DomainSummaryDto[]>([]);
  selectedDomain = signal<DomainDetailDto | null>(null);
  domainDetailLoading = false;
  domainHeatView = false;

  // Obligations
  obligations = signal<ObligationRowDto[]>([]);
  selectedObl = signal<ObligationDetailDto | null>(null);
  oblDetailLoading = false;
  oblCoverageMatrix = signal<CoverageMatrixDto | null>(null);
  oblMatrixVisible = false;

  // Gaps
  gaps = signal<ComplianceGapDto[]>([]);
  selectedGap = signal<GapDetailDto | null>(null);
  gapDetailLoading = false;
  gapSeverityFilter = '';
  newRemTitle = '';
  newRemDialogVisible = false;
  activeGapId = '';

  // Roadmap
  roadmap = signal<ComplianceRoadmapDto | null>(null);

  // Audit Readiness
  auditReadiness = signal<AuditReadinessDto | null>(null);

  // Filters
  fwFilter = '';
  fwFilterOptions: { label: string; value: string }[] = [];
  searchTerm = '';
  oblStatusFilter = '';

  // ═══ Labels ═══
  L = computed(() => this.i18n.currentLang() === 'ar' ? AR : EN);

  ngOnInit(): void {
    this.loadOverview();
  }

  onTabChange(idx: number): void {
    this.tabIndex = idx;
    if (idx === 1 && this.frameworks().length === 0) this.loadFrameworks();
    if (idx === 2 && this.domains().length === 0) this.loadDomains();
    if (idx === 3 && this.obligations().length === 0) this.loadObligations();
    if (idx === 4 && this.gaps().length === 0) this.loadGaps();
    if (idx === 5 && !this.roadmap()) this.loadRoadmap();
  }

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW
  // ═══════════════════════════════════════════════════════════════

  loadOverview(): void {
    this.loading.set(true);
    this.api.getOverview().subscribe({
      next: (d) => {
        this.overview.set(d);
        this.loading.set(false);
        this.fwFilterOptions = [
          { label: this.i18n.translate('compliance.allFrameworks'), value: '' },
          ...d.frameworks.map(f => ({ label: f.frameworkName, value: f.frameworkId })),
        ];
      },
      error: () => this.loading.set(false),
    });
  }

  scoreColor(score: number): string {
    return score >= 70 ? 'var(--green-500, var(--success))' : score >= 40 ? 'var(--yellow-500, #eab308)' : 'var(--red-500, var(--error))';
  }

  scoreClass(score: number): string {
    return score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad';
  }

  severityColor(sev: string): string {
    const map: Record<string, string> = { critical: 'var(--error)', high: '#ea580c', medium: '#ca8a04', low: '#2563eb' };
    return map[sev] || '#6b7280';
  }

  // ═══════════════════════════════════════════════════════════════
  // FRAMEWORKS
  // ═══════════════════════════════════════════════════════════════

  loadFrameworks(): void {
    this.api.getFrameworks().subscribe({ next: (d) => this.frameworks.set(d), error: (e) => devError("[API]", e) });
  }

  openFrameworkDetail(code: string): void {
    this.fwDetailLoading = true;
    this.api.getFrameworkDetail(code).subscribe({
      next: (d) => { this.selectedFw.set(d as any); this.fwDetailLoading = false; },
      error: () => { this.fwDetailLoading = false; this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadFramework'), life: 3000 }); },
    });
  }

  closeFrameworkDetail(): void { this.selectedFw.set(null); }

  openFwComparison(): void {
    this.api.getFrameworkComparison().subscribe({
      next: (d) => { this.fwComparison.set(d); this.fwCompareVisible = true; },
      error: (e) => devError("[API]", e),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAINS
  // ═══════════════════════════════════════════════════════════════

  loadDomains(): void {
    this.api.getDomains(this.fwFilter || undefined).subscribe({ next: (d) => this.domains.set(d), error: (e) => devError("[API]", e) });
  }

  openDomainDetail(nodeId: string): void {
    this.domainDetailLoading = true;
    this.api.getDomainDetail(nodeId).subscribe({
      next: (d) => { this.selectedDomain.set(d as any); this.domainDetailLoading = false; },
      error: () => { this.domainDetailLoading = false; },
    });
  }

  closeDomainDetail(): void { this.selectedDomain.set(null); }

  toggleDomainHeat(): void { this.domainHeatView = !this.domainHeatView; }

  domainHeatColor(score: number): string {
    if (score >= 80) return '#dcfce7';
    if (score >= 60) return '#fef9c3';
    if (score >= 40) return '#fed7aa';
    return 'var(--status-danger-bg, #fff1f1)';
  }

  // ═══════════════════════════════════════════════════════════════
  // OBLIGATIONS
  // ═══════════════════════════════════════════════════════════════

  loadObligations(): void {
    this.api.getObligations(this.fwFilter || undefined).subscribe({ next: (d) => this.obligations.set(d), error: (e) => devError("[API]", e) });
  }

  openOblDetail(nodeId: string): void {
    this.oblDetailLoading = true;
    this.api.getObligationDetail(nodeId).subscribe({
      next: (d) => { this.selectedObl.set(d); this.oblDetailLoading = false; },
      error: () => { this.oblDetailLoading = false; },
    });
  }

  closeOblDetail(): void { this.selectedObl.set(null); }

  openCoverageMatrix(): void {
    if (!this.fwFilter) {
      this.msg.add({ severity: 'warn', summary: this.i18n.translate('compliance.selectFramework'), detail: this.i18n.translate('compliance.selectAFrameworkFirst'), life: 3000 });
      return;
    }
    this.api.getCoverageMatrix(this.fwFilter).subscribe({
      next: (d) => { this.oblCoverageMatrix.set(d); this.oblMatrixVisible = true; },
      error: (e) => devError("[API]", e),
    });
  }

  filteredObligations = computed(() => {
    let list = this.obligations();
    if (this.oblStatusFilter) list = list.filter(o => o.status === this.oblStatusFilter);
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(o => o.titleEn.toLowerCase().includes(t) || o.code.toLowerCase().includes(t));
    }
    return list;
  });

  // ═══════════════════════════════════════════════════════════════
  // GAPS
  // ═══════════════════════════════════════════════════════════════

  loadGaps(): void {
    this.api.getGaps(this.fwFilter || undefined, this.gapSeverityFilter || undefined, undefined, 1, 500).subscribe({
      next: (d) => this.gaps.set(d?.items ?? []), error: (e) => devError("[API]", e),
    });
  }

  openGapDetail(id: string): void {
    this.gapDetailLoading = true;
    this.api.getGapDetail(id).subscribe({
      next: (d) => { this.selectedGap.set(d); this.gapDetailLoading = false; },
      error: () => { this.gapDetailLoading = false; },
    });
  }

  closeGapDetail(): void { this.selectedGap.set(null); }

  updateGapStatus(gapId: string, status: string): void {
    this.api.updateGap(gapId, { status }).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.updated'), detail: this.i18n.translate('common.statusTo', { status: status.replace(/_/g, ' ') }), life: 3000 });
        this.loadGaps();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToUpdateGap'), life: 3000 }),
    });
  }

  openNewRemDialog(gapId: string): void {
    this.activeGapId = gapId;
    this.newRemTitle = '';
    this.newRemDialogVisible = true;
  }

  createRemediation(): void {
    if (!this.newRemTitle.trim()) return;
    this.api.createGapRemediation(this.activeGapId, { title: this.newRemTitle }).subscribe({
      next: () => {
        this.newRemDialogVisible = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.created'), detail: this.i18n.translate('common.remediationTaskCreated'), life: 3000 });
        this.loadGaps();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateTask'), life: 3000 }),
    });
  }

  gapsByPriority = computed(() => {
    const g = this.gaps();
    return {
      critical: g.filter(x => x.severity === 'critical').length,
      high: g.filter(x => x.severity === 'high').length,
      medium: g.filter(x => x.severity === 'medium').length,
      low: g.filter(x => x.severity === 'low').length,
    };
  });

  // ═══════════════════════════════════════════════════════════════
  // ROADMAP
  // ═══════════════════════════════════════════════════════════════

  loadRoadmap(): void {
    this.api.getRoadmap().subscribe({ next: (d) => this.roadmap.set(d), error: (e) => devError("[API]", e) });
    this.api.getAuditReadiness().subscribe({ next: (d) => this.auditReadiness.set(d), error: (e) => devError("[API]", e) });
  }

  phaseStatusClass(phase: GrcRecord): string {
    if (!phase.milestones) return '';
    const tasks = phase.milestones.flatMap((m) => m.tasks || []);
    const done = tasks.filter((t) => t.status === 'completed').length;
    if (done === tasks.length && tasks.length > 0) return 'phase-done';
    if (done > 0) return 'phase-active';
    return 'phase-pending';
  }

  phaseCompletion(phase: GrcRecord): number {
    if (!phase.milestones) return 0;
    const tasks = phase.milestones.flatMap((m) => m.tasks || []);
    const done = tasks.filter((t) => t.status === 'completed').length;
    return tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // FILTER
  // ═══════════════════════════════════════════════════════════════

  onFwFilterChange(): void {
    if (this.tabIndex === 2) this.loadDomains();
    else if (this.tabIndex === 3) this.loadObligations();
    else if (this.tabIndex === 4) this.loadGaps();
  }

}

// ═══ Bilingual labels ═══
const EN = {
  pageTitle: 'Compliance',
  pageSubtitle: 'Compliance command workspace — frameworks, domains, obligations, gaps, remediation, and audit readiness',
  overview: 'Compliance Overview',
  frameworks: 'Frameworks',
  domains: 'Domains',
  obligations: 'Obligations',
  gapAssessment: 'Gap Assessment',
  roadmap: 'Compliance Roadmap',
  overallScore: 'Compliance Score',
  activeFrameworks: 'Active Frameworks',
  openGaps: 'Open Gaps',
  criticalGaps: 'Critical Gaps',
  obligationsCovered: 'Obligations Covered',
  controlsMapped: 'Controls Mapped',
  evidenceCoverage: 'Evidence Coverage',
  auditReadiness: 'Audit Readiness',
  overdueActions: 'Overdue Actions',
  frameworkPosture: 'Framework Posture',
  domainHealth: 'Domain Health',
  priorityIssues: 'Priority Issues',
  score: 'Score',
  status: 'Status',
  controls: 'Controls',
  evidence: 'Evidence',
  owner: 'Owner',
  category: 'Category',
  action: 'Action',
  code: 'Code',
  name: 'Name',
  domain: 'Domain',
  framework: 'Framework',
  coverage: 'Coverage',
  severity: 'Severity',
  dueDate: 'Due Date',
  description: 'Description',
  obligation: 'Obligation',
  implemented: 'Implemented',
  comparison: 'Compare Frameworks',
  coverageMatrix: 'Coverage Matrix',
  heatView: 'Heat View',
  tableView: 'Table View',
  details: 'Details',
  close: 'Close',
  createRemediation: 'Create Remediation',
  startRemediation: 'Start Remediation',
  emptyFrameworks: 'No frameworks are active yet. Enable frameworks from Onboarding scope.',
  emptyDomains: 'Framework domains will appear after framework initialization.',
  emptyObligations: 'No obligation data available. Assessments must be run first.',
  emptyGaps: 'No open gaps detected. Review assessment coverage.',
  emptyRoadmap: 'No compliance roadmap generated yet.',
  allFrameworks: 'All Frameworks',
  filterByFramework: 'Filter by framework',
  phase: 'Phase',
  milestone: 'Milestone',
  tasks: 'Tasks',
  completion: 'Completion',
  totalTasks: 'Total Tasks',
  completedTasks: 'Completed Tasks',
  readinessScore: 'Readiness Score',
  tested: 'Tested',
  withEvidence: 'With Evidence',
  fullyReady: 'Fully Ready',
};

const AR: typeof EN = {
  pageTitle: 'الالتزام',
  pageSubtitle: 'مساحة عمل الالتزام — الأطر، المجالات، الالتزامات، الفجوات، المعالجة، وجاهزية التدقيق',
  overview: 'نظرة عامة على الالتزام',
  frameworks: 'الأطر',
  domains: 'المجالات',
  obligations: 'الالتزامات',
  gapAssessment: 'تقييم الفجوات',
  roadmap: 'خارطة طريق الالتزام',
  overallScore: 'درجة الالتزام',
  activeFrameworks: 'الأطر النشطة',
  openGaps: 'الفجوات المفتوحة',
  criticalGaps: 'الفجوات الحرجة',
  obligationsCovered: 'الالتزامات المغطاة',
  controlsMapped: 'الضوابط المربوطة',
  evidenceCoverage: 'تغطية الأدلة',
  auditReadiness: 'جاهزية التدقيق',
  overdueActions: 'الإجراءات المتأخرة',
  frameworkPosture: 'وضع الأطر',
  domainHealth: 'صحة المجالات',
  priorityIssues: 'قضايا ذات أولوية',
  score: 'الدرجة',
  status: 'الحالة',
  controls: 'الضوابط',
  evidence: 'الأدلة',
  owner: 'المسؤول',
  category: 'الفئة',
  action: 'إجراء',
  code: 'الكود',
  name: 'الاسم',
  domain: 'المجال',
  framework: 'الإطار',
  coverage: 'التغطية',
  severity: 'الخطورة',
  dueDate: 'تاريخ الاستحقاق',
  description: 'الوصف',
  obligation: 'الالتزام',
  implemented: 'مطبّق',
  comparison: 'مقارنة الأطر',
  coverageMatrix: 'مصفوفة التغطية',
  heatView: 'عرض حراري',
  tableView: 'عرض جدول',
  details: 'التفاصيل',
  close: 'إغلاق',
  createRemediation: 'إنشاء معالجة',
  startRemediation: 'بدء المعالجة',
  emptyFrameworks: 'لا توجد أطر نشطة بعد. فعّل الأطر من نطاق الإعداد.',
  emptyDomains: 'ستظهر مجالات الإطار بعد تهيئة الأطر.',
  emptyObligations: 'لا توجد بيانات التزامات. يجب تشغيل التقييمات أولاً.',
  emptyGaps: 'لم يتم اكتشاف فجوات مفتوحة. راجع تغطية التقييم.',
  emptyRoadmap: 'لم يتم إنشاء خارطة طريق الالتزام بعد.',
  allFrameworks: 'جميع الأطر',
  filterByFramework: 'تصفية حسب الإطار',
  phase: 'المرحلة',
  milestone: 'المعلم',
  tasks: 'المهام',
  completion: 'الإنجاز',
  totalTasks: 'إجمالي المهام',
  completedTasks: 'المهام المكتملة',
  readinessScore: 'درجة الجاهزية',
  tested: 'مختبرة',
  withEvidence: 'مع أدلة',
  fullyReady: 'جاهزة بالكامل',

};
