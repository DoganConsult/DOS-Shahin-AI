import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { timer, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { OnboardingStore } from './store/onboarding.store';
import { OnboardingNavigationService } from './services/onboarding-navigation.service';
import { OnboardingSessionService } from './services/onboarding-session.service';
import { OnboardingIntelligenceService } from './services/onboarding-intelligence.service';
import { OnboardingAnswerService } from './services/onboarding-answer.service';
import { OnboardingProvisioningService } from './services/onboarding-provisioning.service';
import { OnboardingValidationService } from './services/onboarding-validation.service';
import { OnboardingDataLoaderService } from './services/onboarding-data-loader.service';
import { RegistrationHeroComponent, RegistrationResult } from '../components/registration/registration-hero.component';
import { JourneyProfileSelectorComponent } from '../components/registration/journey-profile-selector.component';
import { OnboardingStoryRailComponent } from '../components/story-rail/onboarding-story-rail.component';
import { QuestionStageContainerComponent } from './containers/question-stage-container.component';
import { ProvisionStageContainerComponent } from './containers/provision-stage-container.component';
import { IntelligenceSidebarContainerComponent } from './containers/intelligence-sidebar-container.component';
import { OnboardingQuestion, OnboardingSession, OnboardingScore, GrcRecord } from '../models/onboarding.models';
import { OnboardingFormFieldComponent } from '../components/shared/onboarding-form-field.component';
import { ONBOARDING_PLATFORM } from '../ports/onboarding-platform.port';
import { OnboardingPlatformAdapter } from '../adapters/onboarding-platform.adapter';
import { ONBOARDING_STATE, ONBOARDING_NAV } from '../contracts/onboarding-module.contracts';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-onboarding-shell',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, SelectModule, MultiSelectModule,
    InputSwitchModule, InputNumberModule, ProgressBarModule, TagModule, CardModule, TooltipModule, ToastModule,
    SkeletonModule, RegistrationHeroComponent, JourneyProfileSelectorComponent, OnboardingFormFieldComponent,
    OnboardingStoryRailComponent, QuestionStageContainerComponent, ProvisionStageContainerComponent,
    IntelligenceSidebarContainerComponent,
  ],
  providers: [
    MessageService,
    OnboardingPlatformAdapter,
    { provide: ONBOARDING_PLATFORM, useExisting: OnboardingPlatformAdapter },
    OnboardingStore,
    { provide: ONBOARDING_STATE, useExisting: OnboardingStore },
    OnboardingNavigationService,
    { provide: ONBOARDING_NAV, useExisting: OnboardingNavigationService },
    OnboardingSessionService, OnboardingIntelligenceService,
    OnboardingProvisioningService, OnboardingAnswerService,
    OnboardingValidationService, OnboardingDataLoaderService,
  ],
  styleUrl: './onboarding-shell-page.component.scss',
  templateUrl: './onboarding-shell-page.component.html',
})
export class OnboardingShellPageComponent implements OnInit, OnDestroy {
  readonly store = inject(OnboardingStore);
  readonly nav = inject(OnboardingNavigationService);
  readonly sessionSvc = inject(OnboardingSessionService);
  readonly intel = inject(OnboardingIntelligenceService);
  readonly platform = inject(ONBOARDING_PLATFORM);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private deferredSubs: Subscription[] = [];

  ngOnInit(): void {
    this.store.answerSvc.setAutoSaveContext({
      getSessionId: () => this.store.session()?.id ?? null,
      getStageCode: () => this.nav.activeStage?.stageCode ?? null,
      getCurrentQuestions: () => this.nav.currentQuestions(),
      onSessionUpdate: (s) => { const existing = this.store.session(); const sess = s as unknown as OnboardingSession; this.store.session.set({ ...sess, stages: sess.stages ?? existing?.stages ?? [] }); },
      onScoresUpdate: (scores) => this.store.scores.set(scores as OnboardingScore[]),
    });
    this.store.provisioningSvc.setSessionIdResolver(() => this.store.session()?.id ?? null);

    if (!this.platform.auth.isLoggedIn()) {
      this.store.registrationMode.set(true);
      this.store.loading.set(false);
      return;
    }
    if (this.platform.auth.isOnboardingComplete()) {
      this.router.navigate(['/workspace-home']);
      return;
    }
    this.sessionSvc.loadConfiguration();
    this.sessionSvc.loadQuestions();
    const savedSessionId = this.platform.storage.get('onb_session_id');
    if (savedSessionId && OnboardingStore.UUID_RE.test(savedSessionId)) {
      this.sessionSvc.loadSession(savedSessionId);
    } else {
      if (savedSessionId) this.platform.storage.remove('onb_session_id');
      this.sessionSvc.createNewSession();
    }

    this.deferredSubs.push(
      timer(300).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.sessionSvc.loadRoles();
        this.sessionSvc.loadJourneyProfiles();
        this.sessionSvc.loadScenes();
        this.sessionSvc.loadPainCards();
      }),
    );

    this.deferredSubs.push(
      timer(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.intel.loadQuickStartTemplates();
        this.intel.loadTerminology();
        this.intel.loadAgentData();
        this.intel.checkEmailVerified();
      }),
    );
  }

  onRegistered(res: RegistrationResult): void {
    this.sessionSvc.onRegistered(res);
  }

  onAnswer(questionCode: string, value: GrcRecord): void {
    this.store.answerSvc.onAnswer(questionCode, value, this.store.questions(), this.store.uiConfig());
  }

  onQuestionRendererAnswer(event: { questionCode: string; value: unknown }): void {
    this.onAnswer(event.questionCode, event.value as GrcRecord);
  }

  onLookupAnswer(q: OnboardingQuestion, value: GrcRecord): void {
    this.store.answerSvc.onLookupAnswer(q, value, this.store.questions(), this.store.uiConfig());
  }

  onQuestionRendererLookupAnswer(event: { question: OnboardingQuestion; value: unknown }): void {
    this.onLookupAnswer(event.question, event.value as GrcRecord);
  }

  onPainSelectionChange(selected: string[]): void {
    this.onAnswer('pain.primary_concerns', selected as unknown as GrcRecord);
  }

  isPainSelected(painCode: string): boolean {
    const selected = this.store.answers['pain.primary_concerns'];
    return Array.isArray(selected) && selected.includes(painCode);
  }

  togglePain(painCode: string): void {
    let current: string[] = Array.isArray(this.store.answers['pain.primary_concerns'])
      ? this.store.answers['pain.primary_concerns'] as string[]
      : [];
    if (current.includes(painCode)) {
      current = current.filter((c: string) => c !== painCode);
    } else {
      current = [...current, painCode];
    }
    this.onAnswer('pain.primary_concerns', current as unknown as GrcRecord);
  }

  goToStageWithSideEffects(idx: number): void {
    this.nav.goToStage(idx);
    const stage = this.nav.visibleStages()[idx];
    if (stage?.stageCode === 'review_confirmation') {
      this.sessionSvc.loadReview();
      this.intel.loadBlockers();
      this.intel.loadGovernanceContext();
      this.intel.loadReviewIntelligence();
    }
    if (stage?.stageCode === 'people_ownership' || stage?.stageCode === 'people_roles') {
      this.intel.loadStaffingSuggestions();
    }
    if (stage?.stageCode === 'governance_model') {
      this.intel.loadBusinessFunctions();
    }
  }

  approveAndProvision(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.store.provisioningSvc.approveAndProvision(s.id, { onProvisionStarted: () => {
      const provIdx = this.nav.findVisibleStageIndex('provision_workspace');
      this.goToStageWithSideEffects(provIdx >= 0 ? provIdx : this.nav.visibleStages().length - 1);
    }});
  }

  retryProvisionAndApprove(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.store.provisioningSvc.retryProvisionAndApprove(s.id, { onProvisionStarted: () => {
      const provIdx = this.nav.findVisibleStageIndex('provision_workspace');
      this.goToStageWithSideEffects(provIdx >= 0 ? provIdx : this.nav.visibleStages().length - 1);
    }});
  }

  addChip(questionCode: string, event: Event): void { this.store.answerSvc.addChip(questionCode, event); }
  removeChip(questionCode: string, index: number): void { this.store.answerSvc.removeChip(questionCode, index); }
  getJsonRows(questionCode: string): GrcRecord[] { return this.store.answerSvc.getJsonRows(questionCode) as GrcRecord[]; }
  addJsonRow(questionCode: string, template: Record<string, string>): void { this.store.answerSvc.addJsonRow(questionCode, template); }
  removeJsonRow(questionCode: string, index: number): void { this.store.answerSvc.removeJsonRow(questionCode, index); }
  updateJsonField(questionCode: string, rowIndex: number, field: string, value: GrcRecord): void { this.store.answerSvc.updateJsonField(questionCode, rowIndex, field, value); }
  jsonStringify(questionCode: string): string { return this.store.answerSvc.jsonStringify(questionCode); }
  jsonParse(questionCode: string, text: string): void { this.store.answerSvc.jsonParse(questionCode, text); }

  ngOnDestroy(): void {
    this.deferredSubs.forEach(s => s.unsubscribe());
    this.deferredSubs = [];
    this.sessionSvc.destroy();
    this.store.provisioningSvc.destroy();
    this.store.answerSvc.destroy();
  }
}
