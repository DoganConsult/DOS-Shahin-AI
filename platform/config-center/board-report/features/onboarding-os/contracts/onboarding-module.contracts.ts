import { InjectionToken, Signal } from '@angular/core';
import {
  OnboardingSession, OnboardingQuestion, OnboardingScore,
  OnboardingRecommendation, ReviewModel, JourneyProfile,
  SceneTemplate, GovernanceContextSummary, ModuleOperatingState,
  WorkspacePreviewSection, RegulatorExplanation, DashboardPersonaProfile,
  RegionalTerm, InferredFact, ConfidenceDimension,
  StaffingSuggestion, BusinessFunction, TemporalStatus,
  AgentReadiness, ProvisioningEvent, AnswerHistoryEntry,
  SectorResolutionResult,
} from '../models/onboarding.models';
import type { StageDefinition, UIConfiguration } from '../services/onboarding-config.service';
import type { PainCard, QuickStartTemplate, ProvisioningMilestone } from '../services/onboarding-api.service';
import type { StageItem } from '../components/story-rail/onboarding-story-rail.component';

export interface IOnboardingDomainState {
  readonly session: Signal<OnboardingSession | null>;
  readonly stages: Signal<StageDefinition[]>;
  readonly questions: Signal<OnboardingQuestion[]>;
  readonly scores: Signal<OnboardingScore[]>;
  readonly recommendations: Signal<OnboardingRecommendation[]>;
  readonly review: Signal<ReviewModel | null>;
  readonly journeyProfiles: Signal<JourneyProfile[]>;
  readonly selectedProfile: Signal<JourneyProfile | null>;
  readonly scenes: Signal<SceneTemplate[]>;
  readonly painCards: Signal<PainCard[]>;
  readonly governanceContext: Signal<GovernanceContextSummary | null>;
  readonly moduleStates: Signal<ModuleOperatingState[]>;
  readonly workspacePreviewSections: Signal<WorkspacePreviewSection[]>;
  readonly quickStartTemplates: Signal<QuickStartTemplate[]>;
  readonly terminologyTerms: Signal<RegionalTerm[]>;
  readonly regulatorExplanations: Signal<RegulatorExplanation[]>;
  readonly dashboardPersonas: Signal<DashboardPersonaProfile[]>;
  readonly blockers: Signal<unknown[]>;
  readonly staffingSuggestions: Signal<StaffingSuggestion[]>;
  readonly businessFunctions: Signal<BusinessFunction[]>;
  readonly activeAgentPreviews: Signal<unknown[]>;
  readonly agentReadiness: Signal<AgentReadiness | null>;
  readonly answerHistory: Signal<AnswerHistoryEntry[]>;
  readonly temporalStatus: Signal<TemporalStatus | null>;
  readonly provisioningEvents: Signal<ProvisioningEvent[]>;
}

export interface IOnboardingUIState {
  readonly loading: Signal<boolean>;
  readonly registrationMode: Signal<boolean>;
  readonly activeStageIdx: Signal<number>;
  readonly reviewLoading: Signal<boolean>;
  readonly showExitConfirm: Signal<boolean>;
  readonly configLoadError: Signal<boolean>;
  readonly recomputing: Signal<boolean>;
  readonly emailVerified: Signal<boolean>;
  readonly journeyProfilePending: Signal<boolean>;
  readonly uiConfig: Signal<UIConfiguration | null>;
  readonly translations: Signal<Record<string, string>>;
  isReturningSession: boolean;
  inlineEditVisible: boolean;
  inlineEditQuestionCode: string;
  inlineEditValue: string;
  legalConfirmed: boolean;
  roleOptions: Array<{ label: string; value: string }>;
}

export interface IOnboardingAnswerState {
  readonly answers: Record<string, unknown>;
  readonly validationErrors: Record<string, string>;
  readonly saving: Signal<boolean>;
  readonly lastSaved: Signal<boolean>;
  readonly sectorResolution: Signal<SectorResolutionResult | null>;
  readonly liveInferenceData: Signal<unknown>;
  readonly inferenceComputing: Signal<boolean>;
  readonly inferredFacts: Signal<InferredFact[]>;
  readonly confidenceScores: Signal<ConfidenceDimension[]>;
  readonly hasOfflineQueue: Signal<boolean>;
  readonly answersVersion: Signal<number>;
}

export interface IOnboardingProvisioningState {
  readonly provisioning: Signal<boolean>;
  readonly provJob: Signal<unknown>;
  readonly provSteps: Signal<unknown[]>;
  readonly provisionError: Signal<string | null>;
  readonly provisionCorrelationId: Signal<string | null>;
  readonly provisioningMilestones: Signal<ProvisioningMilestone[]>;
  readonly provisionElapsedSeconds: Signal<number>;
  startupChecklist: unknown[];
}

export interface IOnboardingI18n {
  readonly isAr: boolean;
  t(key: string): string;
  getStageLabel(stage: StageDefinition): string;
  getStageDescription(stage: StageDefinition): string;
  readonly SECTION_LABELS: Record<string, { en: string; ar: string; icon: string }>;
}

export interface IOnboardingConstants {
  readonly SPECIAL_STAGES: Set<string>;
  readonly DEDICATED_COMPONENT_STAGES: Set<string>;
}

export interface IOnboardingComputedState {
  readonly overallConfidence: Signal<number>;
  readonly painModuleMappings: Signal<Array<{ painCode: string; painLabel: unknown; modules: string[] }>>;
  readonly provisioningSummary: Signal<{ controls: number; evidence: number; workflows: number; agents: number }>;
}

export interface IOnboardingStateReader extends
  IOnboardingDomainState,
  IOnboardingUIState,
  IOnboardingAnswerState,
  IOnboardingProvisioningState,
  IOnboardingI18n,
  IOnboardingConstants,
  IOnboardingComputedState {}

export interface IOnboardingNavigation {
  readonly visibleStages: Signal<StageDefinition[]>;
  readonly currentScene: Signal<SceneTemplate | null>;
  readonly activePainCards: Signal<PainCard[]>;
  readonly activeModuleStates: Signal<ModuleOperatingState[]>;
  readonly storyRailStages: Signal<StageItem[]>;
  readonly skippedQuestionCount: Signal<number>;
  readonly canSkipCurrentStage: Signal<boolean>;
  readonly activeStage: StageDefinition | undefined;
  readonly isQuestionStage: boolean;
  readonly isReviewStage: boolean;
  readonly isProvisionStage: boolean;
  readonly isDedicatedComponentStage: boolean;
  goToStage(idx: number): void;
  skipCurrentStage(): void;
  navigateToBlocker(blocker: Record<string, unknown>): void;
  navigateToStageCode(stageCode: string): void;
  findVisibleStageIndex(stageCode: string): number;
  maxReachableStage(): number;
  getStageStatus(stageCode: string): string;
  getStagePercent(stageCode: string): number;
  getStageBlockerCount(stageCode: string): number;
  getStageTimeEstimate(stage: StageDefinition): string | null;
  currentQuestions(): OnboardingQuestion[];
  currentSections(): Array<{ code: string; label: string; icon: string; questions: OnboardingQuestion[] }>;
  answeredCount(): number;
  activeQuestionCount(): number;
  suggestedModules(): string[];
  getWillCreateItems(): Array<{ labelEn: string; labelAr: string; count: number }>;
  getResolvedOptions(q: OnboardingQuestion): Array<{ label: string; value: string }>;
  getQuestionLabel(questionCode: string): string;
  getStageCodeForQuestion(questionCode: string): string | undefined;
  getTooltip(q: OnboardingQuestion): string;
  getQuestionNumber(q: OnboardingQuestion): string;
  preloadLookupsForCurrentStage(): void;
  applySessionStageJump(): void;
  trackStage: (idx: number, stage: StageDefinition) => string;
  trackSection: (idx: number, sec: { code: string }) => string;
  trackQuestion: (idx: number, q: OnboardingQuestion) => string;
}

export const ONBOARDING_STATE = new InjectionToken<IOnboardingStateReader>('OnboardingStateReader');
export const ONBOARDING_NAV = new InjectionToken<IOnboardingNavigation>('OnboardingNavigation');
