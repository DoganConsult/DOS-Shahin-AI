import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WsLiveBridgeService {
  private bridgeEvents$ = new Subject<{ channel: string; payload: unknown }>();

  events$ = this.bridgeEvents$.asObservable();

  emit(channel: string, payload: unknown): void {
    this.bridgeEvents$.next({ channel, payload });
  }
}
