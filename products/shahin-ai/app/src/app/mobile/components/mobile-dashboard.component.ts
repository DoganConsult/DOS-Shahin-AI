// =====================================================================
// Shahin GRC — Mobile AGRC-OS Command Center
// Premium mobile dashboard with live signals, biometric auth,
// offline-first, Arabic/English RTL support
// =====================================================================

import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, effect, DestroyRef
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { GrcAuthService, GrcRole } from '@app/core/services/grc-auth.service';
import { WebSocketService } from '@app/core/services/websocket-notification.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { MobilePlatformService } from '../services/mobile-platform.service';
import { OfflineSyncService } from '../services/offline-sync.service';
import { HapticService } from '../services/haptic.service';
import { CameraEvidenceService } from '../services/camera-evidence.service';
import { PushNotificationService } from '../services/push-notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

// ─── Data types ──────────────────────────────────────────────────────────────

interface DashStats {
  complianceScore: number;
  openRisks: number;
  pendingControls: number;
  evidenceQueue: number;
  activePolicies: number;
  frameworks: number;
  aiInsights: number;
  openIncidents: number;
  daysToAudit: number;
  teamHealth: number;
}

interface RiskItem {
  id: string;
  title: string;
  titleAr: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dueDate: string;
  owner: string;
  trend: 'up' | 'down' | 'stable';
}

interface ActivityItem {
  id: string;
  type: 'policy' | 'risk' | 'control' | 'evidence' | 'ai' | 'audit';
  title: string;
  titleAr: string;
  time: string;
  user: string;
  icon: string;
}

interface Deadline {
  id: string;
  title: string;
  titleAr: string;
  daysLeft: number;
  type: 'audit' | 'policy' | 'control' | 'report';
  urgent: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-mobile-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DecimalPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="mob-dash" [class.rtl]="isRtl()" [class.offline]="isOffline()">

  <!-- ══════ TOP STATUS BAR ══════ -->
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

  <!-- ══════ OFFLINE BANNER ══════ -->
  <div class="mob-offline-bar" *ngIf="isOffline()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
    {{ isRtl() ? 'وضع عدم الاتصال — ' + queueLength() + ' طلب في الانتظار' : 'Offline — ' + queueLength() + ' requests queued' }}
  </div>

  <!-- ══════ COMPLIANCE HERO CARD ══════ -->
  <div tabindex="0" role="button" (keyup.enter)="goTo('/agrc-os')" class="mob-hero-card" (click)="goTo('/agrc-os')">
    <div class="mob-hero-glow"></div>
    <div class="mob-hero-content">
      <!-- SVG compliance ring -->
      <div class="mob-ring-container">
        <svg class="mob-ring-svg" viewBox="0 0 120 120" width="120" height="120">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0ea5e9"/>
              <stop offset="50%" stop-color="#6366f1"/>
              <stop offset="100%" stop-color="#10b981"/>
            </linearGradient>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- Track -->
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
          <!-- Progress -->
          <circle cx="60" cy="60" r="50" fill="none"
                  stroke="url(#ringGrad)" stroke-width="8"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="ringDasharray()"
                  [attr.stroke-dashoffset]="ringOffset()"
                  transform="rotate(-90 60 60)"
                  filter="url(#ringGlow)"
                  class="mob-ring-progress"/>
          <!-- Center text -->
          <text x="60" y="54" text-anchor="middle" fill="white" font-size="22" font-weight="800" font-family="Inter">{{ stats()?.complianceScore ?? '--' }}</text>
          <text x="60" y="70" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10" font-family="Inter">{{ isRtl() ? 'امتثال' : 'SCORE' }}</text>
        </svg>
        <!-- Pulse ring animation -->
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
      </div>
    </div>
  </div>

  <!-- ══════ QUICK METRIC CARDS ══════ -->
  <div class="mob-section-header">
    <span>{{ isRtl() ? 'المقاييس الرئيسية' : 'Key Metrics' }}</span>
    <button class="mob-see-all" (click)="goTo('/workspace-home')">{{ isRtl() ? 'عرض الكل' : 'See All' }}</button>
  </div>

  <div class="mob-metrics-scroll">
    <div tabindex="0" role="button" (keyup.enter)="goTo('/controls')" class="mob-metric-card mob-metric-controls" (click)="goTo('/controls')">
      <div class="mob-metric-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div class="mob-metric-val">{{ stats()?.pendingControls ?? '--' }}</div>
      <div class="mob-metric-label">{{ isRtl() ? 'ضوابط' : 'Controls' }}</div>
      <div class="mob-metric-sub">{{ isRtl() ? 'معلّقة' : 'Pending' }}</div>
    </div>

    <div tabindex="0" role="button" (keyup.enter)="goTo('/evidence-tasks')" class="mob-metric-card mob-metric-evidence" (click)="goTo('/evidence-tasks')">
      <div class="mob-metric-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div class="mob-metric-val">{{ stats()?.evidenceQueue ?? '--' }}</div>
      <div class="mob-metric-label">{{ isRtl() ? 'أدلة' : 'Evidence' }}</div>
      <div class="mob-metric-sub">{{ isRtl() ? 'في الانتظار' : 'In Queue' }}</div>
    </div>

    <div tabindex="0" role="button" (keyup.enter)="goTo('/policies')" class="mob-metric-card mob-metric-policies" (click)="goTo('/policies')">
      <div class="mob-metric-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      </div>
      <div class="mob-metric-val">{{ stats()?.activePolicies ?? '--' }}</div>
      <div class="mob-metric-label">{{ isRtl() ? 'سياسات' : 'Policies' }}</div>
      <div class="mob-metric-sub">{{ isRtl() ? 'نشطة' : 'Active' }}</div>
    </div>

    <div tabindex="0" role="button" (keyup.enter)="goTo('/frameworks')" class="mob-metric-card mob-metric-frameworks" (click)="goTo('/frameworks')">
      <div class="mob-metric-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      </div>
      <div class="mob-metric-val">{{ stats()?.frameworks ?? '--' }}</div>
      <div class="mob-metric-label">{{ isRtl() ? 'أطر' : 'Frameworks' }}</div>
      <div class="mob-metric-sub">{{ isRtl() ? 'مُفعّلة' : 'Active' }}</div>
    </div>

    <div tabindex="0" role="button" (keyup.enter)="goTo('/ai-hub')" class="mob-metric-card mob-metric-ai" (click)="goTo('/ai-hub')">
      <div class="mob-metric-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        </svg>
      </div>
      <div class="mob-metric-val">{{ stats()?.aiInsights ?? '--' }}</div>
      <div class="mob-metric-label">{{ isRtl() ? 'رؤى AI' : 'AI Insights' }}</div>
      <div class="mob-metric-sub">{{ isRtl() ? 'جديدة' : 'New' }}</div>
    </div>

    <div tabindex="0" role="button" (keyup.enter)="goTo('/incidents')" class="mob-metric-card mob-metric-incidents" (click)="goTo('/incidents')">
      <div class="mob-metric-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div class="mob-metric-val">{{ stats()?.openIncidents ?? '--' }}</div>
      <div class="mob-metric-label">{{ isRtl() ? 'حوادث' : 'Incidents' }}</div>
      <div class="mob-metric-sub">{{ isRtl() ? 'مفتوحة' : 'Open' }}</div>
    </div>
  </div>

  <!-- ══════ TOP RISKS ══════ -->
  <div class="mob-section-header">
    <span>{{ isRtl() ? 'أعلى المخاطر' : 'Top Risks' }}</span>
    <button class="mob-see-all" (click)="goTo('/risks')">{{ isRtl() ? 'عرض الكل' : 'See All' }}</button>
  </div>

  <div class="mob-risks-list" *ngIf="topRisks().length > 0">
    <div tabindex="0" role="button" (keyup.enter)="goTo('/risks')" class="mob-risk-item" *ngFor="let risk of topRisks(); trackBy: trackById"
         (click)="goTo('/risks')" [class]="'sev-' + risk.severity">
      <div class="mob-risk-left">
        <div class="mob-risk-sev-dot" [class]="'dot-' + risk.severity"></div>
        <div class="mob-risk-info">
          <div class="mob-risk-title">{{ isRtl() ? risk.titleAr : risk.title }}</div>
          <div class="mob-risk-meta">
            <span class="mob-risk-owner">{{ risk.owner }}</span>
            <span class="mob-risk-due">{{ formatDate(risk.dueDate) }}</span>
          </div>
        </div>
      </div>
      <div class="mob-risk-right">
        <span class="mob-sev-badge" [class]="'badge-' + risk.severity">
          {{ isRtl() ? severityLabelAr(risk.severity) : severityLabel(risk.severity) }}
        </span>
        <span class="mob-trend-icon" [class]="'trend-' + risk.trend">
          {{ risk.trend === 'up' ? '↑' : risk.trend === 'down' ? '↓' : '→' }}
        </span>
      </div>
    </div>
  </div>

  <div class="mob-empty-state" *ngIf="!loading() && topRisks().length === 0">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
    <span>{{ isRtl() ? 'لا توجد مخاطر حرجة' : 'No critical risks' }}</span>
  </div>

  <!-- ══════ UPCOMING DEADLINES ══════ -->
  <div class="mob-section-header">
    <span>{{ isRtl() ? 'المواعيد القادمة' : 'Upcoming Deadlines' }}</span>
  </div>

  <div class="mob-deadlines" *ngIf="deadlines().length > 0">
    <div tabindex="0" role="button" (keyup.enter)="goTo('/' + d.type + 's')" class="mob-deadline-item" *ngFor="let d of deadlines(); trackBy: trackById"
         [class.urgent]="d.urgent" (click)="goTo('/' + d.type + 's')">
      <div class="mob-deadline-days" [class.urgent]="d.urgent">
        <span class="mob-deadline-num">{{ d.daysLeft }}</span>
        <span class="mob-deadline-unit">{{ isRtl() ? 'يوم' : 'd' }}</span>
      </div>
      <div class="mob-deadline-info">
        <div class="mob-deadline-title">{{ isRtl() ? d.titleAr : d.title }}</div>
        <div class="mob-deadline-type">{{ deadlineTypeLabel(d.type) }}</div>
      </div>
      <div class="mob-deadline-arrow">›</div>
    </div>
  </div>

  <!-- ══════ LIVE ACTIVITY FEED ══════ -->
  <div class="mob-section-header">
    <span>{{ isRtl() ? 'آخر النشاطات' : 'Live Activity' }}</span>
    <div class="mob-live-dot"></div>
  </div>

  <div class="mob-activity-feed">
    <div tabindex="0" role="button" (keyup.enter)="goTo('/activity-feed')" class="mob-activity-item" *ngFor="let item of activityFeed(); trackBy: trackById"
         (click)="goTo('/activity-feed')">
      <div class="mob-activity-icon" [class]="'act-' + item.type">{{ item.icon }}</div>
      <div class="mob-activity-info">
        <div class="mob-activity-title">{{ isRtl() ? item.titleAr : item.title }}</div>
        <div class="mob-activity-meta">
          <span>{{ item.user }}</span>
          <span class="mob-activity-dot">·</span>
          <span>{{ item.time }}</span>
        </div>
      </div>
    </div>
    <div class="mob-empty-state" *ngIf="!loading() && activityFeed().length === 0">
      <span>{{ isRtl() ? 'لا توجد نشاطات حديثة' : 'No recent activity' }}</span>
    </div>
  </div>

  <!-- ══════ LOADING SKELETON ══════ -->
  <div class="mob-skeleton-overlay" *ngIf="loading()">
    <div class="mob-skeleton mob-skeleton-hero"></div>
    <div class="mob-skeleton-row">
      <div class="mob-skeleton mob-skeleton-card" *ngFor="let i of [1,2,3]"></div>
    </div>
  </div>

  <!-- ══════ QUICK ACTION FAB ══════ -->
  <div class="mob-fab-container" [class.expanded]="fabExpanded()" *ngIf="isNativeApp()">
    <!-- Sub actions (shown when expanded) -->
    <div class="mob-fab-actions" [class.visible]="fabExpanded()">
      <button class="mob-fab-sub mob-fab-evidence" (click)="captureEvidence()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span>{{ isRtl() ? 'أدلة' : 'Evidence' }}</span>
      </button>
      <button class="mob-fab-sub mob-fab-approve" (click)="goTo('/approval-center')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <span>{{ isRtl() ? 'موافقة' : 'Approve' }}</span>
      </button>
      <button class="mob-fab-sub mob-fab-risk" (click)="goTo('/risks')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>
        </svg>
        <span>{{ isRtl() ? 'مخاطر' : 'Risk' }}</span>
      </button>
      <button class="mob-fab-sub mob-fab-ai" (click)="goTo('/ai-hub')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        </svg>
        <span>{{ isRtl() ? 'ذكاء اصطناعي' : 'AI' }}</span>
      </button>
    </div>

    <!-- Main FAB button -->
    <button class="mob-fab-main" (click)="toggleFab()" [class.open]="fabExpanded()" aria-label="Quick actions">
      <svg class="mob-fab-plus" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <svg class="mob-fab-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>

  <!-- FAB backdrop (native only) -->
  <div tabindex="0" role="button" (keyup.enter)="toggleFab()" class="mob-fab-backdrop" [class.visible]="fabExpanded()" (click)="toggleFab()" *ngIf="isNativeApp()"></div>

  <!-- Bottom padding for tab bar -->
  <div class="mob-bottom-spacer"></div>

</div>
  `,
  styles: [`
/* ════════════════════════════════════════════════════════════
   Mobile Dashboard — Premium AGRC-OS Styles
   IBM Carbon + Glassmorphism + Native Motion
   ════════════════════════════════════════════════════════════ */

.mob-dash {
  min-height: 100dvh;
  background: #060d1a;
  color: #fff;
  font-family: var(--font-body, 'Inter', sans-serif);
  overflow-x: hidden;
  position: relative;
}

.mob-dash.rtl { direction: rtl; font-family: 'Tajawal', 'IBM Plex Sans Arabic', sans-serif; }

/* ─── Status bar ─────────────────────────────────────────── */
.mob-status-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px 8px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: rgba(6, 13, 26, 0.95);
  backdrop-filter: blur(20px);
  position: sticky; top: 0; z-index: var(--z-dropdown);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.mob-status-left { display: flex; align-items: center; gap: 10px; }

.mob-avatar {
  width: 36px; height: 36px; border-radius: var(--radius-pill);
  background: linear-gradient(135deg, var(--primary), var(--primary));
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-sm); font-weight: 700; color: #fff;
  box-shadow: var(--shadow-glow);
}

.mob-greeting { display: flex; flex-direction: column; }
.mob-greeting-text { font-size: var(--font-size-xs); color: rgba(255,255,255,0.4); line-height: 1; }
.mob-user-name { font-size: var(--font-size-base); font-weight: 600; line-height: 1.4; }

.mob-status-right { display: flex; align-items: center; gap: 4px; }

.mob-icon-btn {
  width: 40px; height: 40px; border-radius: var(--radius-lg);
  background: rgba(255,255,255,0.06);
  border: none; color: rgba(255,255,255,0.7); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  position: relative; transition: background 0.2s;
}
.mob-icon-btn:active { background: rgba(255,255,255,0.12); }
.mob-icon-btn.spinning svg { animation: spin 0.7s linear infinite; }

.mob-badge {
  position: absolute; top: 6px; right: 6px;
  background: var(--error); color: #fff; font-size: var(--font-size-xs); font-weight: 700;
  border-radius: var(--radius-md); padding: 1px 4px; min-width: 16px; text-align: center;
  border: 2px solid #060d1a;
}

/* ─── Offline banner ─────────────────────────────────────── */
.mob-offline-bar {
  background: rgba(234,179,8,0.15); border-bottom: 1px solid rgba(234,179,8,0.3);
  color: #fbbf24; font-size: var(--font-size-xs); font-weight: 500;
  padding: 6px 16px; display: flex; align-items: center; gap: 6px;
}

/* ─── Hero card ──────────────────────────────────────────── */
.mob-hero-card {
  margin: 16px; border-radius: var(--radius-xl); overflow: hidden;
  background: linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(99,102,241,0.15) 50%, rgba(16,185,129,0.1) 100%);
  border: 1px solid rgba(14,165,233,0.2);
  position: relative; cursor: pointer;
  box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(255,255,255,0.05);
  transition: transform 0.15s, box-shadow 0.15s;
}
.mob-hero-card:active { transform: scale(0.98); box-shadow: var(--shadow-md); }

.mob-hero-glow {
  position: absolute; inset: -20px; z-index: 0;
  background: radial-gradient(ellipse at 30% 50%, rgba(14,165,233,0.12) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.1) 0%, transparent 50%);
  pointer-events: none;
}

.mob-hero-content {
  position: relative; z-index: var(--z-base);
  display: flex; align-items: center; gap: 16px;
  padding: 20px;
}

.mob-ring-container { position: relative; flex-shrink: 0; }

.mob-ring-progress {
  transition: stroke-dashoffset 1.5s cubic-bezier(0.34,1.56,0.64,1);
}

.mob-ring-pulse {
  position: absolute; inset: -8px; border-radius: var(--radius-pill);
  background: transparent;
  box-shadow: 0 0 0 0 rgba(14,165,233,0.4);
  animation: ringPulse 3s ease-out infinite;
}

.mob-hero-info { flex: 1; min-width: 0; }
.mob-hero-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.mob-hero-label { font-size: var(--font-size-sm); font-weight: 600; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.05em; }

.mob-health-dot {
  width: 8px; height: 8px; border-radius: var(--radius-pill);
  &.health-healthy { background: #10b981; box-shadow: var(--shadow-glow); animation: healthPulse 2s ease-in-out infinite; }
  &.health-warning { background: var(--warning); box-shadow: var(--shadow-glow); }
  &.health-critical { background: var(--error); box-shadow: var(--shadow-glow); animation: healthPulse 1s ease-in-out infinite; }
}

.mob-hero-stat { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
.mob-hero-val { font-size: var(--font-size-2xl); font-weight: 800; line-height: 1; }
.mob-hero-unit { font-size: var(--font-size-xs); color: rgba(255,255,255,0.45); }
.team-health { color: #10b981; }

/* ─── Section header ─────────────────────────────────────── */
.mob-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px 4px; margin-top: 4px;
}
.mob-section-header > span { font-size: var(--font-size-sm); font-weight: 600; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.05em; }

.mob-see-all { background: none; border: none; color: var(--primary); font-size: var(--font-size-sm); cursor: pointer; padding: 4px 0; }

.mob-live-dot {
  width: 6px; height: 6px; border-radius: var(--radius-pill); background: #10b981;
  animation: healthPulse 1.5s ease-in-out infinite;
}

/* ─── Metric cards ───────────────────────────────────────── */
.mob-metrics-scroll {
  display: flex; gap: 10px;
  padding: 8px 16px 4px; overflow-x: auto; scroll-snap-type: x mandatory;
  scrollbar-width: none; -ms-overflow-style: none;
}
.mob-metrics-scroll::-webkit-scrollbar { display: none; }

.mob-metric-card {
  flex-shrink: 0; width: 100px; border-radius: var(--radius-xl); padding: 14px 12px;
  scroll-snap-align: start; cursor: pointer;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  transition: transform 0.15s, background 0.2s;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.mob-metric-card:active { transform: scale(0.95); background: rgba(255,255,255,0.08); }

.mob-metric-icon {
  width: 36px; height: 36px; border-radius: var(--radius-md); margin-bottom: 8px;
  display: flex; align-items: center; justify-content: center;
}
.mob-metric-val { font-size: var(--font-size-2xl); font-weight: 800; line-height: 1; margin-bottom: 2px; }
.mob-metric-label { font-size: var(--font-size-xs); font-weight: 600; color: rgba(255,255,255,0.7); }
.mob-metric-sub { font-size: var(--font-size-xs); color: rgba(255,255,255,0.35); }

.mob-metric-controls .mob-metric-icon { background: rgba(99,102,241,0.15); color: #818cf8; }
.mob-metric-controls .mob-metric-val { color: #818cf8; }
.mob-metric-evidence .mob-metric-icon { background: rgba(14,165,233,0.15); color: #38bdf8; }
.mob-metric-evidence .mob-metric-val { color: #38bdf8; }
.mob-metric-policies .mob-metric-icon { background: rgba(16,185,129,0.15); color: var(--success); }
.mob-metric-policies .mob-metric-val { color: var(--success); }
.mob-metric-frameworks .mob-metric-icon { background: rgba(245,158,11,0.15); color: #fbbf24; }
.mob-metric-frameworks .mob-metric-val { color: #fbbf24; }
.mob-metric-ai .mob-metric-icon { background: rgba(168,85,247,0.15); color: #c084fc; }
.mob-metric-ai .mob-metric-val { color: #c084fc; }
.mob-metric-incidents .mob-metric-icon { background: rgba(239,68,68,0.15); color: #f87171; }
.mob-metric-incidents .mob-metric-val { color: #f87171; }

/* ─── Risks list ─────────────────────────────────────────── */
.mob-risks-list { margin: 4px 16px; display: flex; flex-direction: column; gap: 8px; }

.mob-risk-item {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg); padding: 12px 14px; cursor: pointer;
  transition: background 0.15s;
}
.mob-risk-item:active { background: rgba(255,255,255,0.08); }
.mob-risk-item.sev-critical { border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.04); }
.mob-risk-item.sev-high { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.04); }

.mob-risk-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.mob-risk-sev-dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex-shrink: 0; }
.dot-critical { background: var(--error); box-shadow: var(--shadow-glow); }
.dot-high { background: var(--warning); box-shadow: var(--shadow-glow); }
.dot-medium { background: #eab308; }
.dot-low { background: #10b981; }

.mob-risk-info { flex: 1; min-width: 0; }
.mob-risk-title { font-size: var(--font-size-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mob-risk-meta { display: flex; gap: 8px; margin-top: 2px; }
.mob-risk-owner, .mob-risk-due { font-size: var(--font-size-xs); color: rgba(255,255,255,0.4); }

.mob-risk-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.mob-sev-badge { font-size: var(--font-size-xs); font-weight: 700; padding: 2px 6px; border-radius: var(--radius-sm); text-transform: uppercase; letter-spacing: 0.05em; }
.badge-critical { background: rgba(239,68,68,0.2); color: #f87171; }
.badge-high { background: rgba(245,158,11,0.2); color: #fbbf24; }
.badge-medium { background: rgba(234,179,8,0.2); color: #facc15; }
.badge-low { background: rgba(16,185,129,0.2); color: var(--success); }

.mob-trend-icon { font-size: var(--font-size-base); font-weight: 700; }
.trend-up { color: var(--error); }
.trend-down { color: #10b981; }
.trend-stable { color: rgba(255,255,255,0.4); }

/* ─── Deadlines ──────────────────────────────────────────── */
.mob-deadlines { margin: 4px 16px; display: flex; flex-direction: column; gap: 8px; }

.mob-deadline-item {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg); padding: 12px 14px; cursor: pointer;
  transition: background 0.15s;
}
.mob-deadline-item.urgent { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
.mob-deadline-item:active { background: rgba(255,255,255,0.08); }

.mob-deadline-days {
  width: 44px; height: 44px; border-radius: var(--radius-lg); flex-shrink: 0;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.mob-deadline-days.urgent { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); }
.mob-deadline-num { font-size: var(--font-size-md); font-weight: 800; line-height: 1; }
.mob-deadline-unit { font-size: var(--font-size-xs); color: rgba(255,255,255,0.4); }

.mob-deadline-info { flex: 1; min-width: 0; }
.mob-deadline-title { font-size: var(--font-size-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mob-deadline-type { font-size: var(--font-size-xs); color: rgba(255,255,255,0.4); margin-top: 2px; }
.mob-deadline-arrow { color: rgba(255,255,255,0.3); font-size: var(--font-size-lg); }

/* ─── Activity feed ──────────────────────────────────────── */
.mob-activity-feed { margin: 4px 16px; display: flex; flex-direction: column; gap: 2px; margin-bottom: 16px; }

.mob-activity-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: var(--radius-lg); cursor: pointer;
  transition: background 0.15s;
}
.mob-activity-item:active { background: rgba(255,255,255,0.05); }

.mob-activity-icon {
  width: 34px; height: 34px; border-radius: var(--radius-md); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-md);
}
.act-policy { background: rgba(16,185,129,0.12); }
.act-risk { background: rgba(239,68,68,0.12); }
.act-control { background: rgba(99,102,241,0.12); }
.act-evidence { background: rgba(14,165,233,0.12); }
.act-ai { background: rgba(168,85,247,0.12); }
.act-audit { background: rgba(245,158,11,0.12); }

.mob-activity-info { flex: 1; min-width: 0; }
.mob-activity-title { font-size: var(--font-size-sm); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mob-activity-meta { display: flex; gap: 4px; margin-top: 2px; font-size: var(--font-size-xs); color: rgba(255,255,255,0.35); }
.mob-activity-dot { opacity: 0.4; }

/* ─── Empty state ────────────────────────────────────────── */
.mob-empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 24px; gap: 8px; color: rgba(255,255,255,0.3); font-size: var(--font-size-sm);
}

/* ─── Skeleton ───────────────────────────────────────────── */
.mob-skeleton-overlay { position: absolute; inset: 0; z-index: var(--z-base); padding: 16px; background: #060d1a; }
.mob-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%); background-size: 200% 100%; border-radius: var(--radius-xl); animation: shimmer 1.5s infinite; }
.mob-skeleton-hero { height: 140px; margin-bottom: 16px; }
.mob-skeleton-row { display: flex; gap: 10px; }
.mob-skeleton-card { height: 100px; flex: 1; border-radius: var(--radius-xl); }

/* ─── FAB ────────────────────────────────────────────────── */
.mob-fab-container {
  position: fixed; bottom: calc(80px + env(safe-area-inset-bottom)); right: 20px;
  z-index: var(--z-dropdown); display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
}

.mob-fab-main {
  width: 56px; height: 56px; border-radius: 18px;
  background: linear-gradient(135deg, var(--primary), var(--primary));
  border: none; cursor: pointer; color: #fff;
  box-shadow: var(--shadow-lg);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
  position: relative; overflow: hidden;
}
.mob-fab-main:active { transform: scale(0.95); }
.mob-fab-main.open { transform: rotate(45deg); }

.mob-fab-plus, .mob-fab-close { position: absolute; transition: opacity 0.2s, transform 0.2s; }
.mob-fab-close { opacity: 0; transform: rotate(-45deg); }
.mob-fab-main.open .mob-fab-plus { opacity: 0; transform: rotate(45deg); }
.mob-fab-main.open .mob-fab-close { opacity: 1; transform: rotate(0); }

.mob-fab-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; opacity: 0; pointer-events: none; transform: translateY(10px); transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.mob-fab-actions.visible { opacity: 1; pointer-events: all; transform: translateY(0); }

.mob-fab-sub {
  display: flex; align-items: center; gap: 10px;
  background: rgba(15,20,40,0.95); border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-lg); padding: 10px 14px; color: #fff; cursor: pointer; font-size: var(--font-size-sm); font-weight: 500;
  box-shadow: var(--shadow-md); backdrop-filter: blur(20px);
  transition: transform 0.15s, background 0.15s;
}
.mob-fab-sub:active { transform: scale(0.95); }

.mob-fab-evidence svg { color: #38bdf8; }
.mob-fab-approve svg { color: var(--success); }
.mob-fab-risk svg { color: #f87171; }
.mob-fab-ai svg { color: #c084fc; }

.mob-fab-backdrop {
  position: fixed; inset: 0; z-index: var(--z-dropdown); background: rgba(0,0,0,0);
  pointer-events: none; transition: background 0.3s;
}
.mob-fab-backdrop.visible { background: rgba(0,0,0,0.6); pointer-events: all; backdrop-filter: blur(4px); }

/* ─── RTL adjustments ────────────────────────────────────── */
.mob-dash.rtl .mob-fab-container { right: auto; left: 20px; }

/* ─── Bottom spacer ──────────────────────────────────────── */
.mob-bottom-spacer { height: calc(90px + env(safe-area-inset-bottom)); }

/* ─── Animations ─────────────────────────────────────────── */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(14,165,233,0.4); } 70% { box-shadow: 0 0 0 16px rgba(14,165,233,0); } 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0); } }
@keyframes healthPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `],
})
export class MobileDashboardComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(GrcAuthService);
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
  readonly stats = signal<DashStats | null>(null);
  readonly topRisks = signal<RiskItem[]>([]);
  readonly activityFeed = signal<ActivityItem[]>([]);
  readonly deadlines = signal<Deadline[]>([]);
  readonly fabExpanded = signal<boolean>(false);

  // ─── Computed ─────────────────────────────────────────────────────────────
  readonly isRtl = computed(() => this.i18n.direction() === 'rtl');
  readonly isOffline = computed(() => !(this.offlineSync['mobilePlatform']?.isOnline() ?? true));
  readonly queueLength = computed(() => this.offlineSync.queueLength());
  readonly unreadCount = computed(() => this.ws.unreadCount?.() ?? 0);

  readonly ringDasharray = computed(() => {
    const circumference = 2 * Math.PI * 50; // r=50
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
    // Auto-refresh every 2 minutes
    interval(120_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadDashboard(false));
  }

  // ─── Data loading ─────────────────────────────────────────────────────────

  loadDashboard(showLoading = true): void {
    if (showLoading) this.loading.set(true);

    // Try cache first (offline-first)
    const cached = this.offlineSync.cacheGet<unknown>('mobile_dashboard');
    if (cached) {
      this.applyDashboardData(cached);
      if (showLoading) this.loading.set(false);
    }

    // Fetch fresh data
    this.http.get<unknown>(`${environment.apiUrl}/mobile/dashboard`).subscribe({
      next: data => {
        this.offlineSync.cacheSet('mobile_dashboard', data, 120_000);
        this.applyDashboardData(data);
        this.loading.set(false);
      },
      error: () => {
        // Use mock data when backend is unavailable
        if (!cached) {
          this.applyDashboardData(this.getMockData());
        }
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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  trackById(_: number, item: GrcRecord): string { return item.id; }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(this.isRtl() ? 'ar-SA' : 'en-GB', { month: 'short', day: 'numeric' });
  }

  severityLabel(s: string): string {
    const map: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    return map[s] ?? s;
  }

  severityLabelAr(s: string): string {
    const map: Record<string, string> = { critical: 'حرج', high: 'عالٍ', medium: 'متوسط', low: 'منخفض' };
    return map[s] ?? s;
  }

  deadlineTypeLabel(t: string): string {
    const map: Record<string, string> = { audit: '🔍 Audit', policy: '📋 Policy', control: '🛡️ Control', report: '📊 Report' };
    return map[t] ?? t;
  }

  // ─── Mock data (fallback when API unavailable) ────────────────────────────

  private getMockData() {
    return {
      stats: {
        complianceScore: 78,
        openRisks: 14,
        pendingControls: 23,
        evidenceQueue: 7,
        activePolicies: 42,
        frameworks: 5,
        aiInsights: 9,
        openIncidents: 3,
        daysToAudit: 28,
        teamHealth: 91,
      } as DashStats,
      risks: [
        { id: '1', title: 'Access Control Gap — Finance Systems', titleAr: 'ثغرة في ضبط الوصول — الأنظمة المالية', severity: 'critical', dueDate: '2026-03-10', owner: 'A. Al-Rashidi', trend: 'up' },
        { id: '2', title: 'Third-party Vendor SLA Breach', titleAr: 'خرق اتفاقية مستوى الخدمة', severity: 'high', dueDate: '2026-03-15', owner: 'S. Hassan', trend: 'stable' },
        { id: '3', title: 'Data Retention Policy Expiry', titleAr: 'انتهاء سياسة الاحتفاظ بالبيانات', severity: 'medium', dueDate: '2026-03-22', owner: 'N. Al-Otaibi', trend: 'down' },
      ] as RiskItem[],
      activity: [
        { id: '1', type: 'policy', title: 'Information Security Policy approved', titleAr: 'اعتماد سياسة أمن المعلومات', time: '5m ago', user: 'Dogan Consult', icon: '📋' },
        { id: '2', type: 'ai', title: 'AI detected anomaly in access logs', titleAr: 'الذكاء الاصطناعي اكتشف شذوذاً', time: '12m ago', user: 'Shahin-AI', icon: '🤖' },
        { id: '3', type: 'evidence', title: 'Control evidence uploaded — ISO 27001', titleAr: 'تم رفع أدلة الضبط — ISO 27001', time: '1h ago', user: 'M. Al-Ghamdi', icon: '📎' },
        { id: '4', type: 'risk', title: 'Risk re-assessed: Vendor Access', titleAr: 'إعادة تقييم مخاطر وصول المورّد', time: '2h ago', user: 'Risk Team', icon: '⚠️' },
        { id: '5', type: 'control', title: 'Control implemented: MFA enforcement', titleAr: 'تنفيذ الضبط: إلزام المصادقة المتعددة', time: '3h ago', user: 'IT Security', icon: '🛡️' },
      ] as ActivityItem[],
      deadlines: [
        { id: '1', title: 'SAMA Compliance Audit', titleAr: 'تدقيق الامتثال لساما', daysLeft: 28, type: 'audit', urgent: false },
        { id: '2', title: 'ISO 27001 Control Review', titleAr: 'مراجعة ضوابط ISO 27001', daysLeft: 7, type: 'control', urgent: true },
        { id: '3', title: 'Board Risk Report Q1', titleAr: 'تقرير مجلس الإدارة للمخاطر ق1', daysLeft: 14, type: 'report', urgent: false },
      ] as Deadline[],
    };
  }

}
