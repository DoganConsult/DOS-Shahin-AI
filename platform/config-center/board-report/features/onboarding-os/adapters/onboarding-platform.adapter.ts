import { Injectable, inject } from '@angular/core';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StorageService } from '@app/infrastructure';
import { ProductsModulesConfigService } from '@app/runtime/config/products-modules-config.service';
import type {
  OnboardingPlatformPort,
  OnboardingAuthPort,
  OnboardingI18nPort,
  OnboardingStoragePort,
  OnboardingProductsConfigPort,
} from '../ports/onboarding-platform.port';

class AuthAdapter implements OnboardingAuthPort {
  constructor(private svc: GrcAuthService) {}
  isLoggedIn(): boolean { return this.svc.isLoggedIn(); }
  isOnboardingComplete(): boolean { return this.svc.isOnboardingComplete(); }
  setSession(data: Record<string, any>): void { this.svc.setSession(data as Parameters<GrcAuthService['setSession']>[0]); }
  setOnboardingComplete(complete: boolean): void { this.svc.setOnboardingComplete(complete); }
  userProfile(): Record<string, any> | null { return this.svc.userProfile() as Record<string, any> | null; }
  tenantId(): string { return this.svc.tenantId() || ''; }
}

class I18nAdapter implements OnboardingI18nPort {
  constructor(private svc: I18nService) {}
  currentLang(): string { return this.svc.currentLang(); }
  switchLanguage(lang: string): void { this.svc.switchLanguage(lang as any); }
  translate(key: string): string { return this.svc.translate(key); }
}

class StorageAdapter implements OnboardingStoragePort {
  constructor(private svc: StorageService) {}
  get(key: string): string | null { return this.svc.get(key); }
  set(key: string, value: string): void { this.svc.set(key, value); }
  remove(key: string): void { this.svc.remove(key); }
}

class ProductsConfigAdapter implements OnboardingProductsConfigPort {
  constructor(private svc: ProductsModulesConfigService) {}
  load(): Promise<void> { return this.svc.load(); }
}

@Injectable()
export class OnboardingPlatformAdapter implements OnboardingPlatformPort {
  readonly auth: OnboardingAuthPort;
  readonly i18n: OnboardingI18nPort;
  readonly storage: OnboardingStoragePort;
  readonly productsConfig: OnboardingProductsConfigPort;

  constructor() {
    this.auth = new AuthAdapter(inject(GrcAuthService));
    this.i18n = new I18nAdapter(inject(I18nService));
    this.storage = new StorageAdapter(inject(StorageService));
    this.productsConfig = new ProductsConfigAdapter(inject(ProductsModulesConfigService));
  }
}
