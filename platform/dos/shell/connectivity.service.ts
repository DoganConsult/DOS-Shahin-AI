import { Injectable, signal, computed, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService implements OnDestroy {
  private readonly _online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  private onlineFn = () => this._online.set(true);
  private offlineFn = () => this._online.set(false);

  readonly online = computed(() => this._online());

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineFn);
      window.addEventListener('offline', this.offlineFn);
    }
  }

  isOnline(): boolean {
    return this._online();
  }

  isOffline(): boolean {
    return !this.isOnline();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineFn);
      window.removeEventListener('offline', this.offlineFn);
    }
  }
}
