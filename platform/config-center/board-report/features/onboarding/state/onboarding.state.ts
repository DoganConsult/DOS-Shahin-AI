import { Injectable, signal, computed } from '@angular/core';
import type { OnboardingSessionContract, OnboardingLifecycleState, OnboardingStageContract } from '../contracts/onboarding.contracts';

@Injectable({ providedIn: 'root' })
export class OnboardingState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _session = signal<OnboardingSessionContract | null>(null);
  private readonly _currentStageCode = signal<string | null>(null);
  private readonly _currentSectionCode = signal<string | null>(null);
  private readonly _provisioningStatus = signal<string | null>(null);
  private readonly _readinessPercent = signal(0);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly session = this._session.asReadonly();
  readonly currentStageCode = this._currentStageCode.asReadonly();
  readonly currentSectionCode = this._currentSectionCode.asReadonly();
  readonly provisioningStatus = this._provisioningStatus.asReadonly();
  readonly readinessPercent = this._readinessPercent.asReadonly();

  readonly hasError = computed(() => this._error() !== null);
  readonly sessionId = computed(() => this._session()?.id ?? null);
  readonly sessionStatus = computed<OnboardingLifecycleState | null>(() => this._session()?.status ?? null);
  readonly stages = computed<OnboardingStageContract[]>(() => this._session()?.stages ?? []);
  readonly isProvisioning = computed(() => {
    const s = this._session()?.status;
    return s === 'provisioning_started' || s === 'provisioning' || s === 'provisioning_partial';
  });
  readonly isTerminal = computed(() => {
    const s = this._session()?.status;
    return s === 'active' || s === 'archived' || s === 'cancelled';
  });
  readonly isEmpty = computed(() => !this._loading() && !this._session());

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setSession(v: OnboardingSessionContract | null): void { this._session.set(v); }
  setCurrentStage(code: string | null): void { this._currentStageCode.set(code); }
  setCurrentSection(code: string | null): void { this._currentSectionCode.set(code); }
  setProvisioningStatus(status: string | null): void { this._provisioningStatus.set(status); }
  setReadiness(percent: number): void { this._readinessPercent.set(percent); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._session.set(null);
    this._currentStageCode.set(null);
    this._currentSectionCode.set(null);
    this._provisioningStatus.set(null);
    this._readinessPercent.set(0);
  }
}
