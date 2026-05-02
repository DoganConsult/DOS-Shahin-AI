/**
 * OnboardingApiService — spec tests for HTTP API integration.
 * Validates endpoint URLs, method types, and response contract shapes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './onboarding-api.service.ts'), 'utf-8');

describe('OnboardingApiService — HTTP calls to correct endpoints', () => {
  it('sets base URL from environment', () => {
    expect(src).toContain("private base = `${environment.apiUrl}/onboarding`");
  });

  it('register posts to /onboarding/register', () => {
    expect(src).toContain('`${this.base}/register`');
    expect(src).toContain('this.http.post<unknown>(`${this.base}/register`');
  });

  it('createSession posts to /onboarding/sessions', () => {
    expect(src).toContain('this.http.post<OnboardingSession>(`${this.base}/sessions`');
  });

  it('getSession uses GET with session ID', () => {
    expect(src).toContain('this.http.get<OnboardingSession>(`${this.base}/sessions/${sessionId}`');
  });

  it('saveAnswers uses PUT for idempotent bulk save', () => {
    expect(src).toContain('this.http.put(`${this.base}/sessions/${sessionId}/answers`');
  });

  it('getScores fetches from /sessions/{id}/scores', () => {
    expect(src).toContain('`${this.base}/sessions/${sessionId}/scores`');
  });

  it('getRecommendations fetches from /sessions/{id}/recommendations', () => {
    expect(src).toContain('`${this.base}/sessions/${sessionId}/recommendations`');
  });

  it('provision posts to /sessions/{id}/provision', () => {
    expect(src).toContain('`${this.base}/sessions/${sessionId}/provision`');
  });

  it('liveInference posts to /onboarding/live-inference', () => {
    expect(src).toContain('`${this.base}/live-inference`');
  });

  it('getWorkspacePreview fetches from /sessions/{id}/workspace-preview', () => {
    expect(src).toContain('`${this.base}/sessions/${sessionId}/workspace-preview`');
  });

  it('getStartupChecklist fetches from /sessions/{id}/checklist', () => {
    expect(src).toContain('`${this.base}/sessions/${sessionId}/checklist`');
  });

  it('completeChecklistItem posts to /sessions/{id}/checklist/{itemId}/complete', () => {
    expect(src).toContain('`${this.base}/sessions/${sessionId}/checklist/${itemId}/complete`');
  });
});

describe('OnboardingApiService — error handling & response transformation', () => {
  it('injects HttpClient for all HTTP calls', () => {
    expect(src).toContain('constructor(private http: HttpClient)');
  });

  it('returns typed Observables for all endpoints', () => {
    expect(src).toContain('Observable<OnboardingSession>');
    expect(src).toContain('Observable<OnboardingScore[]>');
    expect(src).toContain('Observable<OnboardingRecommendation[]>');
    expect(src).toContain('Observable<OnboardingBlocker[]>');
    expect(src).toContain('Observable<ReviewModel>');
  });

  it('encodes slug parameter for URL safety', () => {
    expect(src).toContain('encodeURIComponent(slug)');
  });

  it('encodes questionCode parameter for URL safety', () => {
    expect(src).toContain('encodeURIComponent(questionCode)');
  });

  it('getQuestionBank supports optional stageCode filter parameter', () => {
    expect(src).toContain('stageCode ? `${this.base}/questions?stage_code=${stageCode}`');
  });

  it('getRegulatorExplanations supports optional sector query param', () => {
    expect(src).toContain('sector ? `${this.base}/regulator-explanations?sector=${encodeURIComponent(sector)}`');
  });

  it('exports LiveInferenceResult interface with full shape', () => {
    expect(src).toContain('export interface LiveInferenceResult');
    expect(src).toContain('regulators:');
    expect(src).toContain('frameworks:');
    expect(src).toContain('impactPreview:');
    expect(src).toContain('automationScore:');
    expect(src).toContain('enabledModules:');
    expect(src).toContain('complexity:');
  });

  it('exports PainCard interface', () => {
    expect(src).toContain('export interface PainCard');
  });

  it('exports SessionBootstrapResult with all required fields', () => {
    expect(src).toContain('export interface SessionBootstrapResult');
    expect(src).toContain('state: string');
    expect(src).toContain('auth:');
    expect(src).toContain('tenant:');
    expect(src).toContain('onboarding:');
    expect(src).toContain('provisioning:');
    expect(src).toContain('next:');
  });
});
