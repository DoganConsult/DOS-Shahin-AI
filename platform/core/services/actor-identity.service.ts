import { Injectable, signal } from '@angular/core';

export interface ActorProfile {
  userId: string;
  displayName: string;
  email: string;
  completeness: {
    percentage: number;
    blockingFields: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class ActorIdentityService {
  private readonly _profile = signal<ActorProfile | null>(null);

  readonly profile = this._profile.asReadonly();

  // Deferred: /api/actors/:id/profile has no backend route. Canonical user
  // identity is delivered by /api/auth/oidc/session and consumed via
  // GrcAuthService. Kept as a no-op so legacy callers compile.
  async loadProfile(_userId: string): Promise<void> {
    void _userId;
  }

  clearCache(): void {
    this._profile.set(null);
  }
}
