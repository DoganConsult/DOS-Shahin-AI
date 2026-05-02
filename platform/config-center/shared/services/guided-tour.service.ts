import { Injectable, OnDestroy, inject } from '@angular/core';

export interface TourStep {
  id: string;
  title: string;
  text: string;
  attachTo: { element: string; on: string };
  buttons?: { text: string; action: string }[];
}

type TourName = 'first-login' | 'dashboard' | 'risk' | 'compliance' | 'audit' | 'evidence' | 'governance' | 'vendor' | 'whats-new';

const STORAGE_KEY = 'shahin_completed_tours';

@Injectable({ providedIn: 'root' })
export class GuidedTourService implements OnDestroy {
  private tour: any = null;

  private async ensureLoaded(): Promise<void> {
    if (this.tour) return;
    const Shepherd = (await import('shepherd.js')).default;
    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'shahin-tour-step',
      },
    });
  }

  async startTour(steps: TourStep[]): Promise<void> {
    await this.ensureLoaded();
    this.tour.steps = [];

    for (const step of steps) {
      this.tour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        attachTo: step.attachTo,
        buttons: (step.buttons || [
          { text: 'التالي', action: 'next' },
        ]).map(b => ({
          text: b.text,
          action: b.action === 'next' ? this.tour.next.bind(this.tour)
            : b.action === 'back' ? this.tour.back.bind(this.tour)
            : this.tour.cancel.bind(this.tour),
        })),
      });
    }

    this.tour.start();
  }

  async startNamedTour(name: TourName, force = false): Promise<void> {
    if (!force && this.isTourCompleted(name)) return;

    const steps = TOUR_REGISTRY[name];
    if (!steps || steps.length === 0) return;

    await this.ensureLoaded();

    this.tour.on('complete', () => this.markTourCompleted(name));
    await this.startTour(steps);
  }

  isTourCompleted(name: TourName): boolean {
    try {
      const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return completed.includes(name);
    } catch {
      return false;
    }
  }

  markTourCompleted(name: TourName): void {
    try {
      const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!completed.includes(name)) {
        completed.push(name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      }
    } catch { /* ignore */ }
  }

  resetAllTours(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  cancel(): void {
    this.tour?.cancel();
  }

  ngOnDestroy(): void {
    this.tour?.cancel();
  }
}

const TOUR_REGISTRY: Record<TourName, TourStep[]> = {
  'first-login': [
    {
      id: 'welcome',
      title: 'مرحباً بك في شاهين',
      text: 'Welcome to Shahin AI-GRC Platform. Let us guide you through the key features.',
      attachTo: { element: '.app-header', on: 'bottom' },
      buttons: [
        { text: 'تخطي', action: 'cancel' },
        { text: 'ابدأ الجولة', action: 'next' },
      ],
    },
    {
      id: 'sidebar-nav',
      title: 'التنقل الرئيسي',
      text: 'Use the sidebar to navigate between modules: Risk, Compliance, Audit, and more.',
      attachTo: { element: '.sidebar-nav', on: 'right' },
    },
    {
      id: 'dashboard',
      title: 'لوحة القيادة',
      text: 'Your dashboard shows real-time GRC metrics, compliance scores, and pending actions.',
      attachTo: { element: '.dashboard-container', on: 'bottom' },
    },
    {
      id: 'command-palette',
      title: 'لوحة الأوامر',
      text: 'Press Ctrl+K to quickly search controls, risks, policies, and navigate anywhere.',
      attachTo: { element: '.command-palette-trigger', on: 'bottom' },
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      text: 'Real-time notifications for task assignments, compliance alerts, and approvals.',
      attachTo: { element: '.notification-bell', on: 'bottom' },
      buttons: [
        { text: 'السابق', action: 'back' },
        { text: 'إنهاء', action: 'next' },
      ],
    },
  ],
  dashboard: [
    {
      id: 'widgets',
      title: 'الأدوات',
      text: 'Each widget shows a key metric. Click any widget to drill into details.',
      attachTo: { element: '.widget-grid', on: 'bottom' },
    },
    {
      id: 'compliance-score',
      title: 'درجة الامتثال',
      text: 'Overall compliance posture across all active frameworks.',
      attachTo: { element: '.compliance-score-widget', on: 'bottom' },
    },
    {
      id: 'risk-heatmap',
      title: 'خريطة المخاطر',
      text: 'Visual risk distribution by likelihood and impact.',
      attachTo: { element: '.risk-heatmap-widget', on: 'left' },
      buttons: [
        { text: 'السابق', action: 'back' },
        { text: 'إنهاء', action: 'next' },
      ],
    },
  ],
  risk: [
    {
      id: 'risk-register',
      title: 'سجل المخاطر',
      text: 'All identified risks with severity, owner, and treatment status.',
      attachTo: { element: '.risk-table', on: 'top' },
    },
    {
      id: 'risk-add',
      title: 'إضافة خطر',
      text: 'Click to add a new risk. The AI will suggest category and severity.',
      attachTo: { element: '.add-risk-btn', on: 'bottom' },
      buttons: [{ text: 'إنهاء', action: 'next' }],
    },
  ],
  compliance: [
    {
      id: 'frameworks',
      title: 'أُطر الامتثال',
      text: 'Active compliance frameworks (NCA-ECC, ISO 27001, etc.) with progress tracking.',
      attachTo: { element: '.framework-list', on: 'top' },
    },
    {
      id: 'control-mapping',
      title: 'ربط الضوابط',
      text: 'Map controls to framework requirements and track implementation status.',
      attachTo: { element: '.control-mapping-section', on: 'bottom' },
      buttons: [{ text: 'إنهاء', action: 'next' }],
    },
  ],
  audit: [
    {
      id: 'audit-plan',
      title: 'خطة التدقيق',
      text: 'Schedule and manage audit engagements with timeline views.',
      attachTo: { element: '.audit-list', on: 'top' },
      buttons: [{ text: 'إنهاء', action: 'next' }],
    },
  ],
  evidence: [
    {
      id: 'evidence-library',
      title: 'مكتبة الأدلة',
      text: 'Upload and manage evidence artifacts linked to controls.',
      attachTo: { element: '.evidence-table', on: 'top' },
      buttons: [{ text: 'إنهاء', action: 'next' }],
    },
  ],
  governance: [
    {
      id: 'policy-list',
      title: 'السياسات',
      text: 'Manage organizational policies with version control and approval workflows.',
      attachTo: { element: '.policy-table', on: 'top' },
      buttons: [{ text: 'إنهاء', action: 'next' }],
    },
  ],
  vendor: [
    {
      id: 'vendor-list',
      title: 'إدارة الموردين',
      text: 'Track vendor risk assessments, contracts, and compliance status.',
      attachTo: { element: '.vendor-table', on: 'top' },
      buttons: [{ text: 'إنهاء', action: 'next' }],
    },
  ],
  'whats-new': [
    {
      id: 'new-features',
      title: 'ما الجديد',
      text: 'Check out the latest features and improvements in this release.',
      attachTo: { element: '.app-header', on: 'bottom' },
      buttons: [{ text: 'فهمت', action: 'next' }],
    },
  ],
};
