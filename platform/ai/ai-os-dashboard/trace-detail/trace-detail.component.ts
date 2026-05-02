import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { TraceResponse } from '@app/core/models/ai-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiEnhancedApiService } from '@app/core/services/api-clients/ai/ai-enhanced-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

/**
 * Trace detail drill-down from AI OS Dashboard.
 * Displays a single run trace by runId (metadata, steps, duration, status) and a link back to the dashboard.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-trace-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageShellComponent,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './trace-detail.component.html',
  styleUrls: [],
})
export class TraceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  i18n = inject(I18nService);
  private api = inject(AiEnhancedApiService);

  loading = signal(true);
  error = signal<string | null>(null);
  correlationId = signal<string | null>(null);
  trace = signal<TraceResponse | null>(null);
  runId = signal<string>('');

  ngOnInit(): void {
    const runId = this.route.snapshot.paramMap.get('runId');
    if (!runId) {
      this.error.set('Missing run ID');
      this.loading.set(false);
      return;
    }
    this.runId.set(runId);
    this.load();
  }

  load(): void {
    const runId = this.runId();
    if (!runId) return;
    this.loading.set(true);
    this.error.set(null);
    this.correlationId.set(null);
    this.trace.set(null);
    this.api
      .getTraceByRunId(runId)
      .pipe(
        catchError((err) => {
          this.error.set(err?.message || err?.error?.message || err?.error?.error || 'Failed to load trace');
          this.correlationId.set(err?.error?.correlationId ?? err?.error?.correlation_id ?? null);
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.trace.set(data as TraceResponse | null);
        this.loading.set(false);
      });
  }

  traceItems(): unknown[] {
    const t = this.trace();
    if (!t) return [];
    const items = (t as TraceResponse).items;
    return Array.isArray(items) ? items : [];
  }

  goBack(): void {
    this.router.navigate(['/ai-os-dashboard']);
  }

  formatDuration(ms: number | undefined): string {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
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
}
