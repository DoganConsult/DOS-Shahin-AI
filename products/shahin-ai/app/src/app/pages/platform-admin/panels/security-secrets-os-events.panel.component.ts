import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel, TableHeaderItem, TableItem } from 'carbon-components-angular/table';
import { AdminPanelFrameComponent } from './admin-panel-frame.component';
import { PlatformAdminApiService } from '../platform-admin-api.service';

interface Row { id: number; record_key: string | null; kind: string; emitted_by: string; emitted_at: string; }
interface Payload { events: Row[] }

@Component({
  selector: 'app-platform-admin-security-secrets-os-events',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminPanelFrameComponent, TableModule],
  template: `
    <app-admin-panel-frame #frame
      title="Secret metadata + rotation — Events"
      subtitle="Source: dos.security_secret_event (append-only ledger, 2026-05-04)."
      testid="panel-security-secrets-os-events">
      <cds-table [model]="model" data-testid="security-secrets-os-events-table"></cds-table>
    </app-admin-panel-frame>
  `,
})
export class PlatformAdminSecuritySecretsOsEventsComponent implements AfterViewInit {
  private api = inject(PlatformAdminApiService);
  @ViewChild('frame') frame!: AdminPanelFrameComponent;
  model = new TableModel();
  data = signal<Payload | null>(null);

  ngAfterViewInit(): void {
    this.frame.bind(async () => {
      const r = await this.api.get<Payload>('/security-secrets-os/events');
      const d = this.frame.applyResult(r, (x) => !x?.events?.length);
      this.data.set(d);
      if (d) {
        this.model.header = ['Record key','Kind','Emitted by','Emitted at'].map(h => new TableHeaderItem({ data: h }));
        this.model.data = d.events.map(r0 => [
          new TableItem({ data: r0.record_key ?? '—' }),
          new TableItem({ data: r0.kind }),
          new TableItem({ data: r0.emitted_by }),
          new TableItem({ data: r0.emitted_at }),
        ]);
      }
    });
    void this.frame.load();
  }
}
