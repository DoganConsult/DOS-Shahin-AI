import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface GatewayHealthData {
  circuitBreaker?: {
    state?: string;
  };
  circuitBreakerState?: string;
  activeRequests?: number;
  totalRequests?: number;
  concurrency?: {
    active?: number;
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-widget-gateway-health',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gw-health-widget">
      <div class="circuit-status" *ngIf="data">
        <div class="circuit-indicator" [class.closed]="circuitState === 'closed'" [class.open]="circuitState === 'open'" [class.half]="circuitState === 'half-open'"></div>
        <div class="circuit-info">
          <span class="circuit-label">{{ i18n.translate('aiOs.circuitBreaker') }}</span>
          <span class="circuit-state">{{ circuitState }}</span>
        </div>
      </div>
      <div class="gw-metrics" *ngIf="data">
        <div class="metric">
          <span class="metric-val">{{ activeRequests }}</span>
          <span class="metric-lbl">{{ i18n.translate('aiOs.activeRequests') }}</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ totalRequests }}</span>
          <span class="metric-lbl">{{ i18n.translate('aiOs.totalRequests') }}</span>
        </div>
      </div>
      <div class="empty" *ngIf="!data && !loading">{{ i18n.translate('common.noData') }}</div>
    </div>
  `,
  styles: [`
    .gw-health-widget { display: flex; flex-direction: column; gap: 10px; }
    .circuit-status { display: flex; align-items: center; gap: 10px; }
    .circuit-indicator { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
    .circuit-indicator.closed { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.4); }
    .circuit-indicator.open { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.4); }
    .circuit-indicator.half { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.4); }
    .circuit-info { display: flex; flex-direction: column; }
    .circuit-label { font-size: var(--font-size-xs); color: var(--text-muted); }
    .circuit-state { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading); text-transform: uppercase; }
    .gw-metrics { display: flex; gap: 10px; }
    .metric {
      flex: 1; text-align: center; padding: 8px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
    }
    .metric-val { display: block; font-size: 1.2rem; font-weight: 800; color: var(--text-heading); }
    .metric-lbl { font-size: var(--font-size-xs); color: var(--text-body); }
    .empty { text-align: center; color: var(--text-muted); font-size: var(--font-size-sm); }
  `]
})
export class GatewayHealthWidget implements OnInit {
  data: GatewayHealthData | null = null;
  circuitState = 'closed';
  activeRequests = 0;
  totalRequests = 0;
  loading = true;

  constructor(private http: HttpClient, public i18n: I18nService) {}

  ngOnInit() {
    this.http.get<GatewayHealthData>(`${environment.apiUrl}/ai-enhanced/gateway/health`).subscribe({
      next: (d) => {
        this.data = d;
        this.circuitState = d?.circuitBreaker?.state ?? d?.circuitBreakerState ?? 'closed';
        this.activeRequests = d?.activeRequests ?? d?.concurrency?.active ?? 0;
        this.totalRequests = d?.totalRequests ?? 0;
        this.loading = false;
      },
      error: (e) => { devError('[GatewayHealthWidget]', e); this.loading = false; },
    });
  }
}
