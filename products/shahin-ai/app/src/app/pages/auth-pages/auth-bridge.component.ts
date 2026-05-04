import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DosBrandEagleComponent } from '@dos/ui-system';

/**
 * Phase M1.6.1 — OIDC Bridge Page.
 *
 * Replaces the SPA-side login/register form with a thin bridge:
 *   - brand mark
 *   - one-line security note
 *   - single primary Carbon-styled button → /api/auth/oidc/start?mode=...
 *   - secondary link to the opposite mode
 *
 * Keycloak (realm `dogan`) owns ALL credential entry. The SPA must NEVER
 * collect username/password — that violates the M1.6 OIDC-first contract
 * (no localStorage, no client-side credential POST).
 */
@Component({
  selector: 'app-auth-bridge',
  standalone: true,
  imports: [DosBrandEagleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-auth-bridge" [attr.data-mode]="mode">
      <section class="dos-auth-bridge-card" data-cds-component="tile">
        <div class="dos-auth-bridge-brand">
          <dos-brand-eagle brandCode="shahin-ai" locale="en" [size]="48" />
          <strong class="dos-auth-bridge-wordmark">Shahin-AI</strong>
        </div>

        <h1 class="dos-auth-bridge-title">{{ titleFor(mode) }}</h1>
        <p class="dos-auth-bridge-sub">{{ subFor(mode) }}</p>

        <p class="dos-auth-bridge-security">
          TLS 1.3 in transit · AES-256 at rest · audit-logged · single sign-on.
        </p>

        @if (errorCode) {
          <p class="dos-auth-bridge-alert" role="alert" aria-live="polite">
            {{ errorMessage(errorCode) }}
          </p>
        }

        <a
          class="dos-auth-bridge-cta"
          data-cds-component="button"
          data-kind="primary"
          [href]="ctaHref()"
          rel="nofollow"
        >
          {{ ctaLabelFor(mode) }}
        </a>

        <p class="dos-auth-bridge-alt">
          @if (mode === 'login') {
            New to Shahin-AI?
            <a href="/register">Create an account</a>
          } @else {
            Already have an account?
            <a href="/login">Sign in</a>
          }
        </p>

        <p class="dos-auth-bridge-help">
          Trouble signing in? <a href="mailto:support&#64;dogan-ai.com">Contact support</a>.
        </p>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--cds-background, #f4f4f4); }
    .dos-auth-bridge {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      box-sizing: border-box;
    }
    .dos-auth-bridge-card {
      max-inline-size: 28rem;
      inline-size: 100%;
      background: var(--cds-layer, #ffffff);
      padding: 2.5rem 2rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
      border-radius: 0;
      display: grid;
      gap: 1rem;
    }
    .dos-auth-bridge-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-block-end: 0.5rem;
    }
    .dos-auth-bridge-wordmark {
      font-weight: 600;
      font-size: 1.125rem;
      letter-spacing: 0.02em;
    }
    .dos-auth-bridge-title {
      font-size: 1.5rem;
      line-height: 1.2;
      margin: 0;
    }
    .dos-auth-bridge-sub {
      font-size: 0.9375rem;
      color: var(--cds-text-secondary, #525252);
      margin: 0;
    }
    .dos-auth-bridge-security {
      font-size: 0.75rem;
      color: var(--cds-text-helper, #6f6f6f);
      margin: 0.5rem 0 0;
      padding: 0.5rem 0.75rem;
      background: var(--cds-layer-accent, #e8e8e8);
      border-inline-start: 2px solid var(--cds-border-strong, #8d8d8d);
    }
    .dos-auth-bridge-alert {
      margin: 0;
      padding: 0.75rem 1rem;
      background: var(--cds-support-error-inverse, #da1e28);
      color: var(--cds-text-on-color, #ffffff);
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .dos-auth-bridge-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-block-size: 48px;
      padding: 0.75rem 1rem;
      background: var(--cds-button-primary, #0f62fe);
      color: var(--cds-text-on-color, #ffffff);
      text-decoration: none;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 0;
      transition: background-color 70ms ease;
    }
    .dos-auth-bridge-cta:hover { background: var(--cds-button-primary-hover, #0050e6); }
    .dos-auth-bridge-cta:active { background: var(--cds-button-primary-active, #002d9c); }
    .dos-auth-bridge-alt,
    .dos-auth-bridge-help {
      font-size: 0.875rem;
      color: var(--cds-text-secondary, #525252);
      margin: 0;
    }
    .dos-auth-bridge-alt a,
    .dos-auth-bridge-help a {
      color: var(--cds-link-primary, #0f62fe);
      text-decoration: none;
    }
    .dos-auth-bridge-alt a:hover,
    .dos-auth-bridge-help a:hover { text-decoration: underline; }
    @media (max-width: 430px) {
      .dos-auth-bridge { padding: 1rem; }
      .dos-auth-bridge-card { padding: 1.75rem 1.25rem; }
      .dos-auth-bridge-title { font-size: 1.25rem; }
    }
  `],
})
export class AuthBridgeComponent {
  private readonly route = inject(ActivatedRoute);
  readonly mode: 'login' | 'register' =
    (this.route.snapshot.data['authMode'] ?? 'login') as 'login' | 'register';
  readonly errorCode = this.route.snapshot.queryParamMap.get('error');

  ctaHref(): string {
    return `/api/auth/oidc/start?mode=${this.mode}`;
  }

  titleFor(mode: 'login' | 'register'): string {
    return mode === 'login' ? 'Sign in to Shahin-AI' : 'Create your Shahin-AI workspace';
  }

  subFor(mode: 'login' | 'register'): string {
    return mode === 'login'
      ? 'Continue with single sign-on. Your credentials never touch this page.'
      : 'Provision a governed AI workspace in minutes. SSO-only enrollment.';
  }

  ctaLabelFor(mode: 'login' | 'register'): string {
    return mode === 'login'
      ? 'Continue with Shahin-AI SSO'
      : 'Continue to create account';
  }

  errorMessage(code: string): string {
    switch (code) {
      case 'NO_USER':
        return 'No Shahin-AI workspace account exists for this identity yet. Use account creation or contact your administrator.';
      case 'NO_MEMBERSHIP':
        return 'Your identity is authenticated, but it is not assigned to a workspace. Contact your administrator or retry account creation.';
      case 'ORG_NAME_REQUIRED':
        return 'Workspace provisioning could not complete because the organization name was missing from the identity response. Retry registration or contact support.';
      default:
        return 'Shahin-AI could not complete sign-in. Retry the flow or contact support if the problem persists.';
    }
  }
}
