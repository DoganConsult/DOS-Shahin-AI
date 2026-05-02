import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type MobilePlatform = 'ios' | 'android' | 'web';
export type NetworkStatus = 'online' | 'offline' | 'slow';

@Injectable({ providedIn: 'root' })
export class MobilePlatformService {
  private platformId = inject(PLATFORM_ID);

  // ─── Platform detection ──────────────────────────────────────────────────
  readonly isCapacitor = this.detectCapacitor();
  readonly platform = signal<MobilePlatform>(this.detectPlatform());
  readonly isNative = computed(() => this.isCapacitor && this.platform() !== 'web');
  readonly isIos = computed(() => this.platform() === 'ios');
  readonly isAndroid = computed(() => this.platform() === 'android');

  // ─── Network state ───────────────────────────────────────────────────────
  readonly isOnline = signal<boolean>(isPlatformBrowser(this.platformId) ? navigator.onLine : true);
  readonly networkStatus = signal<NetworkStatus>('online');

  // ─── UI state ────────────────────────────────────────────────────────────
  readonly keyboardOpen = signal<boolean>(false);
  readonly safeAreaTop = signal<number>(0);
  readonly safeAreaBottom = signal<number>(0);

  private detectCapacitor(): boolean {
    return isPlatformBrowser(this.platformId) &&
      typeof (window as any).Capacitor !== 'undefined';
  }

  private detectPlatform(): MobilePlatform {
    if (!isPlatformBrowser(this.platformId)) return 'web';
    const cap = (window as any).Capacitor;
    if (!cap) return 'web';
    const p = cap.getPlatform?.() ?? 'web';
    return p as MobilePlatform;
  }

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Network listeners
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.networkStatus.set('online');
    });
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.networkStatus.set('offline');
    });

    if (this.isCapacitor) {
      await this.initCapacitorPlugins();
    }

    // Apply platform CSS classes to body
    const body = document.body;
    body.classList.add(`plt-${this.platform()}`);
    if (this.isCapacitor) body.classList.add('plt-capacitor');
  }

  private async initCapacitorPlugins(): Promise<void> {
    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.setBackgroundColor({ color: '#0a1628' });
      await StatusBar.setStyle({ style: 'DARK' as any });
    } catch { /* plugin not installed in browser */ }

    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    } catch { /* ignore */ }

    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      Keyboard.addListener('keyboardWillShow', () => this.keyboardOpen.set(true));
      Keyboard.addListener('keyboardWillHide', () => this.keyboardOpen.set(false));
    } catch { /* ignore */ }

    try {
      const { SafeArea } = await import('capacitor-plugin-safe-area');
      const insets = await SafeArea.getSafeAreaInsets();
      this.safeAreaTop.set(insets.insets.top ?? 0);
      this.safeAreaBottom.set(insets.insets.bottom ?? 0);
    } catch { /* ignore */ }
  }

  /** CSS var string for safe area padding */
  get safeAreaStyle(): Record<string, string> {
    return {
      '--safe-top': `${this.safeAreaTop()}px`,
      '--safe-bottom': `${this.safeAreaBottom()}px`,
    };
  }
}
