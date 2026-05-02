import {
  Component, inject, computed, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SessionService } from '@app/dauth/session/session.service';
import { WebSocketService } from '@app/websocket';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';
import { MobilePlatformService } from '../services/mobile-platform.service';
import { OfflineSyncService } from '../services/offline-sync.service';
import { HapticService } from '../services/haptic.service';

interface TabItem {
  path: string;
  icon: string;
  labelEn: string;
  labelAr: string;
  badge?: () => number;
}

@Component({
    selector: 'app-mobile-tab-bar',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
<nav class="mob-tab-bar" [class.rtl]="isRtl()" [class.hidden]="keyboardOpen()"
     [style.padding-bottom]="safeBottom()">
  <button
    *ngFor="let tab of tabs; trackBy: trackByPath"
    class="mob-tab-item"
    [class.active]="isActive(tab.path)"
    (click)="navigate(tab)"
    [attr.aria-label]="isRtl() ? tab.labelAr : tab.labelEn">
    <div class="mob-tab-icon-wrap">
      <span class="mob-tab-icon" [innerHTML]="sanitizeIcon(tab.icon)"></span>
      <span class="mob-tab-badge" *ngIf="tab.badge && tab.badge() > 0">
        {{ tab.badge()! > 9 ? '9+' : tab.badge()! }}
      </span>
    </div>
    <span class="mob-tab-label">{{ isRtl() ? tab.labelAr : tab.labelEn }}</span>
    <div class="mob-tab-active-bar"></div>
  </button>

  <!-- Offline queue indicator -->
  <div class="mob-tab-offline-indicator" *ngIf="queueLength() > 0">
    <span>{{ queueLength() }}</span>
  </div>
</nav>
  `,
    styles: [`
.mob-tab-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: var(--z-sticky);
  background: rgba(var(--color-navy-mid-rgb), 0.96);
  backdrop-filter: blur(24px) saturate(180%);
  border-top: 1px solid rgba(var(--color-white-rgb), 0.06);
  display: flex; align-items: flex-start;
  padding: 8px 0 0;
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 0 -1px 0 rgba(var(--color-white-rgb), 0.04), 0 -8px 32px rgba(var(--color-black-rgb), 0.4);
}

.mob-tab-bar.hidden { transform: translateY(100%); }

.mob-tab-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: none; border: none; cursor: pointer; padding: 0 4px 8px;
  color: rgba(var(--color-white-rgb), 0.4); min-width: 0;
  transition: color 0.2s; position: relative;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.mob-tab-item.active { color: var(--primary); }
.mob-tab-item:active { opacity: 0.7; }

.mob-tab-icon-wrap { position: relative; }
.mob-tab-icon { font-size: var(--font-size-2xl); line-height: 1; display: block; }

.mob-tab-badge {
  position: absolute; top: -4px; right: -8px;
  background: var(--error); color: #fff; font-size: var(--font-size-xs); font-weight: 700;
  border-radius: var(--radius-md); padding: 1px 4px; min-width: 16px; text-align: center;
  border: 2px solid #060d1a;
}

.mob-tab-label { font-size: var(--font-size-xs); font-weight: 500; line-height: 1; white-space: nowrap; }

.mob-tab-active-bar {
  position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
  width: 0; height: 3px; background: var(--primary); border-radius: 0 0 3px 3px;
  transition: width 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.mob-tab-item.active .mob-tab-active-bar { width: 24px; }

.mob-tab-offline-indicator {
  position: absolute; top: 4px; right: 8px;
  background: rgba(var(--module-accent-yellow-rgb), 0.9); color: #000; font-size: var(--font-size-xs); font-weight: 700;
  border-radius: var(--radius-md); padding: 2px 5px;
}

.mob-tab-bar.rtl { direction: rtl; }
  `]
})
export class MobileTabBarComponent {
  private router = inject(Router);
  private auth = inject(SessionService);
  private ws = inject(WebSocketService);
  readonly i18n = inject(I18nService);
  private htmlSanitizer = inject(HtmlSanitizerService);
  private mobilePlatform = inject(MobilePlatformService);
  private offline = inject(OfflineSyncService);
  private haptic = inject(HapticService);

  readonly isRtl = computed(() => this.i18n.direction() === 'rtl');
  readonly keyboardOpen = computed(() => this.mobilePlatform.keyboardOpen());
  readonly safeBottom = computed(() => `${this.mobilePlatform.safeAreaBottom()}px`);
  readonly queueLength = computed(() => this.offline.queueLength());

  private currentPath = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url }
  );

  readonly tabs: TabItem[] = [
    {
      path: '/mobile-dashboard',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      labelEn: 'Dashboard', labelAr: 'لوحة التحكم',
    },
    {
      path: '/risks',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      labelEn: 'Risks', labelAr: 'المخاطر',
    },
    {
      path: '/approval-center',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      labelEn: 'Approve', labelAr: 'موافقات',
      badge: () => this.ws.unreadCount?.() ?? 0,
    },
    {
      path: '/ai-hub',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>`,
      labelEn: 'AI', labelAr: 'الذكاء',
    },
    {
      path: '/agrc-os',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/></svg>`,
      labelEn: 'AGRC-OS', labelAr: 'النظام',
    },
  ];

  isActive(path: string): boolean {
    return this.currentPath()?.startsWith(path) ?? false;
  }

  async navigate(tab: TabItem): Promise<void> {
    await this.haptic.trigger('light');
    this.router.navigate([tab.path]);
  }

  trackByPath(_: number, tab: TabItem): string { return tab.path; }

  sanitizeIcon(icon: string): any {
    return this.htmlSanitizer.sanitizeSvg(icon);
  }
}
