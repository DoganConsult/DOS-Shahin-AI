import { Component, signal, inject, OnInit, OnDestroy, PLATFORM_ID, ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TIMING } from '@app/runtime/_legacy/ui-constants';

interface PlatformStatus {
  api: 'online' | 'offline' | 'checking';
  version: string;
  environment: string;
  tenant: string;
  uptime: string;
  features: string[];
  lastChecked: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-test-mode-button',
    imports: [CommonModule],
    template: `
    <!-- Floating Enterprise Test Button -->
    <div tabindex="0" role="button" (keyup.enter)="togglePin()" class="test-fab-container"
         (mouseenter)="showPanel()"
         (mouseleave)="scheduleHide()"
         (click)="togglePin()">

      <!-- FAB Button -->
      <button class="test-fab" [class.active]="panelOpen()" [class.pinned]="pinned()">
        <i class="pi pi-building"></i>
        <span class="test-fab-pulse" *ngIf="status().api === 'online'"></span>
        <span class="test-fab-offline" *ngIf="status().api === 'offline'"></span>
      </button>

      <!-- Hover Info Panel -->
      <div class="test-panel" *ngIf="panelOpen()" (mouseenter)="cancelHide()" (mouseleave)="scheduleHide()">
        <div class="test-panel-header">
          <div class="test-panel-title">
            <i class="pi pi-verified"></i>
            <span>{{ t('test.title', 'Platform Status') }}</span>
          </div>
          <div class="test-panel-badge" [class.online]="status().api === 'online'" [class.offline]="status().api === 'offline'" [class.checking]="status().api === 'checking'">
            <span class="status-dot"></span>
            {{ status().api === 'online' ? t('test.online', 'Online') : status().api === 'offline' ? t('test.offline', 'Offline') : t('test.checking', 'Checking...') }}
          </div>
        </div>

        <div class="test-panel-body">
          <!-- Environment Info -->
          <div class="test-info-section">
            <div class="test-info-row">
              <span class="test-info-label"><i class="pi pi-server"></i> {{ t('test.env', 'Environment') }}</span>
              <span class="test-info-value env-badge" [class.prod]="status().environment === 'production'">
                {{ status().environment }}
              </span>
            </div>
            <div class="test-info-row">
              <span class="test-info-label"><i class="pi pi-tag"></i> {{ t('test.version', 'Version') }}</span>
              <span class="test-info-value">{{ status().version }}</span>
            </div>
            <div class="test-info-row">
              <span class="test-info-label"><i class="pi pi-building"></i> {{ t('test.tenant', 'Tenant') }}</span>
              <span class="test-info-value">{{ status().tenant }}</span>
            </div>
            <div class="test-info-row" *ngIf="status().uptime">
              <span class="test-info-label"><i class="pi pi-clock"></i> {{ t('test.uptime', 'Uptime') }}</span>
              <span class="test-info-value">{{ status().uptime }}</span>
            </div>
          </div>

          <!-- Feature Flags -->
          <div class="test-info-section" *ngIf="status().features.length > 0">
            <div class="test-section-label">{{ t('test.features', 'Active Modules') }}</div>
            <div class="test-features-grid">
              <span class="test-feature-tag" *ngFor="let f of status().features">
                <i class="pi pi-check-circle"></i> {{ f }}
              </span>
            </div>
          </div>

          <!-- Last Check -->
          <div class="test-footer">
            <span class="test-last-check">{{ t('test.lastCheck', 'Last checked') }}: {{ status().lastChecked }}</span>
            <button aria-label="Refresh" class="test-refresh-btn" (click)="refresh($event)">
              <i class="pi pi-refresh" [class.spinning]="status().api === 'checking'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    /* ── FAB Container ── */
    .test-fab-container {
      position: fixed;
      bottom: 24px;
      inset-inline-start: 24px;
      z-index: var(--z-splash);
    }

    /* ── FAB Button ── */
    .test-fab {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-pill);
      border: none;
      cursor: pointer;
      background: linear-gradient(135deg, var(--success), #0d9488);
      color: #fff;
      box-shadow: var(--shadow-md);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 220ms, background 220ms;
    }
    .test-fab:hover {
      transform: scale(1.1);
      box-shadow: var(--shadow-lg);
    }
    .test-fab.active {
      background: linear-gradient(135deg, #047857, #0f766e);
      transform: scale(1.05);
    }
    .test-fab.pinned {
      box-shadow: 0 0 0 3px rgba(var(--color-green-emerald-rgb), 0.3), 0 4px 16px rgba(var(--color-green-emerald-rgb), 0.35);
    }
    .test-fab .pi {
      font-size: var(--font-size-xl);
    }

    /* ── Pulse indicator (online) ── */
    .test-fab-pulse {
      position: absolute;
      top: 2px;
      inset-inline-end: 2px;
      width: 10px;
      height: 10px;
      border-radius: var(--radius-pill);
      background: var(--success);
      border: 2px solid #fff;
      animation: fabPulse 2s infinite;
    }
    @keyframes fabPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(var(--module-accent-green-rgb), 0.6); }
      50% { box-shadow: 0 0 0 6px rgba(var(--module-accent-green-rgb), 0); }
    }

    /* ── Offline indicator ── */
    .test-fab-offline {
      position: absolute;
      top: 2px;
      inset-inline-end: 2px;
      width: 10px;
      height: 10px;
      border-radius: var(--radius-pill);
      background: var(--error);
      border: 2px solid #fff;
    }

    /* ── Info Panel ── */
    .test-panel {
      position: absolute;
      bottom: 56px;
      inset-inline-start: 0;
      width: 320px;
      border-radius: var(--radius-lg);
      background: var(--surface, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      animation: panelSlideUp 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes panelSlideUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Panel Header ── */
    .test-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, var(--success), #0d9488);
      color: #fff;
    }
    .test-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: var(--font-size-sm);
    }
    .test-panel-title .pi {
      font-size: var(--font-size-md);
    }

    /* ── Status Badge ── */
    .test-panel-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      padding: 3px 10px;
      border-radius: var(--radius-lg);
      background: rgba(var(--color-white-rgb), 0.2);
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: var(--radius-pill);
    }
    .test-panel-badge.online .status-dot { background: var(--success); }
    .test-panel-badge.offline .status-dot { background: #f87171; }
    .test-panel-badge.checking .status-dot { background: #fbbf24; animation: dotPulse 1s infinite; }
    @keyframes dotPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* ── Panel Body ── */
    .test-panel-body {
      padding: 14px 16px;
    }

    /* ── Info Section ── */
    .test-info-section {
      margin-bottom: 12px;
    }
    .test-info-section:last-of-type {
      margin-bottom: 8px;
    }
    .test-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--border-subtle, var(--surface-ice));
    }
    .test-info-row:last-child {
      border-bottom: none;
    }
    .test-info-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-sm);
      color: var(--text-muted, var(--text-muted));
      font-weight: 500;
    }
    .test-info-label .pi {
      font-size: var(--font-size-sm);
      color: #0d9488;
    }
    .test-info-value {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text, var(--text-heading));
    }

    /* ── Environment Badge ── */
    .env-badge {
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      background: #dbeafe;
      color: #1d4ed8;
      font-size: var(--font-size-xs);
      text-transform: capitalize;
    }
    .env-badge.prod {
      background: #dcfce7;
      color: #15803d;
    }

    /* ── Section Label ── */
    .test-section-label {
      font-size: var(--font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted, var(--text-muted));
      margin-bottom: 8px;
    }

    /* ── Feature Tags ── */
    .test-features-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .test-feature-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--surface-sunken, var(--surface-ice));
      color: var(--text, var(--text-heading));
      font-size: var(--font-size-xs);
      font-weight: 500;
    }
    .test-feature-tag .pi {
      font-size: var(--font-size-xs);
      color: var(--success);
    }

    /* ── Footer ── */
    .test-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle, var(--surface-ice));
    }
    .test-last-check {
      font-size: var(--font-size-xs);
      color: var(--text-muted, var(--text-muted));
    }
    .test-refresh-btn {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      background: var(--surface, #fff);
      color: var(--text-muted, var(--text-muted));
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms;
    }
    .test-refresh-btn:hover {
      background: var(--surface-sunken, var(--surface-ice));
      color: var(--success);
    }
    .test-refresh-btn .pi {
      font-size: var(--font-size-sm);
    }
    .spinning {
      animation: spin 800ms linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* ── Responsive: smaller screens ── */
    @media (max-width: 480px) {
      .test-fab-container {
        bottom: 80px;
      }
      .test-panel {
        width: 280px;
      }
    }
  `]
})
export class TestModeButtonComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  panelOpen = signal(false);
  pinned = signal(false);
  status = signal<PlatformStatus>({
    api: 'checking',
    version: '1.0.0',
    environment: environment.production ? 'production' : 'development',
    tenant: '—',
    uptime: '',
    features: [],
    lastChecked: '—',
  });

  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  /** i18n helper with fallback */
  t(key: string, fallback: string = ''): string {
    const val = this.i18n.translate(key);
    return val !== key ? val : fallback;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.checkHealth();
      // Auto-refresh every 60 seconds
      interval(60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.checkHealth());
    }
  }

  ngOnDestroy(): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
  }

  showPanel(): void {
    this.cancelHide();
    this.panelOpen.set(true);
  }

  scheduleHide(): void {
    if (this.pinned()) return;
    this.hideTimeout = setTimeout(() => this.panelOpen.set(false), TIMING.PANEL_AUTO_HIDE);
  }

  cancelHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  togglePin(): void {
    this.pinned.update(v => !v);
    if (this.pinned()) {
      this.panelOpen.set(true);
    }
  }

  refresh(event: Event): void {
    event.stopPropagation();
    this.checkHealth();
  }

  private checkHealth(): void {
    this.status.update(s => ({ ...s, api: 'checking' }));

    this.http.get<Record<string, any>>(`${environment.apiUrl}/health`).subscribe({
      next: (res) => {
        const now = new Date();
        this.status.set({
          api: 'online',
          version: res?.version || '1.0.0',
          environment: environment.production ? 'production' : 'development',
          tenant: res?.tenant || this.extractTenant(),
          uptime: res?.uptime || this.formatUptime(res?.uptimeSeconds),
          features: res?.features || this.getDefaultFeatures(),
          lastChecked: now.toLocaleTimeString(),
        });
      },
      error: () => {
        const now = new Date();
        this.status.update(s => ({
          ...s,
          api: 'offline',
          lastChecked: now.toLocaleTimeString(),
          features: this.getDefaultFeatures(),
        }));
      },
    });
  }

  private extractTenant(): string {
    if (isPlatformBrowser(this.platformId)) {
      const hostname = window.location.hostname;
      if (hostname.includes('.')) {
        return hostname.split('.')[0];
      }
      return hostname;
    }
    return '—';
  }

  private formatUptime(seconds?: number): string {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 24) {
      const d = Math.floor(h / 24);
      return `${d}d ${h % 24}h`;
    }
    return `${h}h ${m}m`;
  }

  private getDefaultFeatures(): string[] {
    return [
      'GRC Core',
      'Risk Engine',
      'Compliance',
      'Audit',
      'Workflow',
      'AI Copilot',
      'Evidence',
      'RBAC',
    ];
  }

}
