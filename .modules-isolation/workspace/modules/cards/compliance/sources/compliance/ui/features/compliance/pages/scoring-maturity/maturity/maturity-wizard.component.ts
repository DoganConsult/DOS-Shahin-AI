import { MessageService, ConfirmationService } from '@app/services/toast.service';
import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StorageService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import Chart from 'chart.js/auto';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcOperationsService } from '@app/api';
import { ButtonModule, NotificationModule, ProgressIndicatorModule, RadioModule, TagModule, TilesModule } from 'carbon-components-angular';

interface Question {
  question_id: string; category: string; domain: string;
  text_en: string; text_ar: string; answer_type: string;
  options_en: string[] | null; options_ar: string[] | null;
  weight: number; sort_order: number; tags: string[];
}

interface CategoryInfo { category: string; question_count: number; }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-maturity-wizard',
    imports: [CommonModule, FormsModule, PageShellComponent, ButtonModule, TilesModule, ProgressIndicatorModule, TagModule, RadioModule, NotificationModule],
    providers: [],
    templateUrl: './maturity-wizard.component.html',
    styleUrls: ['./maturity-wizard.component.scss']
})
export class MaturityWizardComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  starting = false;
  calculating = false;
  deploying = false;
  step: 'intro' | 'questions' | 'results' = 'intro';

  categories: CategoryInfo[] = [];
  allQuestions: Question[] = [];
  currentCategory = '';
  categoryIndex = 0;
  currentQuestions: Question[] = [];
  currentQIndex = 0;
  completedCategories = new Set<string>();
  answers: Record<string, any> = {};
  assessmentId = '';

  overallScore = 0;
  maturityLevel = 'initial';
  domainScores: Record<string, number> = {};
  domainScoreList: { domain: string; score: number }[] = [];
  deployResult: string[] | null = null;
  buildingWorkspace = false;

  private chart: Chart | null = null;
  private _storage = inject(StorageService);
  private _message = inject(MessageService);

  constructor(public i18n: I18nService, private router: Router, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.complianceSvc.getMaturityCategories().subscribe({
      next: (r: Record<string, any>) => { this.categories = r.categories || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get currentQuestion(): Question | null {
    return this.currentQuestions[this.currentQIndex] || null;
  }

  get isLastQuestion(): boolean {
    return this.categoryIndex === this.categories.length - 1 && this.currentQIndex === this.currentQuestions.length - 1;
  }

  get overallProgress(): number {
    const totalQ = this.categories.reduce((s, c) => s + c.question_count, 0);
    const answered = Object.keys(this.answers).length;
    return totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;
  }

  startAssessment(): void {
    this.starting = true;
    this.complianceSvc.startMaturityAssessment().subscribe({
      next: (a: Record<string, any>) => {
        this.assessmentId = a.assessment_id;
        this.starting = false;
        this.cdr.markForCheck();
        this.loadCategory(0);
        this.step = 'questions';
      },
      error: () => { this.starting = false; this.cdr.markForCheck(); }
    });
  }

  loadCategory(index: number): void {
    if (index >= this.categories.length) return;
    this.categoryIndex = index;
    this.currentCategory = this.categories[index].category;
    this.currentQIndex = 0;
    this.complianceSvc.getMaturityQuestions(this.currentCategory).subscribe({
      next: (r: Record<string, any>) => { this.currentQuestions = r.questions || []; this.cdr.markForCheck(); },
      error: () => { this.currentQuestions = []; this.cdr.markForCheck(); }
    });
  }

  switchCategory(cat: string): void {
    const idx = this.categories.findIndex(c => c.category === cat);
    if (idx >= 0) this.loadCategory(idx);
  }

  setAnswer(qid: string, value: unknown): void {
    this.answers[qid] = value;
  }

  isMultiSelected(qid: string, opt: string): boolean {
    return Array.isArray(this.answers[qid]) && this.answers[qid].includes(opt);
  }

  toggleMulti(qid: string, opt: string): void {
    if (!Array.isArray(this.answers[qid])) this.answers[qid] = [];
    const idx = this.answers[qid].indexOf(opt);
    if (idx >= 0) this.answers[qid].splice(idx, 1);
    else this.answers[qid].push(opt);
  }

  nextQuestion(): void {
    if (this.currentQIndex < this.currentQuestions.length - 1) {
      this.currentQIndex++;
    } else {
      this.completedCategories.add(this.currentCategory);
      this.saveCategoryResponses();
      if (this.categoryIndex < this.categories.length - 1) {
        this.loadCategory(this.categoryIndex + 1);
      }
    }
  }

  prevQuestion(): void {
    if (this.currentQIndex > 0) {
      this.currentQIndex--;
    } else if (this.categoryIndex > 0) {
      this.loadCategory(this.categoryIndex - 1);
      setTimeout(() => { this.currentQIndex = Math.max(0, this.currentQuestions.length - 1); }, 300);
    }
  }

  finishAssessment(): void {
    this.completedCategories.add(this.currentCategory);
    this.calculating = true;
    this.saveCategoryResponses();
    setTimeout(() => {
      this.complianceSvc.getMaturityScore(this.assessmentId).subscribe({
        next: (r: Record<string, any>) => {
          this.overallScore = r.overallScore;
          this.maturityLevel = r.level;
          this.domainScores = r.domainScores || {};
          this.domainScoreList = Object.entries(this.domainScores).map(([domain, score]) => ({ domain, score: score as number })).sort((a, b) => b.score - a.score);
          this.calculating = false;
          this.cdr.markForCheck();
          this.step = 'results';
          setTimeout(() => this.renderRadarChart(), 200);
        },
        error: () => { this.calculating = false; this.cdr.markForCheck(); }
      });
    }, 500);
  }

  autoDeploy(): void {
    this.deploying = true;
    this.complianceSvc.autoDeployMaturity(this.assessmentId).subscribe({
      next: (r: Record<string, any>) => { this.deployResult = r.deployed || []; this.deploying = false; this.cdr.markForCheck(); },
      error: () => { this.deploying = false; this.cdr.markForCheck(); }
    });
  }

  buildWorkspace(): void {
    if (!this.assessmentId) return;
    this.buildingWorkspace = true;
    this.cdr.markForCheck();
    this.operationsSvc.buildWorkspaceFromAssessment({
      assessmentId: this.assessmentId,
      orgName: 'My Organization',
      industry: 'other',
      orgSize: '1-50',
      regions: [],
    }).subscribe({
      next: (res) => {
        this.buildingWorkspace = false;
        this.cdr.markForCheck();
        const rr = res as any;
        const jobId = rr.jobId ?? rr.job_id;
        const tenantId = rr.tenantId ?? rr.workspace?.tenantId ?? rr.tenant_id;
        if (jobId) this._storage.set('grc_provisioning_job_id', jobId);
        if (tenantId) this._storage.set('grc_tenant_id', tenantId);
        if (rr.inferenceSummary) {
          try {
            this._storage.set('grc_inference_summary', JSON.stringify(rr.inferenceSummary));
          } catch { /* non-fatal */ }
        }
        this.router.navigateByUrl('/provisioning-status');
      },
      error: (err) => {
        this.buildingWorkspace = false;
        this.cdr.markForCheck();
        this._message.add({
          severity: 'error',
          summary: this.i18n.translate('maturityWizard.buildWorkspaceError') || 'Create workspace failed',
          detail: err?.error?.error || err?.message || 'Failed to start workspace creation',
          life: 6000,
        });
      },
    });
  }

  private saveCategoryResponses(): void {
    const responses = this.currentQuestions
      .filter(q => this.answers[q.question_id] !== undefined)
      .map(q => ({
        question_id: q.question_id,
        answer: this.answers[q.question_id],
        score: this.computeScore(q, this.answers[q.question_id]),
      }));
    if (responses.length > 0) {
      this.complianceSvc.saveMaturityResponses(this.assessmentId, responses as any).subscribe();
    }
  }

  private computeScore(q: Question, answer: Record<string, any>): number {
    if (q.answer_type === 'scale') return typeof answer === 'number' ? answer : 0;
    if (q.answer_type === 'boolean') return (answer as any) === true ? 5 : 1;
    if (q.answer_type === 'single' && q.options_en) {
      const idx = q.options_en.indexOf(answer as any);
      return idx >= 0 ? Math.round(((idx + 1) / q.options_en.length) * 5) : 0;
    }
    if (q.answer_type === 'multi') return Array.isArray(answer) ? Math.min(5, answer.length) : 0;
    return 0;
  }

  private renderRadarChart(): void {
    if (!this.radarChartRef?.nativeElement || this.domainScoreList.length === 0) return;
    this.chart?.destroy();
    this.chart = new Chart(this.radarChartRef.nativeElement, {
      type: 'radar',
      data: {
        labels: this.domainScoreList.map(d => this.formatCategory(d.domain)),
        datasets: [{
          label: this.i18n.translate('maturityWizard.maturityLabel'),
          data: this.domainScoreList.map(d => d.score),
          backgroundColor: 'rgba(var(--module-accent-sky-rgb), 0.15)',
          borderColor: '#0ea5e9',
          borderWidth: 2,
          pointBackgroundColor: '#0ea5e9',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 10 } }, pointLabels: { font: { size: 11 } } } },
        plugins: { legend: { display: false } },
      },
    });
  }

  formatCategory(cat: string): string {
    const map: Record<string, string> = {
      org_profile: this.i18n.translate('maturityWizard.catOrganization'),
      governance: this.i18n.translate('maturityWizard.catGovernance'),
      risk: this.i18n.translate('maturityWizard.catRisk'),
      compliance: this.i18n.translate('maturityWizard.catCompliance'),
      security: this.i18n.translate('maturityWizard.catSecurity'),
      bcp: this.i18n.translate('maturityWizard.catBcp'),
      vendor: this.i18n.translate('maturityWizard.catVendors'),
      audit: this.i18n.translate('maturityWizard.catAudit'),
      privacy: this.i18n.translate('maturityWizard.catPrivacy'),
      technology: this.i18n.translate('maturityWizard.catTechnology'),
    };
    return map[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getScaleLabel(level: number): string {
    const keys = [
      'maturityWizard.scaleAdHoc',
      'maturityWizard.scaleBasic',
      'maturityWizard.scaleDefined',
      'maturityWizard.scaleMeasured',
      'maturityWizard.scaleOptimized',
    ];
    return this.i18n.translate(keys[level - 1]) || '';
  }

  getLevelSeverity(): 'danger' | 'warning' | 'info' | 'success' | undefined {
    const map: Record<string, any> = { initial: 'danger', managed: 'warning', defined: 'info', measured: 'info', optimized: 'success' };
    return map[this.maturityLevel];
  }

}
