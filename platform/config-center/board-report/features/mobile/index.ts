// ─── Services ─────────────────────────────────────────────────────────────
export { MobilePlatformService } from './services/mobile-platform.service';
export { BiometricAuthService } from './services/biometric-auth.service';
export { PushNotificationService } from './services/push-notification.service';
export { SecureStorageService } from './services/secure-storage.service';
export { HapticService } from './services/haptic.service';
export { CameraEvidenceService } from './services/camera-evidence.service';
export { OfflineSyncService } from './services/offline-sync.service';
export { MobileInitService } from './services/mobile-init.service';

// ─── Components ───────────────────────────────────────────────────────────
export { MobileDashboardComponent } from './components/mobile-dashboard.component';
export { MobileTabBarComponent } from './components/mobile-tab-bar.component';

// ─── Directives ───────────────────────────────────────────────────────────
export { PullToRefreshDirective } from './directives/pull-to-refresh.directive';
export { SwipeActionDirective } from './directives/swipe-action.directive';

// ─── Guards ───────────────────────────────────────────────────────────────
// NOTE: biometricGuard was removed when guards/biometric.guard.ts was deleted.
// Re-add when the guard is restored under platform/dauth or mobile feature layer.
// export { biometricGuard } from './guards/biometric.guard';

// ─── Interceptors ─────────────────────────────────────────────────────────
export { offlineInterceptor } from './interceptors/offline.interceptor';

// ─── Dashboards ───────────────────────────────────────────────────────────
export { MobileDashboardComponent as MobileModuleDashboardComponent } from './dashboards/mobile-dashboard.component';
