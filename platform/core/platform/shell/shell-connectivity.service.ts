/**
 * Browser-only online/offline signal for workspace chrome.
 * No user-facing copy, policy, or banner semantics — consumers derive UX from {@link isOffline}.
 */
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ShellConnectivityService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** True when `navigator.onLine` is false (browser only; stays false in SSR). */
  readonly isOffline = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isOffline.set(!navigator.onLine);
    const onOnline = (): void => {
      this.isOffline.set(false);
    };
    const onOffline = (): void => {
      this.isOffline.set(true);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
  }
}
