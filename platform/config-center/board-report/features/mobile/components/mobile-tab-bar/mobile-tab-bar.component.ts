import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MobilePlatformService } from '../../services/mobile-platform.service';
import { HapticFeedbackService } from '../../services/haptic-feedback.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { WebSocketService } from '@app/websocket';

interface TabItem {
  label: string;
  labelAr: string;
  icon: string;
  route: string;
  badge?: () => number;
}

/**
 * Native-feel bottom tab bar for mobile navigation.
 *
 * Replaces the sidebar on small screens with a thumb-friendly tab bar
 * featuring the 5 most-used GRC modules. Includes:
 * - Haptic feedback on tab switch
 * - Offline indicator badge
 * - RTL-aware layout
 * - Safe area padding for iPhone notch/home indicator
 * - Badge count for pending notifications
 */
@Component({
  selector: 'app-mobile-tab-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (platform.isNative) {
      <nav class="mobile-tab-bar" [class.offline]="offlineSync.isOffline()">
        <!-- Offline banner -->
        @if (offlineSync.isOffline()) {
          <div class="offline-banner">
            <span class="offline-dot"></span>
            <span>{{ isArabic() ? 'غير متصل' : 'Offline' }}</span>
            @if (offlineSync.hasPendingChanges()) {
              <span class="pending-count">{{ offlineSync.queueLength() }}</span>
            }
          </div>
        }

        <div class="tab-items">
          @for (tab of tabs; track tab.route) {
            <a
              [routerLink]="tab.route"
              routerLinkActive="active"
              class="tab-item"
              (click)="onTabTap(tab)"
            >
              <span class="material-icons-outlined tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ isArabic() ? tab.labelAr : tab.label }}</span>
              @if (tab.badge && tab.badge() > 0) {
                <span class="tab-badge">{{ tab.badge() > 99 ? '99+' : tab.badge() }}</span>
              }
            </a>
          }
        </div>
      </nav>
    }
  `,
  styles: [`
    .mobile-tab-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: var(--z-modal);
      background: rgba(var(--color-navy-deep-rgb), 0.95);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-top: 1px solid rgba(var(--color-white-rgb), 0.08);
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .offline-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 0;
      background: rgba(var(--module-accent-amber-rgb), 0.15);
      color: #fbbf24;
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .offline-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f59e0b;
      animation: pulse-dot 2s ease-in-out infinite;
    }

    .pending-count {
      background: #f59e0b;
      color: #0a1628;
      font-size: var(--font-size-nano);
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-md);
    }

    .tab-items {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 6px 0 2px;
    }

    .tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 4px 12px;
      text-decoration: none;
      color: rgba(var(--color-white-rgb), 0.45);
      transition: color 0.2s ease, transform 0.15s ease;
      position: relative;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    .tab-item:active {
      transform: scale(0.92);
    }

    .tab-item.active {
      color: #3b82f6;
    }

    .tab-item.active .tab-icon {
      text-shadow: 0 0 12px rgba(var(--module-accent-blue-rgb), 0.4);
    }

    .tab-icon {
      font-size: 22px;
      line-height: 1;
    }

    .tab-label {
      font-size: var(--font-size-nano);
      font-weight: 600;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }

    .tab-badge {
      position: absolute;
      top: 0;
      right: 4px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: var(--radius);
      background: #ef4444;
      color: white;
      font-size: var(--font-size-nano);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `],
})
export class MobileTabBarComponent {
  readonly platform = inject(MobilePlatformService);
  readonly offlineSync = inject(OfflineSyncService);
  private readonly haptic = inject(HapticFeedbackService);
  private readonly router = inject(Router);
  private readonly wsService = inject(WebSocketService);

  /** Live notification count from WebSocket service */
  readonly notificationCount = this.wsService.unreadCount;

  readonly isArabic = signal(
    document.documentElement.getAttribute('lang') === 'ar'
  );

  readonly tabs: TabItem[] = [
    // Home tab removed — landing route is DB-owned (dos.tenant_landing_config
    // via UI-OS resolver). NO FRONTEND INVENTION (AGENTS.md).
    {
      label: 'Risks',
      labelAr: 'المخاطر',
      icon: 'warning_amber',
      route: '/risks',
    },
    {
      label: 'Controls',
      labelAr: 'الضوابط',
      icon: 'verified_user',
      route: '/controls',
    },
    {
      label: 'Evidence',
      labelAr: 'الأدلة',
      icon: 'fact_check',
      route: '/evidence',
    },
    {
      label: 'Alerts',
      labelAr: 'التنبيهات',
      icon: 'notifications',
      route: '/activity-feed',
      badge: () => this.notificationCount(),
    },
  ];

  async onTabTap(tab: TabItem): Promise<void> {
    await this.haptic.tap();
  }
}
