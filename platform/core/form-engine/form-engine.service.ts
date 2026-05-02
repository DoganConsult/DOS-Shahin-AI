import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormSchema } from './form-schema.types';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class FormEngineService {
  private apiUrl = `${environment.apiUrl || '/api'}/platform/forms`;

  constructor(private http: HttpClient) {}

  getSchema(entityType: string): Observable<FormSchema> {
    return this.http.get<FormSchema>(`${this.apiUrl}/${entityType}`);
  }

  listSchemas(): Observable<{ schemas: any[], count: number }> {
    return this.http.get<{ schemas: any[], count: number }>(this.apiUrl);
  }

  validatePayload(entityType: string, payload: any): Observable<{ valid: boolean, errors?: string[] }> {
    return this.http.post<{ valid: boolean, errors?: string[] }>(`${this.apiUrl}/${entityType}/validate`, payload);
  }
}
