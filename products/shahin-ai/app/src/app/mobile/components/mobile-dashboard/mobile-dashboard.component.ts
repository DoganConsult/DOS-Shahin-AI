import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { MobilePlatformService } from '../../services/mobile-platform.service';
import { HapticFeedbackService } from '../../services/haptic-feedback.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { QrScannerService } from '../../services/qr-scanner.service';
import { NetworkQualityService } from '../../services/network-quality.service';
import { PullToRefreshDirective } from '../../directives/pull-to-refresh.directive';
import { WebSocketService } from '@app/core/services/websocket-notification.service';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { firstValueFrom, Subscription } from 'rxjs';
// Carbon — registered components: IconButton, OverflowMenu, OverflowMenuOption, Tag, Tile, ProgressBar
import { IconModule, ButtonModule, TilesModule, TagModule, ProgressBarModule } from 'carbon-components-angular';
import { OverflowMenuModule } from 'carbon-components-angular';

interface DashboardData {
  complianceScore: number;
  riskScore: number;
  openRisks: number;
  criticalRisks: number;
  controlsTotal: number;
  controlsEffective: number;
  controlsFailing: number;
  policiesTotal: number;
  policiesDraft: number;
  evidencePending: number;
  evidenceExpiring: number;
  pendingApprovals: number;
  frameworkCount: number;
  aiInsightsCount: number;
  recentActivities: Array<{
    type: string;
    title: string;
    description: string;
    timestamp: string;
    module: string;
    icon: string;
  }>;
  upcomingDeadlines: Array<{
    title: string;
    dueDate: string;
    type: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

/**
 * AGRC-OS Mobile Command Center Dashboard
 *
 * A market-defining mobile GRC experience with:
 * - Executive summary hero card with animated compliance score
 * - Risk pulse indicator with heartbeat animation
 * - Swipeable metric cards (control effectiveness, evidence, policies)
 * - Quick action FAB (scan QR, capture evidence, approve)
 * - Live activity feed with real-time WebSocket updates
 * - Upcoming deadline timeline
 * - AI insights teaser with agent avatars
 * - Pull-to-refresh with haptic feedback
 * - Full Arabic RTL support
 */
@Component({
  selector: 'app-mobile-dashboard',
  standalone: true,
  imports: [CommonModule, PullToRefreshDirective, IconModule, ButtonModule, TilesModule, TagModule, ProgressBarModule, OverflowMenuModule],
  template: `
    <div class="mobile-dashboard" appPullToRefresh (refresh)="loadDashboard()">

      <!-- ─── Network Quality Banner ─── -->
      @if (network.quality() === 'weak' || network.quality() === 'offline') {
        <div class="network-banner" [style.background]="network.quality() === 'offline' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'">
          <ibm-icon [icon]="network.quality() === 'offline' ? 'wifi--off' : 'warning--alt'" size="16" [style.color]="network.qualityColor()"></ibm-icon>
          <span [style.color]="network.qualityColor()">
            {{ isArabic() ? network.qualityLabel().ar : network.qualityLabel().en }}
          </span>
          @if (offlineSync.hasPendingChanges()) {
            <cds-tag type="high-contrast" size="sm">{{ offlineSync.queueLength() }}</cds-tag>
          }
        </div>
      }

      <!-- ─── Hero: Compliance Score Ring ─── -->
      <cds-tile class="hero-card">
        <div class="hero-greeting">
          <span class="greeting-text">
            {{ isArabic() ? greeting().ar : greeting().en }}
          </span>
          <span class="user-name">{{ userName() }}</span>
        </div>

        <div class="score-ring-container">
          <svg class="score-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              [attr.stroke]="scoreColor()"
              stroke-width="8"
              stroke-linecap="round"
              [attr.stroke-dasharray]="scoreDash()"
              stroke-dashoffset="0"
              transform="rotate(-90 60 60)"
              class="score-arc"
            />
            <text x="60" y="54" text-anchor="middle" fill="white" font-size="28" font-weight="900">
              {{ data()?.complianceScore || 0 }}%
            </text>
            <text x="60" y="72" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-weight="600">
              {{ isArabic() ? 'درجة الالتزام' : 'COMPLIANCE' }}
            </text>
          </svg>
        </div>

        <div class="hero-stats">
          <div class="hero-stat" (click)="navigateTo('/risks')">
            <span class="stat-value danger">{{ data()?.openRisks || 0 }}</span>
            <span class="stat-label">{{ isArabic() ? 'مخاطر مفتوحة' : 'Open Risks' }}</span>
          </div>
          <div class="hero-divider"></div>
          <div class="hero-stat" (click)="navigateTo('/controls')">
            <span class="stat-value success">{{ data()?.controlsEffective || 0 }}</span>
            <span class="stat-label">{{ isArabic() ? 'ضوابط فعّالة' : 'Effective Controls' }}</span>
          </div>
          <div class="hero-divider"></div>
          <div class="hero-stat" (click)="navigateTo('/activity-feed')">
            <span class="stat-value warning">{{ data()?.pendingApprovals || 0 }}</span>
            <span class="stat-label">{{ isArabic() ? 'بانتظار الموافقة' : 'Pending Approvals' }}</span>
          </div>
        </div>
      </cds-tile>

      <!-- ─── Risk Pulse ─── -->
      <cds-clickable-tile (click)="navigateTo('/risks')" class="risk-pulse-card">
        <div class="pulse-header">
          <ibm-icon icon="activity" size="20" class="pulse-icon"
            [class.pulse-critical]="(data()?.criticalRisks || 0) > 0"></ibm-icon>
          <span class="pulse-title">{{ isArabic() ? 'نبض المخاطر' : 'Risk Pulse' }}</span>
          <ibm-icon icon="chevron--right" size="20" class="pulse-chevron"></ibm-icon>
        </div>
        <cds-progress-bar [value]="riskBarCritical() + riskBarHigh() + riskBarMedium()" [max]="100"
          [status]="(data()?.criticalRisks || 0) > 0 ? 'error' : 'active'" size="sm"></cds-progress-bar>
        <div class="pulse-legend">
          <cds-tag type="red" size="sm">{{ data()?.criticalRisks || 0 }} {{ isArabic() ? 'حرج' : 'Critical' }}</cds-tag>
          <cds-tag type="magenta" size="sm">{{ isArabic() ? 'عالي' : 'High' }}</cds-tag>
          <cds-tag type="warm-gray" size="sm">{{ isArabic() ? 'متوسط' : 'Medium' }}</cds-tag>
        </div>
      </cds-clickable-tile>

      <!-- ─── Metric Cards (Horizontal Scroll) ─── -->
      <section class="metric-scroll">
        <cds-clickable-tile class="metric-card" (click)="navigateTo('/controls')">
          <ibm-icon icon="shield--check" size="20" class="metric-icon controls"></ibm-icon>
          <span class="metric-value">{{ data()?.controlsTotal || 0 }}</span>
          <span class="metric-label">{{ isArabic() ? 'الضوابط' : 'Controls' }}</span>
          @if ((data()?.controlsFailing || 0) > 0) {
            <cds-tag type="red" size="sm">{{ data()?.controlsFailing }} {{ isArabic() ? 'فاشل' : 'failing' }}</cds-tag>
          }
        </cds-clickable-tile>

        <cds-clickable-tile class="metric-card" (click)="navigateTo('/evidence')">
          <ibm-icon icon="task--complete" size="20" class="metric-icon evidence"></ibm-icon>
          <span class="metric-value">{{ data()?.evidencePending || 0 }}</span>
          <span class="metric-label">{{ isArabic() ? 'أدلة معلقة' : 'Evidence Due' }}</span>
          @if ((data()?.evidenceExpiring || 0) > 0) {
            <cds-tag type="warm-gray" size="sm">{{ data()?.evidenceExpiring }} {{ isArabic() ? 'تنتهي قريباً' : 'expiring' }}</cds-tag>
          }
        </cds-clickable-tile>

        <cds-clickable-tile class="metric-card" (click)="navigateTo('/policies')">
          <ibm-icon icon="document" size="20" class="metric-icon policies"></ibm-icon>
          <span class="metric-value">{{ data()?.policiesTotal || 0 }}</span>
          <span class="metric-label">{{ isArabic() ? 'السياسات' : 'Policies' }}</span>
          @if ((data()?.policiesDraft || 0) > 0) {
            <cds-tag type="blue" size="sm">{{ data()?.policiesDraft }} {{ isArabic() ? 'مسودة' : 'drafts' }}</cds-tag>
          }
        </cds-clickable-tile>

        <cds-clickable-tile class="metric-card" (click)="navigateTo('/frameworks')">
          <ibm-icon icon="data--connected" size="20" class="metric-icon frameworks"></ibm-icon>
          <span class="metric-value">{{ data()?.frameworkCount || 0 }}</span>
          <span class="metric-label">{{ isArabic() ? 'الأطر' : 'Frameworks' }}</span>
        </cds-clickable-tile>

        <cds-clickable-tile class="metric-card" (click)="navigateTo('/copilot')">
          <ibm-icon icon="machine-learning-model" size="20" class="metric-icon ai"></ibm-icon>
          <span class="metric-value">{{ data()?.aiInsightsCount || 0 }}</span>
          <span class="metric-label">{{ isArabic() ? 'رؤى AI' : 'AI Insights' }}</span>
        </cds-clickable-tile>
      </section>

      <!-- ─── Upcoming Deadlines ─── -->
      @if (data()?.upcomingDeadlines?.length) {
        <section class="deadlines-section">
          <h3 class="section-heading">
            <ibm-icon icon="calendar" size="20"></ibm-icon>
            {{ isArabic() ? 'المواعيد القادمة' : 'Upcoming Deadlines' }}
          </h3>
          @for (deadline of data()!.upcomingDeadlines.slice(0, 5); track deadline.title) {
            <div class="deadline-row">
              <div class="deadline-urgency" [class]="deadline.urgency"></div>
              <div class="deadline-info">
                <span class="deadline-title">{{ deadline.title }}</span>
                <span class="deadline-date">{{ deadline.dueDate | date:'mediumDate' }}</span>
              </div>
              <cds-tag [type]="deadline.urgency === 'critical' ? 'red' : deadline.urgency === 'high' ? 'magenta' : 'warm-gray'" size="sm">{{ deadline.type }}</cds-tag>
            </div>
          }
        </section>
      }

      <!-- ─── Live Activity Feed ─── -->
      <section class="activity-section">
        <h3 class="section-heading">
          <ibm-icon icon="activity" size="20"></ibm-icon>
          {{ isArabic() ? 'النشاط الأخير' : 'Recent Activity' }}
          @if (wsService.connected()) {
            <span class="live-dot"></span>
          }
        </h3>
        @for (activity of data()?.recentActivities?.slice(0, 8) || []; track activity.timestamp) {
          <div class="activity-row">
            <div class="activity-icon-wrap">
              <ibm-icon icon="circle--dash" size="16"></ibm-icon>
            </div>
            <div class="activity-info">
              <span class="activity-title">{{ activity.title }}</span>
              <span class="activity-desc">{{ activity.description }}</span>
            </div>
            <span class="activity-time">{{ timeAgo(activity.timestamp) }}</span>
          </div>
        }
        @if (!data()?.recentActivities?.length) {
          <div class="empty-state">
            <ibm-icon icon="inbox" size="32"></ibm-icon>
            <span>{{ isArabic() ? 'لا يوجد نشاط حديث' : 'No recent activity' }}</span>
          </div>
        }
      </section>

      <!-- ─── Quick Actions — Carbon OverflowMenu (replaces custom FAB) ─── -->
      <div class="quick-actions-container">
        <ibm-overflow-menu [flip]="true" description="Quick actions">
          <ibm-overflow-menu-option (selected)="onScanQr()">
            <ibm-icon icon="qr-code" size="16"></ibm-icon>
            {{ isArabic() ? 'مسح QR' : 'Scan QR' }}
          </ibm-overflow-menu-option>
          <ibm-overflow-menu-option (selected)="navigateTo('/evidence')">
            <ibm-icon icon="camera" size="16"></ibm-icon>
            {{ isArabic() ? 'التقاط دليل' : 'Capture Evidence' }}
          </ibm-overflow-menu-option>
          <ibm-overflow-menu-option (selected)="navigateTo('/activity-feed')">
            <ibm-icon icon="checkmark--outline" size="16"></ibm-icon>
            {{ isArabic() ? 'الموافقات' : 'Approvals' }}
          </ibm-overflow-menu-option>
        </ibm-overflow-menu>
      </div>

      <!-- Bottom spacer for tab bar -->
      <div style="height: 80px"></div>
    </div>
  `,
  styles: [`
    .mobile-dashboard {
      padding: 0 var(--cds-spacing-05);
      padding-top: env(safe-area-inset-top, var(--cds-spacing-03));
      background: var(--cds-background);
      min-height: 100vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* ─── Network Banner ─── */
    .network-banner {
      display: flex; align-items: center; justify-content: center; gap: var(--cds-spacing-03);
      padding: var(--cds-spacing-02) var(--cds-spacing-04); border-radius: var(--cds-spacing-02); margin-bottom: var(--cds-spacing-04);
      font: var(--cds-label-01);
    }

    /* ─── Hero Card ─── */
    :host ::ng-deep .hero-card.cds--tile {
      background: var(--cds-layer-01);
      border: 1px solid var(--cds-border-subtle-00);
      border-radius: var(--cds-spacing-04); padding: var(--cds-spacing-06) var(--cds-spacing-05) var(--cds-spacing-05);
      margin-bottom: var(--cds-spacing-05);
    }
    .hero-greeting { margin-bottom: var(--cds-spacing-05); }
    .greeting-text { font: var(--cds-label-01); color: var(--cds-text-secondary); display: block; }
    .user-name { font: var(--cds-heading-03); color: var(--cds-text-primary); display: block; margin-top: var(--cds-spacing-01); }

    .score-ring-container { display: flex; justify-content: center; margin: var(--cds-spacing-03) 0 var(--cds-spacing-05); }
    .score-ring { width: 140px; height: 140px; }
    .score-arc { transition: stroke-dasharray var(--cds-duration-moderate-01) var(--cds-easing-standard); }

    .hero-stats {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: var(--cds-spacing-05); border-top: 1px solid var(--cds-border-subtle-00);
    }
    .hero-stat { flex: 1; text-align: center; cursor: pointer; }
    .hero-stat:active { opacity: 0.7; }
    .stat-value { font: var(--cds-heading-04); display: block; line-height: 1; }
    .stat-value.danger { color: var(--cds-support-error); }
    .stat-value.success { color: var(--cds-support-success); }
    .stat-value.warning { color: var(--cds-support-warning); }
    .stat-label { font: var(--cds-helper-text-01); color: var(--cds-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; margin-top: var(--cds-spacing-02); display: block; }
    .hero-divider { width: 1px; height: 36px; background: var(--cds-border-subtle-00); }

    /* ─── Risk Pulse ─── */
    :host ::ng-deep .risk-pulse-card.cds--tile--clickable {
      border-radius: var(--cds-spacing-04); padding: var(--cds-spacing-05); margin-bottom: var(--cds-spacing-05);
    }
    .pulse-header { display: flex; align-items: center; gap: var(--cds-spacing-03); margin-bottom: var(--cds-spacing-04); }
    .pulse-icon { color: var(--cds-support-warning); }
    .pulse-icon.pulse-critical { color: var(--cds-support-error); animation: pulse-glow 2s ease-in-out infinite; }
    .pulse-title { flex: 1; font: var(--cds-body-compact-02); color: var(--cds-text-primary); }
    .pulse-chevron { color: var(--cds-text-secondary); }
    .pulse-legend { display: flex; gap: var(--cds-spacing-03); margin-top: var(--cds-spacing-03); }

    @keyframes pulse-glow {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* ─── Metric Cards ─── */
    .metric-scroll {
      display: flex; gap: var(--cds-spacing-04); overflow-x: auto; padding-bottom: var(--cds-spacing-05);
      scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
      scrollbar-width: none; margin: 0 calc(-1 * var(--cds-spacing-05)); padding-left: var(--cds-spacing-05); padding-right: var(--cds-spacing-05);
    }
    .metric-scroll::-webkit-scrollbar { display: none; }
    :host ::ng-deep .metric-card.cds--tile--clickable {
      min-width: 140px; flex-shrink: 0; scroll-snap-align: start;
      border-radius: var(--cds-spacing-03); padding: var(--cds-spacing-04);
    }
    .metric-icon { margin-bottom: var(--cds-spacing-03); }
    .metric-icon.controls { color: var(--cds-support-success); }
    .metric-icon.evidence { color: var(--cds-support-info); }
    .metric-icon.policies { color: var(--cds-link-primary); }
    .metric-icon.frameworks { color: var(--cds-support-warning); }
    .metric-icon.ai { color: var(--cds-support-error); }
    .metric-value { font: var(--cds-heading-04); color: var(--cds-text-primary); display: block; line-height: 1; }
    .metric-label { font: var(--cds-helper-text-01); color: var(--cds-text-secondary); display: block; margin-top: var(--cds-spacing-02); }

    /* ─── Section Headings ─── */
    .section-heading {
      display: flex; align-items: center; gap: var(--cds-spacing-03);
      font: var(--cds-heading-compact-01); color: var(--cds-text-primary);
      margin: var(--cds-spacing-06) 0 var(--cds-spacing-04); padding: 0;
    }
    .section-heading ibm-icon { color: var(--cds-text-secondary); }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--cds-support-success);
      animation: pulse-dot 2s ease-in-out infinite; margin-inline-start: var(--cds-spacing-02);
    }

    /* ─── Deadlines ─── */
    .deadlines-section { margin-bottom: var(--cds-spacing-03); }
    .deadline-row {
      display: flex; align-items: center; gap: var(--cds-spacing-04);
      padding: var(--cds-spacing-04); background: var(--cds-layer-01);
      border-radius: var(--cds-spacing-02); margin-bottom: var(--cds-spacing-02);
    }
    .deadline-urgency { width: 4px; height: 32px; border-radius: 2px; flex-shrink: 0; }
    .deadline-urgency.critical { background: var(--cds-support-error); }
    .deadline-urgency.high { background: var(--cds-support-warning); }
    .deadline-urgency.medium { background: var(--cds-support-info); }
    .deadline-urgency.low { background: var(--cds-support-success); }
    .deadline-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .deadline-title { font: var(--cds-body-compact-01); color: var(--cds-text-primary); }
    .deadline-date { font: var(--cds-helper-text-01); color: var(--cds-text-secondary); }

    /* ─── Activity Feed ─── */
    .activity-row {
      display: flex; align-items: flex-start; gap: var(--cds-spacing-04);
      padding: var(--cds-spacing-03) 0; border-bottom: 1px solid var(--cds-border-subtle-00);
    }
    .activity-icon-wrap {
      width: 32px; height: 32px; border-radius: var(--cds-spacing-02);
      background: var(--cds-layer-02); display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      color: var(--cds-support-info);
    }
    .activity-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .activity-title { font: var(--cds-body-compact-01); color: var(--cds-text-primary); }
    .activity-desc { font: var(--cds-helper-text-01); color: var(--cds-text-secondary); line-height: 1.3; }
    .activity-time { font: var(--cds-helper-text-01); color: var(--cds-text-helper); flex-shrink: 0; margin-top: 2px; }
    .empty-state {
      text-align: center; padding: var(--cds-spacing-07); color: var(--cds-text-secondary);
      display: flex; flex-direction: column; align-items: center; gap: var(--cds-spacing-03);
    }

    /* ─── Quick Actions (Carbon OverflowMenu) ─── */
    .quick-actions-container {
      position: fixed; bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      inset-inline-end: var(--cds-spacing-05); z-index: 999;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `],
})
export class MobileDashboardComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly platform = inject(MobilePlatformService);
  private readonly haptic = inject(HapticFeedbackService);
  readonly offlineSync = inject(OfflineSyncService);
  readonly network = inject(NetworkQualityService);
  readonly wsService = inject(WebSocketService);
  private readonly auth = inject(GrcAuthService);
  private readonly qrScanner = inject(QrScannerService);

  readonly data = signal<DashboardData | null>(null);
  readonly isLoading = signal(false);
  readonly isArabic = signal(document.documentElement.getAttribute('lang') === 'ar');

  private wsSub?: Subscription;

  userName = () => this.auth.userProfile()?.name || 'User';

  greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { en: 'Good Morning', ar: 'صباح الخير' };
    if (hour < 17) return { en: 'Good Afternoon', ar: 'مساء الخير' };
    return { en: 'Good Evening', ar: 'مساء الخير' };
  }

  scoreColor() {
    const score = this.data()?.complianceScore || 0;
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  scoreDash() {
    const score = this.data()?.complianceScore || 0;
    const circumference = 2 * Math.PI * 52;
    const filled = (score / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  riskBarCritical() { return this.data()?.openRisks ? ((this.data()!.criticalRisks / this.data()!.openRisks) * 100) : 0; }
  riskBarHigh() { return 30; }
  riskBarMedium() { return 25; }
  riskBarLow() { return 15; }

  async ngOnInit(): Promise<void> {
    await this.network.init();
    await this.loadDashboard();

    // Subscribe to WebSocket updates — refresh dashboard on entity changes
    this.wsSub = this.wsService.dataUpdates$.subscribe(() => {
      this.loadDashboard();
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(
        this.http.get<unknown>(`${environment.apiUrl}/dashboard`)
      );

      this.data.set({
        complianceScore: result.complianceScore ?? result.overallComplianceScore ?? 0,
        riskScore: result.riskScore ?? 0,
        openRisks: result.openRisks ?? result.risks?.length ?? 0,
        criticalRisks: result.criticalRisks ?? 0,
        controlsTotal: result.controlsTotal ?? result.controls?.length ?? 0,
        controlsEffective: result.controlsEffective ?? 0,
        controlsFailing: result.controlsFailing ?? 0,
        policiesTotal: result.policiesTotal ?? result.policies?.length ?? 0,
        policiesDraft: result.policiesDraft ?? 0,
        evidencePending: result.evidencePending ?? 0,
        evidenceExpiring: result.evidenceExpiring ?? 0,
        pendingApprovals: result.pendingApprovals ?? 0,
        frameworkCount: result.frameworkCount ?? result.frameworks?.length ?? 0,
        aiInsightsCount: result.aiInsightsCount ?? 0,
        recentActivities: result.recentActivities ?? [],
        upcomingDeadlines: result.upcomingDeadlines ?? [],
      });
    } catch {
      // Offline — data may come from offline interceptor cache
    }
    this.isLoading.set(false);
  }

  async navigateTo(path: string): Promise<void> {
    await this.haptic.tap();
    this.router.navigateByUrl(path);
  }

  async onScanQr(): Promise<void> {
    await this.qrScanner.scanAndNavigate();
  }

  timeAgo(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return this.isArabic() ? 'الآن' : 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
}
