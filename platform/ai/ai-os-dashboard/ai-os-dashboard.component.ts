import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiEnhancedApiService } from '@app/core/services/api-clients/ai/ai-enhanced-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { GrcDataTableComponent } from '@app/shared/components';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * AI OS Dashboard — unified operational overview of the AI subsystem.
 *
 * Eight sections displayed in a responsive CSS grid:
 *   1. Guard Decisions    5. Memory Health
 *   2. Agent Eval SLO     6. Trace Explorer
 *   3. Gateway Health     7. User Feedback
 *   4. LLM Usage & Budget 8. Cache Performance
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-os-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    PageShellComponent, GrcDataTableComponent,
    CardModule, TagModule, ProgressSpinnerModule,
    TableModule, ButtonModule, InputTextModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './ai-os-dashboard.component.html',
  styleUrls: [],
})
export class AiOsDashboardComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private api = inject(AiEnhancedApiService);

  // ── Loading state ──
  loading = signal(true);
  error = signal<string | null>(null);
  correlationId = signal<string | null>(null);

  // ── 1. Guard Decisions ──
  guardDecisions = signal<GrcRecord[]>([]);

  // ── 2. Eval SLO ──
  evalSloAgents = signal<GrcRecord[]>([]);

  // ── 3. Gateway Health ──
  gatewayHealth = signal<GrcRecord | null>(null);

  // ── 4. LLM Usage & Budget ──
  usageSummary = signal<GrcRecord | null>(null);
  budgetStatus = signal<GrcRecord | null>(null);

  // ── 5. Memory Health ──
  memoryHealth = signal<GrcRecord | null>(null);

  // ── 6. Trace Explorer ──
  traces = signal<GrcRecord[]>([]);
  traceFilter = signal<string>('');

  // ── 7. User Feedback ──
  feedbackSummary = signal<GrcRecord | null>(null);

  // ── 8. Cache Performance ──
  cacheStats = signal<GrcRecord | null>(null);

  // ── Auto-refresh ──
  private refreshTimer: ReturnType<typeof setTimeout> | null;
  lastUpdated = signal<string>('');

  ngOnInit(): void {
    this.loadAll();
    // Refresh every 30 seconds
    this.refreshTimer = setInterval(() => this.loadAll(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  /**
   * Load all dashboard sections in parallel.
   * Each call handles its own error to keep other sections functional.
   * First failure sets error + correlationId for display and Retry.
   */
  loadAll(): void {
    this.lastUpdated.set(new Date().toLocaleTimeString());
    this.error.set(null);
    this.correlationId.set(null);

    const setError = (err: GrcRecord) => {
      this.error.update((cur) => cur ?? (err?.message || err?.error?.message || err?.error?.error || 'Failed to load dashboard'));
      this.correlationId.update((cur) => cur ?? (err?.error?.correlationId ?? err?.error?.correlation_id ?? null));
    };

    // 1. Guard Decisions
    this.api.getGuardDecisionStats().pipe(
      catchError((e) => { setError(e); return of({ decisions: [] }); })
    ).subscribe((res) => {
      this.guardDecisions.set((res as any)?.decisions || (res as any)?.stats || (Array.isArray(res) ? res : []));
    });

    // 2. Eval SLO
    this.api.getEvalSloStatus().pipe(
      catchError((e) => { setError(e); return of({ agents: [] }); })
    ).subscribe((res) => {
      this.evalSloAgents.set((res as any)?.agents || (res as any)?.sloStatus || (Array.isArray(res) ? res : []));
    });

    // 3. Gateway Health
    this.api.getGatewayHealth().pipe(
      catchError((e) => { setError(e); return of(null); })
    ).subscribe((res) => {
      this.gatewayHealth.set(res);
    });

    // 4. LLM Usage & Budget
    this.api.getUsageSummary().pipe(
      catchError((e) => { setError(e); return of(null); })
    ).subscribe((res) => {
      this.usageSummary.set(res);
    });

    this.api.getBudgetStatus().pipe(
      catchError((e) => { setError(e); return of(null); })
    ).subscribe((res) => {
      this.budgetStatus.set(res);
    });

    // 5. Memory Health
    this.api.getMemoryHealth().pipe(
      catchError((e) => { setError(e); return of(null); })
    ).subscribe((res) => {
      this.memoryHealth.set(res);
    });

    // 6. Traces
    this.api.getTraces({ limit: 20 }).pipe(
      catchError((e) => { setError(e); return of({ traces: [] }); })
    ).subscribe((res) => {
      this.traces.set((res as any)?.traces || (Array.isArray(res) ? res : []));
    });

    // 7. User Feedback
    this.api.getFeedbackSummary().pipe(
      catchError((e) => { setError(e); return of(null); })
    ).subscribe((res) => {
      this.feedbackSummary.set(res);
    });

    // 8. Cache Performance
    this.api.getCacheStats().pipe(
      catchError((e) => { setError(e); return of(null); })
    ).subscribe((res) => {
      this.cacheStats.set(res);
      this.loading.set(false);
    });
  }

  /** Refresh all data manually */
  onRefresh(): void {
    this.loading.set(true);
    this.loadAll();
  }

  /** Filter traces by agentId or status */
  get filteredTraces(): GrcRecord[] {
    const filter = this.traceFilter().toLowerCase();
    if (!filter) return this.traces();
    return this.traces().filter((t) =>
      (t.agentId || '').toLowerCase().includes(filter) ||
      (t.status || '').toLowerCase().includes(filter) ||
      (t.runId || '').toLowerCase().includes(filter)
    );
  }

  /** Determine circuit breaker CSS class */
  getCbClass(state: string): string {
    if (!state) return 'closed';
    const s = state.toLowerCase();
    if (s === 'open') return 'open';
    if (s.includes('half')) return 'half-open';
    return 'closed';
  }

  /** Get budget bar CSS class based on percentage */
  getBudgetBarClass(pct: number): string {
    if (pct >= 90) return 'danger';
    if (pct >= 70) return 'warning';
    return '';
  }

  /** Calculate budget usage percentage safely */
  budgetPct(used: number, limit: number): number {
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  /** Generate star display string for feedback rating */
  getStars(rating: number): string {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '\u2605'.repeat(full) + (half ? '\u00BD' : '') + '\u2606'.repeat(empty);
  }

  /** Format duration in ms to readable string */
  formatDuration(ms: number): string {
    if (!ms && ms !== 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  /** Format timestamp to short time */
  formatTime(ts: string): string {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  }
}
