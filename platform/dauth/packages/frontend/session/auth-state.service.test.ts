import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'auth-state.service.ts'), 'utf-8');

describe('AuthStateService — cookie-session probe', () => {
  it('is providedIn root', () => {
    expect(src).toContain("providedIn: 'root'");
  });

  it('only injects HttpClient (no DI cycle risk)', () => {
    expect(src).toContain('inject(HttpClient)');
    expect(src).not.toContain('inject(SessionService');
    expect(src).not.toContain('inject(AccessStore');
    expect(src).not.toContain('inject(StorageService');
  });

  it('exposes authed and metadata signals', () => {
    expect(src).toContain('readonly authed =');
    expect(src).toContain('readonly metadata =');
  });

  it('probes /auth/oidc/session with withCredentials', () => {
    expect(src).toContain('/auth/oidc/session');
    expect(src).toContain('withCredentials: true');
  });

  it('uses a request timeout', () => {
    expect(src).toContain('timeout(');
  });

  it('never reads localStorage tokens', () => {
    // Doc comments may reference `localStorage` to describe what is being
    // replaced; only actual API usage is forbidden.
    expect(src).not.toMatch(/localStorage\.(get|set|remove)Item\s*\(/);
    expect(src).not.toMatch(/sessionStorage\.(get|set|remove)Item\s*\(/);
    expect(src).not.toContain("'grc_token'");
    expect(src).not.toContain("'grc_refreshToken'");
  });

  it('never decodes JWTs', () => {
    expect(src).not.toMatch(/\batob\s*\(/);
    expect(src).not.toContain("split('.')");
  });

  it('never sets Authorization Bearer', () => {
    expect(src).not.toMatch(/Authorization:\s*`Bearer/);
  });

  it('exposes setAuthenticated and clear methods', () => {
    expect(src).toContain('setAuthenticated(');
    expect(src).toContain('clear()');
  });
});
