import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Row { id: string; record_key: string; version: number; title: string; kind: string; trust_zone: string; status: string; created_by: string; created_at: string; published_at: string | null; }
interface Payload { records: Row[] }

@Component({
  selector: 'app-platform-admin-deployment-os-records',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: `
    <app-admin-panel-frame #frame
      title="Deployment artefact — Records"
      subtitle="Source: dos.deployment_record (controlled by trg_dos_master_only_deployment_record)."
      testid="panel-deployment-os-records">
      <cds-table [model]="model" data-testid="deployment-os-records-table"></cds-table>
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminDeploymentOsRecordsComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/deployment-os/records');
      const d = this.frame.applyResult(r, (x) => !x?.records?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Key','Version','Title','Kind','Trust zone','Status','Created by','Published'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.records.map(r0 => [
          new TableItem({ data: r0.record_key }),
          new TableItem({ data: String(r0.version) }),
          new TableItem({ data: r0.title }),
          new TableItem({ data: r0.kind }),
          new TableItem({ data: r0.trust_zone }),
          new TableItem({ data: r0.status }),
          new TableItem({ data: r0.created_by }),
          new TableItem({ data: r0.published_at ?? '—' }),
        ]);
      }
    });
    void this.frame.load();
  }
}
