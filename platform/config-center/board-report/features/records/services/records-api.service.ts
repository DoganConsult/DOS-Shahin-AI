import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecordDto {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  description?: string;
  recordType: 'document' | 'policy' | 'evidence' | 'report' | 'correspondence' | 'custom';
  status: 'draft' | 'active' | 'archived' | 'under_review' | 'disposed';
  classification?: string;
  retentionPeriod?: number;
  retentionUnit?: 'days' | 'months' | 'years';
  ownerId?: string;
  ownerName?: string;
  tags: string[];
  legalHold: boolean;
  disposalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordListResponse {
  data: RecordDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RecordDashboard {
  stats: Record<string, number>;
  kpis: Record<string, unknown>;
  typeBreakdown: Record<string, number>;
  classificationBreakdown: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class RecordsApiService {
  private http = inject(HttpClient);
  private base = '/api/records';

  list(params?: { page?: number; limit?: number; status?: string; recordType?: string; classification?: string; search?: string }): Observable<RecordListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.recordType) httpParams = httpParams.set('recordType', params.recordType);
    if (params?.classification) httpParams = httpParams.set('classification', params.classification);
    if (params?.search) httpParams = httpParams.set('q', params.search);
    return this.http.get<RecordListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<RecordDto> {
    return this.http.get<RecordDto>(`${this.base}/${id}`);
  }

  create(data: Partial<RecordDto>): Observable<RecordDto> {
    return this.http.post<RecordDto>(this.base, data);
  }

  update(id: string, data: Partial<RecordDto>): Observable<RecordDto> {
    return this.http.put<RecordDto>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  search(q: string, filters?: Record<string, string>): Observable<RecordListResponse> {
    let httpParams = new HttpParams().set('q', q);
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<RecordListResponse>(`${this.base}/search`, { params: httpParams });
  }

  getDashboard(): Observable<RecordDashboard> {
    return this.http.get<RecordDashboard>(`${this.base}/dashboard`);
  }

  getTrends(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/trends`);
  }

  getExport(filters?: Record<string, string>): Observable<{ rows: unknown[]; total: number }> {
    let httpParams = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<{ rows: unknown[]; total: number }>(`${this.base}/export`, { params: httpParams });
  }

  classify(id: string, classification: string, reason?: string): Observable<RecordDto> {
    return this.http.post<RecordDto>(`${this.base}/${id}/classify`, { classification, reason });
  }

  suggestClassification(title: string, description: string, recordType: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/classify/suggest`, { title, description, recordType });
  }

  applyTags(id: string, tags: string[]): Observable<{ tagged: boolean }> {
    return this.http.post<{ tagged: boolean }>(`${this.base}/${id}/tags`, { tags });
  }

  transition(id: string, status: string, reason?: string): Observable<RecordDto> {
    return this.http.post<RecordDto>(`${this.base}/${id}/transition`, { status, reason });
  }

  getHistory(id: string): Observable<{ history: unknown[] }> {
    return this.http.get<{ history: unknown[] }>(`${this.base}/${id}/history`);
  }

  requestDisposal(id: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/${id}/disposal`, data);
  }

  batchDisposal(recordIds: string[], disposalMethod: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/bulk/disposal`, { recordIds, disposalMethod });
  }

  getCrossModule(linkedModule: string): Observable<{ items: unknown[]; total: number }> {
    return this.http.get<{ items: unknown[]; total: number }>(`${this.base}/cross-module/${linkedModule}`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/records/diagnostics`);
  }
}
