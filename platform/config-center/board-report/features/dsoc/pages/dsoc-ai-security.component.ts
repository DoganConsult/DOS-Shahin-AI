/**
 * DSOC AI Security — gates, HITL queue, denials feed, compliance attestation.
 *
 * Reads:
 *   GET /api/dsoc/ai/gate-stats
 *   GET /api/dsoc/ai/gate-decisions
 *   GET /api/dsoc/ai/hitl-queue
 *   GET /api/dsoc/ai/hitl-backlog
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

interface GateRow {
  id: string; ts: string; tenantId: string; agentId: string | null;
  toolName: string | null; action: 'allowed' | 'denied' | 'budget.denied' | 'unknown';
  decidedBy: string | null; reason: string | null;
  enforcementMode: 'audit' | 'warn' | 'enforce' | null;
  requiresApproval: boolean;
}
interface GateStats { allowed: number; denied: number; byDecidedBy: Record<string, number>; }
interface HitlItem {
  actionId: string; tenantId: string; agentId: string | null;
  proposalType: string | null; priority: string | null; status: string;
  autoExecuteAt: string | null; createdAt: string;
}
interface HitlBacklog { tenantId: string; pending: number; escalated: number; oldestPendingAge: number; }

@Component({
  selector: 'app-dsoc-ai-security',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, DropdownModule,
    TooltipModule, SkeletonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-shell
      icon="pi pi-shield"
      [title]="i18n.translate('dsoc.aiSecurityTitle')"
      [subtitle]="i18n.translate('dsoc.aiSecuritySubtitle')"
      [breadcrumbs]="['Administration', 'DSOC', 'AI Security']"
      [loading]="loading()">

      <div headerActions class="flex gap-2 align-items-center">
        <p-dropdown [options]="tenantOptions()" [(ngModel)]="tenantFilterVal"
                    (onChange)="setTenant($event.value)" [placeholder]="i18n.translate('dsoc.allTenants')"
                    [showClear]="true" styleClass="p-inputtext-sm" style="min-width:180px" />
        <p-dropdown [options]="windowOptions" [(ngModel)]="windowVal"
                    (onChange)="setWindow($event.value)" styleClass="p-inputtext-sm" style="min-width:100px" />
        <p-dropdown [options]="decisionOptions" [(ngModel)]="decisionVal"
                    (onChange)="setDecision($event.value)" [placeholder]="i18n.translate('dsoc.allDecisions')"
                    [showClear]="true" styleClass="p-inputtext-sm" style="min-width:130px" />
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh') || 'Refresh'"
                  (onClick)="refreshAll()" [disabled]="loading()" styleClass="p-button-outlined p-button-sm" />
      </div>

      @if (error(); as e) {
        <div class="p-3 mb-3 border-round surface-ground" style="border-left:4px solid var(--red-500)">
          <i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>
          <span class="text-sm">{{ e }}</span>
        </div>
      }

      <!-- KPI Cards -->
      <div class="grid mb-3">
        <div class="col-12 md:col-4">
          <div class="surface-card p-4 border-round shadow-1 text-center" style="border-top:3px solid var(--green-500)">
            <div class="text-3xl font-bold" style="color:var(--green-600)">{{ stats()?.allowed || 0 }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ i18n.translate('dsoc.allowed') }}</div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div class="surface-card p-4 border-round shadow-1 text-center" style="border-top:3px solid var(--red-500)">
            <div class="text-3xl font-bold" style="color:var(--red-600)">{{ stats()?.denied || 0 }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ i18n.translate('dsoc.denied') }}</div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div class="surface-card p-4 border-round shadow-1 text-center" style="border-top:3px solid var(--orange-500)">
            <div class="text-3xl font-bold" style="color:var(--orange-600)">{{ denyRate() | number:'1.1-1' }}%</div>
            <div class="text-sm text-color-secondary mt-1">{{ i18n.translate('dsoc.denyRate') }}</div>
          </div>
        </div>
      </div>

      <div class="grid mb-3">
        <!-- Decided By breakdown -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-3 border-round shadow-1 h-full">
            <div class="flex align-items-center gap-2 mb-2">
              <i class="pi pi-chart-bar text-primary text-lg"></i>
              <span class="font-semibold">{{ i18n.translate('dsoc.byDecidedBy') }}</span>
            </div>
            <p-table [value]="byDecidedByList()" styleClass="p-datatable-sm p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('dsoc.decidedBy') }}</th>
                  <th style="width:80px">{{ i18n.translate('dsoc.count') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-kv>
                <tr>
                  <td><code class="text-xs surface-100 p-1 border-round">{{ kv[0] }}</code></td>
                  <td class="font-semibold">{{ kv[1] }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="2" class="text-center text-color-secondary p-3">{{ i18n.translate('dsoc.noData') }}</td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>

        <!-- HITL Backlog -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-3 border-round shadow-1 h-full">
            <div class="flex align-items-center gap-2 mb-2">
              <i class="pi pi-inbox text-primary text-lg"></i>
              <span class="font-semibold">{{ i18n.translate('dsoc.hitlBacklog') }}</span>
            </div>
            <p-table [value]="backlog()" styleClass="p-datatable-sm p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('dsoc.tenant') }}</th>
                  <th>{{ i18n.translate('dsoc.pending') }}</th>
                  <th>{{ i18n.translate('dsoc.escalated') }}</th>
                  <th>{{ i18n.translate('dsoc.oldestAge') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-b>
                <tr>
                  <td>{{ b.tenantId }}</td>
                  <td>
                    <p-tag [value]="b.pending + ''" [severity]="b.pending >= 20 ? 'danger' : b.pending >= 10 ? 'warning' : 'success'" />
                  </td>
                  <td>
                    <p-tag [value]="b.escalated + ''" [severity]="b.escalated > 0 ? 'danger' : 'secondary'" />
                  </td>
                  <td>{{ formatAge(b.oldestPendingAge) }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center text-color-secondary p-3">{{ i18n.translate('dsoc.noData') }}</td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </div>

      <!-- Gate Decisions Feed -->
      <div class="surface-card p-3 border-round shadow-1 mb-3">
        <div class="flex align-items-center gap-2 mb-2">
          <i class="pi pi-lock text-primary text-lg"></i>
          <span class="font-semibold">{{ i18n.translate('dsoc.gateDecisions') }}</span>
          <p-tag [value]="filteredGates().length + ' / ' + gates().length" severity="info" styleClass="text-xs" />
        </div>
        <p-table [value]="filteredGates()" [paginator]="true" [rows]="20" [rowHover]="true"
                 styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('dsoc.time') }}</th>
              <th>{{ i18n.translate('dsoc.tenant') }}</th>
              <th>Agent</th>
              <th>{{ i18n.translate('dsoc.tool') }}</th>
              <th>{{ i18n.translate('dsoc.decision') }}</th>
              <th>{{ i18n.translate('dsoc.decidedBy') }}</th>
              <th>{{ i18n.translate('dsoc.mode') }}</th>
              <th>{{ i18n.translate('dsoc.reason') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-g>
            <tr>
              <td class="text-xs">{{ g.ts | date:'medium' }}</td>
              <td>{{ g.tenantId }}</td>
              <td><code class="text-xs surface-100 p-1 border-round">{{ g.agentId || '—' }}</code></td>
              <td><code class="text-xs surface-100 p-1 border-round">{{ g.toolName || '—' }}</code></td>
              <td>
                <p-tag [value]="g.action"
                       [severity]="g.action === 'allowed' ? 'success' : 'danger'" />
              </td>
              <td>{{ g.decidedBy || '—' }}</td>
              <td>
                <p-tag [value]="g.enforcementMode || '—'" severity="secondary" />
              </td>
              <td class="text-xs" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [pTooltip]="g.reason">
                {{ g.reason || '—' }}
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="text-center text-color-secondary p-3">{{ i18n.translate('dsoc.noGateDecisions') }}</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- HITL Pending Queue -->
      <div class="surface-card p-3 border-round shadow-1">
        <div class="flex align-items-center gap-2 mb-2">
          <i class="pi pi-clock text-primary text-lg"></i>
          <span class="font-semibold">{{ i18n.translate('dsoc.hitlQueue') }}</span>
          <p-tag [value]="hitlQueue().length + ' pending'" [severity]="hitlQueue().length > 10 ? 'warning' : 'secondary'" styleClass="text-xs" />
        </div>
        <p-table [value]="hitlQueue()" [paginator]="true" [rows]="15" [rowHover]="true"
                 styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('dsoc.submitted') }}</th>
              <th>{{ i18n.translate('dsoc.tenant') }}</th>
              <th>Agent</th>
              <th>{{ i18n.translate('dsoc.type') }}</th>
              <th>{{ i18n.translate('dsoc.priority') }}</th>
              <th>{{ i18n.translate('dsoc.status') }}</th>
              <th>{{ i18n.translate('dsoc.autoExecuteAt') }}</th>
              <th>ID</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-h>
            <tr>
              <td class="text-xs">{{ h.createdAt | date:'short' }}</td>
              <td>{{ h.tenantId }}</td>
              <td><code class="text-xs surface-100 p-1 border-round">{{ h.agentId || '—' }}</code></td>
              <td>{{ h.proposalType || '—' }}</td>
              <td>
                <p-tag [value]="h.priority || '—'"
                       [severity]="h.priority === 'critical' ? 'danger' : h.priority === 'high' ? 'warning' : 'info'" />
              </td>
              <td>
                <p-tag [value]="h.status"
                       [severity]="h.status === 'escalated' ? 'danger' : h.status === 'pending' ? 'warning' : 'secondary'" />
              </td>
              <td class="text-xs">{{ h.autoExecuteAt ? (h.autoExecuteAt | date:'short') : '—' }}</td>
              <td><code class="text-xs" style="font-size:0.7em">{{ shortId(h.actionId) }}</code></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="8" class="text-center text-color-secondary p-3">{{ i18n.translate('dsoc.queueEmpty') }}</td></tr>
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
export class DsocAiSecurityComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  loading = signal(false);
  error = signal<string | null>(null);
  tenantFilterVal = '';
  windowVal = 24;
  decisionVal = '';
  stats = signal<GateStats | null>(null);
  gates = signal<GateRow[]>([]);
  hitlQueue = signal<HitlItem[]>([]);
  backlog = signal<HitlBacklog[]>([]);
  private timer: any = null;

  windowOptions = [
    { label: '1h', value: 1 },
    { label: '24h', value: 24 },
    { label: '7d', value: 168 },
  ];
  decisionOptions = [
    { label: 'Allowed', value: 'allowed' },
    { label: 'Denied', value: 'denied' },
  ];

  tenantOptions = computed(() => {
    const set = new Set<string>();
    this.gates().forEach(g => g.tenantId && set.add(g.tenantId));
    this.backlog().forEach(b => set.add(b.tenantId));
    this.hitlQueue().forEach(h => set.add(h.tenantId));
    return [...set].sort().map(t => ({ label: t, value: t }));
  });

  byDecidedByList = computed<[string, number][]>(() => {
    const m = this.stats()?.byDecidedBy || {};
    return Object.entries(m).filter(([k]) => k && k !== 'null')
      .sort((a, b) => b[1] - a[1]);
  });

  filteredGates = computed(() => {
    const d = this.decisionVal;
    const t = this.tenantFilterVal;
    return this.gates().filter(g =>
      (!d || g.action === d || (d === 'denied' && g.action === 'budget.denied')) &&
      (!t || g.tenantId === t),
    );
  });

  denyRate = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    const tot = s.allowed + s.denied;
    return tot ? (s.denied / tot) * 100 : 0;
  });

  ngOnInit() {
    this.refreshAll();
    this.timer = setInterval(() => this.refreshAll(), 30_000);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  setTenant(v: string) { this.tenantFilterVal = v || ''; this.refreshAll(); }
  setWindow(v: number) { this.windowVal = v; this.refreshAll(); }
  setDecision(v: string) { this.decisionVal = v || ''; }

  async refreshAll() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const tenant = this.tenantFilterVal;
      const win = this.windowVal;
      const tenantQ = tenant ? `&tenant=${encodeURIComponent(tenant)}` : '';
      const tenantQfirst = tenant ? `?tenant=${encodeURIComponent(tenant)}` : '';
      const [s, g, q, b] = await Promise.all([
        firstValueFrom(this.http.get<GateStats>(`/api/dsoc/ai/gate-stats?window=${win}${tenantQ}`)),
        firstValueFrom(this.http.get<{ rows: GateRow[] }>(`/api/dsoc/ai/gate-decisions?window=${win}${tenantQ}&limit=200`)),
        firstValueFrom(this.http.get<{ rows: HitlItem[] }>(`/api/dsoc/ai/hitl-queue${tenantQfirst}&limit=100`.replace('&', tenant ? '&' : '?'))),
        firstValueFrom(this.http.get<{ rows: HitlBacklog[] }>(`/api/dsoc/ai/hitl-backlog`)),
      ]);
      this.stats.set(s || { allowed: 0, denied: 0, byDecidedBy: {} });
      this.gates.set(g?.rows || []);
      this.hitlQueue.set(q?.rows || []);
      this.backlog.set(b?.rows || []);
    } catch (e: any) {
      this.error.set(`Failed to load: ${e?.message || e}`);
    } finally {
      this.loading.set(false);
    }
  }

  formatAge(seconds: number): string {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
  shortId(s: string): string { return s ? s.slice(0, 8) : ''; }
}
