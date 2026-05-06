// =====================================================================
// Shahin GRC — Mobile AGRC-OS Command Center
// Premium mobile dashboard with live signals, biometric auth,
// offline-first, Arabic/English RTL support
// =====================================================================

import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { NgIf, NgFor, DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { SessionService } from '@app/dauth/session/session.service';
import { WebSocketService } from '@app/core/services/websocket/websocket-notification.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { MobilePlatformService } from '../services/mobile-platform.service';
import { OfflineSyncService } from '../services/offline-sync.service';
import { HapticService } from '../services/haptic.service';
import { CameraEvidenceService } from '../services/camera-evidence.service';
import { PushNotificationService } from '../services/push-notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

import { MobileStatsGridComponent, MobileDashStats } from './mobile-stats-grid.component';
import { MobileRiskCardsComponent, MobileRiskItem } from './mobile-risk-cards.component';
import { MobileActivityFeedComponent, MobileActivityItem, MobileDeadline } from './mobile-activity-feed.component';
import { MobileQuickActionsComponent } from './mobile-quick-actions.component';

// ─── Full stats shape (includes hero card fields) ────────────────────────────

interface DashStats extends MobileDashStats {
  complianceScore: number;
  openRisks: number;
  daysToAudit: number;
  teamHealth: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
    selector: 'app-mobile-dashboard',
    imports: [
        NgIf, NgFor, RouterModule, DecimalPipe, DatePipe,
        MobileStatsGridComponent, MobileRiskCardsComponent,
        MobileActivityFeedComponent, MobileQuickActionsComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
<div class="mob-dash" [class.rtl]="isRtl()" [class.offline]="isOffline()">

  <!-- Top Status Bar -->
  <div class="mob-status-bar">
    <div class="mob-status-left">
      <div class="mob-avatar">{{ userInitials() }}</div>
      <div class="mob-greeting">
        <span class="mob-greeting-text">{{ greeting() }}</span>
        <span class="mob-user-name">{{ userName() }}</span>
      </div>
    </div>
    <div class="mob-status-right">
      <button class="mob-icon-btn" [class.has-badge]="unreadCount() > 0"
              (click)="goTo('/notification-center')" aria-label="Notifications">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="mob-badge" *ngIf="unreadCount() > 0">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
      </button>
      <button class="mob-icon-btn" (click)="refresh()" [class.spinning]="loading()" aria-label="Refresh">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Offline Banner -->
  <div class="mob-offline-bar" *ngIf="isOffline()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
    {{ isRtl() ? 'وضع عدم الاتصال — ' : 'Offline — ' }}{{ queueLength() | number }}{{ isRtl() ? ' طلب في الانتظار' : ' requests queued' }}
  </div>

  <!-- Compliance Hero Card -->
  <div tabindex="0" role="button" (keyup.enter)="goTo('/agrc-os')" class="mob-hero-card" (click)="goTo('/agrc-os')">
    <div class="mob-hero-glow"></div>
    <div class="mob-hero-content">
      <div class="mob-ring-container">
        <svg class="mob-ring-svg" viewBox="0 0 120 120" width="120" height="120">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--hub-compliance)"/>
              <stop offset="50%" stop-color="var(--role-analyst)"/>
              <stop offset="100%" stop-color="var(--hub-vendor)"/>
            </linearGradient>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(var(--color-white-rgb), 0.08)" stroke-width="8"/>
          <circle cx="60" cy="60" r="50" fill="none"
                  stroke="url(#ringGrad)" stroke-width="8"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="ringDasharray()"
                  [attr.stroke-dashoffset]="ringOffset()"
                  transform="rotate(-90 60 60)"
                  filter="url(#ringGlow)"
                  class="mob-ring-progress"/>
          <text x="60" y="54" text-anchor="middle" fill="white" font-size="22" font-weight="800" font-family="Inter">{{ stats()?.complianceScore ?? '--' }}</text>
          <text x="60" y="70" text-anchor="middle" fill="rgba(var(--color-white-rgb), 0.5)" font-size="10" font-family="Inter">{{ isRtl() ? 'امتثال' : 'SCORE' }}</text>
        </svg>
        <div class="mob-ring-pulse"></div>
      </div>
      <div class="mob-hero-info">
        <div class="mob-hero-title">
          <span class="mob-hero-label">{{ isRtl() ? 'نظام AGRC-OS' : 'AGRC-OS System' }}</span>
          <span class="mob-health-dot" [class]="'health-' + systemHealth()"></span>
        </div>
        <div class="mob-hero-stat">
          <span class="mob-hero-val">{{ stats()?.openRisks ?? '--' }}</span>
          <span class="mob-hero-unit">{{ isRtl() ? 'مخاطر مفتوحة' : 'Open Risks' }}</span>
        </div>
        <div class="mob-hero-stat">
          <span class="mob-hero-val">{{ stats()?.daysToAudit ?? '--' }}</span>
          <span class="mob-hero-unit">{{ isRtl() ? 'يوم للتدقيق' : 'Days to Audit' }}</span>
        </div>
        <div class="mob-hero-stat">
          <span class="mob-hero-val team-health">{{ stats()?.teamHealth ?? '--' }}%</span>
          <span class="mob-hero-unit">{{ isRtl() ? 'صحة الفريق' : 'Team Health' }}</span>
        </div>
        <div class="mob-hero-meta">
          <span class="mob-hero-unit">{{ lastRefresh() | date:'shortTime' }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats Grid (sub-component) -->
  <app-mobile-stats-grid [stats]="stats()" (navigate)="goTo($event)" />

  <!-- Risk Cards (sub-component) -->
  <app-mobile-risk-cards [risks]="topRisks()" [loading]="loading()" (navigate)="goTo($event)" />

  <!-- Activity Feed + Deadlines (sub-component) -->
  <app-mobile-activity-feed
    [activityFeed]="activityFeed()"
    [deadlines]="deadlines()"
    [loading]="loading()"
    (navigate)="goTo($event)" />

  <!-- Loading Skeleton -->
  <div class="mob-skeleton-overlay" *ngIf="loading()">
    <div class="mob-skeleton mob-skeleton-hero"></div>
    <div class="mob-skeleton-row">
      <div class="mob-skeleton mob-skeleton-card" *ngFor="let i of [1,2,3]"></div>
    </div>
  </div>

  <!-- Quick Actions FAB (sub-component) -->
  <app-mobile-quick-actions
    [fabExpanded]="fabExpanded()"
    [isNativeApp]="isNativeApp()"
    (toggleFab)="toggleFab()"
    (captureEvidence)="captureEvidence()"
    (navigate)="goTo($event)" />

  <!-- Bottom padding for tab bar -->
  <div class="mob-bottom-spacer"></div>

</div>
  `,
    styles: [`
/* Mobile Dashboard — Core Layout Styles */
.mob-dash {
  min-height: 100dvh;
  background: var(--bg-0);
  color: var(--text-on-primary);
  font-family: var(--font-body, 'Inter', sans-serif);
  overflow-x: hidden;
  position: relative;
}
.mob-dash.rtl { direction: rtl; font-family: 'Tajawal', 'IBM Plex Sans Arabic', sans-serif; }

/* Status bar */
.mob-status-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px 8px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: var(--glass-navbar);
  backdrop-filter: blur(20px);
  position: sticky; top: 0; z-index: var(--z-dropdown);
  border-bottom: 1px solid rgba(var(--color-white-rgb), 0.04);
}
.mob-status-left { display: flex; align-items: center; gap: 10px; }
.mob-avatar {
  width: 36px; height: 36px; border-radius: var(--radius-pill);
  background: linear-gradient(135deg, var(--primary), var(--primary));
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-sm); font-weight: 700; color: var(--text-on-primary);
  box-shadow: var(--shadow-glow);
}
.mob-greeting { display: flex; flex-direction: column; }
.mob-greeting-text { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.4); line-height: 1; }
.mob-user-name { font-size: var(--font-size-base); font-weight: 600; line-height: 1.4; }
.mob-status-right { display: flex; align-items: center; gap: 4px; }
.mob-icon-btn {
  width: 40px; height: 40px; border-radius: var(--radius-lg);
  background: rgba(var(--color-white-rgb), 0.06);
  border: none; color: rgba(var(--color-white-rgb), 0.7); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  position: relative; transition: background 0.2s;
}
.mob-icon-btn:active { background: rgba(var(--color-white-rgb), 0.12); }
.mob-icon-btn.spinning svg { animation: spin 0.7s linear infinite; }
.mob-badge {
  position: absolute; top: 6px; right: 6px;
  background: var(--error); color: var(--text-on-primary); font-size: var(--font-size-xs); font-weight: 700;
  border-radius: var(--radius-md); padding: 1px 4px; min-width: 16px; text-align: center;
  border: 2px solid var(--bg-0);
}

/* Offline banner */
.mob-offline-bar {
  background: color-mix(in srgb, var(--warning) 15%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
  color: var(--warning); font-size: var(--font-size-xs); font-weight: 500;
  padding: 6px 16px; display: flex; align-items: center; gap: 6px;
}

/* Hero card */
.mob-hero-card {
  margin: 16px; border-radius: var(--radius-xl); overflow: hidden;
  background: linear-gradient(135deg, color-mix(in srgb, var(--hub-compliance) 15%, transparent) 0%, color-mix(in srgb, var(--hub-governance) 15%, transparent) 50%, rgba(var(--module-accent-emerald-rgb), 0.1) 100%);
  border: 1px solid color-mix(in srgb, var(--hub-compliance) 20%, transparent);
  position: relative; cursor: pointer;
  box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(var(--color-white-rgb), 0.05);
  transition: transform 0.15s, box-shadow 0.15s;
}
.mob-hero-card:active { transform: scale(0.98); box-shadow: var(--shadow-md); }
.mob-hero-glow {
  position: absolute; inset: -20px; z-index: 0;
  background: radial-gradient(ellipse at 30% 50%, color-mix(in srgb, var(--hub-compliance) 12%, transparent) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, color-mix(in srgb, var(--hub-governance) 10%, transparent) 0%, transparent 50%);
  pointer-events: none;
}
.mob-hero-content {
  position: relative; z-index: var(--z-base);
  display: flex; align-items: center; gap: 16px; padding: 20px;
}
.mob-ring-container { position: relative; flex-shrink: 0; }
.mob-ring-progress { transition: stroke-dashoffset 1.5s cubic-bezier(0.34,1.56,0.64,1); }
.mob-ring-pulse {
  position: absolute; inset: -8px; border-radius: var(--radius-pill);
  background: transparent;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--hub-compliance) 40%, transparent);
  animation: ringPulse 3s ease-out infinite;
}
.mob-hero-info { flex: 1; min-width: 0; }
.mob-hero-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.mob-hero-label { font-size: var(--font-size-sm); font-weight: 600; color: rgba(var(--color-white-rgb), 0.6); text-transform: uppercase; letter-spacing: 0.05em; }
.mob-health-dot {
  width: 8px; height: 8px; border-radius: var(--radius-pill);
  &.health-healthy { background: var(--severity-low); box-shadow: var(--shadow-glow); animation: healthPulse 2s ease-in-out infinite; }
  &.health-warning { background: var(--warning); box-shadow: var(--shadow-glow); }
  &.health-critical { background: var(--error); box-shadow: var(--shadow-glow); animation: healthPulse 1s ease-in-out infinite; }
}
.mob-hero-stat { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
.mob-hero-val { font-size: var(--font-size-2xl); font-weight: 800; line-height: 1; }
.mob-hero-unit { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.45); }
.team-health { color: var(--severity-low); }

/* Skeleton */
.mob-skeleton-overlay { position: absolute; inset: 0; z-index: var(--z-base); padding: 16px; background: var(--bg-0); }
.mob-skeleton { background: linear-gradient(90deg, rgba(var(--color-white-rgb), 0.04) 0%, rgba(var(--color-white-rgb), 0.08) 50%, rgba(var(--color-white-rgb), 0.04) 100%); background-size: 200% 100%; border-radius: var(--radius-xl); animation: shimmer 1.5s infinite; }
.mob-skeleton-hero { height: 140px; margin-bottom: 16px; }
.mob-skeleton-row { display: flex; gap: 10px; }
.mob-skeleton-card { height: 100px; flex: 1; border-radius: var(--radius-xl); }

/* RTL adjustments */
.mob-dash.rtl .mob-fab-container { right: auto; left: 20px; }

/* Bottom spacer */
.mob-bottom-spacer { height: calc(90px + env(safe-area-inset-bottom)); }

/* Animations */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes ringPulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--hub-compliance) 40%, transparent); } 70% { box-shadow: 0 0 0 16px color-mix(in srgb, var(--hub-compliance) 0%, transparent); } 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--hub-compliance) 0%, transparent); } }
@keyframes healthPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `]
})
export class MobileDashboardComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(SessionService);
  private ws = inject(WebSocketService);
  readonly i18n = inject(I18nService);
  private offlineSync = inject(OfflineSyncService);
  private haptic = inject(HapticService);
  private camera = inject(CameraEvidenceService);
  private mobilePlatform = inject(MobilePlatformService);
  private destroyRef = inject(DestroyRef);

  readonly isNativeApp = this.mobilePlatform.isNative;

  // ─── State signals ────────────────────────────────────────────────────────
  readonly loading = signal<boolean>(true);
  readonly lastRefresh = signal<Date>(new Date());
  readonly stats = signal<DashStats | null>(null);
  readonly topRisks = signal<MobileRiskItem[]>([]);
  readonly activityFeed = signal<MobileActivityItem[]>([]);
  readonly deadlines = signal<MobileDeadline[]>([]);
  readonly fabExpanded = signal<boolean>(false);

  // ─── Computed ─────────────────────────────────────────────────────────────
  readonly isRtl = computed(() => this.i18n.direction() === 'rtl');
  readonly isOffline = computed(() => !this.mobilePlatform.isOnline());
  readonly queueLength = computed(() => this.offlineSync.queueLength());
  readonly unreadCount = computed(() => this.ws.unreadCount?.() ?? 0);

  readonly ringDasharray = computed(() => {
    const circumference = 2 * Math.PI * 50;
    return `${circumference} ${circumference}`;
  });

  readonly ringOffset = computed(() => {
    const circumference = 2 * Math.PI * 50;
    const score = this.stats()?.complianceScore ?? 0;
    return circumference - (score / 100) * circumference;
  });

  readonly systemHealth = computed(() => {
    const score = this.stats()?.complianceScore ?? 0;
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  });

  readonly userInitials = computed(() => {
    const name = this.auth.userProfile()?.name ?? 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  readonly userName = computed(() => this.auth.userProfile()?.name ?? '');

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (this.isRtl()) {
      return h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء النور';
    }
    return h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadDashboard();
    interval(120_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadDashboard(false));
  }

  // ─── Data loading ─────────────────────────────────────────────────────────

  loadDashboard(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    const cached = this.offlineSync.cacheGet<any>('mobile_dashboard');
    if (cached) {
      this.applyDashboardData(cached);
      if (showLoading) this.loading.set(false);
    }
    this.http.get<any>(`${environment.apiUrl}/mobile/dashboard`).subscribe({
      next: data => {
        this.offlineSync.cacheSet('mobile_dashboard', data, 120_000);
        this.applyDashboardData(data);
        this.lastRefresh.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        if (!cached) this.applyDashboardData(this.getMockData());
        this.loading.set(false);
      },
    });
  }

  private applyDashboardData(data: GrcRecord): void {
    this.stats.set(data.stats ?? this.getMockData().stats);
    this.topRisks.set(data.risks ?? this.getMockData().risks);
    this.activityFeed.set(data.activity ?? this.getMockData().activity);
    this.deadlines.set(data.deadlines ?? this.getMockData().deadlines);
  }

  async refresh(): Promise<void> {
    await this.haptic.trigger('light');
    this.loadDashboard();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async toggleFab(): Promise<void> {
    await this.haptic.trigger('light');
    this.fabExpanded.update(v => !v);
  }

  async captureEvidence(): Promise<void> {
    this.fabExpanded.set(false);
    await this.haptic.trigger('medium');
    const result = await this.camera.capturePhoto();
    if (result) {
      await this.haptic.trigger('success');
      this.goTo('/evidence-tasks');
    }
  }

  goTo(path: string): void {
    this.fabExpanded.set(false);
    this.router.navigate([path]);
  }

  // ─── Mock data (fallback when API unavailable) ────────────────────────────

  private getMockData() {
    return {
      stats: {
        complianceScore: 78, openRisks: 14, pendingControls: 23,
        evidenceQueue: 7, activePolicies: 42, frameworks: 5,
        aiInsights: 9, openIncidents: 3, daysToAudit: 28, teamHealth: 91,
      } as DashStats,
      risks: [
        { id: '1', title: 'Access Control Gap — Finance Systems', titleAr: 'ثغرة في ضبط الوصول — الأنظمة المالية', severity: 'critical', dueDate: '2026-03-10', owner: 'A. Al-Rashidi', trend: 'up' },
        { id: '2', title: 'Third-party Vendor SLA Breach', titleAr: 'خرق اتفاقية مستوى الخدمة', severity: 'high', dueDate: '2026-03-15', owner: 'S. Hassan', trend: 'stable' },
        { id: '3', title: 'Data Retention Policy Expiry', titleAr: 'انتهاء سياسة الاحتفاظ بالبيانات', severity: 'medium', dueDate: '2026-03-22', owner: 'N. Al-Otaibi', trend: 'down' },
      ] as MobileRiskItem[],
      activity: [
        { id: '1', type: 'policy', title: 'Information Security Policy approved', titleAr: 'اعتماد سياسة أمن المعلومات', time: '5m ago', user: 'Dogan Consult', icon: '📋' },
        { id: '2', type: 'ai', title: 'AI detected anomaly in access logs', titleAr: 'الذكاء الاصطناعي اكتشف شذوذاً', time: '12m ago', user: 'AI Agent', icon: '🤖' },
        { id: '3', type: 'evidence', title: 'Control evidence uploaded — ISO 27001', titleAr: 'تم رفع أدلة الضبط — ISO 27001', time: '1h ago', user: 'M. Al-Ghamdi', icon: '📎' },
        { id: '4', type: 'risk', title: 'Risk re-assessed: Vendor Access', titleAr: 'إعادة تقييم مخاطر وصول المورّد', time: '2h ago', user: 'Risk Team', icon: '⚠️' },
        { id: '5', type: 'control', title: 'Control implemented: MFA enforcement', titleAr: 'تنفيذ الضبط: إلزام المصادقة المتعددة', time: '3h ago', user: 'IT Security', icon: '🛡️' },
      ] as MobileActivityItem[],
      deadlines: [
        { id: '1', title: 'SAMA Compliance Audit', titleAr: 'تدقيق الامتثال لساما', daysLeft: 28, type: 'audit', urgent: false },
        { id: '2', title: 'ISO 27001 Control Review', titleAr: 'مراجعة ضوابط ISO 27001', daysLeft: 7, type: 'control', urgent: true },
        { id: '3', title: 'Board Risk Report Q1', titleAr: 'تقرير مجلس الإدارة للمخاطر ق1', daysLeft: 14, type: 'report', urgent: false },
      ] as MobileDeadline[],
    };
  }
}
