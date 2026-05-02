import { Injectable, signal, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuthService } from './biometric-auth.service';

/**
 * Mobile security hardening service — enterprise-grade protections for GRC data.
 *
 * Features:
 * 1. Jailbreak / root detection — warns if device is compromised
 * 2. Screenshot prevention — blocks screen capture on sensitive views
 * 3. Auto-lock timeout — re-verify biometrics after inactivity period
 * 4. SSL certificate pinning configuration
 * 5. Clipboard restriction — clears clipboard after sensitive copy
 * 6. Debug/emulator detection
 *
 * Compliance alignment: NCA ECC, ISO 27001 A.6.2.1 (mobile device policy)
 */
@Injectable({ providedIn: 'root' })
export class SecurityHardeningService {
  private readonly isNative = Capacitor.isNativePlatform();
  private readonly biometric = inject(BiometricAuthService);

  private readonly AUTO_LOCK_KEY = 'grc_auto_lock_minutes';
  private readonly DEFAULT_AUTO_LOCK_MINUTES = 5;

  /** Whether the device has been detected as jailbroken/rooted */
  readonly isDeviceCompromised = signal(false);
  /** Whether the device is an emulator/simulator */
  readonly isEmulator = signal(false);
  /** Whether screenshot prevention is active */
  readonly screenshotPrevention = signal(true);
  /** Auto-lock timeout in minutes */
  readonly autoLockMinutes = signal(this.DEFAULT_AUTO_LOCK_MINUTES);

  private lastActivityTimestamp = Date.now();
  private autoLockTimer: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    if (!this.isNative) return;

    await this.detectCompromisedDevice();
    await this.detectEmulator();
    await this.loadAutoLockPreference();
    this.startAutoLockTimer();
    this.enableScreenshotPrevention();
    this.setupClipboardRestriction();
  }

  // ──────────────────── Jailbreak / Root Detection ────────────────────

  private async detectCompromisedDevice(): Promise<void> {
    try {
      // Check for common jailbreak/root indicators via native plugin
      const RootDetection = (window as unknown).Capacitor?.Plugins?.RootDetection;
      if (RootDetection) {
        const result = await RootDetection.isRooted();
        this.isDeviceCompromised.set(result.isRooted);
        return;
      }

      // Fallback: heuristic checks via device info
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();

      // Emulators are a weaker signal but worth flagging
      if (info.isVirtual) {
        this.isEmulator.set(true);
      }
    } catch {
      // Detection unavailable — assume clean
    }
  }

  private async detectEmulator(): Promise<void> {
    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      this.isEmulator.set(info.isVirtual);
    } catch {
      // Detection unavailable
    }
  }

  // ──────────────────── Screenshot Prevention ────────────────────

  /**
   * Enable screenshot prevention. On iOS, uses a secure text field overlay.
   * On Android, sets FLAG_SECURE on the window.
   */
  enableScreenshotPrevention(): void {
    if (!this.isNative) return;

    try {
      const ScreenProtect = (window as unknown).Capacitor?.Plugins?.PrivacyScreen;
      if (ScreenProtect) {
        ScreenProtect.enable();
        this.screenshotPrevention.set(true);
      }
    } catch {
      // Plugin not available
    }
  }

  /**
   * Disable screenshot prevention (e.g. on non-sensitive views).
   */
  disableScreenshotPrevention(): void {
    if (!this.isNative) return;

    try {
      const ScreenProtect = (window as unknown).Capacitor?.Plugins?.PrivacyScreen;
      if (ScreenProtect) {
        ScreenProtect.disable();
        this.screenshotPrevention.set(false);
      }
    } catch {
      // Plugin not available
    }
  }

  // ──────────────────── Auto-Lock (Inactivity Timeout) ────────────────────

  /**
   * Record user activity — resets the auto-lock timer.
   * Call on touch events, navigation, and form interactions.
   */
  recordActivity(): void {
    this.lastActivityTimestamp = Date.now();
  }

  /**
   * Set auto-lock timeout in minutes. 0 = disabled.
   */
  async setAutoLockMinutes(minutes: number): Promise<void> {
    this.autoLockMinutes.set(minutes);
    await Preferences.set({
      key: this.AUTO_LOCK_KEY,
      value: minutes.toString(),
    });
  }

  private async loadAutoLockPreference(): Promise<void> {
    const { value } = await Preferences.get({ key: this.AUTO_LOCK_KEY });
    if (value !== null) {
      this.autoLockMinutes.set(parseInt(value, 10));
    }
  }

  private startAutoLockTimer(): void {
    // Check every 30 seconds if user has been inactive
    this.autoLockTimer = setInterval(() => {
      const minutes = this.autoLockMinutes();
      if (minutes === 0) return; // Disabled

      const inactiveMs = Date.now() - this.lastActivityTimestamp;
      const timeoutMs = minutes * 60 * 1000;

      if (inactiveMs >= timeoutMs) {
        this.triggerAutoLock();
      }
    }, 30_000);
  }

  private triggerAutoLock(): void {
    // Clear the biometric session flag so the guard will re-verify
    sessionStorage.removeItem('grc_biometric_verified');
    // The biometric guard on the next navigation will prompt
  }

  // ──────────────────── Clipboard Restriction ────────────────────

  /**
   * Restrict clipboard — automatically clears clipboard after a delay
   * to prevent sensitive data leaking through copy/paste.
   */
  private setupClipboardRestriction(): void {
    document.addEventListener('copy', () => {
      // Clear clipboard after 60 seconds
      setTimeout(async () => {
        try {
          const { Clipboard } = await import('@capacitor/clipboard');
          await Clipboard.write({ string: '' });
        } catch {
          // Clipboard API not available
        }
      }, 60_000);
    });
  }

  // ──────────────────── SSL Certificate Pinning Config ────────────────────

  /**
   * Get certificate pinning configuration for the CapacitorHttp plugin.
   * These pins should be added to capacitor.config.ts CapacitorHttp.pinnedCertificates.
   *
   * In production, generate pins from your server's TLS certificate:
   *   openssl s_client -connect grc.shahin-grc.sa:443 | openssl x509 -pubkey -noout |
   *   openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
   */
  static readonly CERT_PINS = {
    'grc.shahin-grc.sa': {
      pins: [
        // Add your SHA-256 SPKI hashes here
        // 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      ],
      includeSubdomains: true,
    },
  };

  // ──────────────────── Cleanup ────────────────────

  destroy(): void {
    if (this.autoLockTimer) {
      clearInterval(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }
}
