/**
 * SiteContextService — thin facade over SessionService + BootstrapStore
 * for widgets and shared components that need tenant/user/org context signals.
 */
import { Injectable, inject, computed } from '@angular/core';
import { SessionService } from '../../../dauth/session/session.service';
import { BootstrapStore } from '@app/core/platform/bootstrap.store';

@Injectable({ providedIn: 'root' })
export class SiteContextService {
  private readonly auth = inject(SessionService);
  private readonly bootstrap = inject(BootstrapStore);

  /** Current tenant ID (string or null). */
  readonly tenantId = this.auth.tenantId;

  /** Current user profile (role, email, etc.). */
  readonly currentUser = this.auth.userProfile;

  /** Tenant-level info derived from bootstrap data. */
  readonly tenantInfo = computed(() => {
    const d = this.bootstrap.data();
    if (!d) return null;
    return {
      status: (d as Record<string, any>)['orgStatus']
           ?? (d as Record<string, any>)['tenantStatus']
           ?? 'active',
    };
  });
}
