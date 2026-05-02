import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TestProcedure {
  testId: string;
  testMethod: string;
  procedureSteps: string[];
  expectedResult: string;
}

export interface TestResult {
  resultId: string;
  testId: string;
  result: 'pass' | 'partial' | 'fail' | 'inconclusive';
  notes?: string;
}

export interface EvidenceItem {
  evidenceId: string;
  artifactType: string;
  collectedAt: string;
  qualityTier?: 'A' | 'B' | 'C';
}

export interface WorkpaperControl {
  controlCode: string;
  controlTitle: string;
  testStatus: string;
  evidenceStatus: string;
}

export interface Workpaper {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  testProcedures: TestProcedure[];
  testResults: TestResult[];
  evidence: EvidenceItem[];
  workpaperId?: string;
  workpaperTitle?: string;
  generatedAt?: string;
  controls?: WorkpaperControl[];
  traceabilityMatrix?: TraceabilityMatrixRow[];
}

export interface WorkpaperGenerationRequest {
  auditId: string;
  frameworkId?: string;
  includeTestProcedures?: boolean;
  includeEvidence?: boolean;
  notes?: string;
}

export interface TraceabilityMatrixRow {
  controlId: string;
  controlCode?: string;
  testId: string;
  testProcedureName?: string;
  evidenceId: string;
  result: 'pass' | 'partial' | 'fail' | 'inconclusive';
  testResult?: string;
}

export interface WorkpaperGenerationResult {
  auditId: string;
  auditName?: string;
  workpapers: Workpaper[];
  traceabilityMatrix: TraceabilityMatrixRow[];
  generatedAt: string;
}

export interface BatchWorkpaperRequest {
  auditIds: string[];
}

export interface BatchWorkpaperResult {
  results: WorkpaperGenerationResult[];
}

@Injectable({ providedIn: 'root' })
export class WorkpaperGeneratorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/workpapers';

  /**
   * Generate workpapers for an audit
   */
  generateWorkpapers(request: string | WorkpaperGenerationRequest): Observable<WorkpaperGenerationResult> {
    const body = typeof request === 'string' ? { auditId: request } : request;
    return this.http.post<WorkpaperGenerationResult>(`${this.base}/generate`, body);
  }

  /**
   * Generate workpapers for multiple audits in batch
   */
  generateBatch(request: BatchWorkpaperRequest): Observable<BatchWorkpaperResult> {
    return this.http.post<BatchWorkpaperResult>(`${this.base}/generate/batch`, request);
  }
}
