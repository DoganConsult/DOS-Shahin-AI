import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WorkspaceCollabApiService {
  private readonly http = inject(HttpClient);

  getActiveUsers(workspaceId: string): Observable<{ userId: string; status: string }[]> {
    return this.http.get<{ userId: string; status: string }[]>(`/api/workspaces/${workspaceId}/active-users`);
  }
}
