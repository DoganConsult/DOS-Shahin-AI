import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CollaborationApiService {
  private readonly http = inject(HttpClient);

  getCollaborators(workspaceId: string): Observable<{ userId: string; role: string }[]> {
    return this.http.get<{ userId: string; role: string }[]>(`/api/workspaces/${workspaceId}/collaborators`);
  }

  invite(workspaceId: string, userId: string, role: string): Observable<void> {
    return this.http.post<void>(`/api/workspaces/${workspaceId}/collaborators`, { userId, role });
  }
}
