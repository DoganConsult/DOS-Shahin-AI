import { Injectable, inject, effect } from '@angular/core';
import { MobilePlatformService } from './mobile-platform.service';
import { BiometricAuthService } from './biometric-auth.service';
import { PushNotificationService } from './push-notification.service';
import { OfflineSyncService } from './offline-sync.service';
import { CameraEvidenceService } from './camera-evidence.service';
import { WebSocketService } from '@app/websocket';

@Injectable({ providedIn: 'root' })
export class MobileInitService {
  private mobilePlatform = inject(MobilePlatformService);
  private biometric = inject(BiometricAuthService);
  private push = inject(PushNotificationService);
  private offline = inject(OfflineSyncService);
  private camera = inject(CameraEvidenceService);
  private ws = inject(WebSocketService);

  async init(): Promise<void> {
    // Phase 1: Platform (must be first)
    await this.mobilePlatform.init();

    // Phase 2–6: Parallel init of native services
    await Promise.allSettled([
      this.biometric.init(),
      this.push.init(),
    ]);

    // Phase 7: Wire resume handler
    this.wireResumeHandler();
  }

  /** Called when app returns from background */
  async onResume(): Promise<void> {
    await Promise.allSettled([
      this.offline.flush(),
      this.camera.flushQueue(),
    ]);
  }

  /** Called on logout */
  async onLogout(): Promise<void> {
    await this.push.unregisterToken();
    this.biometric.clearSession();
  }

  private wireResumeHandler(): void {
    if (!this.mobilePlatform.isCapacitor) return;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          await this.onResume();
          this.push.clearBadge();
        }
      });
    }).catch(() => { /* ignore */ });
  }
}
