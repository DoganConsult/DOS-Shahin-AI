import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SliderModule } from 'primeng/slider';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { devError } from '@app/runtime/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcOperationsService } from '@app/api';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcDataTableComponent, GrcFormFieldComponent } from '@app/shared/components';

interface DataCategory { name: string; nameAr: string; source: string; storage: string; retention: string; }
interface RiskRow { category: string; categoryAr: string; likelihood: number; impact: number; score: number; residual: number; }
interface MitigationRow { controlId: string; code: string; titleEn: string; titleAr: string; status: 'implemented' | 'planned' | 'not_applicable'; }

// Loaded from /api/public/dpia-config at runtime
let PDPL_MITIGATIONS: Omit<MitigationRow, 'status'>[] = [];
let LAWFUL_BASES: Record<string, any>[] = [];
let DEFAULT_NECESSITY_QUESTIONS: Record<string, any>[] = [];
let DEFAULT_RISKS: RiskRow[] = [];
let DEFAULT_DATA_CATEGORIES: DataCategory[] = [];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dpia',
    imports: [
        CommonModule, FormsModule, GrcDataTableComponent, PageShellComponent, StatCardComponent,
        GrcFormFieldComponent, ButtonModule, CardModule, InputTextModule, InputTextarea,
        DropdownModule, TagModule, SliderModule, TooltipModule,
        ProgressBarModule, TableModule, CheckboxModule, AppDatePipe,
    ],
    templateUrl: './dpia.component.html',
    styleUrls: ['./dpia.component.scss']
})
export class DPIAComponent implements OnInit, OnDestroy {
    private complianceSvc = inject(GrcComplianceService);
  private destroyRef = inject(DestroyRef);
  // Wizard state
  currentStep = 0;
  lawfulBases: Record<string, any>[] = [];
  selectedBasis = '';
  wizardMode = false;
  loading = true;
  saving = false;
  activeDpiaId: string | null = null;
  dpiaList: Record<string, any>[] = [];
  private cdr = inject(ChangeDetectorRef);
  private autoSave$ = new Subject<void>();
  private autoSaveSub: { unsubscribe(): void } | null;

  steps = [
    { labelEn: 'Activity', labelAr: 'النشاط' },
    { labelEn: 'Data Inventory', labelAr: 'جرد البيانات' },
    { labelEn: 'Lawful Basis', labelAr: 'الأساس القانوني' },
    { labelEn: 'Necessity', labelAr: 'الضرورة' },
    { labelEn: 'Risk Assessment', labelAr: 'تقييم المخاطر' },
    { labelEn: 'Mitigations', labelAr: 'التدابير' },
    { labelEn: 'Summary', labelAr: 'الملخص' },
  ];

  activity = { name: '', department: '', description: '', controller: '', dpo: '' };
  dataCategories: DataCategory[] = [];
  necessityQuestions: Record<string, any>[] = [];
  risks: RiskRow[] = [];
  mitigations: MitigationRow[] = [];

  get implementedCount(): number {
    return this.mitigations.filter(m => m.status === 'implemented').length;
  }

  get overallRiskRating(): string {
    const avg = this.risks.reduce((s, r) => s + r.score, 0) / this.risks.length;
    if (avg >= 15) return 'High';
    if (avg >= 8) return 'Medium';
    return 'Low';
  }

  get complianceScore(): number {
    const impl = this.mitigations.filter(m => m.status === 'implemented').length;
    const applicable = this.mitigations.filter(m => m.status !== 'not_applicable').length;
    return applicable > 0 ? Math.round((impl / applicable) * 100) : 0;
  }

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.loadDPIAConfig();
    this.loadDPIAList();
    // Debounced auto-save: saves 2s after last change
    this.autoSaveSub = this.autoSave$.pipe(debounceTime(2000), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.persistDPIA());
  }

  private loadDPIAConfig(): void {
    this.operationsSvc.getPublicDPIAConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cfg: Record<string, any>) => {
        PDPL_MITIGATIONS = cfg.mitigations || [];
        LAWFUL_BASES = cfg.lawfulBases || [];
        DEFAULT_NECESSITY_QUESTIONS = cfg.necessityQuestions || [];
        DEFAULT_RISKS = cfg.defaultRisks || [];
        DEFAULT_DATA_CATEGORIES = cfg.defaultDataCategories || [];
        this.lawfulBases = LAWFUL_BASES;
        if (!this.wizardMode) {
          this.dataCategories = [...DEFAULT_DATA_CATEGORIES];
          this.necessityQuestions = DEFAULT_NECESSITY_QUESTIONS.map(q => ({ ...q }));
          this.risks = DEFAULT_RISKS.map(r => ({ ...r }));
          this.mitigations = PDPL_MITIGATIONS.map(m => ({ ...m, status: 'planned' as const }));
        }
      },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  ngOnDestroy(): void {
    this.autoSaveSub?.unsubscribe();
  }

  loadDPIAList(): void {
    this.loading = true;
    this.complianceSvc.listDPIAs().subscribe({
      next: (res: Record<string, any>) => { this.dpiaList = res.assessments || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  startNewDPIA(): void {
    this.complianceSvc.createDPIA({ title: `DPIA — ${new Date().toISOString().slice(0, 10)}` }).subscribe({
      next: (res: Record<string, any>) => {
        this.activeDpiaId = res.dpiaId;
        this.resetWizardData();
        this.crossLinkNCAStatuses();
        this.wizardMode = true;
        this.currentStep = 0;
      },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  loadDPIA(dpiaId: string): void {
    this.loading = true;
    this.complianceSvc.getDPIA(dpiaId).subscribe({
      next: (res: Record<string, any>) => {
        this.activeDpiaId = res.dpiaId;
        const d = res.data || {};
        this.activity = d.activity || this.activity;
        this.dataCategories = d.dataCategories || this.dataCategories;
        this.selectedBasis = d.selectedBasis || '';
        this.necessityQuestions = d.necessityQuestions || this.necessityQuestions;
        this.risks = d.risks || this.risks;
        this.mitigations = d.mitigations || this.mitigations;
        this.currentStep = d.currentStep || 0;
        this.wizardMode = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  private resetWizardData(): void {
    this.activity = { name: '', department: '', description: '', controller: '', dpo: '' };
    this.dataCategories = DEFAULT_DATA_CATEGORIES.map(d => ({ ...d }));
    this.selectedBasis = '';
    this.necessityQuestions = DEFAULT_NECESSITY_QUESTIONS.map(q => ({ ...q }));
    this.risks = DEFAULT_RISKS.map(r => ({ ...r }));
    this.mitigations = PDPL_MITIGATIONS.map(m => ({ ...m, status: 'planned' as const }));
  }

  triggerAutoSave(): void {
    this.autoSave$.next();
  }

  private persistDPIA(): void {
    if (!this.activeDpiaId) return;
    this.saving = true;
    const wizardData = {
      activity: this.activity, dataCategories: this.dataCategories,
      selectedBasis: this.selectedBasis, necessityQuestions: this.necessityQuestions,
      risks: this.risks, mitigations: this.mitigations, currentStep: this.currentStep,
    };
    const status = this.currentStep === this.steps.length - 1 ? 'completed' : 'in_progress';
    this.complianceSvc.updateDPIA(this.activeDpiaId, { data: wizardData, status } as any).subscribe({
      next: () => { this.saving = false; this.cdr.markForCheck(); },
      error: () => { this.saving = false; this.cdr.markForCheck(); },
    });
  }

  private crossLinkNCAStatuses(): void {
    // Fetch live framework mapping to auto-fill PDPL mitigation statuses from NCA assessment data
    this.complianceSvc.getKSAFrameworkMapping().subscribe({
      next: (data: any) => {
        const mappings: Record<string, any>[] = data.mappings || [];
        for (const mit of this.mitigations) {
          // Find matching control in the live mapping data by controlId
          const match = mappings.find((m: Record<string, any>) => m.controlId === mit.controlId);
          if (match) {
            if (match.status === 'implemented') {
              mit.status = 'implemented';
            } else if (match.status === 'partially') {
              mit.status = 'planned';
            }
            // not_implemented stays as 'planned' (default)
          }
        }
      },
      error: (e: unknown) => devError("[API]", e), // silently fail — cross-link is optional enrichment
    });
  }

  exitWizard(): void {
    this.persistDPIA();
    this.wizardMode = false;
    this.activeDpiaId = null;
    this.loadDPIAList();
  }

  deleteDPIA(dpiaId: string, event: Event): void {
    event.stopPropagation();
    this.complianceSvc.deleteDPIA(dpiaId).subscribe({
      next: () => this.loadDPIAList(),
      error: (e: unknown) => devError("[API]", e),
    });
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.triggerAutoSave();
    }
  }

  addDataCategory(): void {
    this.dataCategories.push({ name: '', nameAr: '', source: '', storage: '', retention: '' });
  }

  calcRiskScore(risk: RiskRow): void {
    risk.score = risk.likelihood * risk.impact;
    risk.residual = Math.max(1, Math.round(risk.score * 0.5));
  }

  riskColor(score: number): string {
    if (score >= 20) return 'var(--error)';
    if (score >= 12) return '#f97316';
    if (score >= 6) return '#d97706';
    return '#16a34a';
  }

  exportDPIA(format: string, lang?: string): void {
    if (format === 'html') {
      const json = JSON.stringify({
        activity: this.activity, dataCategories: this.dataCategories,
        selectedBasis: this.selectedBasis, necessityQuestions: this.necessityQuestions,
        risks: this.risks, mitigations: this.mitigations,
        overallRiskRating: this.overallRiskRating, complianceScore: this.complianceScore,
        implementedCount: this.implementedCount,
      }).replace(/<\//g, '<\\/');
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDPL Data Protection Impact Assessment</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:24px}
.header{background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;padding:32px;border-radius:var(--radius-xl);text-align:center;margin-bottom:24px}
.header h1{font-size: var(--font-size-2xl);margin-bottom:4px}.header p{opacity:.85;font-size: var(--font-size-sm)}
.section{background:#fff;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px}
.section h2{font-size: var(--font-size-md);font-weight:700;margin-bottom:12px;color:#7c3aed}
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.kpi{background:#fff;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:16px;text-align:center}
.kpi-v{font-size: var(--font-size-3xl);font-weight:800}.kpi-l{font-size: var(--font-size-sm);color:var(--text-muted)}
table{width:100%;border-collapse:collapse}th{background:var(--surface-ice);padding:8px;font-size: var(--font-size-xs);font-weight:700;text-align:start}
td{padding:8px;font-size: var(--font-size-sm);border-bottom:1px solid var(--surface-ice)}
.rec{padding:16px;border-radius:var(--radius-lg);font-size: var(--font-size-base);font-weight:600;display:flex;align-items:center;gap:10px}
.rec-low{background:var(--status-success-bg, #defbe6);color:var(--success);border:1px solid #16a34a}
.rec-med{background:#fefce8;color:var(--warning);border:1px solid var(--warning)}
.rec-high{background:var(--status-danger-bg, #fff1f1);color:var(--error);border:1px solid var(--error)}
.badge{display:inline-block;padding:2px 8px;border-radius:var(--radius-pill);font-size: var(--font-size-xs);font-weight:700}
.badge-impl{background:#dcfce7;color:var(--success)}.badge-planned{background:var(--status-warning-bg, #fcf4d6);color:#92400e}.badge-na{background:var(--surface-ice);color:var(--text-muted)}
@media print{body{padding:0}}
</style></head><body>
<div class="header"><h1>PDPL Data Protection Impact Assessment</h1><p>Generated ${new Date().toLocaleDateString()}</p></div>
<div class="kpi-row"><div class="kpi"><div class="kpi-v" id="rating"></div><div class="kpi-l">Risk Rating</div></div>
<div class="kpi"><div class="kpi-v" id="score" style="color:#3b82f6"></div><div class="kpi-l">PDPL Compliance</div></div>
<div class="kpi"><div class="kpi-v" id="impl" style="color:var(--success)"></div><div class="kpi-l">Controls Implemented</div></div></div>
<div id="content"></div>
<script>
const D=${json};
document.getElementById('rating').textContent=D.overallRiskRating;
document.getElementById('rating').style.color=D.overallRiskRating==='Low'?'#16a34a':D.overallRiskRating==='Medium'?'var(--warning)':'var(--error)';
document.getElementById('score').textContent=D.complianceScore+'%';
document.getElementById('impl').textContent=D.implementedCount+'/'+D.mitigations.length;
const recClass=D.overallRiskRating==='Low'?'rec-low':D.overallRiskRating==='Medium'?'rec-med':'rec-high';
const recText=D.overallRiskRating==='Low'?'Proceed':D.overallRiskRating==='Medium'?'Proceed with Conditions':'Do Not Proceed';
function esc(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML}
let h='<div class="section"><h2>Processing Activity</h2><table><tr><th>Name</th><td>'+esc(D.activity.name)+'</td></tr><tr><th>Department</th><td>'+esc(D.activity.department)+'</td></tr><tr><th>Controller</th><td>'+esc(D.activity.controller)+'</td></tr><tr><th>DPO</th><td>'+esc(D.activity.dpo)+'</td></tr></table></div>';
h+='<div class="section"><h2>Data Categories</h2><table><thead><tr><th>Category</th><th>Source</th><th>Storage</th><th>Retention</th></tr></thead><tbody>'+D.dataCategories.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.source)+'</td><td>'+esc(c.storage)+'</td><td>'+esc(c.retention)+'</td></tr>').join('')+'</tbody></table></div>';
h+='<div class="section"><h2>Risk Assessment</h2><table><thead><tr><th>Category</th><th>Likelihood</th><th>Impact</th><th>Score</th></tr></thead><tbody>'+D.risks.map(r=>'<tr><td>'+esc(r.category)+'</td><td>'+r.likelihood+'</td><td>'+r.impact+'</td><td><strong>'+r.score+'</strong></td></tr>').join('')+'</tbody></table></div>';
h+='<div class="section"><h2>Mitigations</h2><table><thead><tr><th>Code</th><th>Control</th><th>Status</th></tr></thead><tbody>'+D.mitigations.map(m=>'<tr><td>'+esc(m.code)+'</td><td>'+esc(m.titleEn)+'</td><td><span class="badge badge-'+esc(m.status)+'">'+esc(m.status)+'</span></td></tr>').join('')+'</tbody></table></div>';
h+='<div class="rec '+recClass+'">Recommendation: '+esc(recText)+'</div>';
document.getElementById('content').innerHTML=h;
<\\/script></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dpia-report.html'; a.click(); URL.revokeObjectURL(a.href);
    } else {
      window.location.href = '/report-center';
    }
  }

}
