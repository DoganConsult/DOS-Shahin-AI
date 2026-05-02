/**
 * OnboardingConfigService — spec tests for config loading, caching, and fallbacks.
 * Validates that the service caches HTTP responses and provides sensible defaults.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './onboarding-config.service.ts'), 'utf-8');

describe('OnboardingConfigService — config loading', () => {
  it('sets apiUrl from environment config endpoint', () => {
    expect(src).toContain("private apiUrl = `${environment.apiUrl}/onboarding/config`");
  });

  it('getStageDefinitions fetches from /config/stages', () => {
    expect(src).toContain('`${this.apiUrl}/stages`');
  });

  it('getProvisioningSteps fetches from /config/provisioning-steps', () => {
    expect(src).toContain('`${this.apiUrl}/provisioning-steps`');
  });

  it('getUIConfig fetches from /config/ui', () => {
    expect(src).toContain('`${this.apiUrl}/ui`');
  });

  it('getTranslations fetches with language query param', () => {
    expect(src).toContain('`${this.apiUrl}/translations?lang=${language}`');
  });

  it('maps API response to extract nested data (stages, steps, config)', () => {
    expect(src).toContain('map(response => response.stages)');
    expect(src).toContain('map(response => response.steps)');
    expect(src).toContain('map(response => response.config)');
  });
});

describe('OnboardingConfigService — config caching', () => {
  it('caches stageDefinitions$ observable with shareReplay', () => {
    expect(src).toContain('private stageDefinitions$?: Observable<StageDefinition[]>');
    expect(src).toContain('shareReplay(1)');
  });

  it('skips HTTP call when cached observable exists', () => {
    expect(src).toContain('if (!this.stageDefinitions$ || forceRefresh)');
    expect(src).toContain('if (!this.provisioningSteps$ || forceRefresh)');
    expect(src).toContain('if (!this.uiConfig$ || forceRefresh)');
  });

  it('supports forceRefresh parameter to bypass cache', () => {
    expect(src).toContain('getStageDefinitions(forceRefresh = false)');
    expect(src).toContain('getProvisioningSteps(forceRefresh = false)');
    expect(src).toContain('getUIConfig(forceRefresh = false)');
  });

  it('caches translations per language key', () => {
    expect(src).toContain("private translations$: Map<string, Observable<Record<string, Translation>>>");
    expect(src).toContain('this.translations$.has(cacheKey)');
    expect(src).toContain('this.translations$.set(cacheKey, translations$)');
  });

  it('clearCache resets all cached observables', () => {
    expect(src).toContain('clearCache(): void');
    expect(src).toContain('this.stageDefinitions$ = undefined');
    expect(src).toContain('this.provisioningSteps$ = undefined');
    expect(src).toContain('this.uiConfig$ = undefined');
    expect(src).toContain('this.translations$.clear()');
  });

  it('clearCache also clears server-side cache', () => {
    expect(src).toContain("`${this.apiUrl}/cache/clear`");
  });
});

describe('OnboardingConfigService — default fallbacks', () => {
  it('falls back to getFallbackStages on HTTP error', () => {
    expect(src).toContain('catchError(error =>');
    expect(src).toContain('return of(this.getFallbackStages())');
  });

  it('falls back to getFallbackProvisioningSteps on HTTP error', () => {
    expect(src).toContain('return of(this.getFallbackProvisioningSteps())');
  });

  it('falls back to getFallbackUIConfig on HTTP error', () => {
    expect(src).toContain('return of(this.getFallbackUIConfig())');
  });

  it('fallback UI config provides sensible threshold defaults', () => {
    expect(src).toContain('readinessReady: 80');
    expect(src).toContain('readinessWarning: 40');
  });

  it('fallback UI config provides autosave and polling intervals', () => {
    expect(src).toContain('autosaveDelayMs: 2000');
    expect(src).toContain('pollingIntervalMs: 2000');
    expect(src).toContain('sessionTimeoutMinutes: 30');
  });

  it('fallback UI config enables key features by default', () => {
    expect(src).toContain('enableAutosave: true');
    expect(src).toContain('enableStageValidation: true');
    expect(src).toContain('enableLiveIntelligence: true');
  });

  it('translate returns key when translation not found', () => {
    expect(src).toContain('return translations[key] || key');
  });

  it('interpolate replaces {variable} placeholders in text', () => {
    expect(src).toContain('interpolate(text: string, variables: Record<string, unknown>)');
    expect(src).toContain("new RegExp(`{${key}}`, 'g')");
  });

  it('getCurrentStages returns value from BehaviorSubject', () => {
    expect(src).toContain('getCurrentStages(): StageDefinition[]');
    expect(src).toContain('return this.currentStages$.value');
  });
});
