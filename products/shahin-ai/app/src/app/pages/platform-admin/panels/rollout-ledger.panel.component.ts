import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Row { id: string; scope: string; scope_key: string; reason: string; cache_version: number; fan_out_count: number; emitted_at: string }
interface Payload { ledger: Row[] }

@Component({
  selector: 'app-platform-admin-rollout-ledger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: `
    <app-admin-panel-frame #frame
      title="Rollout / invalidation ledger"
      subtitle="dos.dos_master_invalidation_log — top 50 most recent rows."
      testid="panel-rollout-ledger">
      <cds-table [model]="model" data-testid="rollout-ledger"></cds-table>
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminRolloutLedgerComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/rollout-ledger');
      const d = this.frame.applyResult(r, (x) => !x?.ledger?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Emitted', 'Scope', 'Key', 'Reason', 'Cache v', 'Fan-out'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.ledger.map(r => [
          new TableItem({ data: r.emitted_at }),
          new TableItem({ data: r.scope }),
          new TableItem({ data: r.scope_key }),
          new TableItem({ data: r.reason }),
          new TableItem({ data: String(r.cache_version) }),
          new TableItem({ data: String(r.fan_out_count) }),
        ]);
      }
    });
    void this.frame.load();
  }
}
