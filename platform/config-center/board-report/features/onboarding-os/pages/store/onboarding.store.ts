import { Injectable, signal, computed, inject } from '@angular/core';
import {
  OnboardingSession, OnboardingQuestion, OnboardingScore,
  OnboardingRecommendation, ReviewModel, JourneyProfile,
  SceneTemplate, GovernanceContextSummary, ModuleOperatingState,
  WorkspacePreviewSection, RegulatorExplanation, DashboardPersonaProfile,
  RegionalTerm, GrcRecord,
  StaffingSuggestion, BusinessFunction, TemporalStatus,
  AgentReadiness, ProvisioningEvent, AnswerHistoryEntry,
} from '../../models/onboarding.models';
import type { PainCard, QuickStartTemplate } from '../../services/onboarding-api.service';
import { StageDefinition, UIConfiguration } from '../../services/onboarding-config.service';
import { OnboardingAnswerService } from '../services/onboarding-answer.service';
import { OnboardingProvisioningService } from '../services/onboarding-provisioning.service';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';
import type { IOnboardingStateReader } from '../../contracts/onboarding-module.contracts';

@Injectable()
export class OnboardingStore implements IOnboardingStateReader {
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  readonly answerSvc = inject(OnboardingAnswerService);
  readonly provisioningSvc = inject(OnboardingProvisioningService);

  readonly registrationMode = signal(false);
  readonly stages = signal<StageDefinition[]>([]);
  readonly uiConfig = signal<UIConfiguration | null>(null);
  readonly translations = signal<Record<string, string>>({});
  readonly session = signal<OnboardingSession | null>(null);
  readonly activeStageIdx = signal(0);
  readonly loading = signal(true);
  readonly reviewLoading = signal(false);
  readonly showExitConfirm = signal(false);
  readonly review = signal<ReviewModel | null>(null);
  readonly scores = signal<OnboardingScore[]>([]);
  readonly recommendations = signal<OnboardingRecommendation[]>([]);
  readonly questions = signal<OnboardingQuestion[]>([]);
  readonly journeyProfiles = signal<JourneyProfile[]>([]);
  readonly selectedProfile = signal<JourneyProfile | null>(null);
  readonly journeyProfilePending = signal(true);
  readonly scenes = signal<SceneTemplate[]>([]);
  readonly painCards = signal<PainCard[]>([]);
  readonly governanceContext = signal<GovernanceContextSummary | null>(null);
  readonly moduleStates = signal<ModuleOperatingState[]>([]);
  readonly workspacePreviewSections = signal<WorkspacePreviewSection[]>([]);
  readonly configLoadError = signal(false);
  readonly quickStartTemplates = signal<QuickStartTemplate[]>([]);
  readonly recomputing = signal(false);
  readonly staffingSuggestions = signal<StaffingSuggestion[]>([]);
  readonly businessFunctions = signal<BusinessFunction[]>([]);
  readonly temporalStatus = signal<TemporalStatus | null>(null);
  readonly provisioningEvents = signal<ProvisioningEvent[]>([]);
  readonly activeAgentPreviews = signal<unknown[]>([]);
  readonly agentReadiness = signal<AgentReadiness | null>(null);
  readonly answerHistory = signal<AnswerHistoryEntry[]>([]);
  readonly terminologyTerms = signal<RegionalTerm[]>([]);
  readonly emailVerified = signal(false);
  readonly blockers = signal<unknown[]>([]);
  readonly regulatorExplanations = signal<RegulatorExplanation[]>([]);
  readonly dashboardPersonas = signal<DashboardPersonaProfile[]>([]);

  isReturningSession = false;
  inlineEditVisible = false;
  inlineEditQuestionCode = '';
  inlineEditValue = '';
  legalConfirmed = false;
  roleOptions: Array<{ label: string; value: string }> = [];

  get isAr(): boolean { return this.platform.i18n.currentLang() === 'ar'; }
  get answers() { return this.answerSvc.answers; }
  get validationErrors() { return this.answerSvc.validationErrors; }
  set validationErrors(v: Record<string, string>) { this.answerSvc.validationErrors = v; }
  get saving() { return this.answerSvc.saving; }
  get lastSaved() { return this.answerSvc.lastSaved; }
  get sectorResolution() { return this.answerSvc.sectorResolution; }
  get hasOfflineQueue() { return this.answerSvc.hasOfflineQueue; }
  get answersVersion() { return this.answerSvc.answersVersion; }
  get liveInferenceData() { return this.answerSvc.liveInferenceData; }
  get inferenceComputing() { return this.answerSvc.inferenceComputing; }
  get inferredFacts() { return this.answerSvc.inferredFacts; }
  get confidenceScores() { return this.answerSvc.confidenceScores; }
  get provisioning() { return this.provisioningSvc.provisioning; }
  get provJob() { return this.provisioningSvc.provJob; }
  get provSteps() { return this.provisioningSvc.provSteps; }
  get provisionError() { return this.provisioningSvc.provisionError; }
  get provisionCorrelationId() { return this.provisioningSvc.provisionCorrelationId; }
  get provisioningMilestones() { return this.provisioningSvc.provisioningMilestones; }
  get provisionElapsedSeconds() { return this.provisioningSvc.provisionElapsedSeconds; }
  get startupChecklist() { return this.provisioningSvc.startupChecklist; }
  set startupChecklist(v: unknown[]) { this.provisioningSvc.startupChecklist = v; }

  readonly overallConfidence = computed(() => {
    const scores = this.confidenceScores();
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, s) => sum + s.confidence_value, 0);
    return Math.round(total / scores.length);
  });

  readonly painModuleMappings = computed(() => {
    const selected: string[] = this.answers['pain.primary_concerns'] as string[] ?? [];
    if (selected.length === 0) return [];
    const cards = this.painCards();
    return selected
      .map(code => cards.find(c => c.pain_code === code))
      .filter((c): c is PainCard => !!c)
      .map(c => ({
        painCode: c.pain_code,
        painLabel: this.isAr ? c.pain_label_ar : c.pain_label_en,
        modules: Object.entries(c.module_priority).sort(([, a], [, b]) => (b as number) - (a as number)).map(([m]) => m),
      }));
  });

  readonly provisioningSummary = computed(() => {
    const ctx = this.governanceContext();
    const agentProfile = ctx?.agentProfile as Record<string, unknown> | undefined;
    const activeAgents = agentProfile?.activeAgents as unknown[] | undefined;
    const agentCount = activeAgents?.length
      || (agentProfile?.totalPlaybooks as number) || 0;
    return {
      controls: this.sectorResolution()?.controlCount || this.review()?.impactSummary?.controlCount || 0,
      evidence: this.sectorResolution()?.evidenceTaskCount || this.review()?.impactSummary?.evidenceTaskCount || 0,
      workflows: this.review()?.impactSummary?.workflowCount || 0,
      agents: agentCount,
    };
  });

  readonly SPECIAL_STAGES = new Set(['review_confirmation', 'provision_workspace']);
  readonly DEDICATED_COMPONENT_STAGES = new Set(['welcome', 'use_case', 'pack_selection', 'data_start_mode', 'ai_setup', 'personalization', 'readiness_check']);

  static readonly UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  static readonly FALLBACK_TRANSLATIONS: Record<string, string> = {
    'onboarding.title': 'Shahin',
    'onboarding.progress': 'Progress',
    'onboarding.readiness': 'Confidence',
    'onboarding.loading': 'Loading...',
    'onboarding.saving': 'Saving...',
    'onboarding.saved': 'Saved',
    'onboarding.exit': 'Exit',
    'onboarding.language.english': 'English',
    'onboarding.language.arabic': 'عربي',
    'onboarding.button.previous': 'Previous',
    'onboarding.button.save_continue': 'Continue',
  };

  readonly SECTION_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
    identity:        { en: 'Legal & Operating Identity',    ar: 'الهوية القانونية والتشغيلية', icon: 'pi-id-card' },
    jurisdictions:   { en: 'Jurisdictions',                 ar: 'الاختصاصات القضائية',         icon: 'pi-globe' },
    frameworks:      { en: 'Frameworks & Standards',        ar: 'الأطر والمعايير',             icon: 'pi-shield' },
    data_governance: { en: 'Data Governance',               ar: 'حوكمة البيانات',              icon: 'pi-database' },
    reporting:       { en: 'Reporting Obligations',         ar: 'التزامات الإبلاغ',            icon: 'pi-file' },
    departments:     { en: 'Departments',                   ar: 'الإدارات',                    icon: 'pi-sitemap' },
    entities:        { en: 'Entities & Subsidiaries',       ar: 'الكيانات والشركات التابعة',   icon: 'pi-building' },
    identity_access: { en: 'Identity & Access',             ar: 'الهوية والوصول',              icon: 'pi-lock' },
    infrastructure:  { en: 'Infrastructure',                ar: 'البنية التحتية',              icon: 'pi-server' },
    integrations:    { en: 'Integrations & Connectors',     ar: 'التكاملات والموصلات',         icon: 'pi-link' },
    monitoring:      { en: 'Security Monitoring',           ar: 'المراقبة الأمنية',            icon: 'pi-eye' },
    committees:      { en: 'Committees & Bodies',           ar: 'اللجان والهيئات',             icon: 'pi-users' },
    approvals:       { en: 'Approval Structure',            ar: 'هيكل الموافقات',              icon: 'pi-check-square' },
    risk_governance: { en: 'Risk Governance',               ar: 'حوكمة المخاطر',              icon: 'pi-exclamation-triangle' },
    workflows:       { en: 'Workflows',                     ar: 'سير العمل',                   icon: 'pi-directions' },
    maturity:        { en: 'Maturity Assessment',           ar: 'تقييم النضج',                 icon: 'pi-chart-bar' },
    risk:            { en: 'Risk Management',               ar: 'إدارة المخاطر',               icon: 'pi-exclamation-triangle' },
    policies:        { en: 'Policy Library',                ar: 'مكتبة السياسات',              icon: 'pi-book' },
    assessment:      { en: 'Assessment & Testing',          ar: 'التقييم والاختبار',            icon: 'pi-check-circle' },
    evidence:        { en: 'Evidence Collection',           ar: 'جمع الأدلة',                  icon: 'pi-folder' },
    audit:           { en: 'Audit',                         ar: 'التدقيق',                     icon: 'pi-search' },
    training:        { en: 'Training & Awareness',          ar: 'التدريب والتوعية',            icon: 'pi-graduation-cap' },
    resilience:      { en: 'Business Resilience',           ar: 'استمرارية الأعمال',           icon: 'pi-replay' },
    risk_ops:        { en: 'Risk Operations',               ar: 'عمليات المخاطر',              icon: 'pi-cog' },
    sla:             { en: 'SLA & Response',                ar: 'اتفاقيات الخدمة والاستجابة',  icon: 'pi-clock' },
    incident_ops:    { en: 'Incident Management',           ar: 'إدارة الحوادث',               icon: 'pi-bolt' },
    change_ops:      { en: 'Change Management',             ar: 'إدارة التغيير',               icon: 'pi-refresh' },
    vendor_ops:      { en: 'Vendor Management',             ar: 'إدارة الموردين',              icon: 'pi-briefcase' },
    leadership:      { en: 'Executive Leadership',          ar: 'القيادة التنفيذية',           icon: 'pi-star' },
    leads:           { en: 'GRC Leads',                     ar: 'قيادات الحوكمة',              icon: 'pi-user' },
    contacts:        { en: 'Key Contacts',                  ar: 'جهات الاتصال الرئيسية',       icon: 'pi-phone' },
    ownership:       { en: 'Ownership & Accountability',    ar: 'المسؤولية والمساءلة',         icon: 'pi-flag' },
    accountability:  { en: 'Accountability Structure',      ar: 'هيكل المساءلة',               icon: 'pi-sitemap' },
    invitations:     { en: 'Team Invitations',              ar: 'دعوات الفريق',                icon: 'pi-envelope' },
  };

  t(key: string): string {
    return this.translations()[key] || OnboardingStore.FALLBACK_TRANSLATIONS[key] || key;
  }

  getStageLabel(stage: StageDefinition): string {
    return this.isAr ? stage.labelAr : stage.labelEn;
  }

  getStageDescription(stage: StageDefinition): string {
    return this.isAr ? stage.descriptionAr : stage.descriptionEn;
  }
}
