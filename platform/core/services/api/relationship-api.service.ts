import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EntityRelationship {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationshipType: string;
}

@Injectable({ providedIn: 'root' })
export class RelationshipApiService {
  private readonly http = inject(HttpClient);

  list(entityType: string, entityId: string): Observable<EntityRelationship[]> {
    return this.http.get<EntityRelationship[]>(`/api/relationships/${entityType}/${entityId}`);
  }

  create(relationship: Omit<EntityRelationship, 'id'>): Observable<EntityRelationship> {
    return this.http.post<EntityRelationship>('/api/relationships', relationship);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/relationships/${id}`);
  }
}
