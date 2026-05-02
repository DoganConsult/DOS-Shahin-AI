import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'session.service.ts'), 'utf-8');

describe('SessionService — structure', () => {
  it('is providedIn root', () => {
    expect(src).toContain("providedIn: 'root'");
  });

  it('exports SessionData interface', () => {
    expect(src).toContain('export interface SessionData');
  });

  it('injects Router', () => {
    expect(src).toContain('private router = inject(Router)');
  });

  it('injects StorageService', () => {
    expect(src).toContain('private storage = inject(StorageService)');
  });

  it('injects HttpClient', () => {
    expect(src).toContain('private http = inject(HttpClient)');
  });

  it('injects AccessStore', () => {
    expect(src).toContain('private accessStore = inject(AccessStore)');
  });

  it('injects DAUTH_ACTOR_IDENTITY_PORT', () => {
    expect(src).toContain('private actorIdentity = inject(DAUTH_ACTOR_IDENTITY_PORT)');
  });

  it('injects AuthStateService (cookie-session truth)', () => {
    expect(src).toContain('private authState = inject(AuthStateService)');
  });
});

describe('SessionService — login() method', () => {
  it('has a login() method', () => {
    expect(src).toContain('login(): void');
  });

  it('navigates to /login', () => {
    const loginMethod = src.slice(src.indexOf('login(): void'));
    expect(loginMethod).toContain("this.router.navigate(['/login'])");
  });

  it('login() does not call any external API', () => {
    const loginStart = src.indexOf('login(): void');
    const loginEnd = src.indexOf('}', loginStart + 'login(): void {'.length);
    const loginBody = src.slice(loginStart, loginEnd);
    expect(loginBody).not.toContain('this.http');
  });
});

describe('SessionService — isLoggedIn (cookie-session truth)', () => {
  it('returns boolean', () => {
    expect(src).toContain('isLoggedIn(): boolean');
  });

  it('uses authState.authed() and never reads grc_token from storage', () => {
    const start = src.indexOf('isLoggedIn(): boolean');
    const end = src.indexOf('\n  }', start);
    const body = src.slice(start, end);
    expect(body).toContain('this.authState.authed()');
    expect(body).not.toContain("this.storage.get('grc_token')");
  });
});

describe('SessionService — logout', () => {
  it('has logout method with optional reason', () => {
    expect(src).toContain('logout(reason?: string): void');
  });

  it('posts to auth/logout endpoint', () => {
    expect(src).toContain('/auth/logout');
  });

  it('does not send Authorization Bearer header on logout', () => {
    const start = src.indexOf('logout(reason');
    const end = src.indexOf('this.router.navigate', start);
    const body = src.slice(start, end);
    expect(body).not.toMatch(/Authorization:\s*`Bearer/);
  });

  it('uses withCredentials on logout call', () => {
    const start = src.indexOf('logout(reason');
    const end = src.indexOf('this.router.navigate', start);
    const body = src.slice(start, end);
    expect(body).toContain('withCredentials: true');
  });

  it('defensively cleans up legacy storage keys (grc_token / grc_refreshToken)', () => {
    expect(src).toContain("'grc_token'");
    expect(src).toContain("'grc_refreshToken'");
    expect(src).toContain("'grc_tenantId'");
    expect(src).toContain("'grc_role'");
    expect(src).toContain("'grc_userId'");
  });

  it('stores logout reason when provided', () => {
    expect(src).toContain("this.storage.set('grc_logout_reason', reason)");
  });

  it('navigates to /login after logout', () => {
    const logoutStart = src.indexOf('logout(reason');
    const logoutBody = src.slice(logoutStart);
    expect(logoutBody).toContain("this.router.navigate(['/login'])");
  });
});

describe('SessionService — setSession (cookie-session, no token writes)', () => {
  it('persists tenantId metadata', () => {
    expect(src).toContain("this.storage.set('grc_tenantId', String(data.tenantId))");
  });

  it('persists role metadata', () => {
    expect(src).toContain("this.storage.set('grc_role', String(data.role))");
  });

  it('persists enterpriseAuthz as JSON', () => {
    expect(src).toContain('JSON.stringify(data.enterpriseAuthz)');
  });

  it('does NOT write grc_token to storage', () => {
    expect(src).not.toContain("this.storage.set('grc_token'");
  });

  it('does NOT write grc_refreshToken to storage', () => {
    expect(src).not.toContain("this.storage.set('grc_refreshToken'");
  });

  it('flips authState to authenticated', () => {
    expect(src).toContain('this.authState.setAuthenticated(');
  });
});

describe('SessionService — profile gating', () => {
  it('waitForProfileLoad delegates to ActorIdentityService', () => {
    expect(src).toContain('async waitForProfileLoad(): Promise<void>');
    expect(src).toContain('await this.actorIdentity.waitForProfileLoad()');
  });
});

describe('SessionService — token refresh (cookie-bound)', () => {
  it('has refreshIfExpiringSoon method', () => {
    expect(src).toContain('refreshIfExpiringSoon(');
  });

  it('posts to auth/refresh endpoint', () => {
    expect(src).toContain('/auth/refresh');
  });

  it('uses withCredentials', () => {
    expect(src).toContain('withCredentials: true');
  });

  it('does NOT pass refresh token from body', () => {
    expect(src).not.toContain("this.storage.get('grc_refreshToken')");
  });

  it('does NOT persist a token from refresh response', () => {
    expect(src).not.toMatch(/storage\.set\('grc_token'/);
  });
});

describe('SessionService — no forbidden patterns', () => {
  it('does not call localStorage directly', () => {
    expect(src).not.toContain('localStorage.');
  });

  it('does not emit Authorization Bearer from storage', () => {
    expect(src).not.toMatch(/Authorization:\s*`Bearer\s*\$\{/);
  });

  it('does not read grc_token from storage anywhere as auth truth', () => {
    expect(src).not.toMatch(/this\.storage\.get\(\s*'grc_token'\s*\)/);
  });

  it('does not reference Keycloak', () => {
    expect(src).not.toMatch(/[Kk]eycloak/);
  });

  it('does not reference Supabase', () => {
    expect(src).not.toMatch(/[Ss]upabase/);
  });
});

describe('SessionService — getToken (cookie-session has no browser token)', () => {
  it('getTokenSync returns null', () => {
    const start = src.indexOf('getTokenSync()');
    const end = src.indexOf('\n  }', start);
    const body = src.slice(start, end);
    expect(body).toContain('return null');
  });

  it('async getToken throws when not authed and never returns a stored grc_token', () => {
    const start = src.indexOf('async getToken()');
    const end = src.indexOf('\n  }', start);
    const body = src.slice(start, end);
    expect(body).toContain('Not authenticated');
    expect(body).not.toContain("this.storage.get('grc_token')");
  });
});
