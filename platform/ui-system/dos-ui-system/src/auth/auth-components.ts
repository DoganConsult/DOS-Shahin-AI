/**
 * Phase M1.6 — Carbon Auth Pages Pack — primitive components.
 *
 * 11 standalone Angular components, OnPush, Carbon attribute hooks
 * (data-cds-component="…"). NO local executor: every interactive
 * component emits an AuthEvent for the host shell to forward to the
 * OIDC backend. NO localStorage. NO PrimeNG / Material / Translate.
 *
 * Carbon mapping per component_key is enforced by migration
 * 20260503_0028_auth_pages_pack.sql.
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  type AuthEvent,
  type AuthLoginPayload,
  type AuthRegisterPayload,
  type AuthForgotPasswordPayload,
  type AuthResetPasswordPayload,
  type AuthMfaPayload,
  type AuthSsoRequest,
  type AuthState,
} from './auth.contract';

function nowIso(): string { return new Date().toISOString(); }

// ═════════════════════════════════════════════════════════════════════
// 1. <dos-auth-shell> — Carbon Grid wrapper (split-on-desktop, single
//                       column on mobile per the spec).
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-shell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="dos-auth-shell"
      data-cds-component="grid"
      [attr.data-page-key]="pageKey"
      [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'"
    >
      <ng-content></ng-content>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; container-type: inline-size; }
    .dos-auth-shell {
      display: grid; grid-template-columns: 1fr 1fr;
      min-height: 100vh; background: var(--dos-color-bg, #f4f4f4);
    }
    @container (max-width: 720px) {
      .dos-auth-shell { grid-template-columns: 1fr; }
    }
  `],
})
export class DosAuthShellComponent {
  @Input() pageKey = 'auth.login.page';
  @Input() locale: 'en' | 'ar' = 'en';
}

// ═════════════════════════════════════════════════════════════════════
// 2. <dos-auth-brand-panel> — left brand pillar (Carbon Tile background).
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-brand-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="dos-auth-brand-panel"
      data-cds-component="tile"
      [attr.data-locale]="locale"
    >
      <h1 class="dos-auth-brand-title">{{ title }}</h1>
      <p class="dos-auth-brand-promise">{{ promise }}</p>
      <ng-content></ng-content>
    </aside>
  `,
  styles: [`
    :host { display: contents; }
    .dos-auth-brand-panel {
      padding: var(--dos-space-6, 2rem);
      display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem);
      background: var(--dos-color-bg-inverse, #161616);
      color: var(--dos-color-text-on-inverse, #f4f4f4);
    }
    .dos-auth-brand-title { font-size: 2rem; margin: 0; }
    .dos-auth-brand-promise { margin: 0; opacity: 0.85; }
    @container (max-width: 720px) {
      .dos-auth-brand-panel { padding: var(--dos-space-4, 1rem); }
      .dos-auth-brand-title { font-size: 1.25rem; }
    }
  `],
})
export class DosAuthBrandPanelComponent {
  @Input() title = 'Shahin-AI';
  @Input() promise = 'AI-native GRC for the GCC.';
  @Input() locale: 'en' | 'ar' = 'en';
}

// ═════════════════════════════════════════════════════════════════════
// 3. <dos-auth-field> — Carbon TextInput single-row form field.
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="dos-auth-field" data-cds-component="input">
      <span class="dos-auth-field-label">{{ label }}</span>
      <input
        [type]="type"
        [name]="name"
        [attr.autocomplete]="autocomplete"
        [attr.inputmode]="inputmode"
        [attr.aria-invalid]="invalid ? 'true' : null"
        [(ngModel)]="value"
        (ngModelChange)="valueChange.emit($event)"
        [required]="required"
      />
      @if (helper) { <small class="dos-auth-field-helper">{{ helper }}</small> }
      @if (invalid && errorMessage) {
        <small class="dos-auth-field-error" role="alert">{{ errorMessage }}</small>
      }
    </label>
  `,
  styles: [`
    :host { display: block; }
    .dos-auth-field { display: grid; gap: 0.25rem; }
    .dos-auth-field-label { font-weight: 500; }
    .dos-auth-field-helper { color: var(--dos-color-text-secondary, #525252); }
    .dos-auth-field-error  { color: var(--dos-color-text-error, #da1e28); }
    input { padding: 0.5rem; min-height: 40px; }
  `],
})
export class DosAuthFieldComponent {
  @Input() name = '';
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'tel' = 'text';
  @Input() autocomplete: string | null = null;
  @Input() inputmode: string | null = null;
  @Input() required = false;
  @Input() helper = '';
  @Input() invalid = false;
  @Input() errorMessage = '';
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
}

// ═════════════════════════════════════════════════════════════════════
// 4. <dos-auth-password-field> — Carbon PasswordInput equivalent (with
//    show/hide toggle as a real <button>).
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-password-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="dos-auth-pw" data-cds-component="input" data-kind="password">
      <span class="dos-auth-pw-label">{{ label }}</span>
      <span class="dos-auth-pw-row">
        <input
          [type]="reveal() ? 'text' : 'password'"
          [name]="name"
          [attr.autocomplete]="autocomplete"
          [attr.aria-invalid]="invalid ? 'true' : null"
          [(ngModel)]="value"
          (ngModelChange)="valueChange.emit($event)"
          [required]="required"
        />
        <button
          type="button"
          data-cds-component="button"
          data-kind="ghost"
          [attr.aria-pressed]="reveal()"
          [attr.aria-label]="reveal() ? hideLabel : showLabel"
          (click)="reveal.set(!reveal())"
        >{{ reveal() ? hideLabel : showLabel }}</button>
      </span>
      @if (helper) { <small class="dos-auth-pw-helper">{{ helper }}</small> }
      @if (invalid && errorMessage) {
        <small class="dos-auth-pw-error" role="alert">{{ errorMessage }}</small>
      }
    </label>
  `,
  styles: [`
    :host { display: block; }
    .dos-auth-pw { display: grid; gap: 0.25rem; }
    .dos-auth-pw-row { display: flex; gap: 0.25rem; }
    .dos-auth-pw-row input { flex: 1; padding: 0.5rem; min-height: 40px; }
    .dos-auth-pw-error { color: var(--dos-color-text-error, #da1e28); }
  `],
})
export class DosAuthPasswordFieldComponent {
  @Input() name = 'password';
  @Input() label = 'Password';
  @Input() autocomplete: 'current-password' | 'new-password' = 'current-password';
  @Input() required = true;
  @Input() helper = '';
  @Input() invalid = false;
  @Input() errorMessage = '';
  @Input() showLabel = 'Show';
  @Input() hideLabel = 'Hide';
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
  readonly reveal = signal(false);
}

// ═════════════════════════════════════════════════════════════════════
// 5. <dos-auth-checkbox>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="dos-auth-cb" data-cds-component="checkbox">
      <input type="checkbox" [name]="name" [(ngModel)]="checked"
             (ngModelChange)="checkedChange.emit($event)" [required]="required" />
      <span>{{ label }}</span>
    </label>
  `,
  styles: [`
    .dos-auth-cb { display: flex; gap: 0.5rem; align-items: center; }
  `],
})
export class DosAuthCheckboxComponent {
  @Input() name = '';
  @Input() label = '';
  @Input() required = false;
  @Input() checked = false;
  @Output() readonly checkedChange = new EventEmitter<boolean>();
}

// ═════════════════════════════════════════════════════════════════════
// 6. <dos-auth-dropdown>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="dos-auth-dd" data-cds-component="dropdown">
      <span>{{ label }}</span>
      <select [name]="name" [(ngModel)]="value" (ngModelChange)="valueChange.emit($event)" [required]="required">
        @for (o of options; track o) { <option [value]="o">{{ o }}</option> }
      </select>
    </label>
  `,
  styles: [`
    .dos-auth-dd { display: grid; gap: 0.25rem; }
    .dos-auth-dd select { padding: 0.5rem; min-height: 40px; }
  `],
})
export class DosAuthDropdownComponent {
  @Input() name = '';
  @Input() label = '';
  @Input() options: ReadonlyArray<string> = [];
  @Input() required = false;
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();
}

// ═════════════════════════════════════════════════════════════════════
// 7. <dos-auth-submit> — Carbon Button + InlineLoading.
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-submit',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dos-auth-submit-row">
      <button
        type="submit"
        data-cds-component="button"
        data-kind="primary"
        [disabled]="state === 'submitting'"
      >
        @if (state === 'submitting') {
          <span data-cds-component="inline-loading">{{ submittingLabel }}</span>
        } @else {
          {{ label }}
        }
      </button>
    </span>
  `,
  styles: [`
    .dos-auth-submit-row { display: block; }
    button { width: 100%; min-height: 48px; padding: 0.75rem 1rem; }
  `],
})
export class DosAuthSubmitComponent {
  @Input() label = 'Submit';
  @Input() submittingLabel = 'Submitting…';
  @Input() state: AuthState = 'idle';
}

// ═════════════════════════════════════════════════════════════════════
// 8. <dos-auth-sso-actions> — vertical stack of SSO Carbon Buttons.
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-sso-actions',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-auth-sso">
      @for (p of providers; track p) {
        <button
          type="button"
          data-cds-component="button"
          data-kind="tertiary"
          [attr.data-provider]="p"
          (click)="onClick(p)"
        >{{ providerLabel(p) }}</button>
      }
    </div>
  `,
  styles: [`
    .dos-auth-sso { display: grid; gap: 0.5rem; }
    button { min-height: 48px; }
  `],
})
export class DosAuthSsoActionsComponent {
  @Input() providers: ReadonlyArray<AuthSsoRequest['provider']> = ['oidc'];
  @Output() readonly event = new EventEmitter<AuthEvent<AuthSsoRequest>>();
  providerLabel(p: string) {
    const map: Record<string, string> = {
      oidc: 'Continue with SSO', saml: 'Continue with SAML',
      google: 'Continue with Google', microsoft: 'Continue with Microsoft',
      apple: 'Continue with Apple',
    };
    return map[p] ?? p;
  }
  onClick(provider: AuthSsoRequest['provider']) {
    this.event.emit({ key: 'auth.sso.requested', occurredAt: nowIso(), payload: { provider } });
  }
}

// ═════════════════════════════════════════════════════════════════════
// 9. <dos-auth-notification> — Carbon InlineNotification.
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-notification',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message) {
      <div
        data-cds-component="notification"
        [attr.data-kind]="kind"
        [attr.role]="kind === 'error' ? 'alert' : 'status'"
      >{{ message }}</div>
    }
  `,
})
export class DosAuthNotificationComponent {
  @Input() message = '';
  @Input() kind: 'error' | 'success' | 'warning' | 'info' = 'error';
}

// ═════════════════════════════════════════════════════════════════════
// 10. <dos-auth-progress> — Carbon ProgressIndicator (vertical on mobile).
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-progress',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol
      class="dos-auth-progress"
      data-cds-component="progress-indicator"
      [attr.data-orientation]="orientation"
      role="list"
    >
      @for (s of steps; track s; let i = $index) {
        <li
          [attr.data-step-index]="i"
          [attr.aria-current]="i === current ? 'step' : null"
          [attr.data-state]="i < current ? 'complete' : (i === current ? 'current' : 'incomplete')"
        >{{ s }}</li>
      }
    </ol>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; }
    .dos-auth-progress { list-style: none; padding: 0; margin: 0; display: flex; gap: 0.5rem; }
    @container (max-width: 480px) {
      .dos-auth-progress { flex-direction: column; }
    }
  `],
})
export class DosAuthProgressComponent {
  @Input() steps: ReadonlyArray<string> = [];
  @Input() current = 0;
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
}

// ═════════════════════════════════════════════════════════════════════
// 11. <dos-auth-language-toggle>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-language-toggle',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      data-cds-component="button"
      data-kind="ghost"
      (click)="toggle()"
    >{{ locale === 'ar' ? 'English' : 'العربية' }}</button>
  `,
})
export class DosAuthLanguageToggleComponent {
  @Input() locale: 'en' | 'ar' = 'en';
  @Output() readonly event = new EventEmitter<AuthEvent<{ locale: 'en' | 'ar' }>>();
  toggle() {
    const next: 'en' | 'ar' = this.locale === 'ar' ? 'en' : 'ar';
    this.event.emit({ key: 'auth.locale.changed', occurredAt: nowIso(), payload: { locale: next } });
  }
}

// ═════════════════════════════════════════════════════════════════════
// 12. <dos-auth-security-note>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-security-note',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="dos-auth-sec" data-cds-component="tile">{{ message }}</p>
  `,
  styles: [`
    .dos-auth-sec { padding: 0.5rem 0.75rem; color: var(--dos-color-text-secondary, #525252); font-size: 0.875rem; }
  `],
})
export class DosAuthSecurityNoteComponent {
  @Input() message = 'Your session is encrypted in transit and at rest.';
}

// ═════════════════════════════════════════════════════════════════════
// 13. <dos-auth-help> — Carbon Accordion FAQ.
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-help',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-auth-help" data-cds-component="accordion">
      @for (item of items; track item.q) {
        <details>
          <summary>{{ item.q }}</summary>
          <p>{{ item.a }}</p>
        </details>
      }
    </section>
  `,
})
export class DosAuthHelpComponent {
  @Input() items: ReadonlyArray<{ q: string; a: string }> = [];
}

// ═════════════════════════════════════════════════════════════════════
// 14. <dos-auth-skeleton>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div data-cds-component="skeleton" aria-hidden="true"></div>`,
  styles: [`
    div { height: 1rem; background: linear-gradient(90deg,#e0e0e0,#f4f4f4,#e0e0e0); border-radius: 4px; }
  `],
})
export class DosAuthSkeletonComponent {}

// ═════════════════════════════════════════════════════════════════════
// 15. <dos-auth-login-card>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-login-card',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DosAuthFieldComponent, DosAuthPasswordFieldComponent,
    DosAuthCheckboxComponent, DosAuthSubmitComponent,
    DosAuthSsoActionsComponent, DosAuthNotificationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-login-card" data-cds-component="tile" [attr.data-page-key]="'auth.login.page'">
      <header>
        <h2>{{ headline }}</h2>
        <p>{{ subheadline }}</p>
      </header>
      <form (ngSubmit)="onSubmit()" novalidate>
        <dos-auth-field
          name="email" type="email" autocomplete="email" inputmode="email"
          [label]="emailLabel" [(value)]="form.email" [required]="true"
          [invalid]="invalidEmail" [errorMessage]="emailError"
        />
        <dos-auth-password-field
          name="password" autocomplete="current-password"
          [label]="passwordLabel" [(value)]="form.password" [required]="true"
          [invalid]="invalidPassword" [errorMessage]="passwordError"
        />
        <dos-auth-checkbox
          name="rememberMe" [label]="rememberMeLabel"
          [(checked)]="form.rememberMe"
        />
        <dos-auth-notification [message]="errorMessage()" kind="error" />
        <dos-auth-submit [label]="submitLabel" [state]="state()" />
        <dos-auth-sso-actions [providers]="ssoProviders" (event)="event.emit($event)" />
        <p class="dos-login-card-links">
          <a [href]="forgotPasswordHref">{{ forgotPasswordLabel }}</a>
          <a [href]="registerHref">{{ registerLabel }}</a>
        </p>
      </form>
    </article>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; }
    .dos-login-card { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); background: var(--dos-color-surface, #fff); }
    form { display: grid; gap: var(--dos-space-3, 0.75rem); }
    .dos-login-card-links { display: flex; gap: 1rem; justify-content: space-between; }
    @container (max-width: 480px) {
      .dos-login-card { padding: var(--dos-space-4, 1rem); }
    }
  `],
})
export class DosAuthLoginCardComponent {
  @Input() headline = 'Sign in to Shahin-AI';
  @Input() subheadline = 'Access your governed AI workspace.';
  @Input() emailLabel = 'Work email';
  @Input() passwordLabel = 'Password';
  @Input() rememberMeLabel = 'Remember me';
  @Input() submitLabel = 'Sign in';
  @Input() forgotPasswordLabel = 'Forgot password?';
  @Input() registerLabel = 'Create an account';
  @Input() forgotPasswordHref = '/forgot-password';
  @Input() registerHref = '/register';
  @Input() ssoProviders: ReadonlyArray<AuthSsoRequest['provider']> = ['oidc'];
  @Input() invalidEmail = false;
  @Input() invalidPassword = false;
  @Input() emailError = '';
  @Input() passwordError = '';

  @Output() readonly event = new EventEmitter<AuthEvent<AuthLoginPayload>>();

  readonly form: AuthLoginPayload = { email: '', password: '', rememberMe: false };
  readonly state = signal<AuthState>('idle');
  readonly errorMessage = signal<string>('');

  onSubmit() {
    this.errorMessage.set('');
    if (!this.form.email || !this.form.password) {
      this.state.set('invalid');
      this.errorMessage.set('Please enter both email and password.');
      return;
    }
    this.state.set('submitting');
    this.event.emit({
      key: 'auth.login.submitted',
      occurredAt: nowIso(),
      payload: { ...this.form },
    });
  }
  /** Host shell calls this when OIDC backend succeeded / failed. */
  markCompleted(success: boolean, message = '') {
    this.state.set(success ? 'success' : 'error');
    this.errorMessage.set(success ? '' : message);
  }
  markMfaRequired() { this.state.set('mfa-required'); }
}

// ═════════════════════════════════════════════════════════════════════
// 16. <dos-auth-register-card>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-register-card',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    DosAuthFieldComponent, DosAuthPasswordFieldComponent,
    DosAuthDropdownComponent, DosAuthCheckboxComponent,
    DosAuthSubmitComponent, DosAuthNotificationComponent,
    DosAuthProgressComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-register-card" data-cds-component="tile" [attr.data-page-key]="'auth.register.page'">
      <header>
        <h2>{{ headline }}</h2>
        <p>{{ subheadline }}</p>
      </header>

      <dos-auth-progress [steps]="steps" [current]="currentStep()" />

      <form (ngSubmit)="onContinue()" novalidate>
        @switch (currentStep()) {
          @case (0) {
            <dos-auth-field name="fullName" type="text" autocomplete="name"
                            [label]="labelFullName" [(value)]="form.fullName" [required]="true" />
            <dos-auth-field name="email" type="email" autocomplete="email" inputmode="email"
                            [label]="labelEmail" [(value)]="form.email" [required]="true" />
            <dos-auth-password-field name="password" autocomplete="new-password"
                            [label]="labelPassword" [(value)]="form.password" [required]="true" />
          }
          @case (1) {
            <dos-auth-field name="company" type="text" autocomplete="organization"
                            [label]="labelCompany" [(value)]="form.company" [required]="true" />
            <dos-auth-field name="jobTitle" type="text" autocomplete="organization-title"
                            [label]="labelJobTitle" [(value)]="form.jobTitle!" />
            <dos-auth-dropdown name="companySize" [label]="labelCompanySize"
                            [options]="companySizes" [(value)]="form.companySize!" />
          }
          @case (2) {
            <dos-auth-dropdown name="country" [label]="labelCountry"
                            [options]="countries" [(value)]="form.country" [required]="true" />
            <dos-auth-dropdown name="industry" [label]="labelIndustry"
                            [options]="industries" [(value)]="form.industry!" />
            <dos-auth-dropdown name="regulatoryScope" [label]="labelRegulatoryScope"
                            [options]="regulatoryScopes" [(value)]="form.regulatoryScope!" />
          }
          @case (3) {
            <dl class="dos-register-review">
              <dt>{{ labelFullName }}</dt><dd>{{ form.fullName }}</dd>
              <dt>{{ labelEmail }}</dt><dd>{{ form.email }}</dd>
              <dt>{{ labelCompany }}</dt><dd>{{ form.company }}</dd>
              <dt>{{ labelCountry }}</dt><dd>{{ form.country }}</dd>
            </dl>
            <dos-auth-checkbox name="acceptedTerms" [label]="labelAcceptTerms"
                               [(checked)]="form.acceptedTerms" [required]="true" />
          }
        }
        <dos-auth-notification [message]="errorMessage()" kind="error" />
        <span class="dos-register-card-actions">
          <button type="button" data-cds-component="button" data-kind="tertiary"
                  [disabled]="currentStep() === 0" (click)="onBack()">{{ backLabel }}</button>
          <dos-auth-submit
            [label]="currentStep() === steps.length - 1 ? submitLabel : continueLabel"
            [state]="state()" />
        </span>
        <p class="dos-register-card-links">
          <a [href]="loginHref">{{ loginLabel }}</a>
        </p>
      </form>
    </article>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; }
    .dos-register-card { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); background: var(--dos-color-surface, #fff); }
    form { display: grid; gap: var(--dos-space-3, 0.75rem); }
    .dos-register-card-actions { display: flex; gap: 0.5rem; }
    .dos-register-review dt { font-weight: 600; }
  `],
})
export class DosAuthRegisterCardComponent {
  @Input() headline = 'Create your workspace';
  @Input() subheadline = 'Onboard your team in 4 steps.';
  @Input() steps: ReadonlyArray<string> = ['Account', 'Company', 'Region', 'Review'];

  @Input() labelFullName = 'Full name';
  @Input() labelEmail = 'Work email';
  @Input() labelPassword = 'Password';
  @Input() labelCompany = 'Company';
  @Input() labelJobTitle = 'Job title';
  @Input() labelCompanySize = 'Company size';
  @Input() labelCountry = 'Country';
  @Input() labelIndustry = 'Industry';
  @Input() labelRegulatoryScope = 'Regulatory scope';
  @Input() labelAcceptTerms = 'I agree to the Terms of Service and Privacy Policy.';

  @Input() continueLabel = 'Continue';
  @Input() backLabel = 'Back';
  @Input() submitLabel = 'Create workspace';
  @Input() loginLabel = 'Already have an account? Sign in';
  @Input() loginHref = '/login';

  @Input() companySizes: ReadonlyArray<string> = ['1-10','11-50','51-200','201-1000','1000+'];
  @Input() countries: ReadonlyArray<string> = ['Saudi Arabia','UAE','Qatar','Kuwait','Bahrain','Oman','Other'];
  @Input() industries: ReadonlyArray<string> = ['Banking','Energy','Healthcare','Telecom','Government','Other'];
  @Input() regulatoryScopes: ReadonlyArray<string> = ['SAMA','NCA','SDAIA','PDPL','ISO 27001','SOC 2','Other'];

  @Output() readonly event = new EventEmitter<AuthEvent<AuthRegisterPayload | { step: number }>>();

  readonly form: AuthRegisterPayload = {
    fullName: '', email: '', password: '',
    company: '', jobTitle: '', companySize: '',
    country: '', industry: '', regulatoryScope: '',
    acceptedTerms: false,
  };
  readonly state = signal<AuthState>('idle');
  readonly errorMessage = signal<string>('');
  readonly currentStep = signal(0);

  onContinue() {
    this.errorMessage.set('');
    const step = this.currentStep();
    if (step === 0 && (!this.form.fullName || !this.form.email || !this.form.password)) {
      this.errorMessage.set('Please complete the account fields.'); return;
    }
    if (step === 1 && !this.form.company) {
      this.errorMessage.set('Please enter your company name.'); return;
    }
    if (step === 2 && !this.form.country) {
      this.errorMessage.set('Please pick your country.'); return;
    }
    if (step === this.steps.length - 1) {
      if (!this.form.acceptedTerms) { this.errorMessage.set('Please accept the terms.'); return; }
      this.state.set('submitting');
      this.event.emit({
        key: 'auth.register.submitted',
        occurredAt: nowIso(),
        payload: { ...this.form },
      });
      return;
    }
    const next = step + 1;
    this.currentStep.set(next);
    this.event.emit({ key: 'auth.register.step.changed', occurredAt: nowIso(), payload: { step: next } });
  }
  onBack() {
    const step = Math.max(0, this.currentStep() - 1);
    this.currentStep.set(step);
    this.event.emit({ key: 'auth.register.step.changed', occurredAt: nowIso(), payload: { step } });
  }
  markCompleted(success: boolean, message = '') {
    this.state.set(success ? 'success' : 'error');
    this.errorMessage.set(success ? '' : message);
  }
}

// ═════════════════════════════════════════════════════════════════════
// 17. <dos-auth-forgot-password-card>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-forgot-password-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DosAuthFieldComponent, DosAuthSubmitComponent, DosAuthNotificationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-fp-card" data-cds-component="tile" [attr.data-page-key]="'auth.forgot-password.page'">
      <header><h2>{{ headline }}</h2><p>{{ subheadline }}</p></header>
      <form (ngSubmit)="onSubmit()" novalidate>
        <dos-auth-field name="email" type="email" autocomplete="email" inputmode="email"
                        [label]="emailLabel" [(value)]="form.email" [required]="true" />
        <dos-auth-notification [message]="message()" [kind]="state() === 'success' ? 'success' : 'error'" />
        <dos-auth-submit [label]="submitLabel" [state]="state()" />
      </form>
    </article>
  `,
  styles: [`
    .dos-fp-card { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); background: var(--dos-color-surface, #fff); }
    form { display: grid; gap: var(--dos-space-3, 0.75rem); }
  `],
})
export class DosAuthForgotPasswordCardComponent {
  @Input() headline = 'Reset your password';
  @Input() subheadline = 'We will send you a recovery link.';
  @Input() emailLabel = 'Work email';
  @Input() submitLabel = 'Send recovery link';

  @Output() readonly event = new EventEmitter<AuthEvent<AuthForgotPasswordPayload>>();

  readonly form: AuthForgotPasswordPayload = { email: '' };
  readonly state = signal<AuthState>('idle');
  readonly message = signal<string>('');

  onSubmit() {
    if (!this.form.email) { this.state.set('invalid'); this.message.set('Email required.'); return; }
    this.state.set('submitting');
    this.event.emit({ key: 'auth.forgot-password.submitted', occurredAt: nowIso(), payload: { ...this.form } });
  }
  markCompleted(success: boolean, message = 'If the address exists, a link has been sent.') {
    this.state.set(success ? 'success' : 'error');
    this.message.set(message);
  }
}

// ═════════════════════════════════════════════════════════════════════
// 18. <dos-auth-reset-password-card>
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-reset-password-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DosAuthPasswordFieldComponent, DosAuthSubmitComponent, DosAuthNotificationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-rp-card" data-cds-component="tile" [attr.data-page-key]="'auth.reset-password.page'">
      <header><h2>{{ headline }}</h2><p>{{ subheadline }}</p></header>
      <form (ngSubmit)="onSubmit()" novalidate>
        <dos-auth-password-field name="newPassword" autocomplete="new-password"
                          [label]="newPasswordLabel" [(value)]="form.newPassword" [required]="true" />
        <dos-auth-password-field name="confirmPassword" autocomplete="new-password"
                          [label]="confirmPasswordLabel" [(value)]="form.confirmPassword" [required]="true" />
        <dos-auth-notification [message]="message()" kind="error" />
        <dos-auth-submit [label]="submitLabel" [state]="state()" />
      </form>
    </article>
  `,
  styles: [`
    .dos-rp-card { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); background: var(--dos-color-surface, #fff); }
    form { display: grid; gap: var(--dos-space-3, 0.75rem); }
  `],
})
export class DosAuthResetPasswordCardComponent {
  @Input() headline = 'Set a new password';
  @Input() subheadline = 'Your password must be at least 12 characters.';
  @Input() newPasswordLabel = 'New password';
  @Input() confirmPasswordLabel = 'Confirm password';
  @Input() submitLabel = 'Set password';

  @Output() readonly event = new EventEmitter<AuthEvent<AuthResetPasswordPayload>>();

  readonly form: AuthResetPasswordPayload = { newPassword: '', confirmPassword: '' };
  readonly state = signal<AuthState>('idle');
  readonly message = signal<string>('');

  onSubmit() {
    if (!this.form.newPassword || !this.form.confirmPassword) {
      this.state.set('invalid'); this.message.set('Both fields are required.'); return;
    }
    if (this.form.newPassword !== this.form.confirmPassword) {
      this.state.set('invalid'); this.message.set('Passwords do not match.'); return;
    }
    this.state.set('submitting');
    this.event.emit({ key: 'auth.reset-password.submitted', occurredAt: nowIso(), payload: { ...this.form } });
  }
  markCompleted(success: boolean, message = '') {
    this.state.set(success ? 'success' : 'error');
    this.message.set(success ? '' : message);
  }
}

// ═════════════════════════════════════════════════════════════════════
// 19. <dos-auth-mfa-card> — Carbon Modal-mode card (bottom-sheet on mobile).
// ═════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-auth-mfa-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DosAuthFieldComponent, DosAuthSubmitComponent, DosAuthNotificationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-mfa-card"
             data-cds-component="modal"
             [attr.data-mobile-mode]="'bottom-sheet'"
             [attr.data-page-key]="'auth.mfa.page'"
             role="dialog" aria-modal="true">
      <header><h2>{{ headline }}</h2><p>{{ subheadline }}</p></header>
      <form (ngSubmit)="onSubmit()" novalidate>
        <dos-auth-field name="code" type="tel" autocomplete="one-time-code" inputmode="numeric"
                        [label]="codeLabel" [(value)]="form.code" [required]="true" />
        <dos-auth-notification [message]="message()" kind="error" />
        <dos-auth-submit [label]="submitLabel" [state]="state()" />
      </form>
    </section>
  `,
  styles: [`
    :host { display: contents; container-type: inline-size; }
    .dos-mfa-card { padding: var(--dos-space-5, 1.5rem); display: grid; gap: var(--dos-space-3, 0.75rem); background: var(--dos-color-surface, #fff); }
    @container (max-width: 480px) {
      .dos-mfa-card { padding: var(--dos-space-4, 1rem); }
    }
  `],
})
export class DosAuthMfaCardComponent {
  @Input() headline = 'Verify it’s you';
  @Input() subheadline = 'Enter the 6-digit code from your authenticator.';
  @Input() codeLabel = 'Verification code';
  @Input() submitLabel = 'Verify';
  @Input() method: AuthMfaPayload['method'] = 'totp';

  @Output() readonly event = new EventEmitter<AuthEvent<AuthMfaPayload>>();

  readonly form: AuthMfaPayload = { code: '', method: 'totp' };
  readonly state = signal<AuthState>('idle');
  readonly message = signal<string>('');

  onSubmit() {
    if (!this.form.code) { this.state.set('invalid'); this.message.set('Code required.'); return; }
    this.state.set('submitting');
    this.event.emit({
      key: 'auth.mfa.submitted',
      occurredAt: nowIso(),
      payload: { code: this.form.code, method: this.method },
    });
  }
  markCompleted(success: boolean, message = '') {
    this.state.set(success ? 'success' : 'error');
    this.message.set(success ? '' : message);
  }
}
