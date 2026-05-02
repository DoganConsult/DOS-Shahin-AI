import { InjectionToken } from '@angular/core';

export interface OnboardingAuthPort {
  isLoggedIn(): boolean;
  isOnboardingComplete(): boolean;
  setSession(data: Record<string, unknown>): void;
  setOnboardingComplete(complete: boolean): void;
  userProfile(): Record<string, unknown> | null;
  tenantId(): string;
}

export interface OnboardingI18nPort {
  currentLang(): string;
  switchLanguage(lang: string): void;
  translate(key: string): string;
}

export interface OnboardingStoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface OnboardingProductsConfigPort {
  load(): Promise<void>;
}

export interface OnboardingPlatformPort {
  readonly auth: OnboardingAuthPort;
  readonly i18n: OnboardingI18nPort;
  readonly storage: OnboardingStoragePort;
  readonly productsConfig: OnboardingProductsConfigPort;
}

export const ONBOARDING_PLATFORM = new InjectionToken<OnboardingPlatformPort>('OnboardingPlatformPort');
