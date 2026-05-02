import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { OnboardingStore } from '../store/onboarding.store';
import { OnboardingNavigationService } from './onboarding-navigation.service';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { OnboardingConfigService } from '../../services/onboarding-config.service';
import { OnboardingLookupService } from '../../services/onboarding-lookup.service';
import { OnboardingDataLoaderService } from './onboarding-data-loader.service';
import { SaveAnswerDto, OnboardingQuestion, OnboardingSession, OnboardingRecommendation, GrcRecord } from '../../models/onboarding.models';
import { RegistrationResult } from '../../components/registration/registration-hero.component';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';
import { devError } from '../../utils/dev-logger';

@Injectable()
export class OnboardingSessionService {
  private readonly deferredTimers: ReturnType<typeof setTimeout>[] = [];
  private readonly store = inject(OnboardingStore);
  private readonly nav = inject(OnboardingNavigationService);
  private readonly api = inject(OnboardingApiService);
  private readonly configService = inject(OnboardingConfigService);
  private readonly lookupService = inject(OnboardingLookupService);
  private readonly dataLoader = inject(OnboardingDataLoaderService);
  private readonly http = inject(HttpClient);
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  loadConfiguration(): void {
    this.configService.getStageDefinitions().subscribe({
      next: (stages) => { this.store.stages.set(stages); },
      error: (error) => { devError('Failed to load stage definitions:', error); this.store.configLoadError.set(true); this.store.loading.set(false); }
    });
    this.configService.getUIConfig().subscribe({
      next: (config) => { this.store.uiConfig.set(config); },
      error: (error) => {
        devError('Failed to load UI configuration:', error);
        this.store.configLoadError.set(true);
        this.store.loading.set(false);
      }
    });
    const lang = this.platform.i18n.currentLang();
    this.configService.getTranslations(lang).subscribe({
      next: (translations) => {
        const simple: Record<string, string> = {};
        Object.entries(translations).forEach(([key, trans]) => {
          simple[key] = lang === 'ar' ? trans.textAr : trans.textEn;
        });
        this.store.translations.set(simple);
      },
      error: (error) => {
        devError('Failed to load translations:', error);
        this.store.configLoadError.set(true);
        this.store.loading.set(false);
      }
    });
  }

  loadQuestions(): void {
    this.api.getQuestionBank().subscribe({
      next: (qs) => {
        const list = Array.isArray(qs) ? qs : ((qs as Record<string, any>)?.questions as OnboardingQuestion[] ?? []);
        this.store.questions.set(list);
        this.nav.applySessionStageJump();
        this.nav.preloadLookupsForCurrentStage();
      },
      error: (err) => {
        devError('[Onboarding] Failed to load question bank:', err);
        this.store.questions.set([]);
      }
    });
  }

  loadRoles(): void {
    this.lookupService.getRoles().subscribe({
      next: (roles) => {
        const ar = this.store.isAr;
        this.store.roleOptions = roles.map(r => ({
          label: ar ? (r.label_ar || r.label_en) : r.label_en,
          value: r.value,
        }));
      },
      error: () => { this.store.roleOptions = []; }
    });
  }

  createNewSession(): void {
    this.api.createSession({ languageCode: this.platform.i18n.currentLang() }).subscribe({
      next: (s) => {
        if (s?.id) {
          this.platform.storage.set('onb_session_id', s.id);
          this.emitSceneWelcome(s.id);
        }
        this.store.session.set(s);
        this.store.loading.set(false);
      },
      error: (err: any) => {
        const httpErr = err as Record<string, any> | null;
        if (httpErr?.status === 401 || httpErr?.status === 403) {
          this.handleAuthFailure();
        } else {
          this.store.loading.set(false);
        }
      }
    });
  }

  loadSession(sessionId: string): void {
    this.dataLoader.loadCurrentSession(sessionId, {
      onSuccess: (s) => {
        this.store.session.set(s);
        this.store.isReturningSession = true;
        this.nav.applySessionStageJump();
        this.store.loading.set(false);
        this.loadAnswers(sessionId);
      },
      onError: (err: any) => {
        const httpErr = err as Record<string, any> | null;
        this.platform.storage.remove('onb_session_id');
        if (httpErr?.status === 401 || httpErr?.status === 403) {
          this.handleAuthFailure();
        } else {
          this.createNewSession();
        }
      },
    });
  }

  handleAuthFailure(): void {
    this.platform.storage.remove('grc_token');
    this.platform.storage.remove('grc_tenantId');
    this.platform.storage.remove('onb_session_id');
    this.store.registrationMode.set(true);
    this.store.loading.set(false);
  }

  onRegistered(res: RegistrationResult): void {
    this.platform.auth.setSession({
      token: res.token,
      refreshToken: res.refreshToken,
      tenantId: res.tenantId,
      role: res.role,
      userName: res.userName,
      orgName: res.orgName,
      onboardingComplete: false,
    });
    this.platform.storage.set('grc_userId', res.userId);
    if (res.sessionId) this.platform.storage.set('onb_session_id', res.sessionId);
    this.store.registrationMode.set(false);
    this.loadConfiguration();
    this.loadQuestions();
    if (res.sessionId) {
      this.loadSession(res.sessionId);
    } else {
      this.createNewSession();
    }
    this.deferredTimers.push(setTimeout(() => {
      this.loadJourneyProfiles();
      this.loadScenes();
      this.loadPainCards();
    }, 300));
  }

  saveAndContinue(): void {
    const s = this.store.session();
    if (!s?.id) return;
    const stage = this.nav.activeStage;
    if (!stage) return;
    if (!this.store.answerSvc.validateCurrentStage(this.nav.currentQuestions())) return;
    this.store.answerSvc.saveAndContinue(s.id, stage.stageCode, this.nav.currentQuestions(), {
      onSuccess: (raw) => {
        const res = raw as Record<string, any> | null;
        if (res?.session) {
          const sess = res.session as OnboardingSession;
          const existing = this.store.session();
          this.store.session.set({ ...sess, stages: sess.stages ?? existing?.stages ?? [] });
        }
        if (res?.scores) {
          const scores = res.scores as Array<Record<string, any>>;
          this.store.scores.set(scores.map((sc) => ({
            scoreType: sc.scoreType as string, scoreDomain: sc.scoreDomain as string,
            scoreValue: sc.scoreValue as number, maxScore: sc.maxScore as number, ratingLabel: sc.ratingLabel as string
          })));
        }
        const next = Math.min(this.store.activeStageIdx() + 1, this.nav.visibleStages().length - 1);
        this.nav.goToStage(next);
      },
      onError: (err: any) => {
        const httpErr = err as Record<string, any> | null;
        const errBody = httpErr?.error as Record<string, any> | null;
        this.messageService.add({
          severity: 'error',
          summary: this.store.isAr ? 'فشل الحفظ' : 'Save failed',
          detail: (errBody?.error as string) || (this.store.isAr ? 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' : 'An error occurred while saving. Please try again.'),
          life: 5000,
        });
      }
    });
  }

  openInlineEdit(questionCode: string, currentValue: GrcRecord): void {
    this.store.inlineEditQuestionCode = questionCode;
    this.store.inlineEditValue = String(currentValue ?? '');
    this.store.inlineEditVisible = true;
  }

  cancelInlineEdit(): void {
    this.store.inlineEditVisible = false;
    this.store.inlineEditQuestionCode = '';
    this.store.inlineEditValue = '';
  }

  saveInlineEdit(): void {
    if (!this.store.inlineEditQuestionCode) return;
    const s = this.store.session();
    if (!s?.id) return;
    this.store.answers[this.store.inlineEditQuestionCode] = this.store.inlineEditValue;
    const dto = this.store.answerSvc.buildSaveDto(this.store.inlineEditQuestionCode);
    const stageCode = this.nav.getStageCodeForQuestion(this.store.inlineEditQuestionCode);
    this.store.saving.set(true);
    this.api.saveAnswers(s.id, { stageCode: stageCode || 'organization_identity', answers: [dto] }).subscribe({
      next: (raw) => {
        this.store.saving.set(false);
        this.store.lastSaved.set(true);
        const res = raw as Record<string, any> | null;
        if (res?.session) {
          const sess = res.session as OnboardingSession;
          const existing = this.store.session();
          this.store.session.set({ ...sess, stages: sess.stages ?? existing?.stages ?? [] });
        }
        this.cancelInlineEdit();
        this.loadReview();
      },
      error: () => {
        this.store.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.store.isAr ? 'فشل الحفظ' : 'Save failed',
          detail: this.store.isAr ? 'لم يتم حفظ التعديل. يرجى المحاولة مرة أخرى.' : 'Edit was not saved. Please try again.',
          life: 5000,
        });
      }
    });
  }

  confirmExit(): void {
    this.store.showExitConfirm.set(false);
    this.store.answerSvc.destroy();
    const s = this.store.session();
    const stage = this.nav.activeStage;
    if (s?.id && stage) {
      const stageAnswers = this.nav.currentQuestions()
        .filter(q => this.store.answers[q.question_code] != null)
        .map(q => this.store.answerSvc.buildSaveDto(q.question_code));
      if (stageAnswers.length > 0) {
        this.store.saving.set(true);
        this.api.saveAnswers(s.id, { stageCode: stage.stageCode, answers: stageAnswers }).subscribe({
          next: () => { this.store.saving.set(false); this.doExit(); },
          error: () => { this.store.saving.set(false); this.doExit(); },
        });
        return;
      }
    }
    this.doExit();
  }

  exitOnboarding(): void { this.doExit(); }

  toggleLang(): void {
    this.platform.i18n.switchLanguage(this.store.isAr ? 'en' : 'ar');
    this.store.answerSvc.clearOptionsCache();
    this.loadConfiguration();
  }

  selectJourneyProfile(profile: import('../../models/onboarding.models').JourneyProfile): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.store.selectedProfile.set(profile);
    this.store.journeyProfilePending.set(false);
    this.api.selectJourneyProfile(s.id, profile.profile_code).subscribe({ error: () => {} });
  }

  onProfileSelected(code: string): void {
    const profile = this.store.journeyProfiles().find(p => p.profile_code === code);
    if (profile) this.selectJourneyProfile(profile);
  }

  onQuickStart(templateCode: string): void {
    const template = this.store.quickStartTemplates().find(t => t.code === templateCode);
    if (!template) return;
    if (template.answers) {
      for (const [key, val] of Object.entries(template.answers)) {
        this.store.answers[key] = val;
      }
      this.store.answerSvc.answersVersion.update(v => v + 1);
    }
    this.store.journeyProfilePending.set(false);
    this.messageService.add({
      severity: 'success',
      summary: this.store.isAr ? 'تم تطبيق القالب' : 'Template applied',
      detail: this.store.isAr ? template.name_ar : template.name_en,
      life: 3000,
    });
  }

  loadReview(): void {
    const s = this.store.session();
    if (!s?.id) return;
    this.store.reviewLoading.set(true);
    this.api.getReview(s.id).subscribe({
      next: (r) => { this.store.review.set(r); this.store.reviewLoading.set(false); },
      error: () => { this.store.reviewLoading.set(false); }
    });
  }

  loadJourneyProfiles(): void {
    this.api.getJourneyProfiles().subscribe({
      next: (res) => {
        const profiles = res.profiles ?? [];
        this.store.journeyProfiles.set(profiles);
        if (profiles.length === 0) {
          this.store.journeyProfilePending.set(false);
          return;
        }
        const s = this.store.session();
        if (s?.id) {
          this.api.getSessionJourneyProfile(s.id).subscribe({
            next: (r) => {
              if (r.profile) {
                this.store.selectedProfile.set(r.profile);
                this.store.journeyProfilePending.set(false);
              }
            },
            error: () => {}
          });
        }
      },
      error: () => {
        this.store.journeyProfiles.set([]);
        this.store.journeyProfilePending.set(false);
      }
    });
  }

  loadScenes(): void {
    this.api.getScenes().subscribe({
      next: (res) => this.store.scenes.set(res.scenes ?? []),
      error: () => this.store.scenes.set([]),
    });
  }

  loadPainCards(): void {
    this.api.getPainCards().subscribe({
      next: (cards) => this.store.painCards.set(cards ?? []),
      error: () => this.store.painCards.set([]),
    });
  }

  private loadAnswers(sessionId: string): void {
    this.dataLoader.loadAnswers(sessionId, this.store.answers, {
      onAnswersLoaded: () => {
        this.nav.preloadLookupsForCurrentStage();
        this.store.answerSvc.fetchSectorResolution();
      },
      onScoresLoaded: (scores) => this.store.scores.set(scores),
      onRecommendationsLoaded: (recs: any) => this.store.recommendations.set(recs as OnboardingRecommendation[]),
    });
  }

  private emitSceneWelcome(sessionId: string): void {
    this.http.post(`${this.api['base']}/sessions/${sessionId}/scene-welcome`, {}).subscribe({ error: () => {} });
  }

  /** Clear deferred timers — call from host component's ngOnDestroy */
  destroy(): void {
    for (const t of this.deferredTimers) clearTimeout(t);
    this.deferredTimers.length = 0;
  }

  private doExit(): void {
    this.router.navigate(['/']);
  }
}
