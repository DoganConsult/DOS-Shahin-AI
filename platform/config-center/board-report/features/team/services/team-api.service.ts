import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private http = inject(HttpClient);
  private base = '/api/team';

  getDashboard(): Observable<any> {
    return this.http.get(`${this.base}/dashboard`);
  }

  list(): Observable<any> {
    return this.http.get(this.base);
  }
}
