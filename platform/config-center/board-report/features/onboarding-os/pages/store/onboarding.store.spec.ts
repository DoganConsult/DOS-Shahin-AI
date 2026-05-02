import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './onboarding.store.ts'), 'utf-8');

describe('OnboardingStore — structure & signals', () => {
  it('exports the store class', () => {
    expect(src).toContain('export class OnboardingStore');
  });

  it('is marked @Injectable()', () => {
    expect(src).toContain('@Injectable()');
  });

  it('injects OnboardingAnswerService', () => {
    expect(src).toContain('readonly answerSvc = inject(OnboardingAnswerService)');
  });

  it('injects OnboardingProvisioningService', () => {
    expect(src).toContain('readonly provisioningSvc = inject(OnboardingProvisioningService)');
  });

  it('declares session as a signal', () => {
    expect(src).toContain('readonly session = signal<OnboardingSession | null>(null)');
  });

  it('declares stages as a signal', () => {
    expect(src).toContain('readonly stages = signal<StageDefinition[]>([])');
  });

  it('declares loading as a signal defaulting to true', () => {
    expect(src).toContain('readonly loading = signal(true)');
  });

  it('declares registrationMode as a signal', () => {
    expect(src).toContain('readonly registrationMode = signal(false)');
  });

  it('declares activeStageIdx as a signal', () => {
    expect(src).toContain('readonly activeStageIdx = signal(0)');
  });

  it('declares questions as a signal', () => {
    expect(src).toContain('readonly questions = signal<OnboardingQuestion[]>([])');
  });
});

describe('OnboardingStore — computed properties', () => {
  it('computes overallConfidence from confidenceScores', () => {
    expect(src).toContain('readonly overallConfidence = computed(');
    expect(src).toContain('this.confidenceScores()');
  });

  it('computes painModuleMappings from pain cards', () => {
    expect(src).toContain('readonly painModuleMappings = computed(');
    expect(src).toContain('this.painCards()');
  });

  it('computes provisioningSummary from governance context', () => {
    expect(src).toContain('readonly provisioningSummary = computed(');
    expect(src).toContain('this.governanceContext()');
  });
});

describe('OnboardingStore — delegated getters', () => {
  it('delegates answers to answerSvc', () => {
    expect(src).toContain('get answers() { return this.answerSvc.answers; }');
  });

  it('delegates saving signal to answerSvc', () => {
    expect(src).toContain('get saving() { return this.answerSvc.saving; }');
  });

  it('delegates provisioning signal to provisioningSvc', () => {
    expect(src).toContain('get provisioning() { return this.provisioningSvc.provisioning; }');
  });

  it('delegates provJob signal to provisioningSvc', () => {
    expect(src).toContain('get provJob() { return this.provisioningSvc.provJob; }');
  });
});

describe('OnboardingStore — constants & utilities', () => {
  it('has UUID regex for session ID validation', () => {
    expect(src).toContain('static readonly UUID_RE');
  });

  it('defines SPECIAL_STAGES set', () => {
    expect(src).toContain("readonly SPECIAL_STAGES = new Set(['review_confirmation', 'provision_workspace'])");
  });

  it('defines DEDICATED_COMPONENT_STAGES set', () => {
    expect(src).toContain('readonly DEDICATED_COMPONENT_STAGES = new Set(');
  });

  it('has t() translation helper with fallback', () => {
    expect(src).toContain('t(key: string): string');
    expect(src).toContain('FALLBACK_TRANSLATIONS');
  });

  it('has getStageLabel with bilingual support', () => {
    expect(src).toContain('getStageLabel(stage: StageDefinition): string');
    expect(src).toContain('stage.labelAr');
    expect(src).toContain('stage.labelEn');
  });

  it('has isAr computed from platform i18n port', () => {
    expect(src).toContain("get isAr(): boolean { return this.platform.i18n.currentLang() === 'ar'; }");
  });

  it('implements IOnboardingStateReader interface', () => {
    expect(src).toContain('implements IOnboardingStateReader');
  });

  it('injects ONBOARDING_PLATFORM token', () => {
    expect(src).toContain('inject(ONBOARDING_PLATFORM)');
  });
});
