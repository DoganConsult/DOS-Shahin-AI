/**
 * Entity Link Service (Frontend)
 * 
 * HTTP client for entity link API and graph data fetching.
 * Requirements: 1.5, 1.7
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EntityLink {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType: string;
  targetTitle?: string;
  createdAt?: string;
}

export interface EntityLinkCounts {
  [entityType: string]: number;
}

export interface GraphNode {
  id: string;
  type: string;
  title: string;
  status?: string;
  linkCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  linkType: string;
}

export interface EntityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Injectable({ providedIn: 'root' })
export class EntityLinkService {
  private apiBase = '/api/entity-links';

  constructor(private http: HttpClient) {}

  getLinks(entityType: string, entityId: string): Observable<EntityLink[]> {
    return this.http.get<{ data: EntityLink[] }>(
      `${this.apiBase}/${entityType}/${entityId}`
    ).pipe(map(res => res.data || []));
  }

  getGraph(entityType: string, entityId: string, depth = 2): Observable<EntityGraph> {
    return this.http.get<{ data: EntityGraph }>(
      `${this.apiBase}/${entityType}/${entityId}/graph?depth=${depth}`
    ).pipe(map(res => res.data));
  }

  getCounts(entityType: string, entityId: string): Observable<EntityLinkCounts> {
    return this.http.get<{ data: EntityLinkCounts }>(
      `${this.apiBase}/${entityType}/${entityId}/counts`
    ).pipe(map(res => res.data));
  }

  createLink(link: Omit<EntityLink, 'id'>): Observable<EntityLink> {
    return this.http.post<{ data: EntityLink }>(this.apiBase, link).pipe(map(res => res.data));
  }

  bulkCreateLinks(links: Array<Omit<EntityLink, 'id'>>): Observable<EntityLink[]> {
    return this.http.post<{ data: EntityLink[] }>(
      `${this.apiBase}/bulk`, { links }
    ).pipe(map(res => res.data));
  }

  deleteLink(linkId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${linkId}`);
  }
}
