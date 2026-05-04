import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilesModule } from 'carbon-components-angular/tiles';
import { TagModule } from 'carbon-components-angular/tag';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Payload { pass: number; fail: number; total: number; output: string }

@Component({
  selector: 'app-platform-admin-ci-guards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TilesModule, TagModule],
  template: `
    <app-admin-panel-frame #frame
      title="CI Guards"
      subtitle="scripts/ci-guards/dos-master-gate.mjs — runs the full doctrine + PPD gate suite."
      testid="panel-ci-guards">
      @if (data(); as d) {
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem">
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Guards PASS</div>
            <div class="cds--type-productive-heading-05">{{ d.pass }}/{{ d.total }}</div>
          </cds-tile>
          <cds-tile data-testid="guards-fail-tile">
            <div class="cds--type-label-01" style="color:#525252">FAIL</div>
            <cds-tag [type]="d.fail === 0 ? 'green' : 'red'">{{ d.fail }}</cds-tag>
          </cds-tile>
        </div>
        <h2 class="cds--type-productive-heading-03" style="margin:0 0 .5rem">Runner output (tail)</h2>
        <pre style="background:#161616;color:#42be65;padding:1rem;font-size:.75rem;overflow:auto;max-height:480px;font-family:'IBM Plex Mono',monospace"
             data-testid="guards-output">{{ d.output }}</pre>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminCiGuardsComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/ci-guards');
      const d = this.frame.applyResult(r, (x) => x?.total === 0);
      this.data.set(d);
    });
    void this.frame.load();
  }
}
