import {
  OnboardingQuestion,
  OnboardingScore,
  OnboardingRecommendation,
  ReviewModel,
  RegulatorExplanation,
  DashboardPersonaProfile,
  GovernanceContextSummary,
  ModuleOperatingState,
  WorkspacePreviewSection,
  InferredFact,
  ConfidenceDimension,
  GrcRecord,
  SectorResolutionResult,
  AgentReadiness,
  AnswerHistoryEntry,
} from '../../models/onboarding.models';
import type { LiveInferenceResult, PainCard, ProvisioningMilestone } from '../../services/onboarding-api.service';

export interface QuestionStageInputs {
  lang: 'en' | 'ar';
  activeStage: { stageCode: string; labelEn: string; labelAr: string; descriptionEn: string; descriptionAr: string; iconClass: string; isRequired?: boolean };
  activeStageIdx: number;
  sections: Array<{ code: string; label: string; icon: string; questions: OnboardingQuestion[] }>;
  answers: Record<string, unknown>;
  answersVersion: number;
  validationErrors: Record<string, string>;
  roleOptions: Array<{ label: string; value: string }>;
  sectorResolution: SectorResolutionResult | null;
  answeredCount: number;
  saving: boolean;
  canSkipCurrentStage: boolean;
  skippedQuestionCount: number;
  stageTimeEstimate: string | null;
  willCreateItems: Array<{ labelEn: string; labelAr: string; count: number }>;
  painCards: PainCard[];
  painModuleMappings: Array<{ painCode: string; painLabel: string; modules: string[] }>;
  staffingSuggestions: unknown[];
  businessFunctions: unknown[];
  currentScene: unknown;
  inferredFacts: InferredFact[];
  overallConfidence: number;
  inferenceComputing: boolean;
}

export interface QuestionStageOutputs {
  answerChanged: { questionCode: string; value: unknown };
  lookupAnswerChanged: { question: OnboardingQuestion; value: unknown };
  saveAndContinue: void;
  goToPrevious: void;
  skipStage: void;
  painSelectionChanged: string[];
  suggestResponsibilities: void;
  teamCsvUploaded: File;
  structureModeChanged: string;
}

export interface ProvisionStageInputs {
  lang: 'en' | 'ar';
  provJob: unknown;
  provSteps: unknown[];
  provisionError: string | null;
  provisionCorrelationId: string | null;
  provisioningMilestones: ProvisioningMilestone[];
  provisionElapsedSeconds: number;
  temporalStatus: unknown;
  provisioningEvents: unknown[];
  startupChecklist: unknown[];
  provisioningSummary: { controls: number; evidence: number; workflows: number; agents: number };
}

export interface ProvisionStageOutputs {
  retryProvisioning: void;
  retryPoll: void;
  cancelProvisioning: void;
  techLogExpanded: void;
  enterWorkspace: void;
  toggleChecklistItem: GrcRecord;
  npsRated: number;
}

export interface IntelligenceSidebarInputs {
  lang: 'en' | 'ar';
  liveInference: LiveInferenceResult | null;
  inferredFacts: InferredFact[];
  confidenceScores: ConfidenceDimension[];
  scores: OnboardingScore[];
  recommendations: OnboardingRecommendation[];
  sectorResolution: SectorResolutionResult | null;
  answeredCount: number;
  totalQuestions: number;
  computing: boolean;
  agents: unknown[];
  agentReadiness: AgentReadiness | null;
  regulatorExplanations: RegulatorExplanation[];
  answerHistory: AnswerHistoryEntry[];
}
