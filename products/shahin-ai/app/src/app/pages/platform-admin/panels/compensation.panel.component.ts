import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { TagModule } from 'carbon-components-angular/tag';
import { TilesModule } from 'carbon-components-angular/tiles';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Chain { id: string; status: string; step_count: number; created_at: string }
interface StepKind { step_kind: string; n: number }
interface Payload { handler_kinds: string[]; chains: Chain[]; steps_by_kind: StepKind[] }

@Component({
  selector: 'app-platform-admin-compensation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule, TagModule, TilesModule],
  template: `
    <app-admin-panel-frame #frame
      title="Compensation chains"
      subtitle="dos.dos_master_compensation_chain — orchestrator handler kinds."
      testid="panel-compensation">
      @if (data(); as d) {
        <h2 class="cds--type-productive-heading-03" style="margin:0 0 .5rem">Handler kinds</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.5rem">
          @for (k of d.handler_kinds; track k) { <cds-tag type="cool-gray">{{ k }}</cds-tag> }
        </div>
        <h2 class="cds--type-productive-heading-03" style="margin:0 0 .5rem">Chains</h2>
        <cds-table [model]="chainsModel" data-testid="comp-chains"></cds-table>
        <h2 class="cds--type-productive-heading-03" style="margin:1.5rem 0 .5rem">Steps by kind</h2>
        <cds-table [model]="stepsModel"></cds-table>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminCompensationComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  chainsModel = new TableModel();
  stepsModel = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/compensation');
      const d = this.frame.applyResult(r, (x) => !x?.handler_kinds?.length);
      this.data.set(d);
      if (d) {
        this.chainsModel.header = ['Chain id', 'Status', 'Steps', 'Created'].map(h => new TableHeaderItem({ data: h }));
        this.chainsModel.data = d.chains.map(c => [
          new TableItem({ data: c.id }),
          new TableItem({ data: c.status }),
          new TableItem({ data: String(c.step_count) }),
          new TableItem({ data: c.created_at }),
        ]);
        this.stepsModel.header = ['Step kind', 'Count'].map(h => new TableHeaderItem({ data: h }));
        this.stepsModel.data = d.steps_by_kind.map(s => [
          new TableItem({ data: s.step_kind }),
          new TableItem({ data: String(s.n) }),
        ]);
      }
    });
    void this.frame.load();
  }
}
