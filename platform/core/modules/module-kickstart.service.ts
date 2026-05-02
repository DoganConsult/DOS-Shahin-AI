import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { environment } from '@env/environment';
import { isCapabilityActive } from '@app/core/platform/navigation/active-modules';

export type ModuleCode = string;
export type ModuleKickstartStatus = 'pending' | 'not_started' | 'in_progress' | 'completed' | 'failed';
export type ModuleIgniteStatus = ModuleKickstartStatus | 'skipped' | 'blocked' | 'ready' | 'already_completed';

export interface KickstartResult {
  module?: ModuleCode;
  moduleCode?: ModuleCode;
  status: Extract<ModuleKickstartStatus, 'completed' | 'failed'>;
  artifacts?: Record<string, unknown>;
  errors?: string[];
  message?: string;
}

export interface ModuleKickstartState {
  status: ModuleKickstartStatus;
  kickedAt?: string;
  kickedBy?: string;
  artifacts?: Record<string, unknown>;
  errors?: string[] | null;
}

export interface ModuleIgnitePrerequisites {
  met: boolean;
  details: string;
  fixRoute?: string;
}

export interface IgniteModuleResult {
  status: ModuleIgniteStatus;
  currentStatus?: string;
  artifacts?: Record<string, unknown>;
  errors?: string[];
  reason?: string;
  blocker?: string;
  fixRoute?: string;
  wouldCreate?: Record<string, number>;
  prerequisites?: ModuleIgnitePrerequisites;
}

export interface IgniteResponse {
  scope: 'all' | 'failed_only';
  dryRun: boolean;
  results: Record<string, IgniteModuleResult>;
  summary: {
    completed: number;
    failed: number;
    skipped: number;
    blocked: number;
    already_completed: number;
  };
}

@Injectable({ providedIn: 'root' })
export class ModuleKickstartService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  kickstart(moduleCode: ModuleCode): Observable<KickstartResult> {
    return this.http.post<KickstartResult>(`${this.base}/${encodeURIComponent(moduleCode)}/kickstart`, {});
  }

  getStatus(moduleCode: ModuleCode): Observable<KickstartResult> {
    return this.http.get<KickstartResult>(`${this.base}/${encodeURIComponent(moduleCode)}/kickstart/status`);
  }

  loadStatus(): Observable<Record<string, ModuleKickstartState>> {
    if (!isCapabilityActive('moduleKickstart')) {
      return of({} as Record<string, ModuleKickstartState>);
    }
    return this.http
      .get<{ modules?: Record<string, ModuleKickstartState> }>(`${this.base}/module-kickstart-status`)
      .pipe(map((response) => response.modules ?? {}));
  }

  igniteAll(dryRun: boolean, scope: 'all' | 'failed_only'): Observable<IgniteResponse> {
    return this.http.post<IgniteResponse>(`${this.base}/workspace-ignite/ignite`, { dryRun, scope });
  }
}
