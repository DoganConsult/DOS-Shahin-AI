import { Injectable, signal, computed } from '@angular/core';

export type DeploymentTier = 'development' | 'staging' | 'production';

export interface DeploymentProfile {
  tier: DeploymentTier;
  region?: string;
  clusterName?: string;
  buildVersion?: string;
  featureFlags?: Record<string, boolean>;
}

/**
 * DeploymentProfileService — Provides deployment environment metadata.
 *
 * Injected by shell-host and other platform components to adapt behavior
 * based on the current deployment tier (dev / staging / production).
 *
 * @owner DOS
 */
@Injectable({ providedIn: 'root' })
export class DeploymentProfileService {
  private readonly _profile = signal<DeploymentProfile>({
    tier: 'production',
  });

  readonly profile = this._profile.asReadonly();
  readonly tier = computed(() => this._profile().tier);
  readonly region = computed(() => this._profile().region ?? 'default');
  readonly isDevelopment = computed(() => this._profile().tier === 'development');
  readonly isProduction = computed(() => this._profile().tier === 'production');

  setProfile(profile: DeploymentProfile): void {
    this._profile.set(profile);
  }

  hasFeatureFlag(flag: string): boolean {
    return this._profile().featureFlags?.[flag] ?? false;
  }
}
