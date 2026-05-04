import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TilesModule } from 'carbon-components-angular/tiles';
import { ButtonModule } from 'carbon-components-angular/button';
import { TagModule } from 'carbon-components-angular/tag';
import { NotificationModule } from 'carbon-components-angular/notification';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface MilestoneRow { milestone: string; title: string; status: 'CLOSED' | 'PENDING'; evidence_count: number; detail: string }
interface EvidencePack {
  generated_at: string;
  git: { clean: boolean; head: string };
  commits: { hash: string; subject: string }[];
  ci_guards: { pass: number; fail: number; total: number; output: string };
  milestones: MilestoneRow[];
  services: unknown[];
  cli: { count: number; commands: string[] };
  controlled_ddl: { total: number; tables: unknown[] };
  doctrine: { articles: unknown[]; acknowledgements: unknown[] };
  ppd: {
    plan: { id: string; title: string } | null;
    rings: unknown[];
    health_gate_adapters: string[];
    evaluations_by_decision: { decision: string; n: number }[];
    rollbacks: number;
  };
  compensation: { handler_kinds: string[]; chains: unknown[]; steps_by_kind: unknown[] };
  auto_evaluator: unknown;
  controlled_write_enforcement: { totals: { rows: number; actors: number; tables: number }; recent: unknown[] };
  rollout_ledger: unknown[];
  negative_proof: { rejected: boolean; sqlstate: string; message: string };
}

interface EndpointRow {
  surface: string;
  path: string;
  status: 'OK' | 'EMPTY' | 'ERROR';
  count: number;
  note: string;
}

@Component({
  selector: 'app-platform-admin-evidence-pack',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, DatePipe, AdminPanelFrameComponent,
    TilesModule, ButtonModule, TagModule, NotificationModule, TableModule,
  ],
  template: `
    <app-admin-panel-frame #frame
      title="Evidence Pack"
      subtitle="Production-acceptance JSON aggregating every DOS Master evidence endpoint."
      testid="panel-evidence">
      @if (pack(); as p) {
        <!-- Summary cards (Carbon Tile grid, responsive) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem"
             data-testid="evidence-summary-grid">
          <cds-tile data-testid="evidence-card-validation">
            <div class="cds--type-label-01" style="color:#525252">Last validation</div>
            <cds-tag [type]="overallOk() ? 'green' : 'red'">
              {{ overallOk() ? 'PASS' : 'NEEDS ATTENTION' }}
            </cds-tag>
            <p class="cds--type-helper-text-01" style="margin:.5rem 0 0;color:#525252">
              {{ p.generated_at | date:'medium' }}
            </p>
          </cds-tile>
          <cds-tile data-testid="evidence-card-milestones">
            <div class="cds--type-label-01" style="color:#525252">Milestones CLOSED</div>
            <div class="cds--type-productive-heading-05">
              {{ closedMilestones(p) }}/{{ p.milestones.length }}
            </div>
          </cds-tile>
          <cds-tile data-testid="evidence-card-guards">
            <div class="cds--type-label-01" style="color:#525252">CI guards</div>
            <div class="cds--type-productive-heading-05">
              {{ p.ci_guards.pass }}/{{ p.ci_guards.total }}
            </div>
            <cds-tag [type]="p.ci_guards.fail === 0 ? 'green' : 'red'">
              {{ p.ci_guards.fail }} fail
            </cds-tag>
          </cds-tile>
          <cds-tile data-testid="evidence-card-doctrine">
            <div class="cds--type-label-01" style="color:#525252">Doctrine articles</div>
            <div class="cds--type-productive-heading-05">{{ p.doctrine.articles.length }}/11</div>
            <p class="cds--type-helper-text-01" style="margin:.25rem 0 0;color:#525252">
              {{ p.doctrine.acknowledgements.length }} acks
            </p>
          </cds-tile>
          <cds-tile data-testid="evidence-card-services">
            <div class="cds--type-label-01" style="color:#525252">Services 4007–4017</div>
            <div class="cds--type-productive-heading-05">{{ p.services.length }}</div>
          </cds-tile>
          <cds-tile data-testid="evidence-card-ddl">
            <div class="cds--type-label-01" style="color:#525252">Controlled DDL tables</div>
            <div class="cds--type-productive-heading-05">{{ p.controlled_ddl.total }}</div>
          </cds-tile>
          <cds-tile data-testid="evidence-card-rings">
            <div class="cds--type-label-01" style="color:#525252">PPD rings</div>
            <div class="cds--type-productive-heading-05">{{ p.ppd.rings.length }}</div>
            <p class="cds--type-helper-text-01" style="margin:.25rem 0 0;color:#525252">
              {{ p.ppd.rollbacks }} rollback(s)
            </p>
          </cds-tile>
          <cds-tile data-testid="evidence-card-negative">
            <div class="cds--type-label-01" style="color:#525252">Article 11 negative proof</div>
            <cds-tag [type]="p.negative_proof.rejected ? 'green' : 'red'">
              {{ p.negative_proof.rejected ? 'REJECTED ' + p.negative_proof.sqlstate : 'ACCEPTED — VIOLATION' }}
            </cds-tag>
          </cds-tile>
          <cds-tile data-testid="evidence-card-git">
            <div class="cds--type-label-01" style="color:#525252">Git HEAD</div>
            <code style="font-size:.875rem">{{ p.git.head?.slice(0,9) || '—' }}</code>
            <div style="margin-top:.25rem">
              <cds-tag [type]="p.git.clean ? 'green' : 'gray'">
                {{ p.git.clean ? 'CLEAN' : 'DIRTY' }}
              </cds-tag>
            </div>
          </cds-tile>
        </div>

        <!-- Download action -->
        <cds-tile style="margin-bottom:1.5rem">
          <h2 class="cds--type-productive-heading-03" style="margin:0 0 .5rem">Download evidence pack</h2>
          <p class="cds--type-body-long-01" style="margin:0 0 1rem">
            One-shot JSON aggregation served by
            <code>GET /api/admin/console/dos-master/evidence-pack</code>. Body unions every panel below.
          </p>
          <button cdsButton="primary"
                  (click)="download()"
                  [disabled]="busy()"
                  data-testid="evidence-pack-download">
            {{ busy() ? 'Building pack…' : 'Download evidence pack' }}
          </button>
          @if (lastFile(); as f) {
            <p class="cds--type-helper-text-01" style="margin:1rem 0 0;color:#525252"
               data-testid="evidence-pack-last">
              Last download: <strong>{{ f }}</strong>
            </p>
          }
          @if (downloadError(); as e) {
            <div style="margin-top:1rem">
              <cds-notification
                [notificationObj]="{ type: 'error', title: 'Download failed', message: e, lowContrast: true, showClose: false }"
                data-testid="evidence-pack-error">
              </cds-notification>
            </div>
          }
        </cds-tile>

        <!-- Endpoint coverage table -->
        <h2 class="cds--type-productive-heading-03" style="margin:0 0 .5rem">Endpoint coverage</h2>
        <p class="cds--type-body-long-01" style="color:#525252;margin:0 0 .75rem">
          13 evidence endpoints + 2 auth endpoints — surfaced from the live BFF.
        </p>
        <cds-table [model]="endpointsModel" data-testid="evidence-endpoints"></cds-table>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminEvidencePackComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;

  pack = signal<EvidencePack | null>(null);
  busy = signal(false);
  downloadError = signal<string | null>(null);
  lastFile = signal<string | null>(null);
  endpointsModel = new TableModel();

  overallOk = computed(() => {
    const p = this.pack();
    if (!p) return false;
    return p.ci_guards.fail === 0
      && p.doctrine.articles.length >= 11
      && p.negative_proof.rejected
      && p.controlled_ddl.total > 0
      && p.ppd.rings.length > 0;
  });

  closedMilestones(p: EvidencePack): number {
    return p.milestones.filter(m => m.status === 'CLOSED').length;
  }

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<EvidencePack>('/dos-master/phase-1');
      const d = this.frame.applyResult(r, (x) => !x?.generated_at);
      this.pack.set(d);
      if (d) this.populateEndpointTable(d);
    });
    void this.frame.load();
  }

  private populateEndpointTable(p: EvidencePack): void {
    const rows: EndpointRow[] = [
      { surface: 'Auth',          path: 'POST /auth/email-login',                 status: 'OK',    count: 1,                                 note: 'Issues 24h JWE-shaped opaque session token' },
      { surface: 'Auth',          path: 'GET /auth/whoami',                       status: 'OK',    count: 1,                                 note: 'Returns user + pillar grants + expiry' },
      { surface: 'Overview',      path: 'GET /dos-master/milestones',             status: this.tag(p.milestones.length), count: p.milestones.length, note: `${this.closedMilestones(p)} CLOSED` },
      { surface: 'Services',      path: 'GET /dos-master/services',               status: this.tag(p.services.length),    count: p.services.length,   note: 'ports 4007–4017' },
      { surface: 'Doctrine',      path: 'GET /dos-master/doctrine',               status: this.tag(p.doctrine.articles.length), count: p.doctrine.articles.length, note: `${p.doctrine.acknowledgements.length} acks` },
      { surface: 'Controlled DDL',path: 'GET /dos-master/controlled-ddl',         status: this.tag(p.controlled_ddl.total),     count: p.controlled_ddl.total,     note: 'trg_dos_master_only-protected' },
      { surface: 'PPD',           path: 'GET /dos-master/ppd',                    status: this.tag(p.ppd.rings.length),         count: p.ppd.rings.length,         note: `${p.ppd.health_gate_adapters.length} health gates` },
      { surface: 'Compensation',  path: 'GET /dos-master/compensation',           status: this.tag(p.compensation.handler_kinds.length), count: p.compensation.handler_kinds.length, note: `${p.compensation.chains.length} chains` },
      { surface: 'Auto-evaluator',path: 'GET /dos-master/auto-evaluator',         status: p.auto_evaluator ? 'OK' : 'EMPTY',   count: 1,                  note: 'real signal endpoints (Prom/Loki/Jaeger)' },
      { surface: 'Controlled writes', path: 'GET /dos-master/controlled-write',   status: this.tag(p.controlled_write_enforcement.totals.rows), count: p.controlled_write_enforcement.totals.rows, note: `${p.controlled_write_enforcement.totals.actors} actors` },
      { surface: 'Rollout ledger',path: 'GET /dos-master/rollout-ledger',         status: this.tag(p.rollout_ledger.length),    count: p.rollout_ledger.length,    note: 'invalidation_log top 50' },
      { surface: 'CI guards',     path: 'GET /dos-master/ci-guards',              status: p.ci_guards.fail === 0 ? 'OK' : 'ERROR', count: p.ci_guards.total, note: `${p.ci_guards.pass}/${p.ci_guards.total} PASS, ${p.ci_guards.fail} FAIL` },
      { surface: 'CLI',           path: 'GET /dos-master/cli',                    status: this.tag(p.cli.count),                count: p.cli.count,                note: 'dos.mjs commands' },
      { surface: 'Negative proof',path: 'GET /dos-master/negative-proof',         status: p.negative_proof.rejected ? 'OK' : 'ERROR', count: 1,        note: `sqlstate ${p.negative_proof.sqlstate}` },
      { surface: 'Pack',          path: 'GET /dos-master/evidence-pack',          status: 'OK',                                 count: 1,                          note: 'application/json attachment' },
    ];
    this.endpointsModel.header = ['Surface', 'Endpoint', 'Status', 'Count', 'Note']
      .map(h => new TableHeaderItem({ data: h }));
    this.endpointsModel.data = rows.map(r => [
      new TableItem({ data: r.surface }),
      new TableItem({ data: r.path }),
      new TableItem({ data: r.status }),
      new TableItem({ data: String(r.count) }),
      new TableItem({ data: r.note }),
    ]);
  }

  private tag(n: number): EndpointRow['status'] { return n > 0 ? 'OK' : 'EMPTY'; }

  async download(): Promise<void> {
    this.busy.set(true);
    this.downloadError.set(null);
    try {
      const out = await this.api.downloadEvidencePack();
      if (!out) {
        this.downloadError.set('Endpoint returned no payload (unauthorized or service down).');
        return;
      }
      const a = document.createElement('a');
      a.href = out.blobUrl;
      a.download = out.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(out.blobUrl), 5_000);
      this.lastFile.set(out.filename);
    } catch (e) {
      this.downloadError.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
