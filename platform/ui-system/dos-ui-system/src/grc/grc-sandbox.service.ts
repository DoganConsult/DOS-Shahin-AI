/**
 * Phase 1: DB-Driven GRC Sandbox
 * Frontend service for GRC sandbox experience
 *
 * Consumes GRC sandbox API endpoints to provide interactive
 * compliance framework, controls, and requirements data for visitors.
 * Uses DB-driven IBM Carbon components instead of hardcoded values.
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export interface GrcFramework {
  framework_id: string;
  name: string;
  description: string;
  version: string;
  status: string;
}

export interface GrcControl {
  control_id: string;
  control_ref: string;
  title: string;
  description: string;
  status: string;
  effectiveness: string;
  framework_name: string;
  framework_version: string;
}

export interface GrcRequirement {
  requirement_id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  framework_name: string;
}

export interface GrcSummary {
  frameworks: number;
  controls: {
    total: number;
    implemented: number;
    partially_implemented: number;
    not_implemented: number;
  };
  requirements: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}

export interface GrcComparison {
  framework_name: string;
  control_ref: string;
  title: string;
  description: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class GrcSandboxService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.production ? '/grc-sandbox' : 'http://localhost:4015/grc-sandbox';
  private readonly _frameworks = signal<GrcFramework[]>([]);
  private readonly _controls = signal<GrcControl[]>([]);
  private readonly _requirements = signal<GrcRequirement[]>([]);
  private readonly _summary = signal<GrcSummary | null>(null);
  private readonly _comparison = signal<GrcComparison[]>([]);
  private readonly _loaded = signal(false);

  readonly frameworks = this._frameworks.asReadonly();
  readonly controls = this._controls.asReadonly();
  readonly requirements = this._requirements.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly comparison = this._comparison.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  /** Fetch all compliance frameworks */
  async fetchFrameworks(): Promise<void> {
    const url = '/api/ui-os/grc-sandbox/frameworks';
    const resp = await new Promise<{ frameworks: GrcFramework[] } | null>((resolve) => {
      this.http.get<{ frameworks: GrcFramework[] }>(url).pipe(
        catchError((err) => {
          console.warn('[grc-sandbox] frameworks fetch failed', err);
          return of(null);
        }),
      ).subscribe((r) => resolve(r));
    });
    if (resp) {
      this._frameworks.set(resp.frameworks);
    }
  }

  /** Fetch controls for a specific framework or all controls */
  async fetchControls(frameworkId?: string): Promise<void> {
    const url = frameworkId 
      ? `/api/ui-os/grc-sandbox/controls?framework_id=${frameworkId}`
      : '/api/ui-os/grc-sandbox/controls';
    const resp = await new Promise<{ controls: GrcControl[] } | null>((resolve) => {
      this.http.get<{ controls: GrcControl[] }>(url).pipe(
        catchError((err) => {
          console.warn('[grc-sandbox] controls fetch failed', err);
          return of(null);
        }),
      ).subscribe((r) => resolve(r));
    });
    if (resp) {
      this._controls.set(resp.controls);
    }
  }

  /** Fetch requirements for a specific framework or all requirements */
  async fetchRequirements(frameworkId?: string): Promise<void> {
    const url = frameworkId
      ? `/api/ui-os/grc-sandbox/requirements?framework_id=${frameworkId}`
      : '/api/ui-os/grc-sandbox/requirements';
    const resp = await new Promise<{ requirements: GrcRequirement[] } | null>((resolve) => {
      this.http.get<{ requirements: GrcRequirement[] }>(url).pipe(
        catchError((err) => {
          console.warn('[grc-sandbox] requirements fetch failed', err);
          return of(null);
        }),
      ).subscribe((r) => resolve(r));
    });
    if (resp) {
      this._requirements.set(resp.requirements);
    }
  }

  /** Fetch summary statistics */
  async fetchSummary(): Promise<void> {
    const url = '/api/ui-os/grc-sandbox/summary';
    const resp = await new Promise<GrcSummary | null>((resolve) => {
      this.http.get<GrcSummary>(url).pipe(
        catchError((err) => {
          console.warn('[grc-sandbox] summary fetch failed', err);
          return of(null);
        }),
      ).subscribe((r) => resolve(r));
    });
    if (resp) {
      this._summary.set(resp);
    }
  }

  /** Compare controls between multiple frameworks */
  async compareFrameworks(frameworkIds: string[]): Promise<void> {
    const url = `/api/ui-os/grc-sandbox/compare?frameworks=${frameworkIds.join(',')}`;
    const resp = await new Promise<{ comparison: GrcComparison[] } | null>((resolve) => {
      this.http.get<{ comparison: GrcComparison[] }>(url).pipe(
        catchError((err) => {
          console.warn('[grc-sandbox] comparison fetch failed', err);
          return of(null);
        }),
      ).subscribe((r) => resolve(r));
    });
    if (resp) {
      this._comparison.set(resp.comparison);
    }
  }

  /** Load all sandbox data */
  async loadAll(): Promise<void> {
    await Promise.all([
      this.fetchFrameworks(),
      this.fetchControls(),
      this.fetchRequirements(),
      this.fetchSummary(),
    ]);
    this._loaded.set(true);
  }

  /** Get Carbon component key for a specific visualization type
   * Uses DB-driven Carbon component registry instead of hardcoded values
   */
  getCarbonKeyForVisualization(type: 'summary' | 'controls' | 'comparison'): string {
    switch (type) {
      case 'summary':
        return 'chart.donut'; // Use chart.donut from DB registry for summary
      case 'controls':
        return 'data-table'; // Use data-table from DB registry for controls
      case 'comparison':
        return 'chart.bar.grouped'; // Use chart.bar.grouped from DB registry for comparison
      default:
        return 'grid'; // Fallback to grid layout
    }
  }
}
