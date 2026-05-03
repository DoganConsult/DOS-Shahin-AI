/**
 * Phase M1.6 — Carbon Auth Pages Pack contract.
 *
 * Source-of-truth for the 5 auth page keys + 16 auth.* component_keys.
 * Every key is Carbon-backed; the DB seed (20260503_0028) declares the
 * vendor/carbon_key mapping and is enforced by trg_carbon_only_runtime.
 *
 * Components NEVER call fetch / HttpClient. They emit AuthEvents for the
 * host shell (product-shell + auth-service) to execute. localStorage is
 * forbidden — session cookies remain owned by the OIDC backend.
 */

export const AUTH_PAGE_KEYS = [
  'auth.login.page',
  'auth.register.page',
  'auth.forgot-password.page',
  'auth.mfa.page',
  'auth.reset-password.page',
] as const;
export type AuthPageKey = (typeof AUTH_PAGE_KEYS)[number];

export const AUTH_COMPONENT_KEYS = [
  'auth.shell',
  'auth.brand-panel',
  'auth.login-card',
  'auth.register-card',
  'auth.forgot-password-card',
  'auth.reset-password-card',
  'auth.mfa-card',
  'auth.field',
  'auth.password-field',
  'auth.dropdown',
  'auth.checkbox',
  'auth.submit',
  'auth.sso-actions',
  'auth.notification',
  'auth.progress',
  'auth.help',
  'auth.language-toggle',
  'auth.security-note',
  'auth.skeleton',
] as const;
export type AuthComponentKey = (typeof AUTH_COMPONENT_KEYS)[number];

export const AUTH_EVENTS = [
  'auth.login.submitted',
  'auth.register.submitted',
  'auth.register.step.changed',
  'auth.forgot-password.submitted',
  'auth.reset-password.submitted',
  'auth.mfa.submitted',
  'auth.sso.requested',
  'auth.locale.changed',
] as const;
export type AuthEventKey = (typeof AUTH_EVENTS)[number];

export interface AuthEvent<TPayload = unknown> {
  key: AuthEventKey;
  occurredAt: string;
  payload?: TPayload;
}

export interface AuthLoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthRegisterPayload {
  // Step 1 — account
  fullName: string;
  email: string;
  password: string;
  // Step 2 — company
  company: string;
  jobTitle?: string;
  companySize?: string;
  // Step 3 — region/sector
  country: string;
  industry?: string;
  regulatoryScope?: string;
  // Step 4 — review
  acceptedTerms: boolean;
}

export interface AuthForgotPasswordPayload {
  email: string;
}

export interface AuthResetPasswordPayload {
  newPassword: string;
  confirmPassword: string;
  recoveryCode?: string;
}

export interface AuthMfaPayload {
  code: string;
  method: 'totp' | 'sms' | 'email' | 'backup';
}

export interface AuthSsoRequest {
  provider: 'oidc' | 'saml' | 'google' | 'microsoft' | 'apple';
}

export type AuthState =
  | 'idle'
  | 'submitting'
  | 'invalid'
  | 'error'
  | 'success'
  | 'mfa-required'
  | 'locked';

export function isAuthComponentKey(k: unknown): k is AuthComponentKey {
  return typeof k === 'string' && (AUTH_COMPONENT_KEYS as readonly string[]).includes(k);
}
export function isAuthPageKey(k: unknown): k is AuthPageKey {
  return typeof k === 'string' && (AUTH_PAGE_KEYS as readonly string[]).includes(k);
}
