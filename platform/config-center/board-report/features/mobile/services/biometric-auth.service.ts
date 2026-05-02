import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MobilePlatformService } from './mobile-platform.service';

export type BiometricType = 'faceId' | 'fingerprint' | 'none';

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  private platformId = inject(PLATFORM_ID);
  private mobilePlatform = inject(MobilePlatformService);

  readonly available = signal<boolean>(false);
  readonly type = signal<BiometricType>('none');
  readonly sessionVerified = signal<boolean>(false);

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.mobilePlatform.isNative()) return;
    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable();
      this.available.set(result.isAvailable);
      if (result.isAvailable) {
        this.type.set(result.biometryType === 1 ? 'fingerprint' : 'faceId');
      }
    } catch { this.available.set(false); }
  }

  async verify(reason: string = 'Verify your identity'): Promise<boolean> {
    if (!this.available()) return true; // fallback: allow on web
    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      await NativeBiometric.verifyIdentity({ reason, title: 'Shahin GRC', subtitle: reason });
      this.sessionVerified.set(true);
      return true;
    } catch {
      return false;
    }
  }

  clearSession(): void {
    this.sessionVerified.set(false);
  }

  get typeLabel(): string {
    return this.type() === 'faceId' ? 'Face ID' : this.type() === 'fingerprint' ? 'Fingerprint' : 'None';
  }
}
