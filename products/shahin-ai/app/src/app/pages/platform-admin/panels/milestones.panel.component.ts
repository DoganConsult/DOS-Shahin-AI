import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { TagModule } from 'carbon-components-angular/tag';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface MilestoneRow { milestone: string; title: string; status: 'CLOSED' | 'PENDING'; evidence_count: number; detail: string }
interface Payload { milestones: MilestoneRow[] }

@Component({
  selector: 'app-platform-admin-milestones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule, TagModule],
  template: `
    <app-admin-panel-frame #frame
      title="Phase 1 — M1 through M14"
      subtitle="Force-binding doctrine milestones, evidence-counted from controlled tables."
      testid="panel-milestones">
      <cds-table [model]="model" data-testid="milestones-table"></cds-table>
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminMilestonesComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/milestones');
      const d = this.frame.applyResult(r, (x) => !x?.milestones?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['M', 'Title', 'Status', 'Evidence', 'Detail'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.milestones.map(m => [
          new TableItem({ data: m.milestone }),
          new TableItem({ data: m.title }),
          new TableItem({ data: m.status }),
          new TableItem({ data: String(m.evidence_count) }),
          new TableItem({ data: m.detail }),
        ]);
      }
    });
    void this.frame.load();
  }
}
