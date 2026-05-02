import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './onboarding-session.service.ts'), 'utf-8');

describe('OnboardingSessionService — structure', () => {
  it('exports the service class', () => {
    expect(src).toContain('export class OnboardingSessionService');
  });

  it('is marked @Injectable()', () => {
    expect(src).toContain('@Injectable()');
  });

  it('imports ONBOARDING_PLATFORM port', () => {
    expect(src).toContain('ONBOARDING_PLATFORM');
    expect(src).toContain('OnboardingPlatformPort');
  });

  it('injects OnboardingStore', () => {
    expect(src).toContain('private readonly store = inject(OnboardingStore)');
  });

  it('injects OnboardingNavigationService', () => {
    expect(src).toContain('private readonly nav = inject(OnboardingNavigationService)');
  });

  it('injects OnboardingApiService', () => {
    expect(src).toContain('private readonly api = inject(OnboardingApiService)');
  });
});

describe('OnboardingSessionService — configuration loading', () => {
  it('loads stage definitions', () => {
    expect(src).toContain('loadConfiguration(): void');
    expect(src).toContain('this.configService.getStageDefinitions()');
  });

  it('loads UI config', () => {
    expect(src).toContain('this.configService.getUIConfig()');
  });

  it('loads translations for current language', () => {
    expect(src).toContain('this.configService.getTranslations(lang)');
  });

  it('sets configLoadError on stage definition failure', () => {
    expect(src).toContain('this.store.configLoadError.set(true)');
  });
});

describe('OnboardingSessionService — session management', () => {
  it('creates new session via API', () => {
    expect(src).toContain('createNewSession(): void');
    expect(src).toContain('this.api.createSession');
  });

  it('stores session ID in storage on creation', () => {
    expect(src).toContain("this.platform.storage.set('onb_session_id', s.id)");
  });

  it('loads existing session via data loader', () => {
    expect(src).toContain('loadSession(sessionId: string): void');
    expect(src).toContain('this.dataLoader.loadCurrentSession');
  });

  it('marks returning session on load', () => {
    expect(src).toContain('this.store.isReturningSession = true');
  });

  it('handles auth failure by clearing storage', () => {
    expect(src).toContain('handleAuthFailure(): void');
    expect(src).toContain("this.platform.storage.remove('grc_token')");
    expect(src).toContain("this.platform.storage.remove('grc_tenantId')");
  });
});

describe('OnboardingSessionService — registration flow', () => {
  it('handles registration result with auth session setup via platform port', () => {
    expect(src).toContain('onRegistered(res: RegistrationResult): void');
    expect(src).toContain('this.platform.auth.setSession');
  });

  it('chains configuration + question + profile loads after registration', () => {
    const onRegIdx = src.indexOf('onRegistered(');
    const block = src.slice(onRegIdx, onRegIdx + 600);
    expect(block).toContain('this.loadConfiguration()');
    expect(block).toContain('this.loadQuestions()');
    expect(block).toContain('this.loadJourneyProfiles()');
  });
});

describe('OnboardingSessionService — save & continue', () => {
  it('validates current stage before saving', () => {
    expect(src).toContain('saveAndContinue(): void');
    expect(src).toContain('this.store.answerSvc.validateCurrentStage');
  });

  it('advances to next stage on success', () => {
    const saveIdx = src.indexOf('saveAndContinue(): void');
    const block = src.slice(saveIdx, saveIdx + 1000);
    expect(block).toContain('this.nav.goToStage(next)');
  });

  it('shows toast on save failure', () => {
    expect(src).toContain("severity: 'error'");
    expect(src).toContain('Save failed');
  });
});

describe('OnboardingSessionService — inline edit', () => {
  it('opens inline edit dialog', () => {
    expect(src).toContain('openInlineEdit(questionCode: string, currentValue: GrcRecord): void');
  });

  it('cancels inline edit and clears state', () => {
    expect(src).toContain('cancelInlineEdit(): void');
    expect(src).toContain("this.store.inlineEditVisible = false");
  });

  it('saves inline edit via API', () => {
    expect(src).toContain('saveInlineEdit(): void');
    expect(src).toContain('this.api.saveAnswers');
  });
});

describe('OnboardingSessionService — exit flow', () => {
  it('confirms exit with autosave', () => {
    expect(src).toContain('confirmExit(): void');
    expect(src).toContain('this.store.answerSvc.destroy()');
  });

  it('saves pending stage answers before exit', () => {
    const exitIdx = src.indexOf('confirmExit(): void');
    const block = src.slice(exitIdx, exitIdx + 800);
    expect(block).toContain('stageAnswers.length > 0');
  });
});

describe('OnboardingSessionService — journey profiles & scenes', () => {
  it('loads journey profiles from API', () => {
    expect(src).toContain('loadJourneyProfiles(): void');
    expect(src).toContain('this.api.getJourneyProfiles()');
  });

  it('selects journey profile with API persistence', () => {
    expect(src).toContain('selectJourneyProfile(');
    expect(src).toContain('this.api.selectJourneyProfile');
  });

  it('loads scenes from API', () => {
    expect(src).toContain('loadScenes(): void');
    expect(src).toContain('this.api.getScenes()');
  });

  it('loads pain cards from API', () => {
    expect(src).toContain('loadPainCards(): void');
    expect(src).toContain('this.api.getPainCards()');
  });
});

describe('OnboardingSessionService — quick start', () => {
  it('applies quick start template answers', () => {
    expect(src).toContain('onQuickStart(templateCode: string): void');
    expect(src).toContain('template.answers');
  });

  it('increments answers version after applying template', () => {
    expect(src).toContain('this.store.answerSvc.answersVersion.update');
  });

  it('shows success toast after template applied', () => {
    const qsIdx = src.indexOf('onQuickStart(');
    const block = src.slice(qsIdx, qsIdx + 600);
    expect(block).toContain("severity: 'success'");
    expect(block).toContain('Template applied');
  });
});
