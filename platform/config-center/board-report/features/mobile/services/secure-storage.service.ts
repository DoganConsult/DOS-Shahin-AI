import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MobilePlatformService } from './mobile-platform.service';

@Injectable({ providedIn: 'root' })
export class SecureStorageService {
  private platformId = inject(PLATFORM_ID);
  private mobilePlatform = inject(MobilePlatformService);

  async set(key: string, value: string): Promise<void> {
    if (this.mobilePlatform.isNative()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        // For truly sensitive data, use NativeBiometric.setCredentials or SecureStoragePlugin
        await Preferences.set({ key: `secure_${key}`, value });
      } catch { localStorage.setItem(key, value); }
    } else {
      localStorage.setItem(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.mobilePlatform.isNative()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key: `secure_${key}` });
        return result.value;
      } catch { return localStorage.getItem(key); }
    }
    return localStorage.getItem(key);
  }

  async remove(key: string): Promise<void> {
    if (this.mobilePlatform.isNative()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: `secure_${key}` });
      } catch { /* ignore */ }
    }
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    if (this.mobilePlatform.isNative()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.clear();
      } catch { /* ignore */ }
    }
    localStorage.clear();
  }
}
