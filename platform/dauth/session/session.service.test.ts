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

  it('injects GrcAuthService for login truth', () => {
    expect(src).toContain('private grcAuth = inject(GrcAuthService)');
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

describe('SessionService — isLoggedIn', () => {
  it('delegates to GrcAuthService (cookie session truth)', () => {
    expect(src).toContain('return this.grcAuth.isLoggedIn()');
  });

  it('returns boolean', () => {
    expect(src).toContain('isLoggedIn(): boolean');
  });

  it('does not read grc_token from storage', () => {
    expect(src).not.toContain("this.storage.get('grc_token')");
  });
});

describe('SessionService — logout', () => {
  it('has logout method with optional reason', () => {
    expect(src).toContain('logout(reason?: string): void');
  });

  it('delegates to GrcAuthService.logout (OIDC + storage cleanup)', () => {
    expect(src).toContain('this.grcAuth.logout(reason)');
  });

  it('does not post to legacy /auth/logout from SessionService', () => {
    expect(src).not.toContain('/auth/logout');
  });
});

describe('SessionService — setSession', () => {
  it('does not persist grc_token', () => {
    expect(src).not.toContain("this.storage.set('grc_token'");
  });

  it('persists tenantId', () => {
    expect(src).toContain("this.storage.set('grc_tenantId', String(data.tenantId))");
  });

  it('persists role', () => {
    expect(src).toContain("this.storage.set('grc_role', String(data.role))");
  });

  it('persists enterpriseAuthz as JSON', () => {
    expect(src).toContain("JSON.stringify(data.enterpriseAuthz)");
  });
});

describe('SessionService — token getters & refresh', () => {
  it('getToken returns empty string (no client token)', () => {
    expect(src).toContain("async getToken(): Promise<string> { return ''; }");
  });

  it('refreshIfExpiringSoon is a no-op', () => {
    expect(src).toContain('refreshIfExpiringSoon(_thresholdMs');
    expect(src).toContain('/* no-op — refresh is server-side via /api/auth/oidc/refresh */');
  });

  it('loadSessionBootstrap uses session/bootstrap with withCredentials', () => {
    expect(src).toContain('/session/bootstrap');
    expect(src).toContain('withCredentials: true');
  });
});

describe('SessionService — no forbidden patterns', () => {
  it('does not call localStorage directly', () => {
    expect(src).not.toContain('localStorage.');
  });

  it('does not reference Keycloak', () => {
    expect(src).not.toMatch(/[Kk]eycloak/);
  });

  it('does not reference Supabase', () => {
    expect(src).not.toMatch(/[Ss]upabase/);
  });
});
