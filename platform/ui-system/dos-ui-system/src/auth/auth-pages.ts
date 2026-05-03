/**
 * Phase M1.6 — Carbon Auth Pages Pack — 5 page composers.
 *
 * Each page composes the auth-components.ts primitives. Desktop layout
 * is split-screen (brand panel + card via <dos-auth-shell> grid). Mobile
 * (≤720px container) collapses to a single column. NO localStorage; no
 * silent fallback; no PrimeNG/Material/Translate.
 *
 *   auth.login.page            → DosAuthLoginPageComponent
 *   auth.register.page         → DosAuthRegisterPageComponent
 *   auth.forgot-password.page  → DosAuthForgotPasswordPageComponent
 *   auth.mfa.page              → DosAuthMfaPageComponent
 *   auth.reset-password.page   → DosAuthResetPasswordPageComponent
 */
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DosAuthShellComponent,
  DosAuthBrandPanelComponent,
  DosAuthLoginCardComponent,
  DosAuthRegisterCardComponent,
  DosAuthForgotPasswordCardComponent,
  DosAuthResetPasswordCardComponent,
  DosAuthMfaCardComponent,
  DosAuthLanguageToggleComponent,
  DosAuthSecurityNoteComponent,
  DosAuthHelpComponent,
} from './auth-components';
import type { AuthEvent } from './auth.contract';

@Component({
  selector: 'dos-auth-login-page',
  standalone: true,
  imports: [
    CommonModule,
    DosAuthShellComponent, DosAuthBrandPanelComponent, DosAuthLoginCardComponent,
    DosAuthLanguageToggleComponent, DosAuthSecurityNoteComponent, DosAuthHelpComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-auth-shell pageKey="auth.login.page" [locale]="locale">
      <dos-auth-brand-panel [title]="brandTitle" [promise]="brandPromise" [locale]="locale">
        <dos-auth-security-note [message]="securityMessage" />
      </dos-auth-brand-panel>
      <section class="dos-auth-right">
        <header class="dos-auth-right-head">
          <dos-auth-language-toggle [locale]="locale" (event)="event.emit($event)" />
        </header>
        <dos-auth-login-card (event)="event.emit($event)" />
        <dos-auth-help [items]="helpItems" />
      </section>
    </dos-auth-shell>
  `,
  styles: [`
    .dos-auth-right { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); }
    .dos-auth-right-head { display: flex; justify-content: flex-end; }
  `],
})
export class DosAuthLoginPageComponent {
  @Input() locale: 'en' | 'ar' = 'en';
  @Input() brandTitle = 'Shahin-AI';
  @Input() brandPromise = 'AI-native GRC for the GCC.';
  @Input() securityMessage = 'TLS 1.3 in transit · AES-256 at rest · audit-logged.';
  @Input() helpItems: ReadonlyArray<{ q: string; a: string }> = [
    { q: 'I do not have an account', a: 'Reach out to your workspace admin or register a new workspace.' },
    { q: 'Forgot password?',         a: 'Use the recovery link from the sign-in card.' },
  ];
  @Output() readonly event = new EventEmitter<AuthEvent<unknown>>();
}

@Component({
  selector: 'dos-auth-register-page',
  standalone: true,
  imports: [
    CommonModule,
    DosAuthShellComponent, DosAuthBrandPanelComponent, DosAuthRegisterCardComponent,
    DosAuthLanguageToggleComponent, DosAuthSecurityNoteComponent, DosAuthHelpComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-auth-shell pageKey="auth.register.page" [locale]="locale">
      <dos-auth-brand-panel [title]="brandTitle" [promise]="brandPromise" [locale]="locale">
        <dos-auth-security-note [message]="securityMessage" />
      </dos-auth-brand-panel>
      <section class="dos-auth-right">
        <header class="dos-auth-right-head">
          <dos-auth-language-toggle [locale]="locale" (event)="event.emit($event)" />
        </header>
        <dos-auth-register-card (event)="event.emit($event)" />
        <dos-auth-help [items]="helpItems" />
      </section>
    </dos-auth-shell>
  `,
  styles: [`
    .dos-auth-right { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); }
    .dos-auth-right-head { display: flex; justify-content: flex-end; }
  `],
})
export class DosAuthRegisterPageComponent {
  @Input() locale: 'en' | 'ar' = 'en';
  @Input() brandTitle = 'Create your workspace';
  @Input() brandPromise = 'Bring AI governance online in minutes.';
  @Input() securityMessage = 'Your data stays in-region. PDPL aligned.';
  @Input() helpItems: ReadonlyArray<{ q: string; a: string }> = [
    { q: 'How long does setup take?',     a: 'Most teams are productive within 30 minutes.' },
    { q: 'Can I migrate later?',          a: 'Yes — workspace settings can change anytime.' },
  ];
  @Output() readonly event = new EventEmitter<AuthEvent<unknown>>();
}

@Component({
  selector: 'dos-auth-forgot-password-page',
  standalone: true,
  imports: [
    CommonModule,
    DosAuthShellComponent, DosAuthBrandPanelComponent, DosAuthForgotPasswordCardComponent,
    DosAuthLanguageToggleComponent, DosAuthSecurityNoteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-auth-shell pageKey="auth.forgot-password.page" [locale]="locale">
      <dos-auth-brand-panel [title]="brandTitle" [promise]="brandPromise" [locale]="locale">
        <dos-auth-security-note [message]="securityMessage" />
      </dos-auth-brand-panel>
      <section class="dos-auth-right">
        <header class="dos-auth-right-head">
          <dos-auth-language-toggle [locale]="locale" (event)="event.emit($event)" />
        </header>
        <dos-auth-forgot-password-card (event)="event.emit($event)" />
      </section>
    </dos-auth-shell>
  `,
  styles: [`
    .dos-auth-right { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); }
    .dos-auth-right-head { display: flex; justify-content: flex-end; }
  `],
})
export class DosAuthForgotPasswordPageComponent {
  @Input() locale: 'en' | 'ar' = 'en';
  @Input() brandTitle = 'Account recovery';
  @Input() brandPromise = 'We will send a one-time recovery link.';
  @Input() securityMessage = 'Recovery links expire after 15 minutes.';
  @Output() readonly event = new EventEmitter<AuthEvent<unknown>>();
}

@Component({
  selector: 'dos-auth-mfa-page',
  standalone: true,
  imports: [
    CommonModule,
    DosAuthShellComponent, DosAuthBrandPanelComponent, DosAuthMfaCardComponent,
    DosAuthLanguageToggleComponent, DosAuthSecurityNoteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-auth-shell pageKey="auth.mfa.page" [locale]="locale">
      <dos-auth-brand-panel [title]="brandTitle" [promise]="brandPromise" [locale]="locale">
        <dos-auth-security-note [message]="securityMessage" />
      </dos-auth-brand-panel>
      <section class="dos-auth-right">
        <header class="dos-auth-right-head">
          <dos-auth-language-toggle [locale]="locale" (event)="event.emit($event)" />
        </header>
        <dos-auth-mfa-card [method]="method" (event)="event.emit($event)" />
      </section>
    </dos-auth-shell>
  `,
  styles: [`
    .dos-auth-right { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); }
    .dos-auth-right-head { display: flex; justify-content: flex-end; }
  `],
})
export class DosAuthMfaPageComponent {
  @Input() locale: 'en' | 'ar' = 'en';
  @Input() brandTitle = 'Two-factor verification';
  @Input() brandPromise = 'A second factor protects your workspace.';
  @Input() securityMessage = 'Codes are time-bound and never reused.';
  @Input() method: 'totp' | 'sms' | 'email' | 'backup' = 'totp';
  @Output() readonly event = new EventEmitter<AuthEvent<unknown>>();
}

@Component({
  selector: 'dos-auth-reset-password-page',
  standalone: true,
  imports: [
    CommonModule,
    DosAuthShellComponent, DosAuthBrandPanelComponent, DosAuthResetPasswordCardComponent,
    DosAuthLanguageToggleComponent, DosAuthSecurityNoteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-auth-shell pageKey="auth.reset-password.page" [locale]="locale">
      <dos-auth-brand-panel [title]="brandTitle" [promise]="brandPromise" [locale]="locale">
        <dos-auth-security-note [message]="securityMessage" />
      </dos-auth-brand-panel>
      <section class="dos-auth-right">
        <header class="dos-auth-right-head">
          <dos-auth-language-toggle [locale]="locale" (event)="event.emit($event)" />
        </header>
        <dos-auth-reset-password-card (event)="event.emit($event)" />
      </section>
    </dos-auth-shell>
  `,
  styles: [`
    .dos-auth-right { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); }
    .dos-auth-right-head { display: flex; justify-content: flex-end; }
  `],
})
export class DosAuthResetPasswordPageComponent {
  @Input() locale: 'en' | 'ar' = 'en';
  @Input() brandTitle = 'Set a new password';
  @Input() brandPromise = 'Pick something only you would know.';
  @Input() securityMessage = 'Old passwords are invalidated immediately.';
  @Output() readonly event = new EventEmitter<AuthEvent<unknown>>();
}
