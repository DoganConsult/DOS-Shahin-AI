import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { TagModule } from 'carbon-components-angular/tag';
import { TilesModule } from 'carbon-components-angular/tiles';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Article { article_no: number; title: string; enforced_by: string }
interface Ack { article_no: number; actor: string; ack_at: string }
interface Payload { articles: Article[]; acknowledgements: Ack[] }

@Component({
  selector: 'app-platform-admin-doctrine',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule, TagModule, TilesModule],
  template: `
    <app-admin-panel-frame #frame
      title="Doctrine — 11 articles"
      subtitle="dos_master.doctrine_article + doctrine_acknowledgement."
      testid="panel-doctrine">
      @if (data(); as d) {
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem">
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Articles</div>
            <div class="cds--type-productive-heading-05">{{ d.articles.length }}</div>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Acknowledgements</div>
            <div class="cds--type-productive-heading-05">{{ d.acknowledgements.length }}</div>
          </cds-tile>
        </div>
        <h2 class="cds--type-productive-heading-03" style="margin:1rem 0 .5rem">Articles</h2>
        <cds-table [model]="articleModel" data-testid="doctrine-articles"></cds-table>
        <h2 class="cds--type-productive-heading-03" style="margin:1.5rem 0 .5rem">Acknowledgements</h2>
        <cds-table [model]="ackModel"></cds-table>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminDoctrineComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  articleModel = new TableModel();
  ackModel = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/doctrine');
      const d = this.frame.applyResult(r, (x) => !x?.articles?.length);
      this.data.set(d);
      if (d) {
        this.articleModel.header = ['#', 'Title', 'Enforced by'].map(h => new TableHeaderItem({ data: h }));
        this.articleModel.data = d.articles.map(a => [
          new TableItem({ data: String(a.article_no) }),
          new TableItem({ data: a.title }),
          new TableItem({ data: a.enforced_by }),
        ]);
        this.ackModel.header = ['Article', 'Actor', 'Ack at'].map(h => new TableHeaderItem({ data: h }));
        this.ackModel.data = d.acknowledgements.map(a => [
          new TableItem({ data: String(a.article_no) }),
          new TableItem({ data: a.actor }),
          new TableItem({ data: a.ack_at }),
        ]);
      }
    });
    void this.frame.load();
  }
}
