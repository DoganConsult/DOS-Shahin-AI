import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { OnboardingNumberPipe as AppNumberPipe } from '../shared/onboarding-number.pipe';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';
import { TerminologyGlossaryComponent } from '../shared/terminology-glossary.component';
import { RegionalTerm } from '../../models/onboarding.models';

/**
 * OnboardingTopBarComponent
 *
 * Dumb presentation component for the onboarding top navigation bar.
 * Displays branding, progress/confidence meters, save status, sync badge,
 * language toggle, terminology glossary, and exit trigger.
 */
@Component({
    selector: 'app-onboarding-topbar',
    imports: [CommonModule, ButtonModule, ProgressBarModule, TooltipModule, AppNumberPipe, TerminologyGlossaryComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Email verification banner -->
    <div class="onb-email-verify-banner" *ngIf="showEmailVerifyBanner">
      <i class="pi pi-envelope"></i>
      <span>{{ lang === 'ar' ? 'يرجى التحقق من بريدك الإلكتروني لاستكمال التفعيل' : 'Please verify your email to complete activation' }}</span>
      <button pButton [text]="true" [label]="lang === 'ar' ? 'إعادة الإرسال' : 'Resend'"
        icon="pi pi-refresh" class="onb-resend-btn" (click)="resendVerification.emit()"
        [attr.aria-label]="lang === 'ar' ? 'إعادة إرسال رسالة التحقق' : 'Resend verification email'"></button>
    </div>
    <div class="onb-topbar">
      <div class="onb-topbar-left">
        <i class="pi pi-shield onb-logo-icon"></i>
        <span class="onb-title">{{ lang === 'ar' ? '\u0634\u0627\u0647\u064A\u0646' : 'Shahin' }}</span>
      </div>
      <div class="onb-topbar-center">
        <div class="onb-progress-pill">
          <span class="onb-progress-label">{{ lang === 'ar' ? '\u0627\u0644\u062A\u0642\u062F\u0645' : 'Progress' }}</span>
          <p-progressBar [value]="progressPercent" [showValue]="true" [style]="{'height':'8px','width':'160px','border-radius':'4px'}" />
        </div>
        <div class="onb-readiness-pill"
          [class.ready]="readinessScore >= readyThreshold"
          [class.warning]="readinessScore >= warningThreshold && readinessScore < readyThreshold">
          <i class="pi pi-gauge"></i>
          <span>{{ lang === 'ar' ? '\u0627\u0644\u062B\u0642\u0629' : 'Confidence' }}: {{ readinessScore | appNumber:'decimal':'1.0-0' }}%</span>
        </div>
      </div>
      <div class="onb-topbar-right">
        <span class="onb-save-status" *ngIf="saving"><i class="pi pi-spin pi-spinner"></i> {{ savingLabel }}</span>
        <span class="onb-save-status saved" *ngIf="!saving && lastSaved && !hasOfflineQueue"><i class="pi pi-check"></i> {{ savedLabel }}</span>
        <span class="onb-save-status offline" *ngIf="hasOfflineQueue && !saving">
          <i class="pi pi-cloud-upload"></i>
          {{ lang === 'ar' ? 'تغييرات غير متزامنة' : 'Unsaved changes' }}
        </span>
        <span class="onb-sync-badge" *ngIf="synced">
          <i class="pi pi-sync"></i>
          {{ lang === 'ar' ? '\u0645\u062A\u0632\u0627\u0645\u0646' : 'Synced' }}
        </span>
        <button pButton [text]="true" icon="pi pi-globe" (click)="toggleLang.emit()"
          [pTooltip]="lang === 'ar' ? englishLabel : arabicLabel"
          [attr.aria-label]="lang === 'ar' ? englishLabel : arabicLabel"></button>
        <app-terminology-glossary [terms]="terminologyTerms" [lang]="lang"></app-terminology-glossary>
        <button pButton [text]="true" icon="pi pi-sign-out" (click)="exitClicked.emit()"
          [pTooltip]="lang === 'ar' ? '\u062E\u0631\u0648\u062C' : 'Exit'"
          [attr.aria-label]="lang === 'ar' ? '\u062E\u0631\u0648\u062C' : 'Exit'"></button>
      </div>
    </div>
  `,
    styles: [`
    .onb-topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 0.65rem 1.5rem; background: var(--surface, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      position: sticky; top: 0; z-index: var(--z-dropdown);
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .onb-topbar-left { display: flex; align-items: center; gap: 0.5rem; }
    .onb-logo-icon { font-size: 1.25rem; color: var(--primary, var(--primary-color)); }
    .onb-title { font-weight: 700; font-size: 1rem; color: var(--text-heading, var(--text-color)); letter-spacing: -0.01em; }
    .onb-topbar-center { display: flex; align-items: center; gap: 1rem; }
    .onb-progress-pill { display: flex; align-items: center; gap: 0.5rem; }
    .onb-progress-label { font-size: 0.8rem; color: var(--text-color-secondary); }
    .onb-readiness-pill {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.25rem 0.7rem; border-radius: var(--radius-pill, 20px); font-size: 0.8rem; font-weight: 600;
      background: var(--onb-ai-pulse, rgba(15,98,254,0.08)); color: var(--primary, var(--primary-color));
      border: 1px solid var(--carbon-blue-20, rgba(15,98,254,0.2));
    }
    .onb-readiness-pill.ready { background: var(--onb-milestone-done, rgba(34,197,94,0.08)); color: var(--success, var(--success)); border-color: var(--carbon-green-20, rgba(34,197,94,0.2)); }
    .onb-readiness-pill.warning { background: var(--onb-milestone-active, rgba(245,158,11,0.08)); color: var(--orange-600); border-color: rgba(245,158,11,0.2); }
    .onb-topbar-right { display: flex; align-items: center; gap: 0.5rem; }
    .onb-save-status { font-size: 0.8rem; color: var(--text-color-secondary); display: flex; align-items: center; gap: 0.25rem; }
    .onb-save-status.saved { color: var(--success); }
    .onb-save-status.offline { color: var(--warning, #f59e0b); }
    .onb-sync-badge {
      display: flex; align-items: center; gap: 0.2rem;
      font-size: 0.7rem; font-weight: 500; color: var(--status-success, #24a148);
      opacity: 0.7;
    }
    .onb-sync-badge i { font-size: 0.65rem; }
    .onb-email-verify-banner {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.4rem 1rem; font-size: 0.8125rem; font-weight: 500;
      background: var(--warning-subtle, rgba(245,158,11,0.08));
      color: var(--warning-text, #92400e);
      border-bottom: 1px solid rgba(245,158,11,0.15);
    }
    .onb-email-verify-banner i { font-size: 0.9rem; }
    .onb-resend-btn { font-size: 0.75rem !important; padding: 0.15rem 0.5rem !important; }
  `]
})
export class OnboardingTopBarComponent {
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  private get i18n() { return this.platform.i18n; }

  /** Current language: 'en' or 'ar' */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Session progress percentage (0-100) */
  @Input() progressPercent = 0;

  /** Session readiness/confidence score (0-100) */
  @Input() readinessScore = 0;

  /** Threshold for "ready" styling on confidence pill */
  @Input() readyThreshold = 85;

  /** Threshold for "warning" styling on confidence pill */
  @Input() warningThreshold = 40;

  /** Whether answers are currently being saved */
  @Input() saving = false;

  /** Whether last save completed successfully */
  @Input() lastSaved = false;

  /** Whether there are answers queued offline awaiting sync */
  @Input() hasOfflineQueue = false;

  /** Whether session is synced (has a session ID) */
  @Input() synced = false;

  /** Terminology terms for the glossary */
  @Input() terminologyTerms: RegionalTerm[] = [];

  /** Label for saving indicator */
  @Input() savingLabel = 'Saving...';

  /** Label for saved indicator */
  @Input() savedLabel = 'Saved';

  /** Label for English language option */
  @Input() englishLabel = 'English';

  /** Label for Arabic language option */
  @Input() arabicLabel = '\u0639\u0631\u0628\u064A';

  /** Whether user has verified their email */
  @Input() emailVerified = true;

  /** Show banner when email not verified and session exists */
  get showEmailVerifyBanner(): boolean {
    return !this.emailVerified && this.synced;
  }

  /** Emitted when user clicks the language toggle button */
  @Output() toggleLang = new EventEmitter<void>();

  /** Emitted when user clicks the exit button */
  @Output() exitClicked = new EventEmitter<void>();

  /** Emitted when user clicks "Resend" in email verification banner */
  @Output() resendVerification = new EventEmitter<void>();
}
