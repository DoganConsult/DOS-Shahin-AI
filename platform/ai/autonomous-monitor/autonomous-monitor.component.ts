import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { catchError, of } from 'rxjs';
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { WebSocketClientService } from '@app/core/services/websocket/websocket-client.service';
import type { EChartsOption } from 'echarts';
import { devError } from '../../core/utils/dev-logger';
import { AppDatePipe } from '../../shared/pipes';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-autonomous-monitor',
  standalone: true,
  imports: [CommonModule, RouterLink, AppEchartComponent, AppDatePipe],
  templateUrl: './autonomous-monitor.component.html',
  styleUrl: '',
})
export class AutonomousMonitorComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private svc = inject(AGRCOSService);
  private ws = inject(WebSocketClientService);
  private subs: Subscription[] = [];

  // Signals
  status = signal<GrcRecord | null>(null);
  autonomousStatus = signal<GrcRecord | null>(null);
  history = signal<GrcRecord[]>([]);
  agentStatus = signal<GrcRecord | null>(null);
  metrics = signal<GrcRecord | null>(null);
  healthStatus = signal<string>('healthy');
  enforcementStream = signal<GrcRecord[]>([]);
  cycleCounter = signal(0);
  lastCycleTime = signal<string>('');
  isAutonomous = signal(true);
  lastUpdated = signal<string>('');

  // Charts
  signalRateOpts = signal<EChartsOption>({});
  cycleHistoryOpts = signal<EChartsOption>({});
  agentPerformanceOpts = signal<EChartsOption>({});

  private refreshTimer: ReturnType<typeof setTimeout> | null;
  private tickerTimer: ReturnType<typeof setInterval> | null;

  ngOnInit(): void {
    this.loadAll();
    this.subscribeToLive();
    this.refreshTimer = setInterval(() => this.loadAll(), 10000);
    // Ticker animation
    this.tickerTimer = setInterval(() => {
      this.cycleCounter.update(c => c + 1);
    }, 3000);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.tickerTimer) clearInterval(this.tickerTimer);
  }

  loadAll(): void {
    this.lastUpdated.set(new Date().toLocaleTimeString());

    this.svc.getHealth().pipe(catchError(() => of({ status: 'healthy' })), takeUntilDestroyed(this.destroyRef)).subscribe((h: Record<string, unknown>) => this.healthStatus.set(h?.status || 'healthy'));

    this.svc.getAutonomousStatus().pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(s => {
      this.autonomousStatus.set(s);
      if ((s as any)?.totalCycles) this.cycleCounter.set((s as any).totalCycles);
    });

    this.svc.getAutonomousHistory(30).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(h => {
      this.history.set(h);
      this.buildCycleHistoryChart();
    });

    this.svc.getAgentStatus().pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(s => {
      this.agentStatus.set(s);
      this.buildAgentPerformanceChart();
    });

    this.svc.getMetrics().pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(m => {
      this.metrics.set(m);
      this.buildSignalRateChart();
    });

    this.svc.getMetricsHistory(30).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(h => {
      this.buildSignalRateFromHistory(h);
    });

    // Enforcement stream (gate log)
    this.svc.getGateLog({ limit: 20 }).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(g => {
      this.enforcementStream.set(g);
    });
  }

  runEngine(): void {
    this.svc.runAutonomousEngine().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loadAll(),
      error: (e: unknown) => devError("[API]", e),
    });
  }

  private subscribeToLive(): void {
    try {
      const sub = this.ws.dashboardRefresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.loadAll();
      });
      this.subs.push(sub);
    } catch (e) { devError("[catch]", e); }
  }

  buildSignalRateChart(): void {
    const m = this.metrics();
    if (!m) return;
    // Simple gauge for signal rate
    this.signalRateOpts.set({
      series: [{
        type: 'gauge', startAngle: 200, endAngle: -20,
        min: 0, max: Math.max(100, (m.telemetryIngestionRate || 0) * 2),
        pointer: { show: true, length: '55%', width: 4, itemStyle: { color: '#38bdf8' } },
        progress: { show: true, width: 12, roundCap: true, itemStyle: { color: '#38bdf8' } },
        axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(var(--color-white-rgb), 0.08)']] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, '75%'], fontSize: 11, color: '#94a3b8' },
        detail: { valueAnimation: true, fontSize: 28, fontWeight: 800, offsetCenter: [0, '35%'], color: '#38bdf8', formatter: '{value}' },
        data: [{ value: m.telemetryIngestionRate || 0, name: 'Signals/min' }]
      }]
    });
  }

  buildSignalRateFromHistory(h: Record<string, unknown>[]): void {
    if (!h?.length) return;
    const labels = h.map((_, i) => `T-${h.length - i}`);
    this.signalRateOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      grid: { top: 10, right: 10, bottom: 20, left: 35 },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 }, boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
      series: [{
        type: 'line', data: h.map(d => d.telemetryIngestionRate || d.eventCount || 0),
        smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#38bdf8' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(var(--color-sky-300-rgb), 0.3)' }, { offset: 1, color: 'rgba(var(--color-sky-300-rgb), 0)' }]
        }}
      }]
    });
  }

  buildCycleHistoryChart(): void {
    const h = this.history();
    if (!h?.length) return;
    this.cycleHistoryOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      grid: { top: 10, right: 10, bottom: 30, left: 40 },
      xAxis: { type: 'category', data: h.map(d => (d.executed_at || d.timestamp || '').slice(11, 19)), axisLabel: { fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', name: 'ms', nameTextStyle: { fontSize: 9 }, axisLabel: { fontSize: 9 } },
      series: [{
        type: 'bar', data: h.map(d => d.duration_ms || d.durationMs || d.cycle_ms || 0),
        itemStyle: { color: (p: any) => p.data > 500 ? '#ef4444' : p.data > 200 ? '#f59e0b' : '#22c55e', borderRadius: [4, 4, 0, 0] },
        barWidth: '60%'
      }]
    });
  }

  buildAgentPerformanceChart(): void {
    const s = this.agentStatus();
    if (!s?.agents?.length) return;
    this.agentPerformanceOpts.set({
      tooltip: { trigger: 'axis', confine: true },
      grid: { top: 10, right: 10, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: s.agents.map((a: Record<string, unknown>) => a.id), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', name: 'Actions', nameTextStyle: { fontSize: 9 }, axisLabel: { fontSize: 9 } },
      series: [{
        type: 'bar', data: s.agents.map((a: Record<string, unknown>) => ({
          value: a.actionsToday || 0,
          itemStyle: { color: a.status === 'active' ? '#22c55e' : a.status === 'stale' ? '#f59e0b' : '#94a3b8', borderRadius: [4, 4, 0, 0] }
        })),
        barWidth: '50%'
      }]
    });
  }

  getTimeSince(ts: string): string {
    if (!ts) return '—';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

}
