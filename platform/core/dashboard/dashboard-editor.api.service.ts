import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SaveDashboardLayoutDto } from './dashboard-editor.models';

@Injectable({ providedIn: 'root' })
export class DashboardEditorApiService {
  private http = inject(HttpClient);

  listWidgets(dashboardCode: string) {
    return this.http.get<unknown[]>(`/api/dashboard/${dashboardCode}/widgets`);
  }

  saveLayout(dashboardCode: string, body: SaveDashboardLayoutDto) {
    return this.http.put(`/api/dashboard/${dashboardCode}/layout`, body);
  }

  resetLayout(dashboardCode: string, appliesToRole?: string | null) {
    const suffix = appliesToRole
      ? `?appliesToRole=${encodeURIComponent(appliesToRole)}`
      : '';
    return this.http.delete(`/api/dashboard/${dashboardCode}/layout-override${suffix}`);
  }
}
