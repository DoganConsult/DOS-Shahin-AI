import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilesModule } from 'carbon-components-angular/tiles';
import { TagModule } from 'carbon-components-angular/tag';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Payload {
  poll_ms: number; auto_rollback: boolean; signal_mode: string;
  real_signal_endpoints: { prom: string; loki: string; jaeger: string; synthetic: string };
}

@Component({
  selector: 'app-platform-admin-auto-evaluator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TilesModule, TagModule],
  template: `
    <app-admin-panel-frame #frame
      title="Auto-evaluator"
      subtitle="rollout-service health-gate evaluator + real signal endpoints."
      testid="panel-auto-evaluator">
      @if (data(); as d) {
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem">
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Poll interval</div>
            <div class="cds--type-productive-heading-05">{{ d.poll_ms }} ms</div>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Auto-rollback</div>
            <cds-tag [type]="d.auto_rollback ? 'green' : 'red'">{{ d.auto_rollback ? 'enabled' : 'disabled' }}</cds-tag>
          </cds-tile>
          <cds-tile>
            <div class="cds--type-label-01" style="color:#525252">Signal mode</div>
            <cds-tag type="cool-gray">{{ d.signal_mode }}</cds-tag>
          </cds-tile>
        </div>
        <h2 class="cds--type-productive-heading-03" style="margin:0 0 .5rem">Real signal endpoints</h2>
        <cds-tile>
          <dl style="margin:0;display:grid;grid-template-columns:8rem 1fr;gap:.5rem;font-size:.875rem">
            <dt>Prometheus</dt><dd><code>{{ d.real_signal_endpoints.prom }}</code></dd>
            <dt>Loki</dt><dd><code>{{ d.real_signal_endpoints.loki }}</code></dd>
            <dt>Jaeger</dt><dd><code>{{ d.real_signal_endpoints.jaeger }}</code></dd>
            <dt>Synthetic</dt><dd><code>{{ d.real_signal_endpoints.synthetic || '—' }}</code></dd>
          </dl>
        </cds-tile>
      }
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminAutoEvaluatorComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/dos-master/auto-evaluator');
      const d = this.frame.applyResult(r, (x) => !x?.real_signal_endpoints);
      this.data.set(d);
    });
    void this.frame.load();
  }
}
