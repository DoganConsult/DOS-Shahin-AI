import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FitchRule {
  name: string;
  symbol: string;
  label: string;
  description: string;
  citationsRequired: string;
}

export interface ProofLineDto {
  lineNumber?: number;
  formula: string;
  rule: string;
  citations: number[];
  depth: number;
  isAssumption?: boolean;
}

export interface FitchProofSummary {
  id: string;
  name: string;
  premises: string[];
  conclusion: string;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FitchProofDetail {
  id: string;
  name: string;
  premises: string[];
  conclusion: string;
  lines: ProofLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResult {
  valid: boolean;
  errors: Array<{ lineNumber: number; message: string }>;
  completeness: 'complete' | 'incomplete';
}

export interface ExampleProof {
  name: string;
  description: string;
  premises: string[];
  conclusion: string;
  lines: ProofLineDto[];
}

@Injectable({ providedIn: 'root' })
export class FitchApiService {
  private http = inject(HttpClient);
  private base = '/api/fitch';

  listProofs(): Observable<{ proofs: FitchProofSummary[] }> {
    return this.http.get<{ proofs: FitchProofSummary[] }>(`${this.base}/proofs`);
  }

  getProof(id: string): Observable<FitchProofDetail> {
    return this.http.get<FitchProofDetail>(`${this.base}/proofs/${id}`);
  }

  createProof(data: {
    name: string;
    premises: string[];
    conclusion: string;
    lines?: ProofLineDto[];
  }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/proofs`, data);
  }

  updateProof(
    id: string,
    data: Partial<{ name: string; premises: string[]; conclusion: string; lines: ProofLineDto[] }>
  ): Observable<any> {
    return this.http.put(`${this.base}/proofs/${id}`, data);
  }

  deleteProof(id: string): Observable<any> {
    return this.http.delete(`${this.base}/proofs/${id}`);
  }

  verify(data: {
    premises: string[];
    conclusion: string;
    lines: ProofLineDto[];
  }): Observable<VerificationResult> {
    return this.http.post<VerificationResult>(`${this.base}/verify`, data);
  }

  parseFormula(formula: string): Observable<{ ast: Record<string, unknown>; formatted: string }> {
    return this.http.post<{ ast: Record<string, unknown>; formatted: string }>(`${this.base}/parse`, { formula });
  }

  getExamples(): Observable<{ examples: ExampleProof[] }> {
    return this.http.get<{ examples: ExampleProof[] }>(`${this.base}/examples`);
  }

  getRules(): Observable<{ rules: FitchRule[] }> {
    return this.http.get<{ rules: FitchRule[] }>(`${this.base}/rules`);
  }
}
