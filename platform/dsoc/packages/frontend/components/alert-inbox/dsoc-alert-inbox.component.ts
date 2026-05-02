/**
 * DSOC Alert Inbox component.
 *
 * Real Angular standalone component. Reads open alerts via the
 * injected DSOCAlertInboxPort, renders them with severity badges,
 * and lets the operator acknowledge / resolve each one.
 *
 * Product shells embed this in a top-level admin route, e.g.
 * /admin/security/alerts.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { DSOC_ALERT_INBOX_PORT, type DSOCAlertInboxPort } from '../../ports';

interface AlertVm {
  id: number;
  severity: string;
  category: string;
  action: string;
  createdAt: string;
}

@Component({
  selector: 'dsoc-alert-inbox',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dsoc-alert-inbox">
      <header class="dsoc-alert-inbox__header">
        <h2>Open Alerts</h2>
        <span class="dsoc-alert-inbox__count">{{ alerts().length }}</span>
        <button type="button" (click)="refresh()" [disabled]="loading()">
          {{ loading() ? 'Loading…' : 'Refresh' }}
        </button>
      </header>

      <div *ngIf="error() as err" class="dsoc-alert-inbox__error" role="alert">
        {{ err }}
      </div>

      <ul *ngIf="!loading() && alerts().length > 0" class="dsoc-alert-inbox__list">
        <li *ngFor="let a of alerts(); trackBy: trackById" class="dsoc-alert-inbox__row">
          <span class="dsoc-alert-inbox__severity" [class]="'sev-' + a.severity">
            {{ a.severity }}
          </span>
          <span class="dsoc-alert-inbox__category">{{ a.category }}</span>
          <span class="dsoc-alert-inbox__action">{{ a.action }}</span>
          <time class="dsoc-alert-inbox__time">{{ a.createdAt }}</time>
          <button type="button" (click)="acknowledge(a.id)">Acknowledge</button>
          <button type="button" (click)="resolve(a.id)">Resolve</button>
        </li>
      </ul>

      <p *ngIf="!loading() && alerts().length === 0" class="dsoc-alert-inbox__empty">
        No open alerts.
      </p>
    </section>
  `,
  styles: [`
    .dsoc-alert-inbox { font-family: system-ui, sans-serif; }
    .dsoc-alert-inbox__header { display: flex; align-items: center; gap: 0.5rem; }
    .dsoc-alert-inbox__count { background:#eee; border-radius:1rem; padding:0 0.5rem; }
    .dsoc-alert-inbox__error { color:#a00; padding:0.5rem; border:1px solid #f00; }
    .dsoc-alert-inbox__list { list-style:none; padding:0; }
    .dsoc-alert-inbox__row { display:grid; grid-template-columns:80px 120px 1fr 180px 110px 90px;
      gap:0.5rem; padding:0.4rem; border-bottom:1px solid #eee; align-items:center; }
    .dsoc-alert-inbox__severity { font-weight:600; text-transform:uppercase; }
    .sev-critical { color:#fff; background:#900; padding:0.1rem 0.4rem; border-radius:0.25rem; }
    .sev-high     { color:#fff; background:#c33; padding:0.1rem 0.4rem; border-radius:0.25rem; }
    .sev-medium   { color:#000; background:#fc6; padding:0.1rem 0.4rem; border-radius:0.25rem; }
    .sev-low      { color:#000; background:#fd9; padding:0.1rem 0.4rem; border-radius:0.25rem; }
    .sev-info     { color:#000; background:#9cf; padding:0.1rem 0.4rem; border-radius:0.25rem; }
    .dsoc-alert-inbox__empty { color:#666; padding:1rem; }
  `],
})
export class DsocAlertInboxComponent implements OnInit {
  @Input({ required: true }) tenantId!: string;
  @Input() actorId = 'operator';

  private port = inject<DSOCAlertInboxPort>(DSOC_ALERT_INBOX_PORT);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly _alerts = signal<readonly AlertVm[]>([]);
  readonly alerts = computed(() => this._alerts());

  ngOnInit(): void {
    void this.refresh();
  }

  trackById(_i: number, a: AlertVm): number {
    return a.id;
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.port.listOpen(this.tenantId));
      this._alerts.set([...list]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load alerts.');
    } finally {
      this.loading.set(false);
    }
  }

  async acknowledge(id: number): Promise<void> {
    try {
      await firstValueFrom(this.port.acknowledge(id, this.actorId));
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Acknowledge failed.');
    }
  }

  async resolve(id: number): Promise<void> {
    try {
      await firstValueFrom(this.port.resolve(id, this.actorId));
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Resolve failed.');
    }
  }
}
