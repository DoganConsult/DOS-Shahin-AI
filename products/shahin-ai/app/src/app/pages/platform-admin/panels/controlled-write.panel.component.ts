import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { TilesModule } from 'carbon-components-angular/tiles';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Totals { rows: number; actors: number; tables: number }
interface Recent { occurred_at: string; actor: string; target: string; op: string }
interface Payload { totals: Totals; recent: Recent[] }

@Component({
  selector: 'app-platform-admin-controlled-write',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule, TilesModule],
  template: `
    <app-admin-panel-frame #frame
      title="Controlled writes — writer audit"
      subtitle="dos.dos_master_writer_audit — every controlled-table write is captured."
      testid="panel-controlled-write">
      @if (data(); as d) {
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem">
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Audit rows</div>
            <div class="cds--type-productive-heading-05">{{ d.totals.rows }}</div>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Distinct actors</div>
            <div class="cds--type-productive-heading-05">{{ d.totals.actors }}</div>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Tables touched</div>
            <div class="cds--type-productive-heading-05">{{ d.totals.tables }}</div>
          </cds-tile>
        </div>
        <h2 class="cds--type-productive-heading-03" style="margin:0 0 .5rem">Recent writes (last 20)</h2>
        <cds-table [model]="model" data-testid="writer-audit"></cds-table>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminControlledWriteComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/controlled-write');
      const d = this.frame.applyResult(r, (x) => !x?.totals);
      this.data.set(d);
      if (d) {
        this.model.header = ['Occurred', 'Actor', 'Target', 'Op'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.recent.map(r => [
          new TableItem({ data: r.occurred_at }),
          new TableItem({ data: r.actor }),
          new TableItem({ data: r.target }),
          new TableItem({ data: r.op }),
        ]);
      }
    });
    void this.frame.load();
  }
}
