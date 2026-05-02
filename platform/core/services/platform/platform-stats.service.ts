import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ModuleLOC {
  moduleCode: string;
  moduleName: string;
  backendFiles: number;
  frontendFiles: number;
  totalFiles: number;
  backendLOC: number;
  frontendLOC: number;
  totalLOC: number;
  coverage35Pct?: number;
  coverage40Pct?: number;
}

export interface PlatformSummary {
  totalFiles: number;
  backendFiles: number;
  frontendFiles: number;
  totalCodeLines: number;
  totalCommentLines: number;
  totalBlankLines: number;
}

export interface PlatformOverview {
  summary: PlatformSummary;
  languages: Record<string, { files: number; codeLines: number }>;
  routeStats: {
    totalRouteFiles: number;
    totalRoutesApprox: number;
  };
  serviceStats: {
    totalServices: number;
  };
  frontendStats: {
    totalPages: number;
    totalComponents: number;
  };
  topModulesByLOC: ModuleLOC[];
  computedAt: string;
}

export interface ModuleFunctionalityEval {
  moduleCode: string;
  moduleName: string;
  totalLOC: number;
  certification35Count: number;
  certification40Count: number;
  coverage35Pct: number;
  coverage40Pct: number;
  status: 'excellent' | 'strong' | 'moderate' | 'weak';
}

export interface ModuleFunctionalityResponse {
  modules: ModuleFunctionalityEval[];
  computedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformStatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/platform-stats`;

  getOverview(): Observable<PlatformOverview> {
    return this.http.get<PlatformOverview>(`${this.baseUrl}/overview`);
  }

  getSummary(): Observable<Pick<PlatformOverview, 'summary' | 'serviceStats' | 'frontendStats' | 'computedAt'>> {
    return this.http.get<Pick<PlatformOverview, 'summary' | 'serviceStats' | 'frontendStats' | 'computedAt'>>(
      `${this.baseUrl}/summary`,
    );
  }

  getModuleEvaluation(): Observable<ModuleFunctionalityResponse> {
    return this.http.get<ModuleFunctionalityResponse>(`${this.baseUrl}/modules`);
  }
}