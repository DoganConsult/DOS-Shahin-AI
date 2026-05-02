import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface EntitlementPlan {
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  modules: string[];
  maxUsers: number;
  features: Record<string, boolean>;
}

export interface EntitlementModules {
  [moduleCode: string]: boolean;
}

export interface EntitlementUi {
  homeRouteByRole?: Record<string, string>;
  defaultHomeRoute?: string;
}

export interface EntitlementData {
  modules: EntitlementModules;
  ui: EntitlementUi;
}

@Injectable({ providedIn: 'root' })
export class EntitlementsService {
  private readonly http = inject(HttpClient);
  private readonly _plan = signal<EntitlementPlan | null>(null);
  private readonly _operationMode = signal<string>('human');

  readonly plan = this._plan.asReadonly();
  readonly tier = computed(() => this._plan()?.tier ?? 'free');
  readonly enabledModules = computed(() => this._plan()?.modules ?? []);
  readonly operationMode = this._operationMode.asReadonly();

  /** Structured entitlements data for consumers that need modules map + UI config. */
  readonly entitlements = computed<EntitlementData | null>(() => {
    const p = this._plan();
    if (!p) return null;
    const modules: EntitlementModules = {};
    for (const m of p.modules) {
      modules[m] = true;
    }
    return {
      modules,
      ui: {
        defaultHomeRoute: '/workspace-home',
      },
    };
  });

  load(): Observable<EntitlementPlan> {
    return this.http.get<EntitlementPlan>('/api/entitlements').pipe(
      tap(p => this._plan.set(p)),
      catchError(() => of({ tier: 'free' as const, modules: [], maxUsers: 5, features: {} })),
    );
  }

  setOperationMode(mode: string): void {
    this._operationMode.set(mode);
  }

  isModuleEntitled(moduleCode: string): boolean {
    return this.enabledModules().includes(moduleCode) || this.tier() === 'enterprise';
  }
}
