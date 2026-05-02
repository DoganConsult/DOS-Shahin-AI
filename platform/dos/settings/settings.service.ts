import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { PlatformSettingContract } from './settings.contracts';

@Injectable({ providedIn: 'root' })
export class PlatformSettingsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform/settings`;

  getAll(scope?: string): Observable<PlatformSettingContract[]> {
    const params: Record<string, string> = {};
    if (scope) params['scope'] = scope;
    return this.http.get<PlatformSettingContract[]>(this.base, { params });
  }

  get(key: string): Observable<PlatformSettingContract> {
    return this.http.get<PlatformSettingContract>(`${this.base}/${key}`);
  }

  set(key: string, value: unknown, scope = 'global', scopeId?: string): Observable<PlatformSettingContract> {
    return this.http.put<PlatformSettingContract>(`${this.base}/${key}`, { value, scope, scopeId });
  }
}
