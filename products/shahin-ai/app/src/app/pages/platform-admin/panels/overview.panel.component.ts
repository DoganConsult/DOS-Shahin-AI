import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilesModule } from 'carbon-components-angular/tiles';
import { TagModule } from 'carbon-components-angular/tag';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface MilestoneRow { milestone: string; title: string; status: 'CLOSED' | 'PENDING'; evidence_count: number; detail: string }
interface OverviewPayload {
  milestones: MilestoneRow[];
  commits: { hash: string; subject: string }[];
  git: { clean: boolean; head: string };
}

@Component({
  selector: 'app-platform-admin-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TilesModule, TagModule, TableModule],
  template: `
    <app-admin-panel-frame #frame
      title="DOS Master Phase 1"
      subtitle="Live evidence queried from shahin_grc."
      testid="panel-overview">
      @if (data(); as d) {
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem">
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Milestones CLOSED</div>
            <div class="cds--type-productive-heading-05">{{ closed(d) }}/{{ d.milestones.length }}</div>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Recent commits</div>
            <div class="cds--type-productive-heading-05">{{ d.commits.length }}</div>
          </cds-tile>
          <cds-tile data-testid="overview-git-state">
            <div class="cds--type-label-01" style="color:#525252">Git working tree</div>
            <cds-tag [type]="d.git.clean ? 'green' : 'red'">{{ d.git.clean ? 'CLEAN' : 'DIRTY' }}</cds-tag>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">HEAD</div>
            <code style="font-size:.875rem">{{ d.git.head?.slice(0, 9) || '—' }}</code>
          </cds-tile>
        </div>
        <h2 class="cds--type-productive-heading-03" style="margin:1rem 0 .5rem">Recent commits</h2>
        <cds-table [model]="commitsModel"></cds-table>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminOverviewComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  data = signal<OverviewPayload | null>(null);
  commitsModel = new TableModel();

  closed(d: OverviewPayload): number { return d.milestones.filter(m => m.status === 'CLOSED').length; }

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<OverviewPayload>('/dos-master/milestones');
      const d = this.frame.applyResult(r, (x) => !x?.milestones?.length);
      this.data.set(d);
      if (d) {
        this.commitsModel.header = [new TableHeaderItem({ data: 'Hash' }), new TableHeaderItem({ data: 'Subject' })];
        this.commitsModel.data = d.commits.map(c => [
          new TableItem({ data: c.hash }),
          new TableItem({ data: c.subject }),
        ]);
      }
    });
    void this.frame.load();
  }
}
