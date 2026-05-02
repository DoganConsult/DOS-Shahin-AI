import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiEnhancedApiService } from '@app/core/services/api-clients/ai/ai-enhanced-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * AI OS decisions list — drill-down from Guard Decisions on the dashboard.
 * Lists decisions with optional filters; rows link to decision detail.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-decisions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageShellComponent, GrcDataTableComponent,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './decisions-list.component.html',
  styleUrls: [],
})
export class DecisionsListComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  private api = inject(AiEnhancedApiService);

  loading = signal(true);
  error = signal<string | null>(null);
  /** Correlation ID from last error for support. */
  correlationId = signal<string | null>(null);
  decisions = signal<GrcRecord[]>([]);
  /** When set, list is scoped to this agent (from Mesh or dashboard). */
  filterAgentId = signal<string | null>(null);

  ngOnInit(): void {
    const agentId = this.route.snapshot.queryParamMap.get('agentId');
    this.filterAgentId.set(agentId);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.correlationId.set(null);
    const agentId = this.filterAgentId();
    this.api
      .getDecisions({ agentId: agentId ?? undefined, limit: 100, offset: 0 })
      .pipe(
        catchError((err) => {
          const msg = err?.message || err?.error?.message || err?.error?.error || 'Failed to load decisions';
          this.error.set(msg);
          const cid = err?.error?.correlationId ?? err?.error?.correlation_id ?? null;
          this.correlationId.set(cid);
          return of({ decisions: [], total: 0 });
        }),
      )
      .subscribe((res) => {
        const list = res?.decisions ?? [];
        this.decisions.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      });
  }

  goBack(): void {
    this.router.navigate(['/ai-os-dashboard']);
  }

  goToDecision(id: string): void {
    this.router.navigate(['/ai-os-dashboard', 'decisions', id]);
  }

  formatTime(ts: string | number | undefined): string {
    if (!ts) return '—';
    try {
      const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  getOutcomeLabel(d: GrcRecord): string {
    if (!d) return '—';
    const o = d.outcome ?? d.result;
    if (o == null) return '—';
    if (typeof o === 'string') return o;
    return o.action ?? o.result ?? o.decision ?? '—';
  }
}
