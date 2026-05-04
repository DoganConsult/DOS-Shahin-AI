import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface DefRow {
  id: string; workflow_key: string; version: number; title: string;
  kind: string; trust_zone: string; status: string;
  created_by: string; created_at: string; published_at: string | null;
}
interface Payload { definitions: DefRow[] }

@Component({
  selector: 'app-platform-admin-workflow-definitions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: `
    <app-admin-panel-frame #frame
      title="Workflow OS — Definitions"
      subtitle="Source: dos.workflow_definition (controlled by trg_dos_master_only_workflow_definition)."
      testid="panel-workflow-definitions">
      <cds-table [model]="model" data-testid="workflow-definitions-table"></cds-table>
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminWorkflowDefinitionsComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/workflow/definitions');
      const d = this.frame.applyResult(r, (x) => !x?.definitions?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Key', 'Version', 'Title', 'Kind', 'Trust zone', 'Status', 'Published'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.definitions.map(r0 => [
          new TableItem({ data: r0.workflow_key }),
          new TableItem({ data: String(r0.version) }),
          new TableItem({ data: r0.title }),
          new TableItem({ data: r0.kind }),
          new TableItem({ data: r0.trust_zone }),
          new TableItem({ data: r0.status }),
          new TableItem({ data: r0.published_at ?? '—' }),
        ]);
      }
    });
    void this.frame.load();
  }
}
