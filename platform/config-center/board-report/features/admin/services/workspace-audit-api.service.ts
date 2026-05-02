import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ComponentTrackingResult {
  category: string;
  group: string;
  total: number;
  tracked: number;
  untracked: number;
  modified: number;
  staged: number;
  files: string[];
  health: 'green' | 'yellow' | 'red';
}

export interface WorkspaceAuditReport {
  timestamp: string;
  durationMs: number;
  git: {
    branch: string;
    lastCommitHash: string;
    lastCommitMessage: string;
    lastCommitAge: string;
    staged: number;
    modified: number;
    untracked: number;
    deleted: number;
    totalUncommitted: number;
    untrackedFiles: string[];
    modifiedFiles: string[];
    stagedFiles: string[];
    diffStat: { insertions: number; deletions: number; filesChanged: number };
  };
  components: ComponentTrackingResult[];
  componentSummary: {
    totalCategories: number;
    healthyCategories: number;
    warningCategories: number;
    criticalCategories: number;
    totalTracked: number;
    totalUntracked: number;
    totalModified: number;
  };
  codeQuality: {
    tscErrors: number;
    tscOutput: string;
    topErrorFiles: { file: string; count: number }[];
  };
  alerts: string[];
  status: 'clean' | 'warnings' | 'critical';
  trend: 'improving' | 'stable' | 'degrading' | 'any';
}

export interface AuditHistoryEntry {
  timestamp: string;
  status: string;
  totalUncommitted: number;
  untracked: number;
  modified: number;
  staged: number;
  tscErrors: number;
  healthyCategories: number;
  warningCategories: number;
  criticalCategories: number;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceAuditApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getLatest(): Observable<WorkspaceAuditReport> {
    return this.http.get<WorkspaceAuditReport>(`${this.base}/workspace-audit/latest`);
  }

  getHistory(): Observable<AuditHistoryEntry[]> {
    return this.http.get<AuditHistoryEntry[]>(`${this.base}/workspace-audit/history`);
  }

  runNow(): Observable<WorkspaceAuditReport> {
    return this.http.post<WorkspaceAuditReport>(`${this.base}/workspace-audit/run`, {});
  }
}
