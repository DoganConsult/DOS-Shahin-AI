import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ConnectorDto {
  connector_id: string;
  name: string;
  type: string;
  status: string;
  endpoint_url: string;
  last_sync_at: string;
  created_at: string;
}

export interface SyncResultDto {
  connector_id: string;
  records_synced: number;
  errors: number;
  duration_ms: number;
  completed_at: string;
}

export interface WebhookDto {
  webhook_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class IntegrationsApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  listConnectors(params?: Record<string, string>): Observable<ConnectorDto[]> {
    return this.http.get<ConnectorDto[]>(`${this.base}/integrations/connectors`, { params });
  }

  getConnector(id: string): Observable<ConnectorDto> {
    return this.http.get<ConnectorDto>(`${this.base}/integrations/connectors/${id}`);
  }

  createConnector(data: Partial<ConnectorDto>): Observable<ConnectorDto> {
    return this.http.post<ConnectorDto>(`${this.base}/integrations/connectors`, data);
  }

  updateConnector(id: string, data: Partial<ConnectorDto>): Observable<ConnectorDto> {
    return this.http.patch<ConnectorDto>(`${this.base}/integrations/connectors/${id}`, data);
  }

  deleteConnector(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/integrations/connectors/${id}`);
  }

  testConnector(id: string): Observable<{ success: boolean; latency_ms: number }> {
    return this.http.post<{ success: boolean; latency_ms: number }>(`${this.base}/integrations/connectors/${id}/test`, {});
  }

  syncConnector(id: string, fullSync = false): Observable<SyncResultDto> {
    return this.http.post<SyncResultDto>(`${this.base}/integrations/connectors/${id}/sync`, { full_sync: fullSync });
  }

  getSyncHistory(id: string): Observable<SyncResultDto[]> {
    return this.http.get<SyncResultDto[]>(`${this.base}/integrations/connectors/${id}/sync-history`);
  }

  listWebhooks(): Observable<WebhookDto[]> {
    return this.http.get<WebhookDto[]>(`${this.base}/integrations/webhooks`);
  }

  createWebhook(data: Partial<WebhookDto>): Observable<WebhookDto> {
    return this.http.post<WebhookDto>(`${this.base}/integrations/webhooks`, data);
  }

  deleteWebhook(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/integrations/webhooks/${id}`);
  }

  getConnectorHealth(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/integrations/health`);
  }

  getMarketplace(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/integrations/marketplace`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/integrations/diagnostics`);
  }
}
