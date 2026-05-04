import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { TilesModule } from 'carbon-components-angular/tiles';
import { TagModule } from 'carbon-components-angular/tag';
import { ProgressBarModule } from 'carbon-components-angular/progress-bar';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Ring { ring_code: string; ring_order: number; status: string; started_at: string | null; ended_at: string | null; gates: number; cohorts: number }
interface Plan { id: string; title: string; status: string; created_at: string }
interface Payload {
  plan: Plan | null;
  rings: Ring[];
  health_gate_adapters: string[];
  evaluations_by_decision: { decision: string; n: number }[];
  rollbacks: number;
}

@Component({
  selector: 'app-platform-admin-ppd',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule, TilesModule, TagModule, ProgressBarModule],
  template: `
    <app-admin-panel-frame #frame
      title="PPD Rollouts — R0 → R5"
      subtitle="Live ring engine state from dos.rollout_plan / rollout_ring."
      testid="panel-ppd">
      @if (data(); as d) {
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem">
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Plan</div>
            <div class="cds--type-productive-heading-04">{{ d.plan?.title || '—' }}</div>
            <code style="font-size:.75rem;color:#6f6f6f">{{ d.plan?.id }}</code>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Health-gate adapters</div>
            <div class="cds--type-productive-heading-05">{{ d.health_gate_adapters.length }}</div>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Rollbacks</div>
            <div class="cds--type-productive-heading-05">{{ d.rollbacks }}</div>
          </cds-tile>
        </div>
        <cds-progress-bar
          label="Ring progress"
          [helperText]="progressLabel(d)"
          [value]="ringProgress(d)"
          [max]="d.rings.length || 1"></cds-progress-bar>
        <h2 class="cds--type-productive-heading-03" style="margin:1.5rem 0 .5rem">Rings</h2>
        <cds-table [model]="ringsModel" data-testid="ppd-rings"></cds-table>
        <h2 class="cds--type-productive-heading-03" style="margin:1.5rem 0 .5rem">Evaluations</h2>
        <cds-table [model]="evalModel"></cds-table>
        <h2 class="cds--type-productive-heading-03" style="margin:1.5rem 0 .5rem">Health-gate adapters</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          @for (a of d.health_gate_adapters; track a) {
            <cds-tag type="cool-gray">{{ a }}</cds-tag>
          }
        </div>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminPpdComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  ringsModel = new TableModel();
  evalModel = new TableModel();
  data = signal<Payload | null>(null);

  ringProgress(d: Payload): number {
    return d.rings.filter(r => r.status === 'succeeded' || r.status === 'active').length;
  }
  progressLabel(d: Payload): string {
    return `${this.ringProgress(d)} of ${d.rings.length} rings succeeded/active`;
  }

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/ppd');
      const d = this.frame.applyResult(r, (x) => !x?.rings?.length);
      this.data.set(d);
      if (d) {
        this.ringsModel.header = ['Ring', 'Order', 'Status', 'Started', 'Ended', 'Gates', 'Cohorts'].map(h => new TableHeaderItem({ data: h }));
        this.ringsModel.data = d.rings.map(rg => [
          new TableItem({ data: rg.ring_code }),
          new TableItem({ data: String(rg.ring_order) }),
          new TableItem({ data: rg.status }),
          new TableItem({ data: rg.started_at ?? '—' }),
          new TableItem({ data: rg.ended_at ?? '—' }),
          new TableItem({ data: String(rg.gates) }),
          new TableItem({ data: String(rg.cohorts) }),
        ]);
        this.evalModel.header = ['Decision', 'Count'].map(h => new TableHeaderItem({ data: h }));
        this.evalModel.data = d.evaluations_by_decision.map(e => [
          new TableItem({ data: e.decision }),
          new TableItem({ data: String(e.n) }),
        ]);
      }
    });
    void this.frame.load();
  }
}
