/**
 * ChainMonitorComponent — Real-time chain execution monitoring page.
 *
 * Displays active and failed chain instances with step timeline visualization.
 * Queries the /api/workflow-chains/instances endpoint.
 */

import {
  Component, OnInit, signal, inject,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

interface ChainInstance {
  instance_id: string;
  chain_code: string;
  status: string;
  current_step_no: number;
  total_steps: number;
  trigger_entity_type: string;
  trigger_entity_id: string;
  started_at: string;
  completed_at?: string;
  error_notes?: string;
}

@Component({
    selector: 'app-chain-monitor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DatePipe],
    template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-[var(--text-0)]">
            {{ i18n.isAr ? 'مراقب سلسلة العمل' : 'Chain Execution Monitor' }}
          </h1>
          <p class="text-sm text-[var(--text-1)] mt-1">
            {{ i18n.isAr ? 'عرض حالة تنفيذ السلاسل في الوقت الفعلي' : 'Real-time view of chain execution status' }}
          </p>
        </div>
        <button type="button"
          (click)="refresh()"
          class="rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-4 py-2 text-sm font-medium text-[var(--text-0)] hover:bg-[var(--bg-2)]">
          {{ i18n.isAr ? 'تحديث' : 'Refresh' }}
        </button>
      </div>

      <!-- Active Chains -->
      <section class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
        <div class="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-0)]">
          <h2 class="text-sm font-semibold text-[var(--text-0)]">
            {{ i18n.isAr ? 'السلاسل النشطة' : 'Active Chains' }}
            <span class="ml-2 text-xs text-[var(--text-1)]">({{ activeChains().length }})</span>
          </h2>
        </div>

        @if (loading()) {
          <div class="p-6 text-center text-sm text-[var(--text-1)]">Loading...</div>
        } @else if (activeChains().length === 0) {
          <div class="p-6 text-center text-sm text-[var(--text-1)] italic">
            {{ i18n.isAr ? 'لا توجد سلاسل نشطة' : 'No active chains running' }}
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Active chain instances">
              <thead>
                <tr class="border-b border-[var(--border)] text-[var(--text-1)] bg-[var(--bg-0)]">
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'الكود' : 'Chain Code' }}</th>
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'التقدم' : 'Progress' }}</th>
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'الكيان' : 'Entity' }}</th>
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'البداية' : 'Started' }}</th>
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'المدة' : 'Elapsed' }}</th>
                </tr>
              </thead>
              <tbody>
                @for (chain of activeChains(); track chain.instance_id) {
                  <tr class="border-b border-[var(--border)]/50 hover:bg-[var(--bg-0)]/50">
                    <td class="px-4 py-3 font-medium text-[var(--text-0)]">{{ chain.chain_code }}</td>
                    <td class="px-4 py-3">
                      <!-- Step timeline -->
                      <div class="flex items-center gap-1">
                        @for (step of getStepArray(chain.total_steps); track step) {
                          <div class="flex items-center">
                            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                              [class]="step < chain.current_step_no
                                ? 'bg-[var(--success)] border-[var(--success)] text-white'
                                : step === chain.current_step_no
                                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white animate-pulse'
                                  : 'bg-[var(--bg-2)] border-[var(--border)] text-[var(--text-1)]'">
                              {{ step }}
                            </div>
                            @if (step < chain.total_steps) {
                              <div class="w-3 h-0.5"
                                [class]="step < chain.current_step_no
                                  ? 'bg-[var(--success)]'
                                  : 'bg-[var(--border)]'">
                              </div>
                            }
                          </div>
                        }
                      </div>
                      <p class="text-xs text-[var(--text-1)] mt-1">
                        Step {{ chain.current_step_no }} of {{ chain.total_steps }}
                      </p>
                    </td>
                    <td class="px-4 py-3 text-[var(--text-1)]">
                      <span class="text-xs">{{ chain.trigger_entity_type }}</span>
                      @if (chain.trigger_entity_id) {
                        <span class="text-xs text-[var(--text-1)]"> / {{ chain.trigger_entity_id | slice:0:8 }}</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-[var(--text-1)]">{{ chain.started_at | date:'short' }}</td>
                    <td class="px-4 py-3 text-[var(--text-1)]">{{ getElapsed(chain.started_at) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- Failed Chains -->
      @if (failedChains().length > 0) {
        <section class="rounded-xl border border-[var(--danger)]/30 bg-[var(--bg-1)] overflow-hidden">
          <div class="px-5 py-3 border-b border-[var(--danger)]/30 bg-[var(--danger)]/5">
            <h2 class="text-sm font-semibold text-[var(--danger)]">
              {{ i18n.isAr ? 'السلاسل الفاشلة' : 'Failed Chains' }}
              <span class="ml-2 text-xs">({{ failedChains().length }})</span>
            </h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Failed chain instances">
              <thead>
                <tr class="border-b border-[var(--border)] text-[var(--text-1)]">
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'الكود' : 'Chain Code' }}</th>
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'فشل عند' : 'Failed At Step' }}</th>
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'الخطأ' : 'Error' }}</th>
                  <th scope="col" class="text-left px-4 py-2.5 font-medium">{{ i18n.isAr ? 'البداية' : 'Started' }}</th>
                </tr>
              </thead>
              <tbody>
                @for (chain of failedChains(); track chain.instance_id) {
                  <tr class="border-b border-[var(--border)]/50">
                    <td class="px-4 py-3 font-medium text-[var(--text-0)]">{{ chain.chain_code }}</td>
                    <td class="px-4 py-3 text-[var(--text-1)]">{{ chain.current_step_no }} / {{ chain.total_steps }}</td>
                    <td class="px-4 py-3 text-[var(--danger)] text-xs max-w-xs truncate">{{ chain.error_notes || 'Unknown error' }}</td>
                    <td class="px-4 py-3 text-[var(--text-1)]">{{ chain.started_at | date:'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `
})
export class ChainMonitorComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  activeChains = signal<ChainInstance[]>([]);
  failedChains = signal<ChainInstance[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.refresh();
    // Auto-refresh every 30 seconds
    interval(30_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
  }

  refresh(): void {
    this.loading.set(true);
    this.http.get<{ instances: ChainInstance[] }>('/api/workflow-chains/instances', {
      params: { status: 'active' },
    }).subscribe({
      next: (res) => {
        this.activeChains.set(res.instances || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.http.get<{ instances: ChainInstance[] }>('/api/workflow-chains/instances', {
      params: { status: 'failed' },
    }).subscribe({
      next: (res) => this.failedChains.set(res.instances || []),
      error: () => { /* non-critical — failed chains section just stays empty */ },
    });
  }

  /** Generate an array [1, 2, ..., n] for step visualization */
  getStepArray(total: number): number[] {
    const count = Math.min(total || 1, 20); // Cap at 20 for display
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  /** Calculate elapsed time since start */
  getElapsed(startedAt: string): string {
    const ms = Date.now() - new Date(startedAt).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
}
