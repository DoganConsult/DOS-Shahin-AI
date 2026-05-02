import { Component, ChangeDetectionStrategy, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { OnboardingStore } from '../store/onboarding.store';
import { OnboardingNavigationService } from '../services/onboarding-navigation.service';
import { OnboardingQuestion, GrcRecord } from '../../models/onboarding.models';
import { OnboardingSceneHeaderComponent } from '../../components/scene-header/onboarding-scene-header.component';
import { SceneValuePreviewComponent } from '../../components/chrome/scene-value-preview.component';
import { QuestionRendererComponent } from '../../components/question-renderer.component';
import { WillCreatePreviewComponent } from '../../components/shared/will-create-preview.component';
import { StructureModeToggleComponent } from '../../components/structure/structure-mode-toggle.component';
import { CsvTeamImportComponent } from '../../components/shared/csv-team-import.component';
import { PainModuleMappingComponent } from '../../components/pain-priorities/pain-module-mapping.component';
import { PainCardsComponent } from '../../components/pain-cards.component';
import { StageDefinition } from '../../services/onboarding-config.service';

@Component({
  selector: 'app-question-stage-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ButtonModule, OnboardingSceneHeaderComponent, SceneValuePreviewComponent,
    QuestionRendererComponent, WillCreatePreviewComponent,
    StructureModeToggleComponent, CsvTeamImportComponent,
    PainCardsComponent, PainModuleMappingComponent,
  ],
  template: `
    <app-onboarding-scene-header
      [scene]="nav.currentScene()"
      [inferredFactCount]="store.inferredFacts().length"
      [overallConfidence]="store.overallConfidence()"
      [computing]="store.inferenceComputing()"
      [lang]="store.isAr ? 'ar' : 'en'">
    </app-onboarding-scene-header>
    <app-scene-value-preview [scene]="nav.currentScene()" [lang]="store.isAr ? 'ar' : 'en'"></app-scene-value-preview>

    <div class="onb-quick-win" *ngIf="store.activeStageIdx() === 0 && store.sectorResolution() && nav.answeredCount() < 3">
      <div class="onb-quick-win-icon"><i class="pi pi-bolt"></i></div>
      <div class="onb-quick-win-content">
        <strong>{{ store.isAr ? 'فوز سريع' : 'Quick Win' }}</strong>
        <span>{{ store.isAr ? 'شاهين تعرّف على قطاعك — أجب عن بضعة أسئلة لتفعيل التوصيات الذكية.' : 'Shahin detected your sector — answer a few questions to unlock smart recommendations.' }}</span>
      </div>
      <span class="onb-quick-win-badge">{{ store.isAr ? 'ذكاء مبكر' : 'Early AI' }}</span>
    </div>

    <div class="onb-stage-header">
      <h2>
        <i class="pi" [ngClass]="activeStage.iconClass"></i>
        {{ store.getStageLabel(activeStage) }}
        <span class="onb-time-estimate" *ngIf="nav.getStageTimeEstimate(activeStage) as est">{{ est }}</span>
      </h2>
      <p class="onb-stage-subtitle">{{ store.getStageDescription(activeStage) }}</p>
      <span class="onb-adaptive-skip" *ngIf="nav.skippedQuestionCount() > 0">
        {{ store.isAr ? nav.skippedQuestionCount() + ' سؤال تم تخطيه تلقائياً' : nav.skippedQuestionCount() + ' questions auto-skipped' }}
      </span>
    </div>

    <app-will-create-preview [lang]="store.isAr ? 'ar' : 'en'" [items]="nav.getWillCreateItems()"></app-will-create-preview>

    <app-pain-cards *ngIf="nav.activePainCards().length > 0"
      [lang]="store.isAr ? 'ar' : 'en'"
      [selected]="store.answers['pain.primary_concerns'] || []"
      (selectionChange)="painSelectionChanged.emit($event)">
    </app-pain-cards>

    <app-pain-module-mapping *ngIf="store.painModuleMappings().length > 0"
      [mappings]="store.painModuleMappings()" [lang]="store.isAr ? 'ar' : 'en'">
    </app-pain-module-mapping>

    <app-structure-mode-toggle *ngIf="activeStage?.stageCode === 'org_structure'"
      [lang]="store.isAr ? 'ar' : 'en'" [initialMode]="store.answers['structure_mode'] || 'simple'"
      (modeChanged)="answerChanged.emit({ questionCode: 'structure_mode', value: $event })">
    </app-structure-mode-toggle>

    <div class="onb-ai-suggest-bar" *ngIf="activeStage?.stageCode === 'people_ownership' || activeStage?.stageCode === 'people_roles'">
      <button pButton [text]="true" icon="pi pi-bolt"
        [label]="store.isAr ? 'اقتراح المسؤوليات بالذكاء الاصطناعي' : 'Suggest Responsibilities with AI'"
        class="onb-ai-suggest-btn" (click)="suggestResponsibilities.emit()"></button>
    </div>

    <div class="onb-staffing-banner" *ngIf="(activeStage?.stageCode === 'people_ownership' || activeStage?.stageCode === 'people_roles') && store.staffingSuggestions()">
      <i class="pi pi-users"></i>
      <div class="onb-staffing-content">
        <strong>{{ store.isAr ? 'توصيات التوظيف' : 'Staffing Recommendations' }}</strong>
        <span>{{ store.isAr ? 'بناءً على حجم مؤسستك، يوصي شاهين بالهيكل التالي' : 'Based on your organization size, Shahin recommends the following structure' }}</span>
        <div class="onb-staffing-grid" *ngIf="store.staffingSuggestions() as data">
          <ng-container *ngFor="let role of data['staffing'] || []">
            <div class="onb-staffing-item" [class.mandatory]="role.is_mandatory">
              <span class="onb-staffing-val">{{ role.recommended_fte }}</span>
              <span class="onb-staffing-label">{{ store.isAr ? role.role_name_ar : role.role_name_en }}</span>
              <span class="onb-staffing-cat">{{ role.role_category }}</span>
            </div>
          </ng-container>
        </div>
      </div>
    </div>

    <div class="onb-biz-functions-banner" *ngIf="activeStage?.stageCode === 'governance_model' && store.businessFunctions()">
      <i class="pi pi-sitemap"></i>
      <div class="onb-biz-functions-content">
        <strong>{{ store.isAr ? 'الوظائف التجارية المتاحة' : 'Available Business Functions' }}</strong>
        <span>{{ store.isAr ? 'اختر الوظائف ذات الصلة بنموذج حوكمتك' : 'Select the functions relevant to your governance model' }}</span>
        <div class="onb-biz-functions-list" *ngIf="store.businessFunctions() as bfData">
          <span *ngFor="let fn of bfData['functions'] || []" class="onb-biz-fn-chip">
            {{ store.isAr ? (fn.labelAr || fn.labelEn || fn.code) : (fn.labelEn || fn.code) }}
          </span>
        </div>
      </div>
    </div>

    <app-csv-team-import *ngIf="activeStage?.stageCode === 'people_ownership' || activeStage?.stageCode === 'people_roles'"
      [attr.lang]="store.isAr ? 'ar' : 'en'" (fileUploaded)="teamCsvUploaded.emit($event)">
    </app-csv-team-import>

    <div *ngIf="nav.currentSections().length === 0" class="onb-empty-stage">
      <i class="pi pi-check-circle onb-empty-stage__icon"></i>
      <p class="onb-empty-stage__text">
        {{ store.isAr ? 'لا توجد أسئلة في هذه المرحلة — مكتملة تلقائياً' : 'No questions in this stage — auto-completed' }}
      </p>
      <button pButton [label]="store.isAr ? 'المرحلة التالية' : 'Next Stage'"
        [icon]="store.isAr ? 'pi pi-chevron-left' : 'pi pi-chevron-right'" [iconPos]="store.isAr ? 'left' : 'right'"
        class="p-button-outlined onb-empty-stage__action" (click)="goToNext.emit()"></button>
    </div>

    <div *ngFor="let sec of (nav.currentSections() ?? []); trackBy: nav.trackSection" class="onb-section-card" [attr.data-av]="store.answerSvc.answersVersion()">
      <div class="onb-section-header">
        <i class="pi" [ngClass]="sec.icon"></i>
        <span>{{ sec.label }}</span>
      </div>
      <div class="onb-questions-grid">
        <app-question-renderer *ngFor="let q of sec.questions; trackBy: nav.trackQuestion"
          [question]="q" [currentValue]="store.answers[q.question_code]"
          [lang]="store.isAr ? 'ar' : 'en'" [questionNumber]="nav.getQuestionNumber(q)"
          [resolvedOptions]="nav.getResolvedOptions(q)" [roleOptions]="store.roleOptions"
          [validationError]="store.validationErrors[q.question_code]"
          (answerChanged)="answerChanged.emit($event)"
          (lookupAnswerChanged)="lookupAnswerChanged.emit($event)">
        </app-question-renderer>
      </div>
    </div>

    <div class="onb-stage-nav-buttons">
      <button pButton [label]="store.isAr ? 'السابق' : 'Previous'"
        [icon]="store.isAr ? 'pi pi-chevron-right' : 'pi pi-chevron-left'" [iconPos]="store.isAr ? 'right' : 'left'" [text]="true"
        *ngIf="store.activeStageIdx() > 0" (click)="goToPrevious.emit()"></button>
      <button pButton [label]="store.isAr ? 'تخطي هذه المرحلة' : 'Skip this stage'" [text]="true" class="onb-skip-btn"
        *ngIf="nav.canSkipCurrentStage()" (click)="skipStage.emit()"></button>
      <span class="flex-grow-1"></span>
      <button pButton [label]="store.isAr ? 'التالي' : 'Continue'"
        [icon]="store.isAr ? 'pi pi-chevron-left' : 'pi pi-chevron-right'" [iconPos]="store.isAr ? 'left' : 'right'"
        (click)="saveAndContinue.emit()" [loading]="store.saving()"></button>
    </div>
  `,
})
export class QuestionStageContainerComponent {
  readonly store = inject(OnboardingStore);
  readonly nav = inject(OnboardingNavigationService);

  @Input({ required: true }) activeStage!: StageDefinition;

  @Output() answerChanged = new EventEmitter<{ questionCode: string; value: unknown }>();
  @Output() lookupAnswerChanged = new EventEmitter<{ question: OnboardingQuestion; value: unknown }>();
  @Output() saveAndContinue = new EventEmitter<void>();
  @Output() goToPrevious = new EventEmitter<void>();
  @Output() goToNext = new EventEmitter<void>();
  @Output() skipStage = new EventEmitter<void>();
  @Output() painSelectionChanged = new EventEmitter<string[]>();
  @Output() suggestResponsibilities = new EventEmitter<void>();
  @Output() teamCsvUploaded = new EventEmitter<File>();
}
