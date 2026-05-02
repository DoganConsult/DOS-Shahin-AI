/**
 * DNOC AI Operations — single-pane dashboard for the AI Operating System.
 *
 * Reads:
 *   GET /api/dnoc/ai/agent-health   — per-agent runs / success / latency / cost
 *   GET /api/dnoc/ai/cost-rollup    — per-tenant USD today vs cap
 *   GET /api/dnoc/ai/timeline       — joined OpsEvent feed
 *
 * Premium PageShell + PrimeNG + i18n. Standalone Angular.
 */

import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

interface AgentHealth {
  tenantId: string;
  agentId: string;
  agentName: string | null;
  approvalBoundary: string | null;
  runs: number;
  successRate: number;
  errorRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalTokensIn: number;
  totalTokensOut: number;
  estimatedCostUsd: number;
  lastRunAt: string | null;
}

interface CostRow {
  tenantId: string;
  spentUsdToday: number;
  spentUsd7Day: number;
  spentUsd30Day: number;
  capUsdDaily: number;
  pctOfCapToday: number;
}

interface OpsEvent {
  id: string;
  source: string;
  ts: string;
  tenantId: string | null;
  agentId: string | null;
  surface: string | null;
  kind: string;
  actorId: string | null;
  status?: string;
  durationMs?: number;
  costUsd?: number;
}

@Component({
  selector: 'app-dnoc-ai-operations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, DropdownModule,
    TooltipModule, SkeletonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-shell
      icon="pi pi-chart-line"
      [title]="i18n.translate('dnoc.aiOpsTitle')"
      [subtitle]="i18n.translate('dnoc.aiOpsSubtitle')"
      [breadcrumbs]="['Administration', 'DNOC', 'AI Operations']"
      [loading]="loading()">

      <div headerActions class="flex gap-2 align-items-center">
        <p-dropdown [options]="tenantOptions()" [(ngModel)]="tenantFilterVal"
                    (onChange)="setTenant($event.value)" [placeholder]="i18n.translate('dnoc.allTenants')"
                    [showClear]="true" styleClass="p-inputtext-sm" style="min-width:180px" />
        <p-dropdown [options]="windowOptions" [(ngModel)]="windowVal"
                    (onChange)="setWindow($event.value)" styleClass="p-inputtext-sm" style="min-width:100px" />
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh') || 'Refresh'"
                  (onClick)="refreshAll()" [disabled]="loading()" styleClass="p-button-outlined p-button-sm" />
        <span class="text-xs text-color-secondary" style="white-space:nowrap">
          <i class="pi pi-sync mr-1"></i>{{ i18n.translate('dnoc.autoRefresh') }}
        </span>
      </div>

      @if (error(); as e) {
        <div class="p-3 mb-3 border-round surface-ground" style="border-left:4px solid var(--red-500)">
          <i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>
          <span class="text-sm">{{ e }}</span>
        </div>
      }

      <!-- KPI Row -->
      <div class="grid mb-3">
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-2xl font-bold text-primary">{{ totalRuns() | number }}</div>
            <div class="text-xs text-color-secondary mt-1">{{ i18n.translate('dnoc.totalRuns') }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-2xl font-bold" [style.color]="overallSuccessRate() >= 95 ? 'var(--green-600)' : overallSuccessRate() >= 80 ? 'var(--yellow-600)' : 'var(--red-600)'">
              {{ overallSuccessRate() | number:'1.0-1' }}%
            </div>
            <div class="text-xs text-color-secondary mt-1">{{ i18n.translate('dnoc.successRate') }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-2xl font-bold text-orange-500">{{ overallP95() | number:'1.0-0' }}ms</div>
            <div class="text-xs text-color-secondary mt-1">{{ i18n.translate('dnoc.p95Latency') }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalTokensIn() | number }}</div>
            <div class="text-xs text-color-secondary mt-1">{{ i18n.translate('dnoc.tokensIn') }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-2xl font-bold text-blue-400">{{ totalTokensOut() | number }}</div>
            <div class="text-xs text-color-secondary mt-1">{{ i18n.translate('dnoc.tokensOut') }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-2xl font-bold text-pink-500">{{'$' + totalCost().toFixed(4) }}</div>
            <div class="text-xs text-color-secondary mt-1">{{ i18n.translate('dnoc.estCost') }}</div>
          </div>
        </div>
      </div>

      <!-- Cost Table -->
      <div class="surface-card p-3 border-round shadow-1 mb-3">
        <div class="flex align-items-center gap-2 mb-2">
          <i class="pi pi-dollar text-primary text-lg"></i>
          <span class="font-semibold">{{ i18n.translate('dnoc.costVsCap') }}</span>
        </div>
        <p-table [value]="costRows()" [rows]="10" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('dnoc.tenant') }}</th>
              <th>{{ i18n.translate('dnoc.today') }}</th>
              <th>{{ i18n.translate('dnoc.cap') }}</th>
              <th>%</th>
              <th>7d</th>
              <th>30d</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td>{{ c.tenantId }}</td>
              <td>{{ '$' + c.spentUsdToday.toFixed(4) }}</td>
              <td>{{ '$' + c.capUsdDaily.toFixed(2) }}</td>
              <td>
                <p-tag [value]="c.pctOfCapToday + '%'"
                       [severity]="c.pctOfCapToday >= 100 ? 'danger' : c.pctOfCapToday >= 80 ? 'warning' : 'success'" />
              </td>
              <td>{{ '$' + c.spentUsd7Day.toFixed(2) }}</td>
              <td>{{ '$' + c.spentUsd30Day.toFixed(2) }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="6" class="text-center text-color-secondary p-3">{{ i18n.translate('dnoc.noData') }}</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Agent Grid -->
      <div class="surface-card p-3 border-round shadow-1 mb-3">
        <div class="flex align-items-center gap-2 mb-2">
          <i class="pi pi-users text-primary text-lg"></i>
          <span class="font-semibold">{{ i18n.translate('dnoc.agentGrid') }}</span>
          <p-tag [value]="filteredHealth().length + ' agents'" severity="info" styleClass="text-xs" />
        </div>
        <p-table [value]="filteredHealth()" [paginator]="true" [rows]="15" [rowHover]="true"
                 styleClass="p-datatable-sm p-datatable-striped"
                 [globalFilterFields]="['agentId','agentName','tenantId']">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="tenantId">{{ i18n.translate('dnoc.tenant') }} <p-sortIcon field="tenantId" /></th>
              <th pSortableColumn="agentId">Agent <p-sortIcon field="agentId" /></th>
              <th>{{ i18n.translate('dnoc.name') }}</th>
              <th>{{ i18n.translate('dnoc.boundary') }}</th>
              <th pSortableColumn="runs">{{ i18n.translate('dnoc.runs') }} <p-sortIcon field="runs" /></th>
              <th pSortableColumn="successRate">{{ i18n.translate('dnoc.success') }} <p-sortIcon field="successRate" /></th>
              <th>p50</th>
              <th>p95</th>
              <th>{{ i18n.translate('dnoc.tokens') }}</th>
              <th pSortableColumn="estimatedCostUsd">{{ i18n.translate('dnoc.cost') }} <p-sortIcon field="estimatedCostUsd" /></th>
              <th>{{ i18n.translate('dnoc.lastRun') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td>{{ r.tenantId }}</td>
              <td><code class="text-xs surface-100 p-1 border-round">{{ r.agentId }}</code></td>
              <td>{{ r.agentName || '—' }}</td>
              <td>
                <p-tag [value]="r.approvalBoundary || '—'"
                       [severity]="r.approvalBoundary === 'high' ? 'danger' : r.approvalBoundary === 'medium' ? 'warning' : 'success'" />
              </td>
              <td>{{ r.runs }}</td>
              <td>
                <span [style.color]="r.successRate >= 0.95 ? 'var(--green-600)' : r.successRate >= 0.8 ? 'var(--yellow-600)' : 'var(--red-600)'"
                      class="font-semibold">{{ (r.successRate * 100) | number:'1.0-1' }}%</span>
              </td>
              <td>{{ r.p50LatencyMs }}ms</td>
              <td>{{ r.p95LatencyMs }}ms</td>
              <td class="text-xs">{{ r.totalTokensIn | number }} / {{ r.totalTokensOut | number }}</td>
              <td>{{ '$' + r.estimatedCostUsd.toFixed(4) }}</td>
              <td class="text-xs">{{ r.lastRunAt ? (r.lastRunAt | date:'short') : '—' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="11" class="text-center text-color-secondary p-3">{{ i18n.translate('dnoc.noData') }}</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- OpsEvent Timeline -->
      <div class="surface-card p-3 border-round shadow-1">
        <div class="flex align-items-center gap-2 mb-2">
          <i class="pi pi-history text-primary text-lg"></i>
          <span class="font-semibold">{{ i18n.translate('dnoc.timeline') }}</span>
          <p-tag [value]="events().length + ' events'" severity="secondary" styleClass="text-xs" />
        </div>
        <p-table [value]="events()" [paginator]="true" [rows]="20" [rowHover]="true"
                 styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('dnoc.timestamp') }}</th>
              <th>{{ i18n.translate('dnoc.tenant') }}</th>
              <th>Agent</th>
              <th>{{ i18n.translate('dnoc.surface') }}</th>
              <th>{{ i18n.translate('dnoc.kind') }}</th>
              <th>{{ i18n.translate('dnoc.status') }}</th>
              <th>{{ i18n.translate('dnoc.duration') }}</th>
              <th>{{ i18n.translate('dnoc.cost') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-e>
            <tr>
              <td class="text-xs">{{ e.ts | date:'medium' }}</td>
              <td>{{ e.tenantId || '—' }}</td>
              <td><code class="text-xs surface-100 p-1 border-round">{{ e.agentId || '—' }}</code></td>
              <td>{{ e.surface || '—' }}</td>
              <td><p-tag [value]="e.kind" severity="info" /></td>
              <td>
                <p-tag [value]="e.status || 'info'"
                       [severity]="e.status === 'error' || e.status === 'denied' ? 'danger' : e.status === 'success' ? 'success' : 'secondary'" />
              </td>
              <td>{{ e.durationMs ? e.durationMs + 'ms' : '—' }}</td>
              <td>{{ e.costUsd != null ? '$' + e.costUsd.toFixed(4) : '—' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="text-center text-color-secondary p-3">{{ i18n.translate('dnoc.noEvents') }}</td></tr>
          </ng-template>
        </p-table>
      </div>
    </app-page-shell>
  `,
  styles: [`
    :host { display: block; }
    code { font-family: var(--font-family-mono, monospace); }
  `],
})
export class DnocAiOperationsComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  loading = signal(false);
  error = signal<string | null>(null);
  tenantFilterVal = '';
  windowVal = 24;
  health = signal<AgentHealth[]>([]);
  costRows = signal<CostRow[]>([]);
  events = signal<OpsEvent[]>([]);
  private timer: any = null;

  windowOptions = [
    { label: '1h', value: 1 },
    { label: '6h', value: 6 },
    { label: '24h', value: 24 },
    { label: '7d', value: 168 },
  ];

  tenantOptions = computed(() => {
    const set = new Set<string>();
    this.health().forEach(h => h.tenantId && set.add(h.tenantId));
    this.costRows().forEach(c => set.add(c.tenantId));
    return [...set].sort().map(t => ({ label: t, value: t }));
  });

  filteredHealth = computed(() => {
    const t = this.tenantFilterVal;
    return t ? this.health().filter(h => h.tenantId === t) : this.health();
  });

  totalRuns = computed(() => this.filteredHealth().reduce((s, h) => s + h.runs, 0));
  totalTokensIn = computed(() => this.filteredHealth().reduce((s, h) => s + h.totalTokensIn, 0));
  totalTokensOut = computed(() => this.filteredHealth().reduce((s, h) => s + h.totalTokensOut, 0));
  totalCost = computed(() => this.filteredHealth().reduce((s, h) => s + h.estimatedCostUsd, 0));
  overallSuccessRate = computed(() => {
    const runs = this.totalRuns();
    if (!runs) return 0;
    const successWeighted = this.filteredHealth().reduce((s, h) => s + h.successRate * h.runs, 0);
    return (successWeighted / runs) * 100;
  });
  overallP95 = computed(() => {
    const arr = this.filteredHealth().map(h => h.p95LatencyMs).filter(n => n > 0);
    return arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
  });

  ngOnInit() {
    this.refreshAll();
    this.timer = setInterval(() => this.refreshAll(), 30_000);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  setTenant(v: string) { this.tenantFilterVal = v || ''; this.refreshAll(); }
  setWindow(v: number) { this.windowVal = v; this.refreshAll(); }

  async refreshAll() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const tenant = this.tenantFilterVal;
      const win = this.windowVal;
      const tenantQ = tenant ? `&tenant=${encodeURIComponent(tenant)}` : '';
      const [h, c, t] = await Promise.all([
        firstValueFrom(this.http.get<{ rows: AgentHealth[] }>(`/api/dnoc/ai/agent-health?window=${win}${tenantQ}`)),
        firstValueFrom(this.http.get<{ rows: CostRow[] }>(`/api/dnoc/ai/cost-rollup${tenant ? '?tenant=' + encodeURIComponent(tenant) : ''}`)),
        firstValueFrom(this.http.get<{ events: OpsEvent[] }>(`/api/dnoc/ai/timeline?limit=100${tenantQ}`)),
      ]);
      this.health.set(h?.rows || []);
      this.costRows.set(c?.rows || []);
      this.events.set(t?.events || []);
    } catch (e: any) {
      this.error.set(`Failed to load: ${e?.message || e}`);
    } finally {
      this.loading.set(false);
    }
  }
}
