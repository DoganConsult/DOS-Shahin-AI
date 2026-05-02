import { Injectable, signal, computed } from '@angular/core';

export interface DashboardFilters {
  frameworkId?: string;
  regulatorId?: string;
  departmentId?: string;
  dateRange?: { from: string; to: string };
  severity?: string[];
  status?: string[];
}

@Injectable({ providedIn: 'root' })
export class DashboardFiltersService {
  private _filters = signal<DashboardFilters>({});
  readonly filters = this._filters.asReadonly();
  readonly hasActiveFilters = computed(() => {
    const f = this._filters();
    return !!(f.frameworkId || f.regulatorId || f.departmentId || f.dateRange || f.severity?.length || f.status?.length);
  });

  update(partial: Partial<DashboardFilters>): void {
    this._filters.update(current => ({ ...current, ...partial }));
  }

  reset(): void {
    this._filters.set({});
  }
}
