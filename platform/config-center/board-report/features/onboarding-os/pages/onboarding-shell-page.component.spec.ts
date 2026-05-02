/**
 * OnboardingShellPageComponent — spec tests for shell page behavior.
 * Validates component structure, navigation, answer handling, and stage lifecycle.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './onboarding-shell-page.component.ts'), 'utf-8');
const html = readFileSync(resolve(__dirname, './onboarding-shell-page.component.html'), 'utf-8');

describe('OnboardingShellPageComponent — creation & structure', () => {
  it('exports the component class', () => {
    expect(src).toContain('export class OnboardingShellPageComponent');
  });

  it('implements OnInit and OnDestroy lifecycle hooks', () => {
    expect(src).toContain('implements OnInit, OnDestroy');
  });

  it('uses OnPush change detection for performance', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('imports ONBOARDING_PLATFORM port', () => {
    expect(src).toContain('ONBOARDING_PLATFORM');
    expect(src).toContain('OnboardingPlatformAdapter');
  });

  it('injects OnboardingStore', () => {
    expect(src).toContain('readonly store = inject(OnboardingStore)');
  });

  it('injects OnboardingNavigationService', () => {
    expect(src).toContain('readonly nav = inject(OnboardingNavigationService)');
  });
});

describe('OnboardingShellPageComponent — loads scenes/stages on init', () => {
  it('ngOnInit checks authentication before proceeding', () => {
    const initIdx = src.indexOf('ngOnInit(): void {');
    const initBlock = src.slice(initIdx, initIdx + 1200);
    expect(initBlock).toContain('this.platform.auth.isLoggedIn()');
  });

  it('ngOnInit loads configuration (stages, UI config, translations)', () => {
    expect(src).toContain('loadConfiguration');
  });

  it('ngOnInit loads questions from the question bank', () => {
    expect(src).toContain('loadQuestions');
  });

  it('ngOnInit loads journey profiles for scene selection', () => {
    expect(src).toContain('loadJourneyProfiles');
  });

  it('loads scenes via sessionSvc', () => {
    expect(src).toContain('this.sessionSvc.loadScenes()');
  });

  it('loads quick start templates via intel service', () => {
    expect(src).toContain('this.intel.loadQuickStartTemplates()');
  });
});

describe('OnboardingShellPageComponent — answer submission', () => {
  const storeSrc = readFileSync(resolve(__dirname, './store/onboarding.store.ts'), 'utf-8');

  it('delegates answer saving to OnboardingAnswerService', () => {
    expect(src).toContain('OnboardingAnswerService');
    expect(src).toContain('answerSvc');
  });

  it('provides saving signal from answer service via store', () => {
    expect(storeSrc).toContain('get saving()');
    expect(storeSrc).toContain('answerSvc.saving');
  });

  it('provides lastSaved signal from answer service via store', () => {
    expect(storeSrc).toContain('get lastSaved()');
    expect(storeSrc).toContain('answerSvc.lastSaved');
  });

  it('delegates answer state to answerSvc.answers via store', () => {
    expect(storeSrc).toContain('get answers()');
    expect(storeSrc).toContain('answerSvc.answers');
  });

  it('exposes validationErrors from answerSvc via store', () => {
    expect(storeSrc).toContain('get validationErrors()');
    expect(storeSrc).toContain('answerSvc.validationErrors');
  });
});

describe('OnboardingShellPageComponent — navigation between stages', () => {
  it('delegates navigation to OnboardingNavigationService', () => {
    expect(src).toContain('readonly nav = inject(OnboardingNavigationService)');
  });

  it('has goToStageWithSideEffects wired from story rail', () => {
    expect(html).toContain('(stageSelected)="goToStageWithSideEffects($event)"');
  });

  it('loads review intelligence on review_confirmation stage', () => {
    const method = src.slice(
      src.indexOf('goToStageWithSideEffects('),
      src.indexOf('goToStageWithSideEffects(') + 600,
    );
    expect(method).toContain("'review_confirmation'");
    expect(method).toContain('this.sessionSvc.loadReview()');
    expect(method).toContain('this.intel.loadBlockers()');
  });

  it('has findVisibleStageIndex via nav service', () => {
    expect(src).toContain('this.nav.findVisibleStageIndex');
  });

  it('navigates to provision_workspace after approval', () => {
    const method = src.slice(
      src.indexOf('approveAndProvision(): void'),
      src.indexOf('approveAndProvision(): void') + 600,
    );
    expect(method).toContain("this.nav.findVisibleStageIndex('provision_workspace')");
  });
});
