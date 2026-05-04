import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { TilesModule } from 'carbon-components-angular/tiles';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Payload { total: number; tables: { schema: string; table: string }[] }

@Component({
  selector: 'app-platform-admin-controlled-ddl',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule, TilesModule],
  template: `
    <app-admin-panel-frame #frame
      title="Controlled DDL"
      subtitle="Tables enforced by trg_dos_master_only — DOS Master is the only writer (Article 11)."
      testid="panel-controlled-ddl">
      @if (data(); as d) {
        <cds-tile style="margin-bottom:1rem">
          <div class="cds--type-label-01" style="color:#525252">Total controlled tables</div>
          <div class="cds--type-productive-heading-05">{{ d.total }}</div>
        </cds-tile>
        <cds-table [model]="model" data-testid="controlled-ddl-table"></cds-table>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminControlledDdlComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/controlled-ddl');
      const d = this.frame.applyResult(r, (x) => !x?.tables?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Schema', 'Table'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.tables.map(t => [
          new TableItem({ data: t.schema }),
          new TableItem({ data: t.table }),
        ]);
      }
    });
    void this.frame.load();
  }
}
