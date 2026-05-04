import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface InstRow {
  id: string; workflow_key: string; version: number; tenant_id: string | null;
  initiated_by: string; status: string; current_step: string | null;
  started_at: string; ended_at: string | null;
}
interface Payload { instances: InstRow[] }

@Component({
  selector: 'app-platform-admin-workflow-instances',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: `
    <app-admin-panel-frame #frame
      title="Workflow OS — Instances"
      subtitle="Source: dos.workflow_instance (runtime, append-only step + event ledgers)."
      testid="panel-workflow-instances">
      <cds-table [model]="model" data-testid="workflow-instances-table"></cds-table>
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminWorkflowInstancesComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/workflow/instances');
      const d = this.frame.applyResult(r, (x) => !x?.instances?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Workflow', 'Version', 'Tenant', 'Initiated by', 'Status', 'Current step', 'Started', 'Ended'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.instances.map(r0 => [
          new TableItem({ data: r0.workflow_key }),
          new TableItem({ data: String(r0.version) }),
          new TableItem({ data: r0.tenant_id ?? '—' }),
          new TableItem({ data: r0.initiated_by }),
          new TableItem({ data: r0.status }),
          new TableItem({ data: r0.current_step ?? '—' }),
          new TableItem({ data: r0.started_at }),
          new TableItem({ data: r0.ended_at ?? '—' }),
        ]);
      }
    });
    void this.frame.load();
  }
}
