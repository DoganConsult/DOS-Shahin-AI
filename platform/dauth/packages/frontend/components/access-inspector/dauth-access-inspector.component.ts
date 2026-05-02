/**
 * DAuth Access Inspector component.
 *
 * Lets an operator check whether a user can perform an action on a
 * resource. Renders the full DAuthAccessResult (decision + reason
 * codes + decisionId + evaluated-at), so it's debuggable.
 *
 * Real Angular standalone. Calls DAuthHttpClient directly (no port
 * token needed — the HTTP client IS the port binding).
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DAuthHttpClient } from '../../services/dauth-http.client';
import type { DAuthAccessResult } from '@dos/ports/dauth';

@Component({
  selector: 'dauth-access-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dauth-access-inspector">
      <h2>Access Inspector</h2>

      <form (ngSubmit)="run()">
        <label>Tenant ID <input [(ngModel)]="tenantId" name="tenantId" required></label>
        <label>User ID <input [(ngModel)]="userId" name="userId" required></label>
        <label>Roles (comma-sep) <input [(ngModel)]="rolesCsv" name="rolesCsv"></label>
        <label>Action <input [(ngModel)]="action" name="action" required placeholder="e.g. risk.read"></label>
        <label>Resource type <input [(ngModel)]="resourceType" name="resourceType" required></label>
        <label>Resource ID (optional) <input [(ngModel)]="resourceId" name="resourceId"></label>
        <button type="submit" [disabled]="busy()">
          {{ busy() ? 'Evaluating…' : 'Evaluate' }}
        </button>
      </form>

      <div *ngIf="error() as err" class="dauth-access-inspector__error" role="alert">{{ err }}</div>

      <div *ngIf="result() as r" class="dauth-access-inspector__result">
        <h3 [class.allow]="r.decision === 'allow'" [class.deny]="r.decision === 'deny'">
          {{ r.decision | uppercase }}
        </h3>
        <dl>
          <dt>decisionId</dt><dd>{{ r.decisionId }}</dd>
          <dt>evaluatedAt</dt><dd>{{ r.evaluatedAt }}</dd>
          <dt>reasonCodes</dt><dd>{{ r.reasonCodes.join(', ') || '—' }}</dd>
          <dt *ngIf="r.policyVersion">policyVersion</dt>
          <dd *ngIf="r.policyVersion">{{ r.policyVersion }}</dd>
        </dl>
        <details *ngIf="r.obligations">
          <summary>Obligations</summary>
          <pre>{{ r.obligations | json }}</pre>
        </details>
      </div>
    </section>
  `,
  styles: [`
    .dauth-access-inspector { font-family: system-ui, sans-serif; max-width:640px; }
    .dauth-access-inspector form { display:grid; gap:0.5rem; padding-bottom:1rem; }
    .dauth-access-inspector label { display:flex; justify-content:space-between; gap:1rem; align-items:center; }
    .dauth-access-inspector input { flex:1; padding:0.25rem 0.5rem; }
    .dauth-access-inspector__error { color:#a00; padding:0.5rem; border:1px solid #f00; }
    .dauth-access-inspector__result h3.allow { color:#060; }
    .dauth-access-inspector__result h3.deny  { color:#a00; }
    .dauth-access-inspector__result dl { display:grid; grid-template-columns:max-content 1fr; gap:0.25rem 1rem; }
    .dauth-access-inspector__result dt { font-weight:600; }
    .dauth-access-inspector__result pre { background:#fafafa; padding:0.5rem; overflow:auto; }
  `],
})
export class DauthAccessInspectorComponent {
  private client = inject(DAuthHttpClient);

  tenantId = '';
  userId = '';
  rolesCsv = '';
  action = '';
  resourceType = '';
  resourceId = '';

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<DAuthAccessResult | null>(null);

  async run(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      const roles = this.rolesCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await firstValueFrom(
        this.client.checkAccess({
          principal: {
            userId: this.userId,
            tenantId: this.tenantId,
            roles,
            scopes: [],
          },
          action: this.action,
          resource: {
            type: this.resourceType,
            id: this.resourceId || undefined,
          },
        }),
      );
      this.result.set(r);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      this.busy.set(false);
    }
  }
}
