import { Injectable, signal } from '@angular/core';

export interface AdminGrant { role_code: string; pillar: string }
export interface AdminWho { user: { id: string; email: string; display_name: string }; grants: AdminGrant[]; expires_at: string }

const TOKEN_KEY = 'dos_master_admin_token';
const API = '/api/admin/console';

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlatformAdminApiService {
  readonly who = signal<AdminWho | null>(null);

  token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  setToken(t: string | null): void {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* noop */ }
  }

  async login(email: string): Promise<{ token: string; expires_at: string }> {
    const r = await fetch(`${API}/auth/email-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error || `http_${r.status}`);
    }
    const j = (await r.json()) as { token: string; expires_at: string };
    this.setToken(j.token);
    return j;
  }

  async whoami(): Promise<AdminWho | null> {
    const tok = this.token();
    if (!tok) return null;
    const r = await fetch(`${API}/auth/whoami`, {
      headers: { authorization: `Bearer ${tok}` },
    });
    if (!r.ok) return null;
    const w = (await r.json()) as AdminWho;
    this.who.set(w);
    return w;
  }

  logout(): void {
    this.setToken(null);
    this.who.set(null);
  }

  async get<T>(path: string): Promise<ApiResult<T>> {
    const tok = this.token();
    if (!tok) return { ok: false, status: 401, data: null, error: 'token_required' };
    const r = await fetch(`${API}${path}`, {
      headers: { authorization: `Bearer ${tok}` },
    });
    const status = r.status;
    if (!r.ok) {
      let err = `http_${status}`;
      try { const j = await r.json(); err = (j as { error?: string }).error || err; } catch { /* noop */ }
      return { ok: false, status, data: null, error: err };
    }
    const data = (await r.json()) as T;
    return { ok: true, status, data, error: null };
  }

  async downloadEvidencePack(): Promise<{ filename: string; blobUrl: string } | null> {
    const tok = this.token();
    if (!tok) return null;
    const r = await fetch(`${API}/dos-master/evidence-pack`, {
      headers: { authorization: `Bearer ${tok}` },
    });
    if (!r.ok) return null;
    const cd = r.headers.get('content-disposition') || '';
    const m = cd.match(/filename="?([^"]+)"?/);
    const filename = m ? m[1] : `dos-master-evidence-${new Date().toISOString().slice(0,10)}.json`;
    const blob = await r.blob();
    return { filename, blobUrl: URL.createObjectURL(blob) };
  }
}
