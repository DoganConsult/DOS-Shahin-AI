/**
 * PostAuthOrchestratorService — Single source of truth for post-authentication routing.
 *
 * Every auth entry point (Register, Login, Shell inline registration) calls
 * `completePostAuth()` after obtaining a valid token. This service:
 *  1. Stores session data (full 9-field shape)
 *  2. Configures idle timeout
 *  3. Loads workspace context via unified bootstrap
 *  4. Resolves the entry route
 *  5. Navigates
 *
 * @owner DAuth
 * @spec DOS-AIO Patch 0 Law 1 (one canonical engine), Law 2 (one canonical owner),
 *       Law 4 (no frontend-invented truth), Law 11 (default-deny on bootstrap failure)
 * @since 2026-04-02
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from './session.service';
import { DAUTH_BOOTSTRAP_PORT } from '../ports';
import { AccessStore } from '../access/access.store';
import { BootstrapStore } from '@app/core/platform/bootstrap.store';
import { StorageService } from '@app/infrastructure';
import { IdleTimeoutService } from '@app/infrastructure';


// ── PostAuthResponse ──────────────────────────────────────────────────────
// Canonical shape for the response from any auth endpoint (login, register).
// The orchestrator normalises this into SessionData + storage writes.

export interface PostAuthResponse {
  token: string;
  refreshToken?: string;
  userId: string;
  tenantId: string;
  tenantCode?: string;
  role: string;
  orgName?: string;
  orgNameAr?: string;
  userName?: string;
  sessionId?: string | null;
  onboardingComplete?: boolean;
  emailVerificationRequired?: boolean;
  isSuperAdmin?: boolean;
  memberOnboarded?: boolean;
  enterpriseAuthz?: unknown;
  sessionIdleTimeoutMinutes?: number;
  returnUrl?: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PostAuthOrchestratorService {
  private session = inject(SessionService);
  private bootstrapApi = inject(DAUTH_BOOTSTRAP_PORT);
  private accessStore = inject(AccessStore);
  private bootstrapStore = inject(BootstrapStore);
  private storage = inject(StorageService);
  private idleTimeout = inject(IdleTimeoutService);
  private router = inject(Router);

  /**
   * Single entry point called by login, register, and shell onRegistered().
   * Handles session write, bootstrap loading, and navigation.
   */
  async completePostAuth(response: PostAuthResponse): Promise<void> {
    // 1. Cookie-session: a `token` field in the response is optional and ignored.
    //    Authentication truth is the HTTP-only cookie issued by the auth-service.
    //    We require sanitized identity metadata only.
    if (!response.tenantId || !response.role) {
      throw new Error('[PostAuthOrchestrator] Missing tenantId/role in auth response — aborting');
    }

    // 2. Store session — sanitized metadata only (no tokens persisted).
    this.session.setSession({
      tenantId: response.tenantId,
      role: response.role || 'viewer',
      userName: response.userName,
      orgName: response.orgName,
      isSuperAdmin: response.isSuperAdmin ?? false,
      memberOnboarded: response.memberOnboarded ?? false,
      enterpriseAuthz: (response.enterpriseAuthz && typeof response.enterpriseAuthz === 'object' && !Array.isArray(response.enterpriseAuthz))
        ? response.enterpriseAuthz as Record<string, unknown>
        : null,
    });

    // 3. Set onboarding completion flag
    this.session.setOnboardingComplete(response.onboardingComplete ?? false);

    // 4. Store auxiliary identifiers
    if (response.sessionId) {
      this.storage.set('onb_session_id', response.sessionId);
    }
    if (response.userId) {
      this.storage.set('grc_userId', response.userId);
    }

    // 5. Configure idle timeout if tenant has one
    if (response.sessionIdleTimeoutMinutes) {
      this.idleTimeout.configure(response.sessionIdleTimeoutMinutes);
      this.storage.set('grc_idle_timeout_min', String(response.sessionIdleTimeoutMinutes));
    }

    // 6. Yield one macrotask so metadata writes from setSession() are fully
    //    committed before downstream bootstrap calls run. Auth itself is
    //    cookie-session — no token is read from storage by the interceptor.
    await new Promise<void>(r => setTimeout(r, 0));

    // 7. Wait for profile cache to hydrate
    await this.session.waitForProfileLoad();

    // 8. Canonical bootstrap gate — do not fan-out until backend says workspace is ready.
    let bootstrapState: string | null = null;
    try {
      const bootstrap = await firstValueFrom(this.bootstrapApi.loadSessionBootstrap());
      bootstrapState = bootstrap?.state ?? null;
      if (bootstrap?.next?.blocking) {
        this.router.navigateByUrl(bootstrap.next.route);
        return;
      }
    } catch (err) {
      console.warn('[PostAuthOrchestrator] Session bootstrap failed', err);
      // Fresh tenant after registration — no workspace provisioned yet.
      // Gracefully route to onboarding instead of hard-failing.
      if (!response.onboardingComplete) {
        this.router.navigateByUrl('/onboarding');
        return;
      }
      this.rollbackSession();
      throw new Error('[PostAuthOrchestrator] Session bootstrap unavailable — cannot continue.');
    }

    // 9. Only for READY states: load workspace context (access snapshot + legacy hydration)
    const { accessLoaded, legacyLoaded } = await this.bootstrapApi.loadUnifiedBootstrap();

    // 10. Check member onboarding status
    const memberOnboarded = response.memberOnboarded === true
      || this.storage.get('grc_member_onboarded') === 'true';

    // 11. Final validation — Law 11: default-deny if bootstrap fails
    if (!accessLoaded && !legacyLoaded) {
      // Graceful fallback for fresh tenants still in onboarding
      if (!response.onboardingComplete) {
        this.router.navigateByUrl('/onboarding');
        return;
      }
      this.rollbackSession();
      throw new Error('[PostAuthOrchestrator] Both access-snapshot and legacy bootstrap failed — cannot determine landing page');
    }

    // 12. Fresh registration / onboarding not yet complete → /onboarding
    if (!response.onboardingComplete) {
      this.router.navigateByUrl('/onboarding');
      return;
    }

    // 13. Non-admin members who haven't completed team onboarding → /team-welcome
    if (!memberOnboarded && this.accessStore.loaded() && !this.accessStore.isAdmin()) {
      this.router.navigate(['/team-welcome']);
      return;
    }

    // 14. Resolve landing page: returnUrl > accessStore > bootstrapStore > fallback
    const returnUrl = this.sanitizeReturnUrl(response.returnUrl ?? null);
    const landing = returnUrl
      || (this.accessStore.loaded()
        ? this.accessStore.landingPage()
        : this.bootstrapStore.landingPage());

    this.router.navigateByUrl(landing);
  }

  async resolveEntryRoute(returnUrl?: string | null): Promise<string> {
    try {
      const bootstrap = await firstValueFrom(this.bootstrapApi.loadSessionBootstrap());
      if (bootstrap?.next?.blocking) return bootstrap.next.route;
      const safe = this.sanitizeReturnUrl(returnUrl ?? null);
      if (safe) return safe;
      if (bootstrap?.next?.route) {
        const mapped = this.sanitizeReturnUrl(bootstrap.next.route);
        if (mapped) return mapped;
      }
    } catch {
      if (!this.accessStore.loaded() && !this.bootstrapStore.landingPage()) {
        if (!this.session.isOnboardingComplete()) {
          return '/onboarding';
        }
        return '/workspace-home';
      }
    }
    if (this.accessStore.loaded()) {
      return this.accessStore.landingPage();
    }
    return this.bootstrapStore.landingPage() || '/workspace-home';
  }

  /**
   * Sanitize a returnUrl to prevent open-redirect attacks.
   * Only accepts relative paths that don't point to auth pages.
   */
  sanitizeReturnUrl(raw: string | null): string | null {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
    const blocked = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/setup/verify', '/setup'];
    if (blocked.some(p => raw === p || raw.startsWith(p + '?') || raw.startsWith(p + '/'))) return null;
    return raw;
  }

  private rollbackSession(): void {
    const keys = [
      'grc_token', 'grc_refreshToken', 'grc_tenantId', 'grc_role',
      'grc_userName', 'grc_orgName', 'grc_userId', 'grc_isSuperAdmin',
      'grc_onboarding_complete', 'grc_member_onboarded', 'grc_enterprise_authz',
      'grc_idle_timeout_min', 'onb_session_id',
    ];
    keys.forEach(k => this.storage.remove(k));
  }
}
