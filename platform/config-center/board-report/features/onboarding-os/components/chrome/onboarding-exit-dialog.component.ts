import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';

/**
 * OnboardingExitDialogComponent
 *
 * Dumb presentation component for the exit confirmation overlay.
 * Displays a modal dialog asking the user to confirm leaving onboarding.
 * Progress will be saved so they can return later.
 */
@Component({
    selector: 'app-onboarding-exit-dialog',
    imports: [CommonModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div *ngIf="visible" tabindex="0" role="button"
      (keyup.enter)="cancelled.emit()" class="onb-exit-overlay" (click)="cancelled.emit()">
      <div tabindex="0" role="button"
        (keyup.enter)="$event.stopPropagation()" class="onb-exit-dialog" (click)="$event.stopPropagation()">
        <i class="pi pi-exclamation-triangle onb-exit-icon"></i>
        <h3>{{ lang === 'ar' ? '\u0647\u0644 \u062A\u0631\u064A\u062F \u0627\u0644\u062E\u0631\u0648\u062C\u061F' : 'Exit Onboarding?' }}</h3>
        <p>{{ lang === 'ar'
          ? '\u0633\u064A\u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u062F\u0645\u0643 \u0627\u0644\u062D\u0627\u0644\u064A. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0627\u0633\u062A\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0647\u064A\u0626\u0629 \u0644\u0627\u062D\u0642\u0627\u064B.'
          : 'Your current progress will be saved. You can return to continue setup later.' }}</p>
        <div class="onb-exit-actions">
          <button pButton
            [label]="lang === 'ar' ? '\u0625\u0644\u063A\u0627\u0621' : 'Cancel'"
            [text]="true" icon="pi pi-times"
            (click)="cancelled.emit()"></button>
          <button pButton
            [label]="lang === 'ar' ? '\u062D\u0641\u0638 \u0648\u0627\u0644\u062E\u0631\u0648\u062C' : 'Save & Exit'"
            icon="pi pi-check" severity="warning"
            (click)="confirmed.emit()"></button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .onb-exit-overlay {
      position: fixed; inset: 0; z-index: var(--z-toast);
      background: rgba(var(--color-black-rgb), 0.5); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
    }
    .onb-exit-dialog {
      background: var(--surface-card, #fff); border-radius: var(--radius-lg);
      padding: 2rem 2.5rem; max-width: 480px; width: 90%;
      text-align: center;
      box-shadow: var(--shadow-lg, 0 8px 24px -4px rgba(var(--color-black-rgb), 0.14), 0 4px 8px rgba(var(--color-black-rgb), 0.06));
      animation: slideUp 0.2s cubic-bezier(0.4,0,0.2,1);
    }
    .onb-exit-icon { font-size: var(--font-size-5xl); color: var(--warning, var(--warning)); margin-bottom: 0.75rem; }
    .onb-exit-dialog h3 { margin: 0 0 0.5rem; font-size: var(--font-size-xl); color: var(--text-color); }
    .onb-exit-dialog p { margin: 0 0 1.5rem; font-size: var(--font-size-body-sm); color: var(--text-color-secondary); line-height: 1.6; }
    .onb-exit-actions { display: flex; gap: 0.75rem; justify-content: center; }
    .onb-exit-actions button { min-width: 120px; border-radius: var(--radius-md); transition: all 200ms cubic-bezier(0.4,0,0.2,1); }
    .onb-exit-actions button:hover { transform: translateY(-1px); }
    .onb-exit-actions button:active { transform: scale(0.98); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) {
      .onb-exit-overlay, .onb-exit-dialog { animation: none !important; }
    }
  `]
})
export class OnboardingExitDialogComponent {
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  private get i18n() { return this.platform.i18n; }

  /** Whether the dialog is visible */
  @Input() visible = false;

  /** Current language: 'en' or 'ar' */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Emitted when user cancels the exit */
  @Output() cancelled = new EventEmitter<void>();

  /** Emitted when user confirms the exit (save and leave) */
  @Output() confirmed = new EventEmitter<void>();
}
