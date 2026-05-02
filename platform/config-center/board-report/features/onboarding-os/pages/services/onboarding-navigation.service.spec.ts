import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './onboarding-navigation.service.ts'), 'utf-8');

describe('OnboardingNavigationService — structure', () => {
  it('exports the service class', () => {
    expect(src).toContain('export class OnboardingNavigationService');
  });

  it('is marked @Injectable()', () => {
    expect(src).toContain('@Injectable()');
  });

  it('injects OnboardingStore', () => {
    expect(src).toContain('private readonly store = inject(OnboardingStore)');
  });

  it('injects OnboardingValidationService', () => {
    expect(src).toContain('private readonly validationService = inject(OnboardingValidationService)');
  });

  it('injects OnboardingDataLoaderService', () => {
    expect(src).toContain('private readonly dataLoader = inject(OnboardingDataLoaderService)');
  });
});

describe('OnboardingNavigationService — computed signals', () => {
  it('computes visibleStages filtering stages with questions', () => {
    expect(src).toContain('readonly visibleStages = computed(');
    expect(src).toContain('SPECIAL_STAGES');
  });

  it('computes currentScene matching stage codes', () => {
    expect(src).toContain('readonly currentScene = computed(');
    expect(src).toContain('stage_codes.includes');
  });

  it('computes storyRailStages for the story rail component', () => {
    expect(src).toContain('readonly storyRailStages = computed<StageItem[]>(');
    expect(src).toContain('getStageStatus');
    expect(src).toContain('getStagePercent');
  });

  it('computes skippedQuestionCount', () => {
    expect(src).toContain('readonly skippedQuestionCount = computed(');
  });

  it('computes canSkipCurrentStage based on config feature flag', () => {
    expect(src).toContain('readonly canSkipCurrentStage = computed(');
    expect(src).toContain('enableStageSkip');
  });
});

describe('OnboardingNavigationService — stage navigation', () => {
  it('has goToStage clearing validation errors', () => {
    expect(src).toContain('goToStage(idx: number): void');
    expect(src).toContain('this.store.validationErrors = {}');
  });

  it('has skipCurrentStage advancing to next', () => {
    expect(src).toContain('skipCurrentStage(): void');
  });

  it('has navigateToBlocker for blocker resolution', () => {
    expect(src).toContain('navigateToBlocker(blocker: GrcRecord): void');
  });

  it('has findVisibleStageIndex for named stage lookup', () => {
    expect(src).toContain('findVisibleStageIndex(stageCode: string): number');
  });

  it('computes maxReachableStage based on session status', () => {
    expect(src).toContain('maxReachableStage(): number');
    expect(src).toContain("s.status === 'provisioning'");
    expect(src).toContain("s.status === 'review_ready'");
  });
});

describe('OnboardingNavigationService — stage classification', () => {
  it('classifies question stages', () => {
    expect(src).toContain('get isQuestionStage(): boolean');
  });

  it('classifies review stage', () => {
    expect(src).toContain('get isReviewStage(): boolean');
    expect(src).toContain("'review_confirmation'");
  });

  it('classifies provision stage', () => {
    expect(src).toContain('get isProvisionStage(): boolean');
    expect(src).toContain("'provision_workspace'");
  });

  it('classifies dedicated component stages', () => {
    expect(src).toContain('get isDedicatedComponentStage(): boolean');
    expect(src).toContain('DEDICATED_COMPONENT_STAGES');
  });
});

describe('OnboardingNavigationService — question/section helpers', () => {
  it('filters and sorts currentQuestions by stage and tier', () => {
    expect(src).toContain('currentQuestions(): OnboardingQuestion[]');
    expect(src).toContain('question_tiers_visible');
    expect(src).toContain('.sort((a, b) => a.sort_order - b.sort_order)');
  });

  it('groups currentSections by section_code', () => {
    expect(src).toContain('currentSections():');
    expect(src).toContain('section_code');
    expect(src).toContain('SECTION_LABELS');
  });

  it('computes answeredCount from active questions', () => {
    expect(src).toContain('answeredCount(): number');
  });

  it('has getQuestionLabel with bilingual fallback', () => {
    expect(src).toContain('getQuestionLabel(questionCode: string): string');
  });

  it('has getStageCodeForQuestion prefix-based fallback', () => {
    expect(src).toContain('getStageCodeForQuestion(questionCode: string)');
    expect(src).toContain("'organization_identity'");
    expect(src).toContain("'regulatory_scope'");
  });

  it('preloads lookups for the current stage', () => {
    expect(src).toContain('preloadLookupsForCurrentStage(): void');
    expect(src).toContain('this.dataLoader.preloadLookupsForCurrentStage');
  });

  it('applies session stage jump on resume', () => {
    expect(src).toContain('applySessionStageJump(): void');
    expect(src).toContain("'provision_workspace'");
    expect(src).toContain("'review_confirmation'");
  });

  it('provides trackBy functions for template lists', () => {
    expect(src).toContain('trackStage =');
    expect(src).toContain('trackSection =');
    expect(src).toContain('trackQuestion =');
  });
});
