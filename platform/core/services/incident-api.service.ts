/**
 * Incident API Service — AGRC-OS
 * Domain service for incident reporting and investigation.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

// -- DTOs --

export interface IncidentDto {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  reportedBy?: string;
  reportedAt?: string;
  category?: string;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  severity: string;
  category?: string;
}

export interface InvestigateIncidentRequest {
  findings?: string;
  rootCause?: string;
  status?: string;
  assignedTo?: string;
}

@Injectable({ providedIn: 'root' })
export class IncidentApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getIncidents(): Observable<IncidentDto[]> {
    return this.http.get<IncidentDto[]>(`${this.base}/incidents`);
  }

  reportIncident(data: CreateIncidentRequest): Observable<IncidentDto> {
    return this.http.post<IncidentDto>(`${this.base}/incidents`, data);
  }

  investigateIncident(id: string, data: InvestigateIncidentRequest): Observable<IncidentDto> {
    return this.http.put<IncidentDto>(`${this.base}/incidents/${id}/investigate`, data);
  }

  getNearMisses(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/incidents/near-misses`);
  }

  getTrends(): Observable<any> {
    return this.http.get<unknown>(`${this.base}/incidents/trends`);
  }
}
