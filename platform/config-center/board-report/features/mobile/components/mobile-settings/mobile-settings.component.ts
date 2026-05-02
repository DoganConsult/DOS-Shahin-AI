import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BiometricAuthService } from '../../services/biometric-auth.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { MobilePlatformService } from '../../services/mobile-platform.service';
import { SecureStorageService } from '@app/infrastructure';
import { HapticFeedbackService } from '../../services/haptic-feedback.service';

/**
 * Mobile-specific settings panel for native device preferences.
 *
 * Sections:
 * - Security: biometric toggle, auto-lock timeout
 * - Notifications: push permission status, test push
 * - Offline: cached data size, last sync time, manual sync, clear cache
 * - Device: model info, OS version, app version
 */
@Component({
  selector: 'app-mobile-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (platform.isNative) {
      <div class="mobile-settings">
        <!-- Security Section -->
        <section class="settings-section">
          <h3 class="section-title">
            <span class="material-icons-outlined">security</span>
            {{ isArabic() ? 'الأمان' : 'Security' }}
          </h3>

          <div class="setting-row" (click)="toggleBiometric()">
            <div class="setting-info">
              <span class="setting-label">
                {{ isArabic() ? 'المصادقة البيومترية' : 'Biometric Authentication' }}
              </span>
              <span class="setting-description">
                {{ biometricTypeLabel() }}
              </span>
            </div>
            <div class="toggle" [class.active]="biometric.isBiometricEnabled()">
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </section>

        <!-- Notifications Section -->
        <section class="settings-section">
          <h3 class="section-title">
            <span class="material-icons-outlined">notifications</span>
            {{ isArabic() ? 'الإشعارات' : 'Notifications' }}
          </h3>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">
                {{ isArabic() ? 'إشعارات الدفع' : 'Push Notifications' }}
              </span>
              <span class="setting-description" [class.text-green]="push.permissionGranted()" [class.text-red]="!push.permissionGranted()">
                {{ push.permissionGranted() ? (isArabic() ? 'مفعّل' : 'Enabled') : (isArabic() ? 'معطّل' : 'Disabled') }}
              </span>
            </div>
            <span class="material-icons-outlined chevron">chevron_right</span>
          </div>
        </section>

        <!-- Offline Section -->
        <section class="settings-section">
          <h3 class="section-title">
            <span class="material-icons-outlined">cloud_off</span>
            {{ isArabic() ? 'بيانات بدون إنترنت' : 'Offline Data' }}
          </h3>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">
                {{ isArabic() ? 'العمليات المعلقة' : 'Pending Actions' }}
              </span>
              <span class="setting-description">
                {{ offlineSync.queueLength() }} {{ isArabic() ? 'في الانتظار' : 'queued' }}
              </span>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">
                {{ isArabic() ? 'آخر مزامنة' : 'Last Sync' }}
              </span>
              <span class="setting-description">
                {{ offlineSync.lastSyncAt() || (isArabic() ? 'لم تتم المزامنة بعد' : 'Not yet synced') }}
              </span>
            </div>
          </div>

          <div class="setting-row action" (click)="syncNow()">
            <span class="setting-label action-label">
              {{ isSyncing() ? (isArabic() ? 'جارٍ المزامنة...' : 'Syncing...') : (isArabic() ? 'مزامنة الآن' : 'Sync Now') }}
            </span>
            @if (isSyncing()) {
              <span class="material-icons-outlined spinning">sync</span>
            } @else {
              <span class="material-icons-outlined">sync</span>
            }
          </div>

          <div class="setting-row action danger" (click)="clearCache()">
            <span class="setting-label action-label">
              {{ isArabic() ? 'مسح البيانات المحلية' : 'Clear Cached Data' }}
            </span>
            <span class="material-icons-outlined">delete_outline</span>
          </div>
        </section>

        <!-- Device Info Section -->
        <section class="settings-section">
          <h3 class="section-title">
            <span class="material-icons-outlined">phone_android</span>
            {{ isArabic() ? 'الجهاز' : 'Device' }}
          </h3>

          @if (platform.deviceInfo(); as device) {
            <div class="setting-row">
              <span class="setting-label">{{ isArabic() ? 'الطراز' : 'Model' }}</span>
              <span class="setting-value">{{ device.manufacturer }} {{ device.model }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">{{ isArabic() ? 'نظام التشغيل' : 'OS' }}</span>
              <span class="setting-value">{{ platform.platform | titlecase }} {{ device.osVersion }}</span>
            </div>
          }

          <div class="setting-row">
            <span class="setting-label">{{ isArabic() ? 'المنصة' : 'Platform' }}</span>
            <span class="setting-value">{{ platform.isIOS ? 'iOS' : 'Android' }} (Capacitor)</span>
          </div>
        </section>
      </div>
    }
  `,
  styles: [`
    .mobile-settings {
      padding: 16px;
    }

    .settings-section {
      margin-bottom: 24px;
      background: rgba(var(--color-white-rgb), 0.04);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      margin: 0;
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: rgba(var(--color-white-rgb), 0.5);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .section-title .material-icons-outlined {
      font-size: var(--font-size-lg);
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-top: 1px solid rgba(var(--color-white-rgb), 0.05);
      min-height: 44px;
      -webkit-tap-highlight-color: transparent;
    }

    .setting-row.action {
      cursor: pointer;
    }

    .setting-row.action:active {
      background: rgba(var(--color-white-rgb), 0.05);
    }

    .setting-row.danger {
      color: #ef4444;
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .setting-label {
      font-size: 15px;
      color: rgba(var(--color-white-rgb), 0.9);
    }

    .setting-description {
      font-size: var(--font-size-sm);
      color: rgba(var(--color-white-rgb), 0.4);
    }

    .setting-value {
      font-size: var(--font-size-base);
      color: rgba(var(--color-white-rgb), 0.5);
    }

    .action-label {
      font-weight: 600;
    }

    .text-green { color: #22c55e; }
    .text-red { color: #ef4444; }

    .chevron {
      color: rgba(var(--color-white-rgb), 0.2);
      font-size: var(--font-size-xl);
    }

    /* Toggle switch */
    .toggle {
      width: 44px;
      height: 26px;
      border-radius: 13px;
      background: rgba(var(--color-white-rgb), 0.15);
      position: relative;
      cursor: pointer;
      transition: background 0.25s ease;
    }

    .toggle.active {
      background: #3b82f6;
    }

    .toggle-thumb {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: white;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 0.25s ease;
      box-shadow: 0 1px 3px rgba(var(--color-black-rgb), 0.2);
    }

    .toggle.active .toggle-thumb {
      transform: translateX(18px);
    }

    .spinning {
      animation: spin-icon 1s linear infinite;
    }

    @keyframes spin-icon {
      to { transform: rotate(360deg); }
    }
  `],
})
export class MobileSettingsComponent {
  readonly platform = inject(MobilePlatformService);
  readonly biometric = inject(BiometricAuthService);
  readonly push = inject(PushNotificationService);
  readonly offlineSync = inject(OfflineSyncService);
  private readonly haptic = inject(HapticFeedbackService);
  private readonly secureStorage = inject(SecureStorageService);

  readonly isSyncing = this.offlineSync.syncing;
  readonly isArabic = signal(document.documentElement.getAttribute('lang') === 'ar');

  biometricTypeLabel() {
    const type = (this.biometric as any).biometricType?.() ?? '';
    if (type === 'face') return this.isArabic() ? 'Face ID متاح' : 'Face ID available';
    if (type === 'fingerprint') return this.isArabic() ? 'بصمة الإصبع متاحة' : 'Fingerprint available';
    return this.isArabic() ? 'غير متاح' : 'Not available';
  }

  async toggleBiometric(): Promise<void> {
    await this.haptic.tap();
    if ((this.biometric as any).isBiometricEnabled?.()) {
      await (this.biometric as any).disable();
    } else {
      await (this.biometric as any).enable();
    }
  }

  async syncNow(): Promise<void> {
    await this.haptic.impact();
    const result = await (this.offlineSync as any).syncQueue?.() ?? { synced: 0 };
    if (result.synced > 0) {
      await this.haptic.success();
    }
  }

  async clearCache(): Promise<void> {
    await this.haptic.heavyImpact();
    await (this.offlineSync as any).clearCache?.();
    await this.haptic.success();
  }
}
