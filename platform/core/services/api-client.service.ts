import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, retry, timer } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  loading = signal(false);
  private activeRequests = 0;

  private trackRequest<T>(obs: Observable<T>): Observable<T> {
    this.activeRequests++;
    this.loading.set(true);
    return obs.pipe(finalize(() => {
      this.activeRequests--;
      if (this.activeRequests <= 0) { this.activeRequests = 0; this.loading.set(false); }
    }));
  }

  private withRetry<T>(obs: Observable<T>): Observable<T> {
    return obs.pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          const status = (error as { status?: number })?.status;
          if (status && status !== 429 && status < 500) {
            throw error;
          }
          const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 4000);
          return timer(delayMs);
        },
      })
    );
  }

  private unwrap<T>(obs: Observable<T>): Observable<T> {
    return obs.pipe(map((res: T) => {
      if (res && typeof res === 'object' && (res as Record<string, unknown>)['success'] === true && 'data' in (res as Record<string, unknown>)) return (res as Record<string, unknown>)['data'] as T;
      return res;
    }));
  }

  get<T = any>(path: string, opts?: { params?: Record<string, string | number | boolean> }): Observable<T> {
    const params = opts?.params ? new HttpParams({ fromObject: opts.params as Record<string, string> }) : undefined;
    return this.unwrap(this.withRetry(this.http.get<T>(`${this.api}${path}`, params ? { params } : undefined)));
  }
  post<T = any>(path: string, body: unknown): Observable<T> { return this.unwrap(this.http.post<T>(`${this.api}${path}`, body)); }
  put<T = any>(path: string, body: unknown): Observable<T> { return this.unwrap(this.http.put<T>(`${this.api}${path}`, body)); }
  patch<T = any>(path: string, body: unknown): Observable<T> { return this.unwrap(this.http.patch<T>(`${this.api}${path}`, body)); }
  del<T = any>(path: string): Observable<T> { return this.unwrap(this.http.delete<T>(`${this.api}${path}`)); }
  delete<T = any>(path: string, opts?: { params?: Record<string, string | number | boolean> }): Observable<T> {
    const params = opts?.params ? new HttpParams({ fromObject: opts.params as Record<string, string> }) : undefined;
    return this.unwrap(this.http.delete<T>(`${this.api}${path}`, params ? { params } : undefined));
  }
  getBlob(path: string): Observable<Blob> {
    return this.withRetry(this.http.get(`${this.api}${path}`, { responseType: 'blob', withCredentials: true }));
  }
  postFormData<T = any>(path: string, body: FormData): Observable<T> { return this.http.post<T>(`${this.api}${path}`, body); }
}
