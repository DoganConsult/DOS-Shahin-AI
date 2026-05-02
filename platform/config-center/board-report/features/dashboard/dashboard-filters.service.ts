import { Injectable, signal, computed } from '@angular/core';

export interface DashboardFilters {
  tenantId: string;
  workspaceId: string;
  scopeId?: string;
  frameworkKeys: string[];
  from: string;
  to: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardFiltersService {
  private readonly filtersSignal = signal<DashboardFilters>({
    tenantId: '',
    workspaceId: '',
    frameworkKeys: [],
    from: this.defaultFrom(),
    to: this.defaultTo(),
  });

  readonly filters = this.filtersSignal.asReadonly();
  readonly filtersHash = computed(() => JSON.stringify(this.filtersSignal()));

  private defaultFrom(): string {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }

  private defaultTo(): string {
    return new Date().toISOString().slice(0, 10);
  }

  setFilters(partial: Partial<DashboardFilters>): void {
    this.filtersSignal.update((f) => ({ ...f, ...partial }));
  }
}
