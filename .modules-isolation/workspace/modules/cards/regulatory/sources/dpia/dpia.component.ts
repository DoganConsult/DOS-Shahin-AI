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
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcOperationsService } from '@app/api';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

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
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatCardComponent,
    ButtonModule, CardModule, InputTextModule, InputTextarea,
    DropdownModule, TagModule, SliderModule, TooltipModule,
    ProgressBarModule, TableModule, CheckboxModule, AppDatePipe,],
  template: `
    <app-page-shell
      icon="file-edit"
      [title]="i18n.translate('dpia.title')"
      [subtitle]="i18n.translate('dpia.subtitle')"
      [breadcrumbs]="['Dashboard', 'DPIA']"
      [loading]="loading">

      <!-- DPIA List View -->
      <ng-container *ngIf="!wizardMode">
        <div class="list-toolbar">
          <p-button [label]="i18n.translate('dpia.newDpia')"
                    icon="pi pi-plus" (onClick)="startNewDPIA()" />
        </div>
        <div class="dpia-cards" *ngIf="dpiaList.length > 0">
          <div tabindex="0" role="button" (keyup.enter)="loadDPIA(d.dpiaId)" *ngFor="let d of dpiaList" class="dpia-card" (click)="loadDPIA(d.dpiaId)">
            <div class="dpia-card-header">
              <h3>{{ d.title }}</h3>
              <span class="dpia-status" [class]="'status-' + d.status">{{ d.status }}</span>
            </div>
            <div class="dpia-card-meta">
              <span><i class="pi pi-calendar"></i> {{ d.createdAt | appDate:'medium' }}</span>
              <button aria-label="Delete" class="delete-btn" (click)="deleteDPIA(d.dpiaId, $event)"><i class="pi pi-trash"></i></button>
            </div>
          </div>
        </div>
        <div *ngIf="!loading && dpiaList.length === 0" class="empty-state">
          <i class="pi pi-file-edit" style="font-size: 48px; color: #7c3aed; margin-bottom: 16px;"></i>
          <h3>{{ i18n.translate('dpia.noDpias') }}</h3>
          <p>{{ i18n.translate('dpia.startFirstDpia') }}</p>
          <p-button [label]="i18n.translate('dpia.startDpia')"
                    icon="pi pi-play" (onClick)="startNewDPIA()" styleClass="mt-3" />
        </div>
      </ng-container>

      <!-- Wizard Mode -->
      <ng-container *ngIf="wizardMode">
      <div class="wizard-toolbar">
        <button class="back-btn" (click)="exitWizard()"><i class="pi pi-arrow-left"></i> {{ i18n.translate('dpia.backToList') }}</button>
        <span *ngIf="saving" class="save-indicator"><i class="pi pi-spin pi-spinner"></i> {{ i18n.translate('dpia.saving') }}</span>
        <span *ngIf="!saving && activeDpiaId" class="save-indicator saved"><i class="pi pi-check"></i> {{ i18n.translate('dpia.saved') }}</span>
      </div>

      <!-- Wizard Steps -->
      <div class="dpia-wizard-nav">
        <button *ngFor="let step of steps; let idx = index" class="dpia-step-btn"
                [class.active]="currentStep === idx" [class.completed]="idx < currentStep"
                (click)="currentStep = idx">
          <span class="dpia-step-num">{{ idx + 1 }}</span>
          <span class="dpia-step-label">{{ i18n.localize(step.labelEn, step.labelAr) }}</span>
        </button>
      </div>

      <!-- Step 1: Processing Activity -->
      <div *ngIf="currentStep === 0" class="dpia-step">
        <h3>{{ i18n.translate('dpia.processingActivityDesc') }}</h3>
        <div class="form-grid">
          <div class="form-field"><label>{{ i18n.translate('dpia.activityName') }}</label>
            <input pInputText [(ngModel)]="activity.name" /></div>
          <div class="form-field"><label>{{ i18n.translate('dpia.department') }}</label>
            <input pInputText [(ngModel)]="activity.department" /></div>
          <div class="form-field full"><label>{{ i18n.translate('dpia.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="activity.description" [rows]="3"></textarea></div>
          <div class="form-field"><label>{{ i18n.translate('dpia.dataController') }}</label>
            <input pInputText [(ngModel)]="activity.controller" /></div>
          <div class="form-field"><label>{{ i18n.translate('dpia.dpoContact') }}</label>
            <input pInputText [(ngModel)]="activity.dpo" /></div>
        </div>
      </div>

      <!-- Step 2: Data Inventory -->
      <div *ngIf="currentStep === 1" class="dpia-step">
        <h3>{{ i18n.translate('dpia.dataInventory') }}</h3>
        <p-button [label]="i18n.translate('dpia.addCategory')" icon="pi pi-plus"
                  (onClick)="addDataCategory()" styleClass="mb-3 p-button-sm" />
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data Categories table" [value]="dataCategories" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header"><tr>
            <th>{{ i18n.translate('dpia.category') }}</th>
            <th>{{ i18n.translate('dpia.source') }}</th>
            <th>{{ i18n.translate('dpia.storage') }}</th>
            <th>{{ i18n.translate('dpia.retention') }}</th>
            <th></th>
          </tr></ng-template>
          <ng-template pTemplate="body" let-row let-i="rowIndex"><tr>
            <td><input pInputText [(ngModel)]="row.name" class="table-input" /></td>
            <td><input pInputText [(ngModel)]="row.source" class="table-input" /></td>
            <td><input pInputText [(ngModel)]="row.storage" class="table-input" /></td>
            <td><input pInputText [(ngModel)]="row.retention" class="table-input" /></td>
            <td><button aria-label="Delete" class="icon-btn danger" (click)="dataCategories.splice(i, 1)"><i class="pi pi-trash"></i></button></td>
          </tr></ng-template>
        </p-table>
      </div>

      <!-- Step 3: Lawful Basis -->
      <div *ngIf="currentStep === 2" class="dpia-step">
        <h3>{{ i18n.translate('dpia.lawfulBasis') }}</h3>
        <p class="step-hint">{{ i18n.translate('dpia.pdplArticle10') }}</p>
        <div class="basis-cards">
          <div tabindex="0" role="button" (keyup.enter)="selectedBasis = basis.value" *ngFor="let basis of lawfulBases" class="basis-card"
               [class.selected]="selectedBasis === basis.value" (click)="selectedBasis = basis.value">
            <div class="basis-icon">{{ basis.icon }}</div>
            <div class="basis-label">{{ i18n.localize(basis.labelEn, basis.labelAr) }}</div>
            <div class="basis-desc">{{ i18n.localize(basis.descEn, basis.descAr) }}</div>
          </div>
        </div>
      </div>

      <!-- Step 4: Necessity & Proportionality -->
      <div *ngIf="currentStep === 3" class="dpia-step">
        <h3>{{ i18n.translate('dpia.necessityProportionality') }}</h3>
        <div *ngFor="let q of necessityQuestions" class="necessity-row">
          <div class="nec-label">{{ i18n.localize(q.labelEn, q.labelAr) }}</div>
          <div class="nec-slider">
            <p-slider [(ngModel)]="q.score" [min]="1" [max]="5" [step]="1" />
            <div class="nec-scale">
              <span>1 {{ i18n.translate('dpia.weak') }}</span>
              <span>5 {{ i18n.translate('dpia.strong') }}</span>
            </div>
          </div>
          <div class="nec-value" [class.good]="q.score >= 4" [class.warn]="q.score === 3" [class.bad]="q.score <= 2">{{ q.score }}/5</div>
        </div>
      </div>

      <!-- Step 5: Risk Assessment -->
      <div *ngIf="currentStep === 4" class="dpia-step">
        <h3>{{ i18n.translate('dpia.riskAssessment') }}</h3>
        <div *ngFor="let risk of risks" class="risk-row">
          <div class="risk-cat">{{ i18n.localize(risk.category, risk.categoryAr) }}</div>
          <div class="risk-sliders">
            <div class="risk-slider-group">
              <label>{{ i18n.translate('dpia.likelihood') }}: {{ risk.likelihood }}</label>
              <p-slider [(ngModel)]="risk.likelihood" [min]="1" [max]="5" [step]="1" (onChange)="calcRiskScore(risk)" />
            </div>
            <div class="risk-slider-group">
              <label>{{ i18n.translate('dpia.impact') }}: {{ risk.impact }}</label>
              <p-slider [(ngModel)]="risk.impact" [min]="1" [max]="5" [step]="1" (onChange)="calcRiskScore(risk)" />
            </div>
          </div>
          <div class="risk-score" [style.background]="riskColor(risk.score)">{{ risk.score }}</div>
        </div>
      </div>

      <!-- Step 6: Mitigation Measures -->
      <div *ngIf="currentStep === 5" class="dpia-step">
        <h3>{{ i18n.translate('dpia.mitigationMeasures') }}</h3>
        <p class="step-hint">{{ i18n.translate('dpia.linkedPdplControls') }}</p>
        <div *ngFor="let m of mitigations" class="mitigation-card" [class.impl]="m.status === 'implemented'" [class.planned]="m.status === 'planned'">
          <div class="mit-header">
            <span class="mit-code">{{ m.code }}</span>
            <span class="mit-title">{{ i18n.localize(m.titleEn, m.titleAr) }}</span>
          </div>
          <div class="mit-pills">
            <button class="pill" [class.active]="m.status === 'implemented'" (click)="m.status = 'implemented'">
              <i class="pi pi-check"></i> {{ i18n.translate('dpia.implemented') }}
            </button>
            <button class="pill" [class.active]="m.status === 'planned'" (click)="m.status = 'planned'">
              <i class="pi pi-clock"></i> {{ i18n.translate('dpia.planned') }}
            </button>
            <button class="pill" [class.active]="m.status === 'not_applicable'" (click)="m.status = 'not_applicable'">
              <i class="pi pi-ban"></i> N/A
            </button>
          </div>
        </div>
      </div>

      <!-- Step 7: Summary & Export -->
      <div *ngIf="currentStep === 6" class="dpia-step">
        <h3>{{ i18n.translate('dpia.summaryExport') }}</h3>
        <div class="summary-kpis">
          <app-stat-card icon="shield" [value]="overallRiskRating"
                        [label]="i18n.translate('dpia.riskRating')"
                        [accentColor]="overallRiskRating === 'Low' ? '#16a34a' : overallRiskRating === 'Medium' ? 'var(--warning)' : 'var(--error)'" />
          <app-stat-card icon="check-circle" [value]="complianceScore + '%'"
                        [label]="i18n.translate('dpia.pdplCompliance')"
                        [accentColor]="complianceScore >= 70 ? '#16a34a' : 'var(--warning)'" />
          <app-stat-card icon="file" [value]="implementedCount + '/' + mitigations.length"
                        [label]="i18n.translate('dpia.controlsImplemented')"
                        accentColor="#3b82f6" />
        </div>

        <div class="recommendation-box" [class.proceed]="overallRiskRating === 'Low'" [class.conditions]="overallRiskRating === 'Medium'" [class.stop]="overallRiskRating === 'High'">
          <i class="pi" [ngClass]="overallRiskRating === 'Low' ? 'pi-check-circle' : overallRiskRating === 'Medium' ? 'pi-exclamation-triangle' : 'pi-times-circle'"></i>
          <div>
            <strong>{{ i18n.translate('dpia.recommendation') }}:</strong>
            {{ overallRiskRating === 'Low' ? i18n.translate('dpia.proceed') :
               overallRiskRating === 'Medium' ? i18n.translate('dpia.proceedWithConditions') :
               i18n.translate('dpia.doNotProceed') }}
          </div>
        </div>

        <div class="export-bar">
          <button class="export-btn pdf" (click)="exportDPIA('pdf','en')"><i class="pi pi-file-pdf"></i> PDF (English)</button>
          <button class="export-btn pdf" (click)="exportDPIA('pdf','ar')"><i class="pi pi-file-pdf"></i> PDF (عربي)</button>
          <button class="export-btn excel" (click)="exportDPIA('excel')"><i class="pi pi-file-excel"></i> Excel</button>
          <button class="export-btn html" (click)="exportDPIA('html')"><i class="pi pi-globe"></i> Interactive HTML</button>
        </div>
      </div>

      <!-- Step Navigation -->
      <div class="step-actions">
        <p-button *ngIf="currentStep > 0" [label]="i18n.translate('dpia.previous')"
                  icon="pi pi-arrow-left" (onClick)="currentStep = currentStep - 1; triggerAutoSave()" styleClass="p-button-outlined" />
        <p-button *ngIf="currentStep < steps.length - 1" [label]="i18n.translate('dpia.next')"
                  icon="pi pi-arrow-right" iconPos="right" (onClick)="nextStep()" />
      </div>
      </ng-container>
    </app-page-shell>
  `,
  styles: [`
    .list-toolbar { margin-bottom: 16px; }
    .dpia-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .dpia-card { background: #fff; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-lg); padding: 16px; cursor: pointer; transition: all 200ms; }
    .dpia-card:hover { border-color: #7c3aed; box-shadow: var(--shadow-md); }
    .dpia-card-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
    .dpia-card-header h3 { font-size: var(--font-size-base); font-weight: 700; margin: 0; }
    .dpia-status { padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 700; }
    .status-draft { background: var(--surface-ice); color: var(--text-muted); }
    .status-in_progress { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .status-completed { background: #dcfce7; color: var(--success); }
    .status-approved { background: #dbeafe; color: #1e40af; }
    .dpia-card-meta { display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-sm); color: var(--text-muted); }
    .delete-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; }
    .delete-btn:hover { color: var(--error); }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-state h3 { font-size: var(--font-size-lg); margin-bottom: 8px; }
    .empty-state p { color: var(--text-muted); font-size: var(--font-size-base); }

    .wizard-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .back-btn { background: none; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius); padding: 6px 14px; cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .back-btn:hover { background: var(--surface-ice); }
    .save-indicator { font-size: var(--font-size-sm); color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .save-indicator.saved { color: var(--success); }

    .dpia-wizard-nav { display: flex; gap: 4px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px; }
    .dpia-step-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-md); background: #fff; font-size: var(--font-size-sm); cursor: pointer; white-space: nowrap; transition: all 200ms; }
    .dpia-step-btn.active { background: #7c3aed; color: #fff; border-color: #7c3aed; }
    .dpia-step-btn.completed { background: var(--status-success-bg, #defbe6); border-color: var(--success); color: var(--success); }
    .dpia-step-num { width: 22px; height: 22px; border-radius: var(--radius-pill); background: var(--surface-ice); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: var(--font-size-xs); }
    .dpia-step-btn.active .dpia-step-num { background: rgba(255,255,255,0.2); color: #fff; }
    .dpia-step-btn.completed .dpia-step-num { background: var(--success); color: #fff; }
    .dpia-step-label { font-weight: 600; }

    .dpia-step h3 { font-size: var(--font-size-lg); font-weight: 700; margin: 0 0 16px; }
    .step-hint { font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 16px; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field.full { grid-column: 1 / -1; }
    .form-field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .form-field input, .form-field textarea { width: 100%; }
    .table-input { width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; }
    .icon-btn.danger:hover { color: var(--error); }
    .mb-3 { margin-bottom: 12px; }

    .basis-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .basis-card { padding: 16px; border: 2px solid var(--border, var(--border-subtle)); border-radius: var(--radius-lg); cursor: pointer; transition: all 200ms; text-align: center; }
    .basis-card:hover { border-color: #7c3aed; }
    .basis-card.selected { border-color: #7c3aed; background: #faf5ff; }
    .basis-icon { font-size: var(--font-size-3xl); margin-bottom: 8px; }
    .basis-label { font-weight: 700; font-size: var(--font-size-base); margin-bottom: 4px; }
    .basis-desc { font-size: var(--font-size-sm); color: var(--text-muted); }

    .necessity-row { display: flex; align-items: center; gap: 16px; padding: 14px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 8px; }
    .nec-label { width: 200px; font-size: var(--font-size-sm); font-weight: 600; }
    .nec-slider { flex: 1; }
    .nec-scale { display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; }
    .nec-value { width: 48px; text-align: center; font-weight: 800; font-size: var(--font-size-md); border-radius: var(--radius); padding: 4px; }
    .nec-value.good { color: var(--success); background: var(--status-success-bg, #defbe6); }
    .nec-value.warn { color: var(--warning); background: #fefce8; }
    .nec-value.bad { color: var(--error); background: var(--status-danger-bg, #fff1f1); }

    .risk-row { display: flex; align-items: center; gap: 16px; padding: 14px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 8px; }
    .risk-cat { width: 200px; font-size: var(--font-size-sm); font-weight: 600; }
    .risk-sliders { flex: 1; display: flex; gap: 24px; }
    .risk-slider-group { flex: 1; }
    .risk-slider-group label { font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 4px; display: block; }
    .risk-score { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: var(--font-size-lg); color: #fff; }

    .mitigation-card { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 8px; transition: all 200ms; }
    .mitigation-card.impl { border-color: var(--success); background: var(--status-success-bg, #defbe6); }
    .mitigation-card.planned { border-color: var(--warning); background: #fefce8; }
    .mit-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .mit-code { font-weight: 700; color: #7c3aed; font-size: var(--font-size-sm); }
    .mit-title { font-size: var(--font-size-base); font-weight: 600; }
    .mit-pills { display: flex; gap: 6px; }
    .pill { padding: 6px 12px; border-radius: var(--radius-pill); border: 1.5px solid var(--border); background: #fff; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 200ms; }
    .pill.active { background: #7c3aed; color: #fff; border-color: #7c3aed; }

    .summary-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .recommendation-box { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: var(--radius-lg); margin-bottom: 24px; font-size: var(--font-size-base); }
    .recommendation-box.proceed { background: var(--status-success-bg, #defbe6); color: var(--success); border: 1px solid var(--success); }
    .recommendation-box.conditions { background: #fefce8; color: var(--warning); border: 1px solid var(--warning); }
    .recommendation-box.stop { background: var(--status-danger-bg, #fff1f1); color: var(--error); border: 1px solid var(--error); }
    .recommendation-box .pi { font-size: var(--font-size-2xl); }

    .export-bar { display: flex; gap: 8px; flex-wrap: wrap; }
    .export-btn { padding: 10px 20px; border-radius: var(--radius-md); border: 1.5px solid; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 200ms; }
    .export-btn.pdf { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); color: var(--error); }
    .export-btn.excel { background: var(--status-success-bg, #defbe6); border-color: var(--success); color: var(--success); }
    .export-btn.html { background: #eff6ff; border-color: var(--primary); color: var(--primary); }

    .step-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }

    @media (max-width: 768px) {
      .basis-cards { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .summary-kpis { grid-template-columns: 1fr; }
    }
  `],
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
    this.complianceSvc.updateDPIA(this.activeDpiaId, { data: wizardData, status }).subscribe({
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
