import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WsLiveBridgeService {
  init(): void {
    console.log('[WsLiveBridgeService] Initialized websocket bridge.');
  }
}
