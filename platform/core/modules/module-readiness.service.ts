import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type ReadinessState = 'not_checked' | 'checking' | 'ready' | 'not_ready' | 'degraded' | 'in_progress' | 'attention_required' | 'needs_setup';

export interface StageResult {
  stage: string;
  passed: boolean;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface ReadinessCheck {
  moduleCode: string;
  state: ReadinessState;
  stages: StageResult[];
  checkedAt: string;
  passed?: boolean;
  label?: string;
  detail?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ModuleReadinessService {
  private http = inject(HttpClient);

  checkReadiness(moduleCode: string) {
    return this.http.get<ReadinessCheck>(`/api/modules/${moduleCode}/readiness`);
  }

  getModuleReport(_moduleCode: string): any {
    // Returns cached module report or null if not available
    return null;
  }

  getModuleReadiness(moduleCode: string) {
    return this.http.get<ReadinessCheck>(`/api/modules/${moduleCode}/readiness`);
  }

  getModuleState(moduleCode: string): ReadinessState {
    // Synchronous check — returns last known state
    return 'not_checked';
  }
}
