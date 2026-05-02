import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  OnboardingSession,
  OnboardingStage,
  OnboardingQuestion,
  SaveBulkAnswersPayload,
  OnboardingScore,
  OnboardingBlocker,
  OnboardingRecommendation,
  ReviewModel,
  ProvisioningJob,
  ProvisioningStep,
  JourneyProfile,
  SceneTemplate,
  GovernanceContextSummary,
  ModuleOperatingState,
  InferredFact,
  ConfidenceDimension,
  WorkspacePreviewSection,
  RegulatorExplanation,
  DashboardPersonaProfile,
  RegionalTerm,
  SectorResolutionResult,
} from '../models/onboarding.models';

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private base = `${environment.apiUrl}/onboarding`;

  constructor(private http: HttpClient) {}

  // ═══ Public registration (no auth) ═══
  register(body: {
    companyNameEn: string;
    companyNameAr?: string;
    sector?: string;
    country?: string;
    orgType?: string;
    employeeBand?: string;
    appName?: string;
    email: string;
    password: string;
    userName: string;
    userTitle?: string;
    consent: boolean;
  }): Observable<{ token: string; refreshToken: string; userId: string; tenantId: string; tenantCode: string; role: string; orgName: string; orgNameAr: string; userName: string; sessionId: string; onboardingComplete: boolean }> {
    return this.http.post<{ token: string; refreshToken: string; userId: string; tenantId: string; tenantCode: string; role: string; orgName: string; orgNameAr: string; userName: string; sessionId: string; onboardingComplete: boolean }>(`${this.base}/register`, body);
  }

  // ═══ Email availability check (no auth) ═══
  checkEmailAvailability(email: string): Observable<{ available: boolean; reason?: string; existingOrg?: string }> {
    return this.http.post<{ available: boolean; reason?: string; existingOrg?: string }>(`${this.base}/check-email`, { email });
  }

  // ═══ Session readiness check ═══
  getSessionReadiness(sessionId: string): Observable<{ summary: ReadinessSummary; modules: ReadinessModule[] }> {
    return this.http.get<{ summary: ReadinessSummary; modules: ReadinessModule[] }>(`${this.base}/readiness/${sessionId}`);
  }

  // ═══ Question bank ═══
  getQuestionBank(stageCode?: string): Observable<OnboardingQuestion[]> {
    const url = stageCode ? `${this.base}/questions?stage_code=${stageCode}` : `${this.base}/questions`;
    return this.http.get<OnboardingQuestion[]>(url);
  }

  // ═══ A. Session lifecycle — 4 APIs ═══
  createSession(body: { organizationName?: string; displayName?: string; languageCode?: string }): Observable<OnboardingSession> {
    return this.http.post<OnboardingSession>(`${this.base}/sessions`, body);
  }

  getSession(sessionId: string): Observable<OnboardingSession> {
    return this.http.get<OnboardingSession>(`${this.base}/sessions/${sessionId}`);
  }

  patchSession(sessionId: string, body: any): Observable<OnboardingSession> {
    return this.http.patch<OnboardingSession>(`${this.base}/sessions/${sessionId}`, body);
  }

  getSessionStages(sessionId: string): Observable<OnboardingStage[]> {
    return this.http.get<OnboardingStage[]>(`${this.base}/sessions/${sessionId}/stages`);
  }

  // ═══ B. Answer APIs — 3 APIs ═══
  saveAnswers(sessionId: string, payload: SaveBulkAnswersPayload): Observable<any> {
    return this.http.put(`${this.base}/sessions/${sessionId}/answers`, payload);
  }

  getAnswers(sessionId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/sessions/${sessionId}/answers`);
  }

  getOneAnswer(sessionId: string, questionCode: string): Observable<any> {
    return this.http.get(`${this.base}/sessions/${sessionId}/answers/${encodeURIComponent(questionCode)}`);
  }

  // ═══ C. Validation / intelligence — 5 APIs ═══
  validateStage(sessionId: string, stageCode: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/validate-stage`, { stageCode });
  }

  recalculate(sessionId: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/recalculate`, {});
  }

  getScores(sessionId: string): Observable<OnboardingScore[]> {
    return this.http.get<OnboardingScore[]>(`${this.base}/sessions/${sessionId}/scores`);
  }

  getRecommendations(sessionId: string): Observable<OnboardingRecommendation[]> {
    return this.http.get<OnboardingRecommendation[]>(`${this.base}/sessions/${sessionId}/recommendations`);
  }

  getBlockers(sessionId: string): Observable<OnboardingBlocker[]> {
    return this.http.get<OnboardingBlocker[]>(`${this.base}/sessions/${sessionId}/blockers`);
  }

  // ═══ D. Review / provisioning — 6 APIs ═══
  getReview(sessionId: string): Observable<ReviewModel> {
    return this.http.get<ReviewModel>(`${this.base}/sessions/${sessionId}/review`);
  }

  /** Live sector resolution — returns authorities, frameworks, controls, evidence counts */
  getReviewPreview(sectorCode: string): Observable<SectorResolutionResult> {
    return this.http.post<SectorResolutionResult>(`${this.base}/review-preview`, { sectorCode });
  }

  // ═══ Dashboard KPIs ═══
  getDashboardStats(): Observable<{ data: Record<string, unknown> }> {
    return this.http.get<{ data: Record<string, unknown> }>(`${this.base}-os/dashboard`);
  }

  approve(sessionId: string, body: { approvedByUserId: string; acceptProvisioningImpact: boolean }): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/approve`, body);
  }

  provision(sessionId: string): Observable<{ accepted: boolean; jobId: string; sessionId: string; status: string }> {
    return this.http.post<{ accepted: boolean; jobId: string; sessionId: string; status: string }>(`${this.base}/sessions/${sessionId}/provision`, {});
  }

  getProvisioningJob(jobId: string): Observable<ProvisioningJob> {
    return this.http.get<ProvisioningJob>(`${this.base}/provisioning/jobs/${jobId}`);
  }

  getProvisioningSteps(jobId: string): Observable<ProvisioningStep[]> {
    return this.http.get<ProvisioningStep[]>(`${this.base}/provisioning/jobs/${jobId}/steps`);
  }

  retryProvisioningJob(jobId: string): Observable<any> {
    return this.http.post(`${this.base}/provisioning/jobs/${jobId}/retry`, {});
  }

  getProvisioningEvents(jobId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/provisioning/jobs/${jobId}/events`);
  }

  completeSession(sessionId: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/complete`, {});
  }

  // ═══ E. Startup checklist — 2 APIs ═══
  getStartupChecklist(sessionId: string): Observable<any> {
    return this.http.get(`${this.base}/sessions/${sessionId}/checklist`);
  }

  completeChecklistItem(sessionId: string, itemId: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/checklist/${itemId}/complete`, {});
  }

  checkSlugAvailability(slug: string): Observable<{ available: boolean; slug: string; reason?: string }> {
    return this.http.get<{ available: boolean; slug: string; reason?: string }>(`${this.base}/check-slug/${encodeURIComponent(slug)}`);
  }

  // ═══ F. Live inference — real-time scene-aware inference ═══
  liveInference(answers: Record<string, unknown>): Observable<LiveInferenceResult> {
    return this.http.post<LiveInferenceResult>(`${this.base}/live-inference`, { answers });
  }

  // ═══ G. Pain module mapping — for Scene 2 pain cards ═══
  getPainCards(): Observable<PainCard[]> {
    return this.http.get<PainCard[]>(`${this.base}/pain-cards`);
  }

  // ═══ H. Provisioning milestones — for Scene 9 activation ceremony ═══
  getProvisioningMilestones(): Observable<ProvisioningMilestone[]> {
    return this.http.get<ProvisioningMilestone[]>(`${this.base}/provisioning/milestones`);
  }

  // ═══ I. Journey Profiles — DB-driven story layer ═══
  getJourneyProfiles(): Observable<{ profiles: JourneyProfile[] }> {
    return this.http.get<{ profiles: JourneyProfile[] }>(`${this.base}/journey-profiles`);
  }

  getSessionJourneyProfile(sessionId: string): Observable<{ profile: JourneyProfile | null }> {
    return this.http.get<{ profile: JourneyProfile | null }>(`${this.base}/sessions/${sessionId}/journey-profile`);
  }

  selectJourneyProfile(sessionId: string, profileCode: string): Observable<{ profile: JourneyProfile }> {
    return this.http.post<{ profile: JourneyProfile }>(`${this.base}/sessions/${sessionId}/journey-profile`, { profileCode });
  }

  // ═══ J. Scenes — DB-driven emotional story scenes ═══
  getScenes(): Observable<{ scenes: SceneTemplate[] }> {
    return this.http.get<{ scenes: SceneTemplate[] }>(`${this.base}/scenes`);
  }

  updateCurrentScene(sessionId: string, sceneCode: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/current-scene`, { sceneCode });
  }

  // ═══ K. Governance Context — canonical context from context engine ═══
  getGovernanceContext(tenantId: string): Observable<GovernanceContextSummary> {
    return this.http.get<GovernanceContextSummary>(`${this.base}/context/${tenantId}`);
  }

  getModuleStates(tenantId: string): Observable<{ modules: ModuleOperatingState[] }> {
    return this.http.get<{ modules: ModuleOperatingState[] }>(`${this.base}/context/${tenantId}/modules`);
  }

  // ═══ L. Inferred Facts — 3 APIs ═══
  getInferredFacts(sessionId: string): Observable<{ facts: InferredFact[] }> {
    return this.http.get<{ facts: InferredFact[] }>(`${this.base}/sessions/${sessionId}/inferred-facts`);
  }

  computeInferredFacts(sessionId: string, answers: Record<string, unknown>): Observable<{ facts: InferredFact[] }> {
    return this.http.post<{ facts: InferredFact[] }>(`${this.base}/sessions/${sessionId}/inferred-facts/compute`, { answers });
  }

  confirmFact(sessionId: string, factCode: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/sessions/${sessionId}/inferred-facts/${encodeURIComponent(factCode)}/confirm`, {});
  }

  // ═══ M. Confidence Scores — 2 APIs ═══
  getConfidenceScores(sessionId: string): Observable<{ scores: ConfidenceDimension[] }> {
    return this.http.get<{ scores: ConfidenceDimension[] }>(`${this.base}/sessions/${sessionId}/confidence`);
  }

  computeConfidenceScores(sessionId: string): Observable<{ scores: ConfidenceDimension[] }> {
    return this.http.post<{ scores: ConfidenceDimension[] }>(`${this.base}/sessions/${sessionId}/confidence/compute`, {});
  }

  // ═══ N. Workspace Preview — 1 API ═══
  getWorkspacePreview(sessionId: string): Observable<{ sections: WorkspacePreviewSection[] }> {
    return this.http.get<{ sections: WorkspacePreviewSection[] }>(`${this.base}/sessions/${sessionId}/workspace-preview`);
  }

  // ═══ O. Regulator Explanations — 1 API ═══
  getRegulatorExplanations(sector?: string): Observable<{ explanations: RegulatorExplanation[] }> {
    const url = sector ? `${this.base}/regulator-explanations?sector=${encodeURIComponent(sector)}` : `${this.base}/regulator-explanations`;
    return this.http.get<{ explanations: RegulatorExplanation[] }>(url);
  }

  // ═══ P. Dashboard Personas — 1 API ═══
  getDashboardPersonas(): Observable<{ personas: DashboardPersonaProfile[] }> {
    return this.http.get<{ personas: DashboardPersonaProfile[] }>(`${this.base}/dashboard-personas`);
  }

  // ═══ Q. Regional Terminology — 1 API ═══
  getTerminology(category?: string): Observable<{ terms: RegionalTerm[] }> {
    const url = category ? `${this.base}/terminology?category=${encodeURIComponent(category)}` : `${this.base}/terminology`;
    return this.http.get<{ terms: RegionalTerm[] }>(url);
  }

  // ═══ R. Quick-Start Templates — 1 API ═══
  getQuickStartTemplates(): Observable<{ templates: QuickStartTemplate[] }> {
    return this.http.get<{ templates: QuickStartTemplate[] }>(`${this.base}/quick-start-templates`);
  }

  // ═══ S. Staffing Suggestions — 1 API ═══
  getStaffingSuggestions(rangeCode: string, sectorCode?: string): Observable<{ staffing: unknown[] }> {
    const params = sectorCode ? `?sector=${encodeURIComponent(sectorCode)}` : '';
    return this.http.get<{ staffing: unknown[] }>(`${this.base}/staffing/${encodeURIComponent(rangeCode)}${params}`);
  }

  // ═══ T. Business Functions — 1 API ═══
  getBusinessFunctions(): Observable<{ functions: unknown[] }> {
    return this.http.get<{ functions: unknown[] }>(`${this.base}/business-functions`);
  }

  // ═══ U. Temporal Status — 1 API ═══
  getTemporalStatus(jobId: string): Observable<any> {
    return this.http.get(`${this.base}/provisioning/jobs/${jobId}/temporal-status`);
  }

  // ═══ V. Cancel Provisioning — 1 API ═══
  cancelProvisioningJob(jobId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.base}/provisioning/jobs/${jobId}/cancel`, { reason: reason ?? '' });
  }

  // ═══ W. Answer History — 1 API ═══
  getAnswerHistory(sessionId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/sessions/${sessionId}/answers-history`);
  }

  // ═══ X. Suggest Responsibilities — 1 API ═══
  suggestResponsibilities(sessionId: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/suggest-responsibilities`, {});
  }

  // ═══ Y. Import Persons (CSV) — 1 API ═══
  importPersons(sessionId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.base}/sessions/${sessionId}/import-persons`, formData);
  }

  // ═══ Z. Session Feedback (NPS) — 1 API ═══
  submitFeedback(sessionId: string, rating: number, type?: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/feedback`, { rating, type: type ?? 'nps' });
  }

  // ═══ AA. Agent Previews — 1 API ═══
  getAgentPreviews(tenantId: string): Observable<{ agents: unknown[]; totalPlaybooks: number }> {
    return this.http.get<{ agents: unknown[]; totalPlaybooks: number }>(`${this.base}/context/${tenantId}/agents`);
  }

  // ═══ AB. Agent Readiness — 1 API ═══
  getAgentReadiness(tenantId: string): Observable<any> {
    return this.http.get(`${this.base}/context/${tenantId}/agent-readiness`);
  }

  // ═══ AC. Recompute Context — 1 API ═══
  recomputeContext(tenantId: string, sessionId: string): Observable<any> {
    return this.http.post(`${this.base}/context/${tenantId}/recompute`, { sessionId });
  }

  // ═══ AD. Toggle Module State — 1 API ═══
  toggleModuleState(tenantId: string, moduleCode: string, state: string): Observable<any> {
    return this.http.put(`${this.base}/context/${tenantId}/modules/${moduleCode}`, { state });
  }

  // ═══ AE. Resend Verification Email — 1 API ═══
  resendVerificationEmail(sessionId: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${sessionId}/resend-verification`, {});
  }
}

// ── Live inference types ──
export interface LiveInferenceResult {
  regulators: {
    id: string;
    name: string;
    nameAr: string;
    confidence: number;
    reason: string;
    reasonAr: string;
  }[];
  frameworks: {
    code: string;
    name: string;
    nameAr: string;
    priority: 'essential' | 'recommended' | 'optional';
    reason: string;
    reasonAr: string;
    enabled: boolean;
  }[];
  impactPreview: {
    controls: number;
    evidenceTasks: number;
    risks: number;
    policies: number;
    workflows: number;
    dashboards: number;
  };
  automationScore: number;
  enabledModules: string[];
  complexity: 'lite' | 'standard' | 'enterprise';
  estimatedTime: string;
}

export interface PainCard {
  pain_code: string;
  pain_label_en: string;
  pain_label_ar: string;
  pain_icon: string;
  module_priority: Record<string, number>;
  dashboard_persona: string;
  ninety_day_emphasis: string;
}

export interface QuickStartTemplate {
  code: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  sector: string;
  enabled_modules: string[];
  answers: Record<string, unknown>;
}

export interface SessionBootstrapResult {
  state: string;
  auth: { token: string; refreshToken: string; userId: string; role: string };
  tenant: { tenantId: string; tenantCode: string; orgName: string; orgNameAr: string };
  onboarding: { sessionId: string; currentStage: string; completedStages: string[] };
  provisioning: { status: string; jobId: string | null; progress: number };
  next: string;
}

export interface ProvisioningMilestone {
  milestone_code: string;
  milestone_label_en: string;
  milestone_label_ar: string;
  step_codes: string[];
  sort_order: number;
  icon_class: string;
  status?: 'queued' | 'running' | 'completed';
  progressPercent?: number;
  currentStep?: number;
  totalSteps?: number;
  artifacts?: { label: string; count: number }[];
}

// ── Readiness types (used by ReadinessCheckComponent via OnboardingApiService) ──

export interface ReadinessModule {
  moduleCode: string;
  state: 'ready' | 'needs_setup' | 'in_progress' | 'attention_required';
  score: number;
  maxScore: number;
}

export interface ReadinessSummary {
  total: number;
  ready: number;
  needsSetup: number;
  inProgress: number;
  attentionRequired: number;
}
