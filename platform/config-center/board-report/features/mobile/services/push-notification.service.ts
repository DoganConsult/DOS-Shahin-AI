import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { MobilePlatformService } from './mobile-platform.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private mobilePlatform = inject(MobilePlatformService);

  readonly hasPermission = signal<boolean>(false);
  readonly deviceToken = signal<string | null>(null);
  readonly unreadBadge = signal<number>(0);

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.mobilePlatform.isNative()) return;
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return;
      this.hasPermission.set(true);
      await PushNotifications.register();
      PushNotifications.addListener('registration', token => {
        this.deviceToken.set(token.value);
        this.registerTokenWithBackend(token.value);
      });
      PushNotifications.addListener('pushNotificationReceived', notification => {
        this.unreadBadge.update(n => n + 1);
        this.updateBadge(this.unreadBadge());
      });
      PushNotifications.addListener('pushNotificationActionPerformed', action => {
        // handled by deep link router
      });
    } catch { /* browser fallback */ }
  }

  private registerTokenWithBackend(token: string): void {
    const platform = this.mobilePlatform.isIos() ? 'ios' : 'android';
    this.http.post(`${environment.apiUrl}/mobile/push-token`, { token, platform }).subscribe();
  }

  async unregisterToken(): Promise<void> {
    const token = this.deviceToken();
    if (token) {
      this.http.delete(`${environment.apiUrl}/mobile/push-token`, { body: { token } }).subscribe();
    }
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.unregister();
    } catch { /* ignore */ }
    this.deviceToken.set(null);
  }

  async clearBadge(): Promise<void> {
    this.unreadBadge.set(0);
    await this.updateBadge(0);
  }

  private async updateBadge(count: number): Promise<void> {
    try {
      const { Badge } = await import('@capawesome/capacitor-badge');
      await Badge.set({ count });
    } catch { /* ignore */ }
  }
}
