import { Injectable, signal, computed } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Network, type ConnectionStatus } from '@capacitor/network';
type ConnectionType = any;

export type NetworkQuality = 'excellent' | 'good' | 'weak' | 'offline';

/**
 * Network quality indicator — goes beyond simple online/offline detection.
 *
 * Provides:
 * - Connection type detection (WiFi, 4G, 3G, 2G, none)
 * - Quality tier mapping for UI indicators
 * - Arabic/English labels
 * - Auto-save warning for weak connections
 */
@Injectable({ providedIn: 'root' })
export class NetworkQualityService {
  private readonly isNative = Capacitor.isNativePlatform();

  readonly connectionType = signal<ConnectionType>('any');
  readonly isConnected = signal(true);

  readonly quality = computed<NetworkQuality>(() => {
    if (!this.isConnected()) return 'offline';

    const type = this.connectionType();
    switch (type) {
      case 'wifi':
        return 'excellent';
      case '4g':
        return 'good';
      case '3g':
        return 'weak';
      case '2g':
        return 'weak';
      case 'cellular':
        return 'good'; // Generic cellular — assume decent
      case 'none':
        return 'offline';
      default:
        return 'good'; // Unknown — assume good
    }
  });

  readonly qualityLabel = computed(() => {
    const labels: Record<NetworkQuality, { en: string; ar: string }> = {
      excellent: { en: 'Excellent', ar: 'ممتاز' },
      good: { en: 'Good', ar: 'جيد' },
      weak: { en: 'Weak', ar: 'ضعيف' },
      offline: { en: 'Offline', ar: 'غير متصل' },
    };
    return labels[this.quality()];
  });

  readonly qualityColor = computed(() => {
    const colors: Record<NetworkQuality, string> = {
      excellent: '#22c55e',
      good: '#3b82f6',
      weak: '#f59e0b',
      offline: '#ef4444',
    };
    return colors[this.quality()];
  });

  readonly qualityIcon = computed(() => {
    const icons: Record<NetworkQuality, string> = {
      excellent: 'signal_wifi_4_bar',
      good: 'network_wifi_3_bar',
      weak: 'network_wifi_1_bar',
      offline: 'signal_wifi_off',
    };
    return icons[this.quality()];
  });

  /** True if connection is too weak for large uploads (evidence photos) */
  readonly isWeakForUploads = computed(() => {
    return this.quality() === 'weak' || this.quality() === 'offline';
  });

  async init(): Promise<void> {
    if (!this.isNative) return;

    const status = await Network.getStatus();
    this.isConnected.set(status.connected);
    this.connectionType.set(status.connectionType);

    await Network.addListener('networkStatusChange', (s) => {
      this.isConnected.set(s.connected);
      this.connectionType.set(s.connectionType);
    });
  }
}
