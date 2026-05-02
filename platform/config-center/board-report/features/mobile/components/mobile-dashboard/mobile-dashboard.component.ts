import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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
import { WebSocketService } from '@app/websocket';
import { SessionService } from '@app/dauth/session/session.service';
import { firstValueFrom, Subscription } from 'rxjs';

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
  imports: [CommonModule, PullToRefreshDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-dashboard.component.html',
  styleUrls: ['./mobile-dashboard.component.scss'],
})
export class MobileDashboardComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly platform = inject(MobilePlatformService);
  private readonly haptic = inject(HapticFeedbackService);
  readonly offlineSync = inject(OfflineSyncService);
  readonly network = inject(NetworkQualityService);
  readonly wsService = inject(WebSocketService);
  private readonly auth = inject(SessionService);
  private readonly qrScanner = inject(QrScannerService);

  readonly data = signal<DashboardData | null>(null);
  readonly isLoading = signal(false);
  readonly fabOpen = signal(false);
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
        this.http.get<any>(`${environment.apiUrl}/dashboard`)
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

  async toggleFab(): Promise<void> {
    await this.haptic.impact();
    this.fabOpen.update((v) => !v);
  }

  async onScanQr(): Promise<void> {
    this.fabOpen.set(false);
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
