/**
 * Setup Wizard Component -- Conversational AI-guided company setup.
 *
 * Orchestrator component that manages wizard state, step navigation,
 * API interactions, and session persistence. Delegates rendering to:
 *   - SetupWizardChatComponent (chat message thread)
 *   - SetupWizardStepInputComponent (step form controls + completion view)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
 */

import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StorageService } from '@app/infrastructure';
import {
  JourneyService,
  FrameworkRecommendation,
  RoleRecommendation,
  SetupAnswerResponse,
} from '@app/core/services/user-account/journey.service';

import type { SetupStep, ChatMessage, WizardSessionState } from './setup-wizard.types';
import {
  SETUP_STEPS,
  INDUSTRY_SECTORS,
  EMPLOYEE_COUNTS,
  KSA_REGIONS,
  SESSION_KEY,
} from './setup-wizard.types';
import { SetupWizardChatComponent } from './components/setup-wizard-chat.component';
import { SetupWizardStepInputComponent } from './components/setup-wizard-step-input.component';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-setup-wizard',
    imports: [CommonModule, StepsModule, SetupWizardChatComponent, SetupWizardStepInputComponent],
    template: `
    <div class="setup-wizard">
      <!-- Header -->
      <div class="setup-header">
        <div class="setup-icon">
          <i class="pi pi-comments"></i>
        </div>
        <h1>{{ isAr() ? 'معالج إعداد الشركة' : 'Company Setup Wizard' }}</h1>
        <p class="setup-desc">
          {{ isAr()
            ? 'سيرشدك شاهين خلال إعداد ملف شركتك واكتشاف الأطر التنظيمية المطبقة.'
            : 'Shahin will guide you through setting up your company profile and discovering applicable regulatory frameworks.' }}
        </p>
      </div>

      <!-- PrimeNG Steps wizard indicator -->
      <div class="steps-container">
        <p-steps [model]="wizardSteps()" [activeIndex]="activeStepIndex()" [readonly]="false"
                 (activeIndexChange)="navigateToStep($event)"
                 styleClass="setup-steps" />
      </div>

      <!-- Chat area (child component) -->
      <app-setup-wizard-chat
        [messages]="messages()"
        [isAr]="isAr()"
        #chatComponent />

      <!-- Step input area (child component) -->
      <app-setup-wizard-step-input
        [currentStep]="currentStep()"
        [isAr]="isAr()"
        [loading]="loading()"
        [validationError]="validationError()"
        [companyName]="companyName"
        [selectedSector]="selectedSector"
        [selectedEmployeeCount]="selectedEmployeeCount"
        [selectedRegion]="selectedRegion"
        [subsidiaryInput]="subsidiaryInput"
        [subsidiaries]="subsidiaries"
        (startSetup)="startSetup()"
        (submitCompanyName)="submitCompanyName()"
        (companyNameChange)="companyName = $event"
        (selectIndustry)="selectIndustry($event)"
        (selectEmployeeCount)="selectEmployeeCount($event)"
        (selectRegion)="selectRegion($event)"
        (addSubsidiary)="addSubsidiary()"
        (removeSubsidiary)="removeSubsidiary($event)"
        (subsidiaryInputChange)="subsidiaryInput = $event"
        (submitSubsidiaries)="submitSubsidiaries()"
        (confirmProfile)="confirmProfile()"
        (restartSetup)="restartSetup()"
        (goToRoadmap)="goToRoadmap()" />
    </div>
  `,
    styles: [`
    .setup-wizard {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 160px);
      min-height: 500px;
    }

    /* ---- Header ---- */
    .setup-header {
      text-align: center;
      padding-bottom: var(--space-md);
      flex-shrink: 0;
    }

    .setup-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-ice);
      border: 2px solid var(--border-primary);
      color: var(--primary);
      font-size: var(--font-size-xl);
      margin-bottom: var(--space-sm);
    }

    .setup-header h1 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-black);
      color: var(--text-heading);
      margin: 0 0 var(--space-xs);
    }

    .setup-desc {
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      max-width: 480px;
      margin: 0 auto;
    }

    /* ---- PrimeNG Steps ---- */
    .steps-container {
      flex-shrink: 0;
      padding: var(--space-sm) 0 var(--space-md);
      overflow-x: auto;
    }
  `]
})
export class SetupWizardComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private journeyService = inject(JourneyService);
  private router = inject(Router);
  private _storage = inject(StorageService);

  @ViewChild('chatComponent') chatComponent!: SetupWizardChatComponent;

  // ── Signals ──
  currentStep = signal<SetupStep>('welcome');
  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  validationError = signal<string>('');

  // ── Collected data ──
  companyName = '';
  selectedSector = '';
  selectedEmployeeCount = '';
  selectedRegion = '';
  subsidiaryInput = '';
  subsidiaries: string[] = [];

  // ── Data from API responses ──
  detectedFrameworks: FrameworkRecommendation[] = [];
  recommendedRoles: RoleRecommendation[] = [];

  private msgCounter = 0;

  // ── Computed ──
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  /** PrimeNG Steps MenuItem array -- completed steps are clickable, future steps are disabled */
  wizardSteps = computed<MenuItem[]>(() => {
    const ar = this.isAr();
    const labels = [
      { id: 'company_name' as SetupStep, en: 'Company', ar: 'الشركة' },
      { id: 'industry_sector' as SetupStep, en: 'Industry', ar: 'القطاع' },
      { id: 'employee_count' as SetupStep, en: 'Size', ar: 'الحجم' },
      { id: 'ksa_region' as SetupStep, en: 'Region', ar: 'المنطقة' },
      { id: 'subsidiaries' as SetupStep, en: 'Subsidiaries', ar: 'الشركات التابعة' },
      { id: 'confirm' as SetupStep, en: 'Confirm', ar: 'تأكيد' },
    ];
    const currentIdx = SETUP_STEPS.indexOf(this.currentStep());
    return labels.map(l => {
      const stepIdx = SETUP_STEPS.indexOf(l.id);
      const isCompleted = stepIdx < currentIdx;
      const isFuture = stepIdx > currentIdx;
      return {
        label: ar ? l.ar : l.en,
        disabled: isFuture,
        styleClass: isCompleted ? 'step-completed' : '',
      } as MenuItem;
    });
  });

  /** Active index for PrimeNG Steps (0-based, offset by 1 since 'welcome' is step 0 but not in the steps UI) */
  activeStepIndex = computed(() => {
    const step = this.currentStep();
    if (step === 'welcome') return 0;
    if (step === 'complete') return 5;
    const idx = SETUP_STEPS.indexOf(step);
    return idx > 0 ? idx - 1 : 0;
  });

  ngOnInit(): void {
    const restored = this.restoreFromSession();
    if (restored) return;

    this.addAssistantMessage(
      'Welcome to Shahin! I\'m your AI GRC partner. I\'ll help you set up your company profile and discover which regulatory frameworks apply to your business.\n\nThis will only take a few minutes. Ready to begin?',
      'مرحباً بك في شاهين! أنا شريكك الذكي في الحوكمة والمخاطر والامتثال. سأساعدك في إعداد ملف شركتك واكتشاف الأطر التنظيمية المطبقة على أعمالك.\n\nلن يستغرق الأمر سوى دقائق قليلة. هل أنت مستعد للبدء؟',
      'welcome'
    );
  }

  ngOnDestroy(): void {
    if (this.currentStep() !== 'complete' && this.currentStep() !== 'welcome') {
      this.saveToSession();
    }
  }

  // ── Step handlers ──

  startSetup(): void {
    this.addUserMessage('Yes, let\'s get started!', 'نعم، لنبدأ!');
    this.currentStep.set('company_name');
    this.addAssistantMessage(
      'Great! First, what is your company name?',
      'ممتاز! أولاً، ما هو اسم شركتك؟',
      'company_name'
    );
    this.saveToSession();
  }

  submitCompanyName(): void {
    const name = this.companyName.trim();
    if (!name) {
      this.validationError.set(this.isAr()
        ? 'يرجى إدخال اسم الشركة'
        : 'Please enter your company name');
      return;
    }
    this.validationError.set('');
    this.addUserMessage(name, name);

    this.showTypingThenMessage(
      `Nice to meet you, ${name}! Now, which industry sector does your company operate in? This helps me identify the regulatory frameworks that apply to your business.`,
      `سعيد بلقائك، ${name}! الآن، في أي قطاع صناعي تعمل شركتك؟ هذا يساعدني في تحديد الأطر التنظيمية المطبقة على أعمالك.`,
      'industry_sector'
    );
    this.currentStep.set('industry_sector');
    this.saveToSession();
  }

  selectIndustry(sectorId: string): void {
    this.selectedSector = sectorId;
    const sector = INDUSTRY_SECTORS.find(s => s.id === sectorId);
    if (!sector) return;

    this.addUserMessage(sector.labelEn, sector.labelAr);
    this.loading.set(true);

    this.journeyService.submitSetupAnswer('industry_sector', { industrySector: sectorId }).subscribe({
      next: (res: SetupAnswerResponse) => {
        this.loading.set(false);
        const frameworks = res.profile?.applicableFrameworks ?? [];
        this.detectedFrameworks = frameworks;

        if (frameworks.length > 0) {
          this.addAssistantMessageWithFrameworks(
            `Based on the ${sector.labelEn} sector, I've identified ${frameworks.length} regulatory framework${frameworks.length > 1 ? 's' : ''} that apply to your business:`,
            `بناءً على قطاع ${sector.labelAr}، حددت ${frameworks.length} إطار${frameworks.length > 1 ? 'اً' : ''} تنظيمي${frameworks.length > 1 ? 'اً' : ''} ينطبق على أعمالك:`,
            frameworks,
            'industry_sector'
          );
        }

        setTimeout(() => {
          this.addAssistantMessage(
            'Now, how many employees does your company have? This helps me recommend the right team structure for GRC.',
            'الآن، كم عدد موظفي شركتك؟ هذا يساعدني في التوصية بهيكل الفريق المناسب للحوكمة والمخاطر والامتثال.',
            'employee_count'
          );
          this.currentStep.set('employee_count');
          this.saveToSession();
        }, 600);
      },
      error: () => {
        this.loading.set(false);
        this.addAssistantMessage(
          'Now, how many employees does your company have? This helps me recommend the right team structure for GRC.',
          'الآن، كم عدد موظفي شركتك؟ هذا يساعدني في التوصية بهيكل الفريق المناسب للحوكمة والمخاطر والامتثال.',
          'employee_count'
        );
        this.currentStep.set('employee_count');
        this.saveToSession();
      },
    });
  }

  selectEmployeeCount(countId: string): void {
    this.selectedEmployeeCount = countId;
    const ec = EMPLOYEE_COUNTS.find(e => e.id === countId);
    if (!ec) return;

    this.addUserMessage(ec.labelEn, ec.labelAr);
    this.loading.set(true);

    this.journeyService.submitSetupAnswer('employee_count', { employeeCount: countId }).subscribe({
      next: (res: SetupAnswerResponse) => {
        this.loading.set(false);
        const roles = res.profile?.recommendedRoles ?? [];
        this.recommendedRoles = roles;

        if (roles.length > 0) {
          this.addAssistantMessageWithRoles(
            'Based on your company size, here are the GRC roles I recommend:',
            'بناءً على حجم شركتك، إليك أدوار الحوكمة والمخاطر والامتثال التي أوصي بها:',
            roles,
            'employee_count'
          );
        }

        setTimeout(() => {
          this.addAssistantMessage(
            'Which region in Saudi Arabia is your company headquartered in?',
            'في أي منطقة في المملكة العربية السعودية يقع المقر الرئيسي لشركتك؟',
            'ksa_region'
          );
          this.currentStep.set('ksa_region');
          this.saveToSession();
        }, 600);
      },
      error: () => {
        this.loading.set(false);
        this.addAssistantMessage(
          'Which region in Saudi Arabia is your company headquartered in?',
          'في أي منطقة في المملكة العربية السعودية يقع المقر الرئيسي لشركتك؟',
          'ksa_region'
        );
        this.currentStep.set('ksa_region');
        this.saveToSession();
      },
    });
  }

  selectRegion(regionId: string): void {
    this.selectedRegion = regionId;
    const region = KSA_REGIONS.find(r => r.id === regionId);
    if (!region) return;

    this.addUserMessage(region.labelEn, region.labelAr);

    this.showTypingThenMessage(
      'Almost done! Does your company have any subsidiaries? You can add them below, or skip if there are none.',
      'أوشكنا على الانتهاء! هل لدى شركتك أي شركات تابعة؟ يمكنك إضافتها أدناه، أو التخطي إذا لم تكن هناك شركات تابعة.',
      'subsidiaries'
    );
    this.currentStep.set('subsidiaries');
    this.saveToSession();
  }

  addSubsidiary(): void {
    const name = this.subsidiaryInput.trim();
    if (!name) return;
    if (!this.subsidiaries.includes(name)) {
      this.subsidiaries = [...this.subsidiaries, name];
    }
    this.subsidiaryInput = '';
  }

  removeSubsidiary(name: string): void {
    this.subsidiaries = this.subsidiaries.filter(s => s !== name);
  }

  submitSubsidiaries(): void {
    if (this.subsidiaries.length > 0) {
      this.addUserMessage(
        `Subsidiaries: ${this.subsidiaries.join(', ')}`,
        `الشركات التابعة: ${this.subsidiaries.join('، ')}`
      );
    } else {
      this.addUserMessage('No subsidiaries', 'لا توجد شركات تابعة');
    }

    const sectorLabel = INDUSTRY_SECTORS.find(s => s.id === this.selectedSector);
    const ecLabel = EMPLOYEE_COUNTS.find(e => e.id === this.selectedEmployeeCount);
    const regionLabel = KSA_REGIONS.find(r => r.id === this.selectedRegion);

    const summaryEn = `Here's a summary of your company profile:\n\n` +
      `\u2022 Company: ${this.companyName}\n` +
      `\u2022 Industry: ${sectorLabel?.labelEn ?? this.selectedSector}\n` +
      `\u2022 Size: ${ecLabel?.labelEn ?? this.selectedEmployeeCount}\n` +
      `\u2022 Region: ${regionLabel?.labelEn ?? this.selectedRegion}\n` +
      `\u2022 Subsidiaries: ${this.subsidiaries.length > 0 ? this.subsidiaries.join(', ') : 'None'}\n` +
      `\u2022 Frameworks: ${this.detectedFrameworks.length} detected\n\n` +
      `Does everything look correct? Click "Confirm & Save" to proceed to your GRC roadmap.`;

    const summaryAr = `إليك ملخص ملف شركتك:\n\n` +
      `\u2022 الشركة: ${this.companyName}\n` +
      `\u2022 القطاع: ${sectorLabel?.labelAr ?? this.selectedSector}\n` +
      `\u2022 الحجم: ${ecLabel?.labelAr ?? this.selectedEmployeeCount}\n` +
      `\u2022 المنطقة: ${regionLabel?.labelAr ?? this.selectedRegion}\n` +
      `\u2022 الشركات التابعة: ${this.subsidiaries.length > 0 ? this.subsidiaries.join('، ') : 'لا يوجد'}\n` +
      `\u2022 الأطر التنظيمية: ${this.detectedFrameworks.length} تم اكتشافها\n\n` +
      `هل كل شيء صحيح؟ انقر "تأكيد وحفظ" للانتقال إلى خارطة طريق الحوكمة والمخاطر والامتثال.`;

    this.showTypingThenMessage(summaryEn, summaryAr, 'confirm');
    this.currentStep.set('confirm');
    this.saveToSession();
  }

  confirmProfile(): void {
    this.loading.set(true);
    this.validationError.set('');

    this.journeyService.submitSetupAnswer('confirm', {
      companyName: this.companyName.trim(),
      industrySector: this.selectedSector,
      employeeCount: this.selectedEmployeeCount,
      ksaRegion: this.selectedRegion,
      subsidiaries: this.subsidiaries,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.addAssistantMessage(
          'Your company profile has been saved successfully! I\'m now generating your personalized GRC roadmap. Let\'s move forward!',
          'تم حفظ ملف شركتك بنجاح! أقوم الآن بإنشاء خارطة طريق الحوكمة والمخاطر والامتثال المخصصة لك. لننطلق!',
          'complete'
        );
        this.currentStep.set('complete');
        this.clearSession();
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = (err as GrcRecord)?.error?.missingFields
          ? (this.isAr()
            ? `يرجى إكمال الحقول التالية: ${((err as GrcRecord).error).missingFields.join('، ')}`
            : `Please complete the following fields: ${((err as GrcRecord).error).missingFields.join(', ')}`)
          : (this.isAr()
            ? 'حدث خطأ أثناء حفظ الملف. يرجى المحاولة مرة أخرى.'
            : 'An error occurred while saving your profile. Please try again.');
        this.validationError.set(errorMsg);
      },
    });
  }

  restartSetup(): void {
    this.companyName = '';
    this.selectedSector = '';
    this.selectedEmployeeCount = '';
    this.selectedRegion = '';
    this.subsidiaryInput = '';
    this.subsidiaries = [];
    this.detectedFrameworks = [];
    this.recommendedRoles = [];
    this.validationError.set('');
    this.messages.set([]);
    this.currentStep.set('welcome');
    this.clearSession();
    this.ngOnInit();
  }

  goToRoadmap(): void {
    this.router.navigate(['/journey/roadmap']);
  }

  /** Navigate to a previously completed step via PrimeNG Steps click (Req 6.3) */
  navigateToStep(index: number): void {
    const targetStep = SETUP_STEPS[index + 1];
    if (!targetStep) return;

    const currentIdx = SETUP_STEPS.indexOf(this.currentStep());
    const targetIdx = SETUP_STEPS.indexOf(targetStep);
    if (targetIdx >= currentIdx) return;

    this.currentStep.set(targetStep);
    this.saveToSession();
  }

  // ── Message helpers ──

  private addAssistantMessage(contentEn: string, contentAr: string, stepId?: SetupStep): void {
    const msg: ChatMessage = {
      id: `msg-${++this.msgCounter}`,
      role: 'assistant',
      contentEn,
      contentAr,
      timestamp: new Date(),
      stepId,
    };
    this.messages.update(msgs => [...msgs, msg]);
    this.requestChatScroll();
  }

  private addAssistantMessageWithFrameworks(
    contentEn: string, contentAr: string,
    frameworks: FrameworkRecommendation[], stepId?: SetupStep
  ): void {
    const msg: ChatMessage = {
      id: `msg-${++this.msgCounter}`,
      role: 'assistant',
      contentEn,
      contentAr,
      timestamp: new Date(),
      stepId,
      frameworks,
    };
    this.messages.update(msgs => [...msgs, msg]);
    this.requestChatScroll();
  }

  private addAssistantMessageWithRoles(
    contentEn: string, contentAr: string,
    roles: RoleRecommendation[], stepId?: SetupStep
  ): void {
    const msg: ChatMessage = {
      id: `msg-${++this.msgCounter}`,
      role: 'assistant',
      contentEn,
      contentAr,
      timestamp: new Date(),
      stepId,
      roles,
    };
    this.messages.update(msgs => [...msgs, msg]);
    this.requestChatScroll();
  }

  private addUserMessage(contentEn: string, contentAr: string): void {
    const msg: ChatMessage = {
      id: `msg-${++this.msgCounter}`,
      role: 'user',
      contentEn,
      contentAr,
      timestamp: new Date(),
    };
    this.messages.update(msgs => [...msgs, msg]);
    this.requestChatScroll();
  }

  private showTypingThenMessage(contentEn: string, contentAr: string, stepId?: SetupStep): void {
    const typingId = `msg-${++this.msgCounter}`;
    const typingMsg: ChatMessage = {
      id: typingId,
      role: 'assistant',
      contentEn: '',
      contentAr: '',
      timestamp: new Date(),
      isTyping: true,
    };
    this.messages.update(msgs => [...msgs, typingMsg]);
    this.requestChatScroll();

    setTimeout(() => {
      this.messages.update(msgs =>
        msgs.map(m => m.id === typingId
          ? { ...m, contentEn, contentAr, stepId, isTyping: false }
          : m
        )
      );
      this.requestChatScroll();
    }, 800);
  }

  /** Tell the chat child component to scroll to bottom */
  private requestChatScroll(): void {
    // Use setTimeout to ensure the child view has updated before scrolling
    setTimeout(() => this.chatComponent?.requestScroll(), 0);
  }

  // ── Session persistence ──

  /** Persist wizard state to sessionStorage (Req 6.4) */
  private saveToSession(): void {
    try {
      const state: WizardSessionState = {
        currentStep: this.currentStep(),
        companyName: this.companyName,
        selectedSector: this.selectedSector,
        selectedEmployeeCount: this.selectedEmployeeCount,
        selectedRegion: this.selectedRegion,
        subsidiaries: [...this.subsidiaries],
        messages: this.messages().map(m => ({ ...m, frameworks: m.frameworks, roles: m.roles })),
      };
      this._storage.set(SESSION_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage unavailable -- graceful degradation
    }
  }

  /** Restore wizard state from sessionStorage (Req 6.4) */
  private restoreFromSession(): boolean {
    try {
      const raw = this._storage.get(SESSION_KEY);
      if (!raw) return false;
      const state: WizardSessionState = JSON.parse(raw);
      if (!state.currentStep || state.currentStep === 'welcome' || state.currentStep === 'complete') return false;

      this.currentStep.set(state.currentStep);
      this.companyName = state.companyName || '';
      this.selectedSector = state.selectedSector || '';
      this.selectedEmployeeCount = state.selectedEmployeeCount || '';
      this.selectedRegion = state.selectedRegion || '';
      this.subsidiaries = state.subsidiaries || [];
      if (state.messages?.length) {
        this.msgCounter = state.messages.length;
        this.messages.set(state.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Clear session state after successful completion */
  private clearSession(): void {
    try {
      this._storage.remove(SESSION_KEY);
    } catch {
      // ignore
    }
  }
}
