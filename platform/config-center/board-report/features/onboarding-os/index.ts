// ============================================
// AGRC-OS — Onboarding Module (MP-01) Frontend Barrel
//
// Exports all public API: pages, components, services,
// models, pipes, directives, providers, dashboards.
// This module is self-contained and can be plugged/unplugged
// independently (Law 15 — product removable principle).
// ============================================

// ── Contracts & Ports (module boundary) ───────────────────────────────────
export type { IOnboardingStateReader, IOnboardingNavigation, IOnboardingDomainState, IOnboardingUIState, IOnboardingAnswerState, IOnboardingProvisioningState, IOnboardingI18n, IOnboardingConstants, IOnboardingComputedState } from './contracts/onboarding-module.contracts';
export { ONBOARDING_STATE, ONBOARDING_NAV } from './contracts/onboarding-module.contracts';
export type { OnboardingPlatformPort, OnboardingAuthPort, OnboardingI18nPort, OnboardingStoragePort, OnboardingProductsConfigPort } from './ports/onboarding-platform.port';
export { ONBOARDING_PLATFORM } from './ports/onboarding-platform.port';
export { OnboardingPlatformAdapter } from './adapters/onboarding-platform.adapter';

// ── Pages ─────────────────────────────────────────────────────────────────
export { OnboardingShellPageComponent } from './pages/onboarding-shell-page.component';

// ── Dashboards ────────────────────────────────────────────────────────────
export { OnboardingOsDashboardComponent } from './dashboards/onboarding-os-dashboard.component';

// ── Services (API layer) ──────────────────────────────────────────────────
export { OnboardingConfigService } from './services/onboarding-config.service';
export { OnboardingLookupService } from './services/onboarding-lookup.service';
export { OnboardingApiService } from './services/onboarding-api.service';
export { SectorConfigService } from './services/sector-config.service';

// ── Page Services (page-scoped logic) ─────────────────────────────────────
export { OnboardingAnswerService } from './pages/services/onboarding-answer.service';
export { OnboardingDataLoaderService } from './pages/services/onboarding-data-loader.service';
export { OnboardingProvisioningService } from './pages/services/onboarding-provisioning.service';
export { OnboardingValidationService } from './pages/services/onboarding-validation.service';
export { OnboardingNavigationService } from './pages/services/onboarding-navigation.service';
export { OnboardingSessionService } from './pages/services/onboarding-session.service';
export { OfflineQueueService } from './services/offline-queue.service';

// ── Models / Types ────────────────────────────────────────────────────────
export * from './models/onboarding.models';
export { FREEMAIL_DOMAINS, EMAIL_RE, isFreeMailDomain, extractEmailDomain } from './models/registration.constants';

// ── Providers ─────────────────────────────────────────────────────────────
export { OnboardingContentProvider } from './providers/onboarding-content.provider';
export { ShahinContentProvider } from './providers/shahin-content.provider';

// ── Components: Registration ──────────────────────────────────────────────
export { RegistrationHeroComponent } from './components/registration/registration-hero.component';
export { JourneyProfileSelectorComponent } from './components/registration/journey-profile-selector.component';
export { QuickStartSelectorComponent } from './components/registration/quick-start-selector.component';

// ── Components: Chrome (shell UI) ─────────────────────────────────────────
export { OnboardingTopbarComponent } from './components/topbar/onboarding-topbar.component';
export { OnboardingStoryRailComponent } from './components/story-rail/onboarding-story-rail.component';
export { OnboardingSceneHeaderComponent } from './components/scene-header/onboarding-scene-header.component';
export { SceneValuePreviewComponent } from './components/scene-header/scene-value-preview.component';

// ── Components: Preview ───────────────────────────────────────────────────
export { GovernanceContextSummaryComponent } from './components/preview/governance-context-summary.component';
export { RegulatoryChainVisualComponent } from './components/preview/regulatory-chain-visual.component';
export { InferredFactsExplainerComponent } from './components/preview/inferred-facts-explainer.component';
export { PersonaConfirmationComponent } from './components/preview/persona-confirmation.component';
export { WorkspacePreviewGridComponent } from './components/preview/workspace-preview-grid.component';

// ── Components: Live Intelligence ─────────────────────────────────────────
export { LiveIntelligencePanelComponent } from './components/live-intelligence/live-intelligence-panel.component';
export { AgentPreviewPanelComponent } from './components/live-intelligence/agent-preview-panel.component';
export { RegulatorExplainerComponent } from './components/live-intelligence/regulator-explainer.component';

// ── Components: Activation ────────────────────────────────────────────────
export { ActivationMilestonesComponent } from './components/activation/activation-milestones.component';
export { CockpitRevealBannerComponent } from './components/activation/cockpit-reveal-banner.component';

// ── Components: Data & Structure ──────────────────────────────────────────
export { DataStartModeComponent } from './components/data-start/data-start-mode.component';
export { StructureModeToggleComponent } from './components/structure/structure-mode-toggle.component';
export { UseCaseSelectorComponent } from './components/use-case/use-case-selector.component';
export { PackSelectionComponent } from './components/pack-selection/pack-selection.component';
export { PersonalizationComponent } from './components/personalization/personalization.component';

// ── Components: Review & Readiness ────────────────────────────────────────
export { OnboardingReviewStageComponent } from './components/review-stage/onboarding-review-stage.component';
export { ReadinessCheckComponent } from './components/readiness-check/readiness-check.component';
export { ReviewDiffComponent } from './components/review-diff.component';
export { StartupChecklistComponent } from './components/startup-checklist/startup-checklist.component';

// ── Components: Misc ──────────────────────────────────────────────────────
export { OnboardingWelcomeComponent } from './components/welcome/onboarding-welcome.component';
export { AiSetupComponent } from './components/ai-setup/ai-setup.component';
export { PainCardsComponent } from './components/pain-cards.component';
export { PainModuleMappingComponent } from './components/pain-priorities/pain-module-mapping.component';
export { QuestionRendererComponent } from './components/question-renderer.component';

// ── Components: Shared (pipes, directives, utilities) ─────────────────────
export { AnswerHistoryComponent } from './components/shared/answer-history.component';
export { TerminologyGlossaryComponent } from './components/shared/terminology-glossary.component';
export { ConfettiBurstComponent } from './components/shared/confetti-burst.component';
export { ConfidenceRadarComponent } from './components/shared/confidence-radar.component';
export { CsvTeamImportComponent } from './components/shared/csv-team-import.component';
export { ProgressRingComponent } from './components/shared/progress-ring.component';
export { WillCreatePreviewComponent } from './components/shared/will-create-preview.component';
export { BilingualPipe } from './components/shared/bilingual.pipe';
export { FactNamePipe } from './components/shared/fact-name.pipe';
export { CountUpDirective } from './components/shared/count-up.directive';
export { TypewriterDirective } from './components/shared/typewriter.directive';
export { OnboardingNumberPipe } from './components/shared/onboarding-number.pipe';
export { OnboardingFormFieldComponent } from './components/shared/onboarding-form-field.component';
export { FocusTrapDirective } from './components/shared/focus-trap.directive';
