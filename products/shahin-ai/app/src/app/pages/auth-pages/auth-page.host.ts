import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  DosAuthLoginPageComponent,
  DosAuthRegisterPageComponent,
  DosAuthForgotPasswordPageComponent,
  DosAuthMfaPageComponent,
  DosAuthResetPasswordPageComponent,
  type AuthEvent,
} from '@dos/ui-system';

/**
 * Phase M1.6 — SPA host for the 5 Carbon auth pages.
 *
 * Renders the page composer matching `route.data.authPage`. On
 * `auth.login.submitted` / `auth.register.submitted` / `auth.sso.requested`
 * it bridges to the existing OIDC flow by navigating to
 * `/api/auth/oidc/start?mode=...`. The auth-service then 302s to Keycloak
 * with PKCE.
 *
 * No localStorage. No fetch. Submit payloads are intentionally NOT POSTed
 * from the browser — they are forwarded to OIDC, which owns credential
 * exchange.
 */
@Component({
  selector: 'app-auth-page-host',
  standalone: true,
  imports: [
    DosAuthLoginPageComponent,
    DosAuthRegisterPageComponent,
    DosAuthForgotPasswordPageComponent,
    DosAuthMfaPageComponent,
    DosAuthResetPasswordPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (page) {
      @case ('login') {
        <dos-auth-login-page (event)="onAuth($event)" />
      }
      @case ('register') {
        <dos-auth-register-page (event)="onAuth($event)" />
      }
      @case ('forgot-password') {
        <dos-auth-forgot-password-page (event)="onAuth($event)" />
      }
      @case ('mfa') {
        <dos-auth-mfa-page (event)="onAuth($event)" />
      }
      @case ('reset-password') {
        <dos-auth-reset-password-page (event)="onAuth($event)" />
      }
    }
  `,
  styles: [`:host { display: block; min-height: 100vh; background: var(--cds-background, #f4f4f4); }`],
})
export class AuthPageHostComponent {
  private readonly route = inject(ActivatedRoute);
  readonly page: 'login' | 'register' | 'forgot-password' | 'mfa' | 'reset-password' =
    (this.route.snapshot.data['authPage'] ?? 'login') as
      | 'login' | 'register' | 'forgot-password' | 'mfa' | 'reset-password';

  onAuth(ev: AuthEvent<unknown>): void {
    if (ev.key === 'auth.login.submitted' || ev.key === 'auth.sso.requested') {
      window.location.href = '/api/auth/oidc/start?mode=login';
      return;
    }
    if (ev.key === 'auth.register.submitted') {
      window.location.href = '/api/auth/oidc/start?mode=register';
      return;
    }
  }
}
