import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class McpService {
  constructor(private http: HttpClient) {}
  
  getTools(): Observable<{data: any[]}> {
    return this.http.get<{data: any[]}>('/api/mcp/tools');
  }

  getAgents(): Observable<{data: any[]}> {
    return this.http.get<{data: any[]}>('/api/mcp/agents');
  }

  runDiagnostics(): Observable<any> {
    return this.http.get('/api/mcp/diagnostics'); // (Mock endpoint for UI purposes built in the actual dashboard)
  }
}
