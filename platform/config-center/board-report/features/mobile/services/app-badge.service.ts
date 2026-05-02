import { Injectable, inject, effect } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { WebSocketService } from '@app/websocket';

/**
 * Native app badge count service — shows unread notification count on the app icon.
 *
 * iOS: Uses LocalNotifications badge API (iOS 16+)
 * Android: Uses badge shortcut API (Android 8+, launcher-dependent)
 *
 * Automatically tracks WebSocket unread count via signal effect.
 */
@Injectable({ providedIn: 'root' })
export class AppBadgeService {
  private readonly isNative = Capacitor.isNativePlatform();
  private readonly wsService = inject(WebSocketService);

  /**
   * Call once during app init to start tracking badge count.
   */
  init(): void {
    if (!this.isNative) return;

    // Watch WebSocket unread count and update native badge
    effect(() => {
      const count = this.wsService.unreadCount();
      this.setBadge(count);
    });
  }

  /**
   * Set the app icon badge to a specific count.
   */
  async setBadge(count: number): Promise<void> {
    if (!this.isNative) return;

    try {
      if (Capacitor.getPlatform() === 'ios') {
        // iOS: Use badge on a pending notification trick, or direct badge API
        // The LocalNotifications plugin can set badge count on iOS
        await (LocalNotifications as unknown).setBadgeCount?.({ count });
      } else {
        // Android: Use ShortcutBadger via the native bridge if available
        const BadgePlugin = (window as unknown).Capacitor?.Plugins?.Badge;
        if (BadgePlugin) {
          await BadgePlugin.set({ count });
        }
      }
    } catch {
      // Badge API not available on this device/OS version
    }
  }

  /**
   * Clear the badge (e.g., when user opens the app or views notifications).
   */
  async clearBadge(): Promise<void> {
    await this.setBadge(0);
  }
}
