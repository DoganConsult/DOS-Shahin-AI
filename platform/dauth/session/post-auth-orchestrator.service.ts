/**
 * PostAuthOrchestratorService — Single source of truth for post-authentication routing.
 *
 * Entry points that return a token in the SPA (legacy login/register, shell) call
 * `completePostAuth()` after obtaining a valid token. Keycloak-only users typically
 * never hit this path: they return with httpOnly cookies and `GrcAuthService.init()`
 * hydrates via `GET /auth/oidc/session`. This service:
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
import { TimeoutError, firstValueFrom } from 'rxjs';
import { SessionService } from './session.service';
import { AppBootstrapService } from '../../core/services/app-bootstrap.service';
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
  private bootstrapApi = inject(AppBootstrapService);
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
    // 1. Guard: token must be present
    if (!response.token) {
      throw new Error('[PostAuthOrchestrator] No token in auth response — aborting');
    }

    // 2. Store session — full 9-field SessionData shape (fixes B3)
    this.session.setSession({
      token: response.token,
      refreshToken: response.refreshToken,
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

    // 6. Yield one macrotask so localStorage writes from setSession() are fully
    //    committed before bootstrap HTTP (cookie + withCredentials) runs.
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
      this.rollbackSession();
      if (err instanceof TimeoutError) {
        throw new Error('[PostAuthOrchestrator] Session bootstrap timed out — check network or try again.');
      }
      throw new Error('[PostAuthOrchestrator] Session bootstrap unavailable — cannot continue.');
    }

    // 9. Only for READY states: load workspace context (access snapshot + legacy hydration)
    let accessLoaded = false;
    let legacyLoaded = false;
    try {
      const unified = await this.bootstrapApi.loadUnifiedBootstrap();
      accessLoaded = unified.accessLoaded;
      legacyLoaded = unified.legacyLoaded;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('loadUnifiedBootstrap exceeded')) {
        this.rollbackSession();
        throw new Error('[PostAuthOrchestrator] Workspace bootstrap timed out — try again or check network.');
      }
      this.rollbackSession();
      throw err instanceof Error ? err : new Error(String(err));
    }

    // 10. Check member onboarding status
    const memberOnboarded = response.memberOnboarded === true
      || this.storage.get('grc_member_onboarded') === 'true';

    // 11. Final validation — Law 11: default-deny if bootstrap fails
    if (!accessLoaded && !legacyLoaded) {
      this.rollbackSession();
      throw new Error('[PostAuthOrchestrator] Both access-snapshot and legacy bootstrap failed — cannot determine landing page');
    }

    // 12. Non-admin members who haven't completed team onboarding → /team-welcome
    // Disabled: onboarding-service is not yet deployed and /api/onboarding/*
    // returns 404 from the gateway catch-all. Routing here instead of
    // /workspace-home would render the broken onboarding shell. Re-enable
    // once services/onboarding-service is mounted on the gateway.
    void memberOnboarded;

    // 13. Resolve landing page. Platform-admin operators (admin-hub) win over
    // any returnUrl/bootstrap fallback so a stale /workspace-home does not
    // beat the access-snapshot decision.
    const returnUrl = this.sanitizeReturnUrl(response.returnUrl ?? null);
    const accessLanding = this.accessStore.loaded() ? this.accessStore.landingPage() : null;
    const landing = (accessLanding === '/admin-hub')
      ? accessLanding
      : (returnUrl
        || accessLanding
        || this.bootstrapStore.landingPage()
        || '/workspace-home');

    this.router.navigateByUrl(landing);
  }

  async resolveEntryRoute(returnUrl?: string | null): Promise<string> {
    try {
      const bootstrap = await firstValueFrom(this.bootstrapApi.loadSessionBootstrap());
      // Suppress server-driven redirects into the onboarding shell while
      // onboarding-service is missing — the page would 404 on every API.
      const isOnboardingRoute = (r?: string | null): boolean =>
        !!r && (r === '/onboarding' || r.startsWith('/onboarding/') || r === '/team-welcome' || r.startsWith('/team-welcome/'));
      if (bootstrap?.next?.blocking && !isOnboardingRoute(bootstrap.next.route)) {
        return bootstrap.next.route;
      }
      // Platform-admin precedence: ensure access snapshot is loaded so the
      // /admin-hub landing wins over a generic bootstrap /workspace-home.
      // Without this, ahmet.dogan@doganconsult.com (platform_admin) would
      // land on the tenant Foundation Workspace instead of Admin Hub.
      if (!this.accessStore.loaded()) {
        try { await this.accessStore.load(); } catch { /* ignore */ }
      }
      if (this.accessStore.loaded()) {
        const accessLanding = this.accessStore.landingPage();
        if (accessLanding === '/admin-hub') return accessLanding;
      }
      const safe = this.sanitizeReturnUrl(returnUrl ?? null);
      if (safe && !isOnboardingRoute(safe)) return safe;
      if (bootstrap?.next?.route && !isOnboardingRoute(bootstrap.next.route)) {
        const mapped = this.sanitizeReturnUrl(bootstrap.next.route);
        if (mapped) return mapped;
      }
    } catch {
      // Onboarding fallback disabled — onboarding-service is not deployed.
      // Cookie-authenticated users land on /workspace-home until the
      // backend route is mounted on the gateway.
      if (!this.accessStore.loaded() && !this.bootstrapStore.landingPage()) {
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
    // Defensive cleanup of legacy localStorage keys.
    //
    // Two callers still write some of these keys today:
    //   • blueprint/pages/invitations/invitation-accept.component.ts
    //     writes grc_userId / grc_tenantId / grc_role / grc_userName /
    //     grc_orgName as part of the scoped-JWT external-user flow.
    //   • Pre-cookie builds (now retired) wrote grc_token /
    //     grc_refreshToken before the platform moved to httpOnly
    //     cookie-session. Stale entries from those builds may still
    //     live on long-lived devices.
    //
    // The DAuth single-source-of-token effort plans to move the
    // invitation-accept flow off localStorage onto httpOnly cookies
    // (audit item A1). Once that lands AND the legacy-build cohort
    // ages out, this entire cleanup block becomes a no-op and can be
    // deleted — verify by checking the rate of non-empty keys at
    // rollback time before removing.
    const keys = [
      'grc_token', 'grc_refreshToken', 'grc_tenantId', 'grc_role',
      'grc_userName', 'grc_orgName', 'grc_userId', 'grc_isSuperAdmin',
      'grc_onboarding_complete', 'grc_member_onboarded', 'grc_enterprise_authz',
      'grc_idle_timeout_min', 'onb_session_id',
    ];
    keys.forEach(k => this.storage.remove(k));
  }
}
