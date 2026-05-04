import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface ServiceRow {
  service_code: string; port: number; trust_zone: string; status: string;
  pm2_name: string | null; endpoints: string | number;
}
interface Payload { services: ServiceRow[] }

@Component({
  selector: 'app-platform-admin-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: `
    <app-admin-panel-frame #frame
      title="DOS Master Services (ports 4007–4017)"
      subtitle="Source: dos_master.service_registry."
      testid="panel-services">
      <cds-table [model]="model" data-testid="services-table"></cds-table>
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminServicesComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/services');
      const d = this.frame.applyResult(r, (x) => !x?.services?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Service', 'Port', 'Trust zone', 'Status', 'Endpoints', 'PM2 name'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.services.map(s => [
          new TableItem({ data: s.service_code }),
          new TableItem({ data: String(s.port) }),
          new TableItem({ data: s.trust_zone }),
          new TableItem({ data: s.status }),
          new TableItem({ data: String(s.endpoints) }),
          new TableItem({ data: s.pm2_name ?? '—' }),
        ]);
      }
    });
    void this.frame.load();
  }
}
