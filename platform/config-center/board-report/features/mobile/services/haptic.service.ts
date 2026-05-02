import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MobilePlatformService } from './mobile-platform.service';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

@Injectable({ providedIn: 'root' })
export class HapticService {
  private platformId = inject(PLATFORM_ID);
  private mobilePlatform = inject(MobilePlatformService);

  async trigger(style: HapticStyle = 'light'): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.mobilePlatform.isNative()) {
      await this.nativeHaptic(style);
    } else if ('vibrate' in navigator) {
      const pattern = style === 'heavy' ? [40] : style === 'medium' ? [20] : [10];
      navigator.vibrate(pattern);
    }
  }

  private async nativeHaptic(style: HapticStyle): Promise<void> {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      switch (style) {
        case 'light':   await Haptics.impact({ style: ImpactStyle.Light }); break;
        case 'medium':  await Haptics.impact({ style: ImpactStyle.Medium }); break;
        case 'heavy':   await Haptics.impact({ style: ImpactStyle.Heavy }); break;
        case 'success': await Haptics.notification({ type: NotificationType.Success }); break;
        case 'warning': await Haptics.notification({ type: NotificationType.Warning }); break;
        case 'error':   await Haptics.notification({ type: NotificationType.Error }); break;
      }
    } catch { /* ignore */ }
  }
}
