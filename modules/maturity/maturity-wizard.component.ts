import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StorageService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import Chart from 'chart.js/auto';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcOperationsService } from '@app/api';

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
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, ButtonModule, CardModule, ProgressBarModule, TagModule, RadioButtonModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />
    <app-page-shell
      icon="gauge"
      [title]="i18n.translate('maturityWizard.title')"
      [subtitle]="i18n.translate('maturityWizard.subtitle')"
      [breadcrumbs]="['Dashboard', 'Maturity Assessment']"
      [loading]="loading">

      <!-- Step: Intro -->
      <div *ngIf="step === 'intro'" class="intro-section">
        <div class="intro-card">
          <div class="intro-icon"><i class="pi pi-gauge"></i></div>
          <h2>{{ i18n.translate('maturityWizard.welcome') }}</h2>
          <p class="intro-desc">{{ i18n.translate('maturityWizard.welcomeDesc') }}</p>
          <div class="intro-stats">
            <div class="intro-stat" *ngFor="let c of categories">
              <span class="stat-count">{{ c.question_count }}</span>
              <span class="stat-label">{{ formatCategory(c.category) }}</span>
            </div>
          </div>
          <p-button [label]="i18n.translate('maturityWizard.startAssessment')"
                    icon="pi pi-arrow-right" iconPos="right" (onClick)="startAssessment()" [loading]="starting" />
        </div>
      </div>

      <!-- Step: Questions -->
      <div *ngIf="step === 'questions'" class="questions-section">
        <div class="progress-header">
          <div class="progress-info">
            <span class="progress-category">{{ formatCategory(currentCategory) }}</span>
            <span class="progress-count">{{ currentQIndex + 1 }} / {{ currentQuestions.length }}</span>
          </div>
          <p-progressBar [value]="overallProgress" [showValue]="true" styleClass="progress-bar" />
        </div>

        <!-- Category Tabs -->
        <div class="cat-tabs">
          <button *ngFor="let c of categories; let i = index" class="cat-tab"
                  [class.active]="c.category === currentCategory"
                  [class.done]="completedCategories.has(c.category)"
                  (click)="switchCategory(c.category)">
            <i class="pi" [ngClass]="completedCategories.has(c.category) ? 'pi-check-circle' : 'pi-circle'"></i>
            <span>{{ formatCategory(c.category) }}</span>
          </button>
        </div>

        <!-- Current Question -->
        <div class="question-card" *ngIf="currentQuestion">
          <div class="question-number">Q{{ currentQuestion.sort_order }}</div>
          <h3 class="question-text">{{ i18n.localize(currentQuestion.text_en, currentQuestion.text_ar) }}</h3>

          <!-- Scale Answer (1-5 Likert) -->
          <div *ngIf="currentQuestion.answer_type === 'scale'" class="scale-options">
            <button *ngFor="let level of [1,2,3,4,5]" class="scale-btn"
                    [class.selected]="answers[currentQuestion.question_id] === level"
                    (click)="setAnswer(currentQuestion.question_id, level)">
              <span class="scale-num">{{ level }}</span>
              <span class="scale-label">{{ getScaleLabel(level) }}</span>
            </button>
          </div>

          <!-- Boolean Answer -->
          <div *ngIf="currentQuestion.answer_type === 'boolean'" class="bool-options">
            <button class="bool-btn" [class.selected]="answers[currentQuestion.question_id] === true" (click)="setAnswer(currentQuestion.question_id, true)">
              <i class="pi pi-check"></i> {{ i18n.translate('maturityWizard.yes') }}
            </button>
            <button class="bool-btn" [class.selected]="answers[currentQuestion.question_id] === false" (click)="setAnswer(currentQuestion.question_id, false)">
              <i class="pi pi-times"></i> {{ i18n.translate('maturityWizard.no') }}
            </button>
          </div>

          <!-- Single Choice -->
          <div *ngIf="currentQuestion.answer_type === 'single'" class="single-options">
            <button *ngFor="let opt of (i18n.currentLang() === 'ar' ? currentQuestion.options_ar : currentQuestion.options_en) || []; let oi = index"
                    class="option-btn" [class.selected]="answers[currentQuestion.question_id] === opt"
                    (click)="setAnswer(currentQuestion.question_id, opt)">
              {{ opt }}
            </button>
          </div>

          <!-- Multi Choice -->
          <div *ngIf="currentQuestion.answer_type === 'multi'" class="multi-options">
            <button *ngFor="let opt of (i18n.currentLang() === 'ar' ? currentQuestion.options_ar : currentQuestion.options_en) || []"
                    class="option-btn" [class.selected]="isMultiSelected(currentQuestion.question_id, opt)"
                    (click)="toggleMulti(currentQuestion.question_id, opt)">
              <i class="pi" [ngClass]="isMultiSelected(currentQuestion.question_id, opt) ? 'pi-check-square' : 'pi-stop'"></i>
              {{ opt }}
            </button>
          </div>
        </div>

        <!-- Navigation -->
        <div class="nav-buttons">
          <p-button [label]="i18n.translate('maturityWizard.previous')" icon="pi pi-arrow-left"
                    severity="secondary" [text]="true" (onClick)="prevQuestion()" [disabled]="currentQIndex === 0 && categoryIndex === 0" />
          <p-button *ngIf="!isLastQuestion" [label]="i18n.translate('maturityWizard.next')" icon="pi pi-arrow-right"
                    iconPos="right" (onClick)="nextQuestion()" />
          <p-button *ngIf="isLastQuestion" [label]="i18n.translate('maturityWizard.viewResults')" icon="pi pi-chart-bar"
                    iconPos="right" severity="success" (onClick)="finishAssessment()" [loading]="calculating" />
        </div>
      </div>

      <!-- Step: Results -->
      <div *ngIf="step === 'results'" class="results-section">
        <div class="results-header">
          <div class="score-circle" [class.initial]="maturityLevel === 'initial'" [class.managed]="maturityLevel === 'managed'"
               [class.defined]="maturityLevel === 'defined'" [class.measured]="maturityLevel === 'measured'" [class.optimized]="maturityLevel === 'optimized'">
            <span class="score-value">{{ overallScore }}%</span>
            <span class="score-level">{{ maturityLevel | uppercase }}</span>
          </div>
          <div class="results-info">
            <h2>{{ i18n.translate('maturityWizard.resultsTitle') }}</h2>
            <p>{{ i18n.translate('maturityWizard.resultsDesc') }}</p>
            <p-tag [value]="maturityLevel | uppercase" [severity]="getLevelSeverity()" [rounded]="true" styleClass="level-tag" />
          </div>
        </div>

        <!-- Radar Chart -->
        <div class="chart-container">
          <canvas #radarChart></canvas>
        </div>

        <!-- Domain Score Cards -->
        <div class="domain-grid">
          <div *ngFor="let ds of domainScoreList" class="domain-card">
            <div class="domain-name">{{ formatCategory(ds.domain) }}</div>
            <div class="domain-bar-wrap">
              <div class="domain-bar" [style.width.%]="ds.score"
                   [class.low]="ds.score < 40" [class.mid]="ds.score >= 40 && ds.score < 70" [class.high]="ds.score >= 70"></div>
            </div>
            <span class="domain-score">{{ ds.score }}%</span>
          </div>
        </div>

        <!-- Auto-Deploy Button -->
        <div class="auto-deploy-section">
          <h3><i class="pi pi-bolt"></i> {{ i18n.translate('maturityWizard.autoDeploy') }}</h3>
          <p>{{ i18n.translate('maturityWizard.autoDeployDesc') }}</p>
          <p-button [label]="i18n.translate('maturityWizard.deployAutoSetup')"
                    icon="pi pi-bolt" (onClick)="autoDeploy()" [loading]="deploying" severity="success" />
          <div *ngIf="deployResult" class="deploy-result">
            <p-tag *ngFor="let item of deployResult" [value]="item" severity="info" styleClass="deploy-tag" />
          </div>
        </div>

        <!-- Build workspace (provisioning) -->
        <div class="build-workspace-section">
          <h3><i class="pi pi-building"></i> {{ i18n.translate('maturityWizard.buildWorkspace') || 'Create workspace' }}</h3>
          <p>{{ i18n.translate('maturityWizard.buildWorkspaceDesc') || 'Generate your GRC workspace from this assessment: frameworks, controls, evidence plan, and 90-day roadmap.' }}</p>
          <p-button label="Create workspace"
                    icon="pi pi-building" (onClick)="buildWorkspace()" [loading]="buildingWorkspace" severity="primary" />
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [`
    /* Intro */
    .intro-section { display: flex; justify-content: center; padding: 32px 0; }
    .intro-card {
      max-width: 700px; text-align: center; padding: 48px 40px;
      background: #fff; border-radius: var(--radius-xl); border: 1px solid #bae6fd;
      box-shadow: var(--shadow-lg);
    }
    .intro-icon { margin-bottom: 20px; }
    .intro-icon .pi { font-size: 48px; color: var(--primary); }
    .intro-card h2 { font-size: var(--font-size-2xl); font-weight: 800; color: #0c4a6e; margin: 0 0 12px; }
    .intro-desc { font-size: var(--font-size-base); color: var(--text-muted); line-height: 1.7; margin: 0 0 28px; }
    .intro-stats { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 28px; }
    .intro-stat { display: flex; flex-direction: column; align-items: center; padding: 10px 16px; background: var(--status-info-bg, #edf5ff); border-radius: var(--radius-md); min-width: 80px; }
    .stat-count { font-size: var(--font-size-xl); font-weight: 800; color: #0369a1; }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-muted); font-weight: 600; }

    /* Progress */
    .progress-header { margin-bottom: 20px; }
    .progress-info { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .progress-category { font-size: var(--font-size-base); font-weight: 700; color: #0c4a6e; }
    .progress-count { font-size: var(--font-size-sm); color: var(--text-muted); }

    /* Category Tabs */
    .cat-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
    .cat-tab {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px;
      border-radius: var(--radius-pill); border: 1.5px solid #e0f2fe; background: #fff;
      font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 200ms;
    }
    .cat-tab .pi { font-size: var(--font-size-sm); }
    .cat-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .cat-tab.done { color: var(--success); border-color: #bbf7d0; }
    .cat-tab.done .pi { color: var(--success); }

    /* Question Card */
    .question-card {
      background: #fff; padding: 32px; border-radius: var(--radius-xl);
      border: 1px solid #e0f2fe; box-shadow: var(--shadow-sm); margin-bottom: 20px;
    }
    .question-number { font-size: var(--font-size-xs); font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    .question-text { font-size: 17px; font-weight: 600; color: var(--text-heading); margin: 0 0 24px; line-height: 1.5; }

    /* Scale Options (Likert 1-5) */
    .scale-options { display: flex; gap: 10px; }
    .scale-btn {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 16px 8px; border-radius: var(--radius-lg); border: 2px solid #e0f2fe;
      background: #fff; cursor: pointer; transition: all 200ms;
    }
    .scale-btn:hover { border-color: var(--primary); background: var(--status-info-bg, #edf5ff); }
    .scale-btn.selected { border-color: var(--primary); background: #e0f2fe; }
    .scale-num { font-size: var(--font-size-2xl); font-weight: 800; color: #0369a1; }
    .scale-label { font-size: var(--font-size-xs); color: var(--text-muted); text-align: center; }

    /* Boolean Options */
    .bool-options { display: flex; gap: 16px; }
    .bool-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 16px; border-radius: var(--radius-lg); border: 2px solid #e0f2fe;
      background: #fff; cursor: pointer; font-size: var(--font-size-base); font-weight: 600; color: #334155; transition: all 200ms;
    }
    .bool-btn:hover { border-color: var(--primary); }
    .bool-btn.selected { border-color: var(--primary); background: #e0f2fe; color: #0369a1; }

    /* Single/Multi Options */
    .single-options, .multi-options { display: flex; flex-direction: column; gap: 8px; }
    .option-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: var(--radius-md); border: 1.5px solid #e0f2fe;
      background: #fff; cursor: pointer; font-size: var(--font-size-base); color: #334155; text-align: start; transition: all 200ms;
    }
    .option-btn:hover { border-color: var(--primary); background: var(--status-info-bg, #edf5ff); }
    .option-btn.selected { border-color: var(--primary); background: #e0f2fe; color: #0369a1; font-weight: 600; }
    .option-btn .pi { font-size: var(--font-size-base); color: var(--primary); }

    /* Nav Buttons */
    .nav-buttons { display: flex; justify-content: space-between; align-items: center; }

    /* Results */
    .results-section { max-width: 900px; }
    .results-header { display: flex; align-items: center; gap: 28px; margin-bottom: 32px; }
    .score-circle {
      width: 140px; height: 140px; border-radius: var(--radius-pill); display: flex; flex-direction: column;
      align-items: center; justify-content: center; flex-shrink: 0;
      background: linear-gradient(135deg, #e0f2fe, #bae6fd); border: 4px solid var(--primary);
    }
    .score-circle.initial { border-color: var(--error); background: linear-gradient(135deg, var(--status-danger-bg, #fff1f1), var(--status-danger-bg, #fff1f1)); }
    .score-circle.managed { border-color: var(--warning); background: linear-gradient(135deg, #fffbeb, var(--status-warning-bg, #fcf4d6)); }
    .score-circle.defined { border-color: var(--primary); }
    .score-circle.measured { border-color: var(--secondary, #8b5cf6); background: linear-gradient(135deg, var(--purple-50, #f5f3ff), #ede9fe); }
    .score-circle.optimized { border-color: var(--success); background: linear-gradient(135deg, var(--status-success-bg, #defbe6), #dcfce7); }
    .score-value { font-size: var(--font-size-4xl); font-weight: 800; color: #0c4a6e; }
    .score-level { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .results-info h2 { font-size: var(--font-size-2xl); font-weight: 800; color: #0c4a6e; margin: 0 0 8px; }
    .results-info p { font-size: var(--font-size-base); color: var(--text-muted); margin: 0 0 12px; }

    .chart-container { background: #fff; border-radius: var(--radius-xl); border: 1px solid #e0f2fe; padding: 24px; margin-bottom: 28px; max-height: 350px; }
    .chart-container canvas { max-height: 300px; }

    /* Domain Score Cards */
    .domain-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
    .domain-card { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: #fff; border-radius: var(--radius-md); border: 1px solid #e0f2fe; }
    .domain-name { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); min-width: 140px; }
    .domain-bar-wrap { flex: 1; height: 8px; background: var(--border-subtle); border-radius: var(--radius-xs); overflow: hidden; }
    .domain-bar { height: 100%; border-radius: var(--radius-xs); transition: width 500ms; }
    .domain-bar.low { background: var(--error); }
    .domain-bar.mid { background: var(--warning); }
    .domain-bar.high { background: var(--success); }
    .domain-score { font-size: var(--font-size-base); font-weight: 800; color: #0369a1; min-width: 40px; text-align: end; }

    /* Auto Deploy */
    .auto-deploy-section {
      background: #fff; border-radius: var(--radius-xl); border: 1px solid #e0f2fe; padding: 28px;
    }
    .auto-deploy-section h3 { font-size: var(--font-size-lg); font-weight: 700; color: #0c4a6e; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
    .auto-deploy-section h3 .pi { color: var(--primary); }
    .auto-deploy-section p { font-size: var(--font-size-base); color: var(--text-muted); margin: 0 0 16px; }
    .deploy-result { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .build-workspace-section { margin-top: 24px; background: #fff; border-radius: var(--radius-xl); border: 1px solid #e0f2fe; padding: 28px; }
    .build-workspace-section h3 { font-size: var(--font-size-lg); font-weight: 700; color: #0c4a6e; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
    .build-workspace-section h3 .pi { color: var(--primary); }
    .build-workspace-section p { font-size: var(--font-size-base); color: var(--text-muted); margin: 0 0 16px; }
  `],
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
  answers: Record<string, unknown> = {};
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
      next: (r: Record<string, unknown>) => { this.categories = r.categories || []; this.loading = false; this.cdr.markForCheck(); },
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
      next: (a: Record<string, unknown>) => {
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
      next: (r: Record<string, unknown>) => { this.currentQuestions = r.questions || []; this.cdr.markForCheck(); },
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
        next: (r: Record<string, unknown>) => {
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
      next: (r: Record<string, unknown>) => { this.deployResult = r.deployed || []; this.deploying = false; this.cdr.markForCheck(); },
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
        const jobId = res.jobId ?? res.job_id;
        const tenantId = res.tenantId ?? res.workspace?.tenantId ?? res.tenant_id;
        if (jobId) this._storage.set('grc_provisioning_job_id', jobId);
        if (tenantId) this._storage.set('grc_tenant_id', tenantId);
        if (res.inferenceSummary) {
          try {
            this._storage.set('grc_inference_summary', JSON.stringify(res.inferenceSummary));
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
      this.complianceSvc.saveMaturityResponses(this.assessmentId, responses).subscribe();
    }
  }

  private computeScore(q: Question, answer: Record<string, unknown>): number {
    if (q.answer_type === 'scale') return typeof answer === 'number' ? answer : 0;
    if (q.answer_type === 'boolean') return (answer as unknown) === true ? 5 : 1;
    if (q.answer_type === 'single' && q.options_en) {
      const idx = q.options_en.indexOf(answer as unknown);
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
          backgroundColor: 'rgba(14,165,233,0.15)',
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
    const map: Record<string, unknown> = { initial: 'danger', managed: 'warning', defined: 'info', measured: 'info', optimized: 'success' };
    return map[this.maturityLevel];
  }

}
