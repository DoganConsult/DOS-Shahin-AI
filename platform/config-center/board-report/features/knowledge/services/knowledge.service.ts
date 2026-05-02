import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/knowledge';

  getArticles(params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/articles`, { params });
  }

  getArticle(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/articles/${id}`);
  }

  getCategories(): Observable<any> {
    return this.http.get(`${this.baseUrl}/categories`);
  }
}
