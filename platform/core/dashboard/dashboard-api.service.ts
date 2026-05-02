import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DashboardResolvedDto, DashboardResolveResponseDto } from './dashboard-api.models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private http = inject(HttpClient);

  resolveDefault(): Observable<DashboardResolveResponseDto> {
    return this.http.get<DashboardResolveResponseDto>('/api/dashboard/resolve');
  }

  getDashboard(dashboardCode: string): Observable<DashboardResolvedDto> {
    return this.http.get<DashboardResolvedDto>(`/api/dashboard/${dashboardCode}`);
  }

  listDashboards(): Observable<unknown[]> {
    return this.http.get<unknown[]>('/api/dashboard/list');
  }
}
