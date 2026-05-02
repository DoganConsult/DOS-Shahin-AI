import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DashboardApiService } from './dashboard-api.service';
import { DashboardResolvedDto } from './dashboard-api.models';

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private api = inject(DashboardApiService);

  readonly current = signal<DashboardResolvedDto | null>(null);
  readonly loading = signal(false);

  async load(dashboardCode: string): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.api.getDashboard(dashboardCode));
      this.current.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  clear() {
    this.current.set(null);
  }
}
