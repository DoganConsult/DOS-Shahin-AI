/**
 * Manager Inbox — every report filed by an AI employee that reports to YOU.
 *
 * Reads:
 *   GET  /api/ai-hr/inbox?status=filed|acknowledged|actioned|all
 *   POST /api/ai-hr/inbox/:id/acknowledge
 *   POST /api/ai-hr/inbox/:id/action
 *
 * The backend filters by the caller's role memberships — a Compliance Officer
 * sees only reports from agents whose managerRoleCode is compliance_officer
 * (A01/A03/A04/A05/A06/A08); a platform_admin sees all.
 */

import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../../../../../core/services/ui-infra/i18n.service';

interface InboxRow {
  reportId: string;
  tenantId: string | null;
  agentId: string;
  agentJobTitle: string;
  managerRoleCode: string;
  shiftCode: string | null;
  deliverableCode: string;
  title: string;
  summary: string | null;
  status: 'filed' | 'acknowledged' | 'actioned';
  filedAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

@Component({
  selector: 'app-manager-inbox',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" [attr.dir]="dir()" *ngIf="!loading() else loadingTpl">
      <header>
        <div>
          <h1>{{ ar() ? 'صندوق وارد المدير' : 'Manager Inbox' }}</h1>
          <p class="sub">
            {{ ar()
              ? 'كل تقرير يقدمه الموظفون الذكيون الذين يتبعون لك. راجع، أكّد، أو حدد كإجراء كامل.'
              : "Every report filed by AI employees who report to you. Review, acknowledge, or mark as actioned." }}
          </p>
        </div>
        <div class="status-tabs">
          <button class="tab" [class.active]="status() === 'filed'"        (click)="setStatus('filed')">{{ ar() ? 'قيد المراجعة' : 'Pending' }}</button>
          <button class="tab" [class.active]="status() === 'acknowledged'" (click)="setStatus('acknowledged')">{{ ar() ? 'مؤكد' : 'Acknowledged' }}</button>
          <button class="tab" [class.active]="status() === 'actioned'"     (click)="setStatus('actioned')">{{ ar() ? 'مُنجَز' : 'Actioned' }}</button>
          <button class="tab" [class.active]="status() === 'all'"          (click)="setStatus('all')">{{ ar() ? 'الكل' : 'All' }}</button>
        </div>
      </header>

      <section *ngIf="rows().length === 0" class="empty">
        <p class="muted">
          {{ ar()
            ? 'لا توجد تقارير في هذا التصنيف. الموظفون الذكيون يعملون — سيظهر هنا أي شيء يحتاج إلى مراجعتك.'
            : 'No reports in this view yet. The AI employees are working — anything requiring your review will land here.' }}
        </p>
      </section>

      <ul class="rows" *ngIf="rows().length > 0">
        <li *ngFor="let r of rows(); trackBy: tb" class="row" [class]="'st-' + r.status">
          <div class="agent-pill">{{ r.agentId }}</div>
          <div class="content">
            <div class="title-line">
              <strong>{{ r.title }}</strong>
              <span class="agent-job">{{ r.agentJobTitle }}</span>
              <span class="role-pill">{{ r.managerRoleCode }}</span>
            </div>
            <div class="summary">{{ r.summary || (ar() ? '— لا يوجد ملخص —' : '— no summary —') }}</div>
            <div class="meta">
              <span><code>{{ r.deliverableCode }}</code></span>
              <span *ngIf="r.shiftCode" class="muted">·</span>
              <span *ngIf="r.shiftCode" class="muted">{{ ar() ? 'وردية' : 'shift' }} <code>{{ r.shiftCode }}</code></span>
              <span class="muted">·</span>
              <span class="muted">{{ ar() ? 'مُقدَّم' : 'filed' }} {{ r.filedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              <span *ngIf="r.acknowledgedBy" class="muted">·</span>
              <span *ngIf="r.acknowledgedBy" class="muted">{{ ar() ? 'بواسطة' : 'by' }} {{ r.acknowledgedBy }}</span>
            </div>
          </div>
          <div class="actions">
            <span class="status-pill" [class]="'sp-' + r.status">{{ statusLabel(r.status) }}</span>
            <button *ngIf="r.status === 'filed'" class="btn btn-primary" (click)="acknowledge(r)">{{ ar() ? 'تأكيد' : 'Acknowledge' }}</button>
            <button *ngIf="r.status !== 'actioned'" class="btn btn-success" (click)="action(r)">{{ ar() ? 'مُنجَز' : 'Mark actioned' }}</button>
          </div>
        </li>
      </ul>
    </div>

    <ng-template #loadingTpl><div class="page"><p class="muted">{{ ar() ? 'جاري تحميل صندوق الوارد…' : 'Loading inbox…' }}</p></div></ng-template>
  `,
  styles: [`
    .page { padding: 24px 32px; max-width: 1300px; margin: 0 auto; color: #1f2937; }
    .page[dir="rtl"] { text-align: right; }
    header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:20px; flex-wrap:wrap; }
    h1 { font-size: 28px; font-weight: 800; margin:0 0 4px; color:#0f172a; }
    .sub { color:#475569; font-size:14px; max-width:780px; margin:0; line-height:1.6; }
    .muted { color:#64748b; }

    .status-tabs { display:flex; gap:0; background:#f1f5f9; padding:4px; border-radius:8px; }
    .tab { padding:8px 16px; border:0; background:transparent; cursor:pointer; font-size:13px; color:#475569; border-radius:6px; font-weight:500; transition: all .12s; }
    .tab:hover { color:#0f172a; }
    .tab.active { background:#fff; color:#0f172a; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.06); }

    .empty { padding:60px 20px; text-align:center; }
    .rows { list-style:none; padding:0; margin:0; }
    .row { display:flex; gap:16px; padding:16px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:10px; align-items:flex-start; }
    .row.st-filed { border-inline-start:4px solid #b45309; }
    .row.st-acknowledged { border-inline-start:4px solid #1d4ed8; }
    .row.st-actioned { border-inline-start:4px solid #059669; opacity:.85; }

    .agent-pill { background:#0f172a; color:#fff; font-weight:700; font-size:11px; padding:8px 10px; border-radius:6px; letter-spacing:.5px; flex-shrink:0; min-width:42px; text-align:center; }
    .content { flex:1; min-width:0; }
    .title-line { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; margin-bottom:4px; }
    .title-line strong { font-size:14px; color:#0f172a; }
    .agent-job { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
    .role-pill { display:inline-block; background:#f1f5f9; color:#475569; font-family:ui-monospace,monospace; font-size:10px; padding:1px 6px; border-radius:4px; }
    .summary { font-size:13px; color:#374151; line-height:1.5; margin-bottom:6px; }
    .meta { font-size:11px; color:#64748b; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .meta code { background:#f1f5f9; padding:1px 5px; border-radius:3px; font-size:11px; }

    .actions { display:flex; flex-direction:column; gap:8px; align-items:flex-end; flex-shrink:0; }
    .status-pill { font-size:10px; padding:3px 8px; border-radius:99px; text-transform:uppercase; letter-spacing:.5px; font-weight:700; }
    .sp-filed { background:#fef3c7; color:#92400e; }
    .sp-acknowledged { background:#dbeafe; color:#1e40af; }
    .sp-actioned { background:#dcfce7; color:#166534; }
    .btn { padding:6px 14px; font-size:12px; font-weight:600; border-radius:6px; cursor:pointer; border:0; transition: all .12s; }
    .btn-primary { background:#1e40af; color:#fff; }
    .btn-primary:hover { background:#1e3a8a; }
    .btn-success { background:#059669; color:#fff; }
    .btn-success:hover { background:#047857; }
  `],
})
export class ManagerInboxComponent implements OnInit {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);

  loading = signal(true);
  status = signal<'filed' | 'acknowledged' | 'actioned' | 'all'>('filed');
  rows = signal<InboxRow[]>([]);

  ar = () => this.i18n.isAr();
  dir = () => this.i18n.dir();

  tb = (_: number, r: InboxRow) => r.reportId;

  statusLabel(s: string): string {
    if (!this.ar()) return s;
    return ({ filed: 'قيد المراجعة', acknowledged: 'مؤكد', actioned: 'مُنجَز' } as Record<string,string>)[s] || s;
  }

  ngOnInit(): void {
    void this.load();
  }

  async setStatus(s: 'filed' | 'acknowledged' | 'actioned' | 'all'): Promise<void> {
    this.status.set(s);
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.http.get<{ rows: InboxRow[] }>(`/api/ai-hr/inbox?status=${this.status()}`));
      this.rows.set(r.rows ?? []);
    } catch {
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async acknowledge(r: InboxRow): Promise<void> {
    try { await firstValueFrom(this.http.post(`/api/ai-hr/inbox/${r.reportId}/acknowledge`, {})); }
    finally { await this.load(); }
  }
  async action(r: InboxRow): Promise<void> {
    try { await firstValueFrom(this.http.post(`/api/ai-hr/inbox/${r.reportId}/action`, {})); }
    finally { await this.load(); }
  }
}
