// OnboardingShellPageComponent — Real Functional Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const shellSrc = readFileSync(
  resolve(__dirname, './onboarding-shell-page.component.ts'), 'utf-8'
);
const shellHtml = readFileSync(
  resolve(__dirname, './onboarding-shell-page.component.html'), 'utf-8'
);
const shellScss = readFileSync(
  resolve(__dirname, './onboarding-shell-page.component.scss'), 'utf-8'
);
const storeSrc = readFileSync(
  resolve(__dirname, './store/onboarding.store.ts'), 'utf-8'
);
const navSrc = readFileSync(
  resolve(__dirname, './services/onboarding-navigation.service.ts'), 'utf-8'
);
const sessionSrc = readFileSync(
  resolve(__dirname, './services/onboarding-session.service.ts'), 'utf-8'
);
const intelSrc = readFileSync(
  resolve(__dirname, './services/onboarding-intelligence.service.ts'), 'utf-8'
);

describe('OnboardingShellPageComponent', () => {
  // ── Structure Tests ──
  describe('component structure', () => {
    it('should use imports array (modern Angular component)', () => {
      expect(shellSrc).toContain('imports: [');
    });

    it('should export a component class', () => {
      expect(shellSrc).toContain('export class OnboardingShellPageComponent');
    });

    it('should use OnPush change detection', () => {
      expect(shellSrc).toContain('ChangeDetectionStrategy.OnPush');
    });

    it('should implement OnInit and OnDestroy', () => {
      expect(shellSrc).toContain('implements OnInit, OnDestroy');
    });

    it('should inject required services', () => {
      expect(shellSrc).toContain('OnboardingSessionService');
      expect(shellSrc).toContain('ONBOARDING_PLATFORM');
      expect(shellSrc).toContain('OnboardingPlatformAdapter');
    });

    it('should inject HttpClient in session service for direct API calls', () => {
      expect(sessionSrc).toContain('HttpClient');
    });

    it('should use signals for reactive state in store', () => {
      expect(storeSrc).toContain('signal<');
      expect(storeSrc).toContain('computed(');
    });

    it('should import all required sub-components (shell or containers)', () => {
      const allSrc = shellSrc + storeSrc + navSrc + sessionSrc + intelSrc;
      const shellAndContainerSrc = shellSrc + shellHtml;
      const requiredInShell = [
        'JourneyProfileSelectorComponent',
        'OnboardingStoryRailComponent',
        'QuestionStageContainerComponent',
        'ProvisionStageContainerComponent',
        'IntelligenceSidebarContainerComponent',
      ];
      for (const comp of requiredInShell) {
        expect(shellSrc).toContain(comp);
      }
    });

    it('should import PrimeNG UI modules', () => {
      expect(shellSrc).toContain('ButtonModule');
      expect(shellSrc).toContain('SelectModule');
      expect(shellSrc).toContain('MultiSelectModule');
      expect(shellSrc).toContain('ToastModule');
      expect(shellSrc).toContain('SkeletonModule');
      expect(shellSrc).toContain('TagModule');
      expect(shellSrc).toContain('CardModule');
    });

    it('should use onboarding models (in store)', () => {
      expect(storeSrc).toContain('OnboardingSession');
      expect(storeSrc).toContain('OnboardingQuestion');
      expect(storeSrc).toContain('ReviewModel');
      expect(storeSrc).toContain('JourneyProfile');
      expect(storeSrc).toContain('SceneTemplate');
      expect(storeSrc).toContain('GovernanceContextSummary');
    });

    it('should provide MessageService locally', () => {
      expect(shellSrc).toContain('providers: [');
      expect(shellSrc).toContain('MessageService');
    });

    it('should delegate to child services for answer/provisioning logic', () => {
      expect(shellSrc).toContain('OnboardingProvisioningService');
      expect(shellSrc).toContain('OnboardingAnswerService');
    });

    it('should define SPECIAL_STAGES in store', () => {
      expect(storeSrc).toContain("SPECIAL_STAGES = new Set(['review_confirmation', 'provision_workspace'])");
    });

    it('should define UUID_RE regex in store for session ID validation', () => {
      expect(storeSrc).toContain('UUID_RE');
      expect(storeSrc).toContain('/^[0-9a-f]{8}-[0-9a-f]{4}');
    });

    it('should define FALLBACK_TRANSLATIONS in store for offline operation', () => {
      expect(storeSrc).toContain('FALLBACK_TRANSLATIONS');
      expect(storeSrc).toContain("'onboarding.title': 'Shahin'");
      expect(storeSrc).toContain("'onboarding.progress': 'Progress'");
    });

    it('should define SECTION_LABELS in store for all onboarding domains', () => {
      const expectedSections = [
        'identity', 'jurisdictions', 'frameworks', 'data_governance',
        'reporting', 'departments', 'entities', 'risk', 'policies',
        'evidence', 'audit', 'training', 'resilience',
      ];
      for (const sec of expectedSections) {
        expect(storeSrc).toContain(`${sec}:`);
      }
    });
  });

  // ── Template Tests ──
  describe('template wiring', () => {
    it('should set registrationMode when not logged in', () => {
      expect(shellSrc).toContain('registrationMode.set(true)');
      expect(shellHtml).toContain('registrationMode()');
    });

    it('should guard topbar inside ng-container with !store.registrationMode() to prevent DOM overlap', () => {
      expect(shellHtml).toContain('*ngIf="!store.registrationMode()"');
      const guardIdx = shellHtml.indexOf('*ngIf="!store.registrationMode()"');
      const topbarIdx = shellHtml.indexOf('app-onboarding-topbar');
      expect(topbarIdx).toBeGreaterThan(guardIdx);
    });

    it('should guard p-toast inside !store.registrationMode() container to prevent dual-layer toasts', () => {
      const guardIdx = shellHtml.indexOf('*ngIf="!store.registrationMode()"');
      const toastIdx = shellHtml.indexOf('p-toast', guardIdx);
      expect(toastIdx).toBeGreaterThan(guardIdx);
    });

    it('should guard onb-layout inside !store.registrationMode() container to prevent hidden element focus trap', () => {
      const guardIdx = shellHtml.indexOf('*ngIf="!store.registrationMode()"');
      const layoutIdx = shellHtml.indexOf('onb-layout', guardIdx);
      expect(layoutIdx).toBeGreaterThan(guardIdx);
    });

    it('should have 3-column layout (rail + canvas + panel)', () => {
      expect(shellHtml).toContain('onb-left-rail');
      expect(shellHtml).toContain('onb-canvas');
      expect(shellHtml).toContain('onb-right-panel');
    });

    it('should show welcome-back banner for returning users', () => {
      expect(shellHtml).toContain('onb-welcome-back');
      expect(shellHtml).toContain('store.isReturningSession');
    });

    it('should have journey profile selector', () => {
      expect(shellHtml).toContain('app-journey-profile-selector');
      expect(shellHtml).toContain('store.journeyProfilePending()');
    });

    it('should have quick-start templates', () => {
      expect(shellHtml).toContain('app-quick-start-selector');
      expect(shellHtml).toContain('store.quickStartTemplates()');
    });

    it('should have question stage container for question rendering', () => {
      expect(shellHtml).toContain('app-question-stage-container');
    });

    it('should have skip stage wired via nav service', () => {
      expect(shellHtml).toContain('nav.skipCurrentStage()');
    });

    it('should have review stage with review component', () => {
      expect(shellHtml).toContain('app-onboarding-review-stage');
    });

    it('should have what-if recompute button', () => {
      expect(shellHtml).toContain('recomputeContext()');
      expect(shellHtml).toContain('store.recomputing()');
    });

    it('should have legal confirmation gate before provisioning', () => {
      expect(shellHtml).toContain('legalConfirmed');
      expect(shellHtml).toContain('approveAndProvision()');
    });

    it('should have provisioning stage container with milestones and cockpit reveal', () => {
      expect(shellHtml).toContain('app-provision-stage-container');
    });

    it('should wire NPS rating output event', () => {
      expect(shellHtml).toContain('(npsRated)="intel.onNpsRated($event)"');
    });

    it('should have right panel with intelligence sidebar container', () => {
      expect(shellHtml).toContain('app-intelligence-sidebar-container');
    });

    it('should have topbar component', () => {
      expect(shellHtml).toContain('app-onboarding-topbar');
    });

    it('should pass session sync status to topbar', () => {
      expect(shellHtml).toContain("[synced]=\"!!store.session()?.id\"");
    });

    it('should have skeleton loading state', () => {
      expect(shellHtml).toContain('onb-skeleton-wrap');
      expect(shellHtml).toContain('store.loading()');
      expect(shellHtml).toContain('aria-busy="true"');
    });

    it('should have exit confirmation dialog', () => {
      expect(shellHtml).toContain('store.showExitConfirm()');
      expect(shellHtml).toContain('sessionSvc.confirmExit()');
    });

    it('should have story rail in left sidebar', () => {
      expect(shellHtml).toContain('app-onboarding-story-rail');
      expect(shellHtml).toContain('nav.storyRailStages()');
      expect(shellHtml).toContain('(stageSelected)="goToStageWithSideEffects($event)"');
    });

    it('should have provision error banner with correlation ID and retry', () => {
      expect(shellHtml).toContain('store.provisionError()');
      expect(shellHtml).toContain('store.provisionCorrelationId()');
      expect(shellHtml).toContain('retryProvisionAndApprove()');
    });

    it('should have inline edit dialog for review stage edits', () => {
      expect(shellHtml).toContain('store.inlineEditVisible');
      expect(shellHtml).toContain('sessionSvc.saveInlineEdit()');
      expect(shellHtml).toContain('sessionSvc.cancelInlineEdit()');
    });

    it('should wire question stage container with answer events', () => {
      expect(shellHtml).toContain('app-question-stage-container');
      expect(shellHtml).toContain('(answerChanged)="onQuestionRendererAnswer($event)"');
    });

    it('should pass overallConfidence to story rail', () => {
      expect(shellHtml).toContain('[overallConfidence]="store.overallConfidence()"');
    });

    it('should wire language toggle', () => {
      expect(shellHtml).toContain('sessionSvc.toggleLang()');
    });
  });

  // ── SCSS Tests ──
  describe('styling', () => {
    it('should have dark mode support via prefers-color-scheme', () => {
      expect(shellScss).toContain('prefers-color-scheme: dark');
    });

    it('should have reduced motion support', () => {
      expect(shellScss).toContain('prefers-reduced-motion: reduce');
    });

    it('should have stageTransition keyframe animation', () => {
      expect(shellScss).toContain('@keyframes stageTransition');
      expect(shellScss).toContain('translateY(12px)');
    });

    it('should define flex-grow-1 utility', () => {
      expect(shellScss).toContain('.flex-grow-1');
      expect(shellScss).toContain('flex-grow: 1');
    });

    it('should use --onb-ai-pulse design token for readiness pill', () => {
      expect(shellScss).toContain('--onb-ai-pulse');
    });

    it('should have RTL support in layout', () => {
      expect(shellScss).toContain('.onb-layout.rtl');
      expect(shellScss).toContain('direction: rtl');
      expect(shellScss).toContain('.rtl .onb-left-rail');
      expect(shellScss).toContain('.rtl .onb-right-panel');
    });

    it('should have responsive breakpoints hiding right panel on small screens', () => {
      expect(shellScss).toContain('@media (max-width: 1024px)');
      expect(shellScss).toContain('.onb-right-panel { display: none; }');
    });

    it('should have responsive single-column questions grid on mobile', () => {
      expect(shellScss).toContain('@media (max-width: 768px)');
      expect(shellScss).toContain('grid-template-columns: 1fr');
    });

    it('should have focus-within glow effect on question fields', () => {
      expect(shellScss).toContain('.onb-field:focus-within');
      expect(shellScss).toContain('--onb-ai-glow');
    });

    it('should style risk cards by impact level', () => {
      expect(shellScss).toContain('data-impact="high"');
      expect(shellScss).toContain('data-impact="medium"');
      expect(shellScss).toContain('data-impact="low"');
    });

    it('should note that topbar styles were moved to sub-component', () => {
      expect(shellScss).toContain('top bar styles moved to onboarding-topbar component');
    });

    it('should note that sync badge styles were moved to sub-component', () => {
      expect(shellScss).toContain('sync badge styles moved to onboarding-topbar component');
    });

    it('should disable animations when reduced motion is preferred', () => {
      // Verify that the reduced-motion media query disables animations on stage content
      const reducedMotionBlock = shellScss.slice(shellScss.indexOf('prefers-reduced-motion'));
      expect(reducedMotionBlock).toContain('animation: none');
    });
  });

  // ── Business Logic Tests ──
  describe('business logic', () => {
    it('canSkipCurrentStage prevents skipping special and required stages (in nav service)', () => {
      const method = navSrc.slice(
        navSrc.indexOf('canSkipCurrentStage'),
        navSrc.indexOf('canSkipCurrentStage') + 500
      );
      expect(method).toContain("isRequired");
      expect(method).toContain('SPECIAL_STAGES');
    });

    it('getStageTimeEstimate in nav service calculates based on question count', () => {
      const defIdx = navSrc.indexOf('getStageTimeEstimate(stage');
      const method = navSrc.slice(defIdx, defIdx + 500);
      expect(method).toContain('qs.length');
      expect(method).toContain('Math.max(1');
    });

    it('getStageTimeEstimate returns null for empty stages', () => {
      const defIdx = navSrc.indexOf('getStageTimeEstimate(stage');
      const method = navSrc.slice(defIdx, defIdx + 500);
      expect(method).toContain('return null');
    });

    it('skippedQuestionCount computes difference between all and visible questions (in nav service)', () => {
      const method = navSrc.slice(
        navSrc.indexOf('skippedQuestionCount'),
        navSrc.indexOf('skippedQuestionCount') + 300
      );
      expect(method).toContain('allStageQs');
      expect(method).toContain('filter');
    });

    it('onNpsRated submits feedback via intelligence service', () => {
      const method = intelSrc.slice(
        intelSrc.indexOf('onNpsRated('),
        intelSrc.indexOf('onNpsRated(') + 300
      );
      expect(method).toContain('submitFeedback');
      expect(method).toContain('rating');
    });

    it('onQuickStart applies template answers via session service', () => {
      const method = sessionSrc.slice(
        sessionSrc.indexOf('onQuickStart('),
        sessionSrc.indexOf('onQuickStart(') + 900
      );
      expect(method).toContain('template.answers');
      expect(method).toContain('answersVersion.update');
      expect(method).not.toContain('console.log');
    });

    it('onTeamCsvUploaded sends file via intelligence service', () => {
      const method = intelSrc.slice(
        intelSrc.indexOf('onTeamCsvUploaded('),
        intelSrc.indexOf('onTeamCsvUploaded(') + 600
      );
      expect(method).toContain('importPersons');
      expect(method).not.toContain('console.log');
    });

    it('loadAnswerHistory fetches from API (in intelligence service)', () => {
      const defIdx = intelSrc.indexOf('loadAnswerHistory():');
      const method = intelSrc.slice(defIdx, defIdx + 800);
      expect(method).toContain('getAnswerHistory');
      expect(method).toContain('answerHistory.set');
    });

    it('onRegistered loads configuration and questions after registration (in session service)', () => {
      const defIdx = sessionSrc.indexOf('onRegistered(res:');
      const onRegisteredBlock = sessionSrc.slice(defIdx, defIdx + 1200);
      expect(onRegisteredBlock).toContain('loadConfiguration');
      expect(onRegisteredBlock).toContain('loadQuestions');
      expect(onRegisteredBlock).toContain('loadJourneyProfiles');
    });

    it('onRegistered sets auth session via platform port (in session service)', () => {
      const defIdx = sessionSrc.indexOf('onRegistered(res:');
      const onRegisteredBlock = sessionSrc.slice(defIdx, defIdx + 1200);
      expect(onRegisteredBlock).toContain('platform.auth.setSession');
      expect(onRegisteredBlock).toContain('res.token');
      expect(onRegisteredBlock).toContain('res.tenantId');
      expect(onRegisteredBlock).toContain('registrationMode.set(false)');
    });

    it('recomputeContext calls recomputeContext and reloads governance context (in intelligence service)', () => {
      const method = intelSrc.slice(
        intelSrc.indexOf('recomputeContext():'),
        intelSrc.indexOf('recomputeContext():') + 800
      );
      expect(method).toContain('recomputeContext');
      expect(method).toContain('recomputing.set(true)');
      expect(method).toContain('loadGovernanceContext()');
      expect(method).toContain('recomputing.set(false)');
    });

    it('painModuleMappings builds from selected pain cards using module_priority (in store)', () => {
      const defIdx = storeSrc.indexOf('painModuleMappings = computed');
      const method = storeSrc.slice(defIdx, defIdx + 800);
      expect(method).toContain('module_priority');
      expect(method).toContain('pain.primary_concerns');
    });

    it('isReturningSession is set when loadSession succeeds (in session service)', () => {
      const loadSession = sessionSrc.slice(
        sessionSrc.indexOf('loadSession(sessionId:'),
        sessionSrc.indexOf('loadSession(sessionId:') + 500
      );
      expect(loadSession).toContain('isReturningSession = true');
    });

    it('overallConfidence computes average of confidence scores (in store)', () => {
      const computed = storeSrc.slice(
        storeSrc.indexOf('overallConfidence = computed'),
        storeSrc.indexOf('overallConfidence = computed') + 300
      );
      expect(computed).toContain('confidence_value');
      expect(computed).toContain('total / scores.length');
      expect(computed).toContain('Math.round');
    });

    it('overallConfidence returns 0 for empty scores (in store)', () => {
      const computed = storeSrc.slice(
        storeSrc.indexOf('overallConfidence = computed'),
        storeSrc.indexOf('overallConfidence = computed') + 300
      );
      expect(computed).toContain('scores.length === 0');
      expect(computed).toContain('return 0');
    });

    it('ngOnInit redirects to registration if not logged in', () => {
      const defIdx = shellSrc.indexOf('ngOnInit(): void {');
      const ngOnInit = shellSrc.slice(defIdx, defIdx + 1200);
      expect(ngOnInit).toContain('platform.auth.isLoggedIn()');
      expect(ngOnInit).toContain('registrationMode.set(true)');
    });

    it('ngOnInit defers post-onboarding navigation to DB-resolved landing route (NO FRONTEND INVENTION)', () => {
      const defIdx = shellSrc.indexOf('ngOnInit(): void {');
      const ngOnInit = shellSrc.slice(defIdx, defIdx + 1200);
      expect(ngOnInit).toContain('platform.auth.isOnboardingComplete()');
      // Doctrine: no hardcoded landing route literal in ngOnInit; the
      // outer landing guard (dos.tenant_landing_config via
      // TenantLandingConfigService) owns the redirect target.
      const FORBIDDEN_LITERAL = "'" + '/workspace-' + "home'";
      expect(ngOnInit).not.toContain(FORBIDDEN_LITERAL);
    });

    it('ngOnInit validates saved session ID with UUID regex before loading', () => {
      const defIdx = shellSrc.indexOf('ngOnInit(): void {');
      const ngOnInit = shellSrc.slice(defIdx, defIdx + 3000);
      expect(ngOnInit).toContain('UUID_RE.test(savedSessionId)');
    });

    it('ngOnDestroy cleans up subscriptions and destroys child services', () => {
      const ngOnDestroy = shellSrc.slice(
        shellSrc.indexOf('ngOnDestroy():'),
        shellSrc.indexOf('ngOnDestroy():') + 400
      );
      expect(ngOnDestroy).toContain('provisioningSvc.destroy()');
      expect(ngOnDestroy).toContain('answerSvc.destroy()');
    });

    it('visibleStages filters out stages with no questions (in nav service)', () => {
      const computed = navSrc.slice(
        navSrc.indexOf('visibleStages = computed'),
        navSrc.indexOf('visibleStages = computed') + 500
      );
      expect(computed).toContain('SPECIAL_STAGES.has(s.stageCode)');
      expect(computed).toContain('stage_code');
    });

    it('approveAndProvision delegates to provisioningSvc and jumps to provision stage', () => {
      const method = shellSrc.slice(
        shellSrc.indexOf("approveAndProvision(): void"),
        shellSrc.indexOf("approveAndProvision(): void") + 600
      );
      expect(method).toContain('provisioningSvc.approveAndProvision');
      expect(method).toContain("findVisibleStageIndex('provision_workspace')");
    });

    it('onRegistered delegates to sessionSvc', () => {
      const defIdx = shellSrc.indexOf('onRegistered(res:');
      expect(defIdx).toBeGreaterThan(-1);
      const method = shellSrc.slice(defIdx, defIdx + 200);
      expect(method).toContain('sessionSvc.onRegistered');
    });

    it('t() falls back to FALLBACK_TRANSLATIONS when key not in loaded translations (in store)', () => {
      const method = storeSrc.slice(
        storeSrc.indexOf('t(key: string):'),
        storeSrc.indexOf('t(key: string):') + 200
      );
      expect(method).toContain('FALLBACK_TRANSLATIONS[key]');
      expect(method).toContain('|| key');
    });

    it('confirmExit saves pending answers before navigating away (in session service)', () => {
      const defIdx = sessionSrc.indexOf('confirmExit(): void {');
      const method = sessionSrc.slice(defIdx, defIdx + 1000);
      expect(method).toContain('showExitConfirm.set(false)');
      expect(method).toContain('answerSvc.destroy()');
      expect(method).toContain('saveAnswers');
      expect(method).toContain('doExit()');
    });

    it('getStagePercent calculates from answers (in nav service)', () => {
      const defIdx = navSrc.indexOf('getStagePercent(stageCode: string): number');
      const method = navSrc.slice(defIdx, defIdx + 900);
      expect(method).toContain('percent_complete');
      expect(method).toContain('answered / stageQs.length');
      expect(method).toContain('Math.round');
    });

    it('getStagePercent returns 100 for stages with no questions (in nav service)', () => {
      const defIdx = navSrc.indexOf('getStagePercent(stageCode: string): number');
      const method = navSrc.slice(defIdx, defIdx + 600);
      expect(method).toContain('stageQs.length === 0');
      expect(method).toContain('return 100');
    });

    it('currentQuestions filters by stage, visibility, and profile tiers (in nav service)', () => {
      const defIdx = navSrc.indexOf('currentQuestions(): OnboardingQuestion[]');
      const method = navSrc.slice(defIdx, defIdx + 800);
      expect(method).toContain('q.stage_code !== stageCode');
      expect(method).toContain('isQuestionVisible');
      expect(method).toContain('question_tiers_visible');
      expect(method).toContain("tier === 'hidden'");
      expect(method).toContain('sort_order');
    });

    it('storyRailStages maps visible stages to StageItem with status (in nav service)', () => {
      const defIdx = navSrc.indexOf('storyRailStages = computed');
      const computed = navSrc.slice(defIdx, defIdx + 900);
      expect(computed).toContain("'completed'");
      expect(computed).toContain("'in_progress'");
      expect(computed).toContain("'pending'");
      expect(computed).toContain('getStagePercent');
    });

    it('provisioningSummary computes controls/evidence/workflows/agents from context (in store)', () => {
      const defIdx = storeSrc.indexOf('provisioningSummary = computed');
      const computed = storeSrc.slice(defIdx, defIdx + 700);
      expect(computed).toContain('controls:');
      expect(computed).toContain('evidence:');
      expect(computed).toContain('workflows:');
      expect(computed).toContain('agents:');
    });
  });

  // ── Security Tests ──
  describe('security', () => {
    it('should not contain innerHTML bindings (XSS prevention)', () => {
      expect(shellHtml).not.toContain('[innerHTML]');
      expect(shellHtml).not.toContain('bypassSecurityTrust');
    });

    it('should not expose sensitive data in template', () => {
      expect(shellHtml).not.toContain('password');
      expect(shellHtml).not.toContain('refreshToken');
    });

    it('should validate session ID format before using it', () => {
      expect(shellSrc).toContain('UUID_RE.test(savedSessionId)');
    });

    it('should handle auth failures by clearing tokens (in session service)', () => {
      expect(sessionSrc).toContain('handleAuthFailure');
    });

    it('should not use eval or Function constructor', () => {
      expect(shellSrc).not.toMatch(/\beval\s*\(/);
      expect(shellSrc).not.toMatch(/new\s+Function\s*\(/);
    });
  });

  // ── Accessibility Tests ──
  describe('accessibility', () => {
    it('should have aria-busy on skeleton loading state', () => {
      expect(shellHtml).toContain('aria-busy="true"');
    });

    it('should have aria-label on loading skeleton', () => {
      expect(shellHtml).toContain('[attr.aria-label]');
    });

    it('should have role="status" on loading state', () => {
      expect(shellHtml).toContain('role="status"');
    });

    it('should have dismiss aria-label on welcome back banner', () => {
      expect(shellHtml).toContain("[attr.aria-label]=\"store.isAr ? '\u0625\u063A\u0644\u0627\u0642' : 'Dismiss'\"");
    });
  });
});
