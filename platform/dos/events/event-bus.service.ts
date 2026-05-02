import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '@env/environment';
import type { PlatformEventContract } from './event.contracts';

@Injectable({ providedIn: 'root' })
export class EventBusService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform/events`;
  private localBus = new Subject<PlatformEventContract>();

  readonly events$ = this.localBus.asObservable();

  publish(event: Omit<PlatformEventContract, 'eventId' | 'timestamp'>): Observable<{ eventId: string }> {
    return this.http.post<{ eventId: string }>(this.base, event);
  }

  emit(event: PlatformEventContract): void {
    this.localBus.next(event);
  }

  getRecent(limit = 50): Observable<PlatformEventContract[]> {
    return this.http.get<PlatformEventContract[]>(`${this.base}/recent`, { params: { limit } });
  }
}
