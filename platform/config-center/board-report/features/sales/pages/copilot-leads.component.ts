/**
 * Sales Copilot Leads — captures from A13 public-chat (landing page) with
 * a state-machine workflow. Every list view + transition is audit-trailed.
 *
 * Reads:
 *   GET  /api/sales/copilot-leads?status=&intent=&search=
 *   GET  /api/sales/copilot-leads/:id
 *   POST /api/sales/copilot-leads/:id/transition  { to, routedTo?, note? }
 */
import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../../../../../core/services/ui-infra/i18n.service';

interface Lead {
  leadId: string;
  intent: 'demo' | 'pricing' | 'contact' | 'docs' | 'general';
  email: string | null;
  company: string | null;
  roleTitle: string | null;
  message: string;
  source: string;
  status: 'new' | 'routed' | 'contacted' | 'converted' | 'rejected';
  routedTo: string | null;
  routedAt: string | null;
  capturedAt: string;
  history?: Array<{ intent: string; message: string; at: string }>;
}

@Component({
  selector: 'app-copilot-leads',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" [attr.dir]="dir()" *ngIf="!loading() else loadingTpl">
      <header>
        <div>
          <h1>{{ ar() ? 'العملاء المحتملون من المساعد العام' : 'Public Copilot Leads' }}</h1>
          <p class="sub">
            {{ ar()
              ? 'كل عميل محتمل التقطه المساعد A13 من الصفحة الرئيسية. وجّه، اتصل، أو حدد التحويل. كل إجراء يدخل سجل التدقيق.'
              : "Every lead the A13 landing copilot captured from anonymous visitors. Route, contact, or close. Every action lands in the audit trail." }}
          </p>
        </div>
        <div class="status-tabs">
          <button class="tab" [class.active]="status() === 'open'"      (click)="setStatus('open')">{{ ar() ? 'مفتوح' : 'Open' }} <span class="cnt">{{ totalsByTab().open }}</span></button>
          <button class="tab" [class.active]="status() === 'contacted'" (click)="setStatus('contacted')">{{ ar() ? 'تم التواصل' : 'Contacted' }} <span class="cnt">{{ totalsByTab().contacted }}</span></button>
          <button class="tab" [class.active]="status() === 'converted'" (click)="setStatus('converted')">{{ ar() ? 'محول' : 'Converted' }}</button>
          <button class="tab" [class.active]="status() === 'rejected'"  (click)="setStatus('rejected')">{{ ar() ? 'مرفوض' : 'Rejected' }}</button>
          <button class="tab" [class.active]="status() === 'all'"       (click)="setStatus('all')">{{ ar() ? 'الكل' : 'All' }}</button>
        </div>
      </header>

      <section *ngIf="rows().length === 0" class="empty">
        <p class="muted">{{ ar() ? 'لا يوجد عملاء محتملون في هذا التصنيف.' : 'No leads in this view.' }}</p>
      </section>

      <ul *ngIf="rows().length > 0" class="rows">
        <li *ngFor="let l of rows(); trackBy: tb" class="row" [class]="'in-' + l.intent + ' st-' + l.status">
          <div class="intent-pill" [class]="'pill-' + l.intent">{{ intentLabel(l.intent) }}</div>
          <div class="content">
            <div class="title-line">
              <strong *ngIf="l.email">{{ l.email }}</strong>
              <span *ngIf="!l.email" class="muted">{{ ar() ? 'بدون بريد' : 'no email' }}</span>
              <span *ngIf="l.company"> · {{ l.company }}</span>
              <span *ngIf="l.roleTitle" class="muted"> · {{ l.roleTitle }}</span>
            </div>
            <div class="msg">{{ l.message }}</div>
            <div *ngIf="l.history?.length" class="history muted small">
              + {{ l.history?.length }} {{ ar() ? 'رسائل تالية' : 'follow-up messages' }}
            </div>
            <div class="meta">
              <span class="muted">{{ ar() ? 'الالتقاط' : 'captured' }} {{ l.capturedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              <span *ngIf="l.routedAt" class="muted">· {{ ar() ? 'وجّه إلى' : 'routed to' }} <strong>{{ l.routedTo }}</strong></span>
            </div>
          </div>
          <div class="actions">
            <span class="status-pill" [class]="'sp-' + l.status">{{ statusLabel(l.status) }}</span>
            <div class="btn-row">
              <button *ngIf="l.status === 'new'"        class="btn primary"  (click)="transition(l, 'routed')">{{ ar() ? 'وجّه' : 'Route' }}</button>
              <button *ngIf="l.status !== 'contacted' && l.status !== 'converted' && l.status !== 'rejected'" class="btn primary"  (click)="transition(l, 'contacted')">{{ ar() ? 'تم التواصل' : 'Mark contacted' }}</button>
              <button *ngIf="l.status !== 'converted' && l.status !== 'rejected'" class="btn success" (click)="transition(l, 'converted')">{{ ar() ? 'محول' : 'Mark converted' }}</button>
              <button *ngIf="l.status !== 'rejected'  && l.status !== 'converted'" class="btn ghost"   (click)="transition(l, 'rejected')">{{ ar() ? 'رفض' : 'Reject' }}</button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <ng-template #loadingTpl><div class="page"><p class="muted">{{ ar() ? 'جاري تحميل العملاء المحتملين…' : 'Loading leads…' }}</p></div></ng-template>
  `,
  styles: [`
    .page { padding: 24px 32px; max-width: 1300px; margin: 0 auto; color: #1f2937; }
    .page[dir="rtl"] { text-align: right; }
    header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:20px; flex-wrap:wrap; }
    h1 { font-size: 26px; font-weight: 800; margin:0 0 4px; color:#0f172a; }
    .sub { color:#475569; font-size:14px; max-width:780px; margin:0; line-height:1.6; }
    .muted { color:#64748b; }
    .small { font-size:11px; }

    .status-tabs { display:flex; gap:0; background:#f1f5f9; padding:4px; border-radius:8px; flex-wrap:wrap; }
    .tab { padding:8px 14px; border:0; background:transparent; cursor:pointer; font-size:12px; color:#475569; border-radius:6px; font-weight:500; transition: all .12s; display:flex; gap:6px; align-items:center; }
    .tab .cnt { font-size:10px; padding:1px 7px; background:rgba(15,23,42,.08); border-radius:99px; }
    .tab:hover { color:#0f172a; }
    .tab.active { background:#fff; color:#0f172a; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.06); }

    .empty { padding:60px 20px; text-align:center; }
    .rows { list-style:none; padding:0; margin:0; }
    .row { display:flex; gap:14px; padding:14px 16px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:10px; align-items:flex-start; }
    .row.in-demo    { border-inline-start:4px solid #b91c1c; }
    .row.in-pricing { border-inline-start:4px solid #b45309; }
    .row.in-contact { border-inline-start:4px solid #1d4ed8; }
    .row.in-docs    { border-inline-start:4px solid #059669; }
    .row.st-rejected { opacity:.6; }

    .intent-pill { font-size:10px; padding:6px 9px; font-weight:700; letter-spacing:.5px; border-radius:6px; min-width:74px; text-align:center; flex-shrink:0; }
    .pill-demo    { background:#fee2e2; color:#991b1b; }
    .pill-pricing { background:#fef3c7; color:#92400e; }
    .pill-contact { background:#dbeafe; color:#1e40af; }
    .pill-docs    { background:#dcfce7; color:#166534; }
    .pill-general { background:#f1f5f9; color:#475569; }

    .content { flex:1; min-width:0; }
    .title-line { font-size:14px; color:#0f172a; margin-bottom:4px; }
    .title-line strong { color:#0f172a; }
    .msg { font-size:13px; color:#374151; line-height:1.5; margin-bottom:6px; }
    .history { margin-bottom:4px; }
    .meta { font-size:11px; color:#64748b; display:flex; gap:8px; flex-wrap:wrap; }
    .meta strong { color:#0f172a; }

    .actions { display:flex; flex-direction:column; gap:8px; align-items:flex-end; flex-shrink:0; min-width:200px; }
    .status-pill { font-size:10px; padding:3px 9px; border-radius:99px; text-transform:uppercase; letter-spacing:.5px; font-weight:700; }
    .sp-new       { background:#fef3c7; color:#92400e; }
    .sp-routed    { background:#dbeafe; color:#1e40af; }
    .sp-contacted { background:#fef9c3; color:#854d0e; }
    .sp-converted { background:#dcfce7; color:#166534; }
    .sp-rejected  { background:#f3f4f6; color:#6b7280; }
    .btn-row { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
    .btn { padding:5px 10px; font-size:11px; font-weight:600; border-radius:5px; cursor:pointer; border:0; }
    .btn.primary { background:#1e40af; color:#fff; }
    .btn.success { background:#059669; color:#fff; }
    .btn.ghost   { background:transparent; color:#6b7280; border:1px solid #e2e8f0; }
    .btn:hover { filter:brightness(.92); }
  `],
})
export class CopilotLeadsComponent implements OnInit {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);

  loading = signal(true);
  status = signal<'open' | 'contacted' | 'converted' | 'rejected' | 'all'>('open');
  rows = signal<Lead[]>([]);
  totalsByTab = signal<{ open: number; contacted: number }>({ open: 0, contacted: 0 });

  ar = () => this.i18n.isAr();
  dir = () => this.i18n.dir();

  tb = (_: number, l: Lead) => l.leadId;

  intentLabel(i: string): string {
    if (this.ar()) return ({ demo: 'عرض', pricing: 'سعر', contact: 'تواصل', docs: 'وثائق', general: 'عام' } as Record<string,string>)[i] || i;
    return i.toUpperCase();
  }
  statusLabel(s: string): string {
    if (this.ar()) return ({ new: 'جديد', routed: 'موجّه', contacted: 'تم التواصل', converted: 'محول', rejected: 'مرفوض' } as Record<string,string>)[s] || s;
    return s;
  }

  ngOnInit(): void {
    void this.load();
  }

  async setStatus(s: 'open' | 'contacted' | 'converted' | 'rejected' | 'all'): Promise<void> {
    this.status.set(s);
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.http.get<{ leads: Lead[]; total: number }>(`/api/sales/copilot-leads?status=${this.status()}&intent=qualified`));
      this.rows.set(r.leads ?? []);
      // Header tab counts (cheap second fetch with status=open and =contacted only)
      const [open, contacted] = await Promise.all([
        firstValueFrom(this.http.get<{ total: number }>(`/api/sales/copilot-leads?status=open&intent=qualified&limit=1`)),
        firstValueFrom(this.http.get<{ total: number }>(`/api/sales/copilot-leads?status=contacted&intent=qualified&limit=1`)),
      ]);
      this.totalsByTab.set({ open: open.total ?? 0, contacted: contacted.total ?? 0 });
    } catch {
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async transition(l: Lead, to: string): Promise<void> {
    try { await firstValueFrom(this.http.post(`/api/sales/copilot-leads/${l.leadId}/transition`, { to })); }
    finally { await this.load(); }
  }
}
