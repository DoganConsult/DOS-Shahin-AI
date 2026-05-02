/**
 * AI Employees — org-chart view of the 13 AI staff members in the customer's
 * organization. Each card represents an employee with a job title, manager,
 * mission, schedule, KPI count, recent reports.
 *
 * Reads:
 *   GET /api/ai-hr/employees[?manager=<role>]   — org-chart list (filtered)
 *   GET /api/ai-hr/employees/:agentId           — full profile (drill-down)
 *   GET /api/ai-hr/managers                     — manager rollup for filter pills
 *
 * Bilingual EN/AR with RTL via I18nService. Standalone Angular, OnPush.
 */

import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../../../../../core/services/ui-infra/i18n.service';

interface Employee {
  agentId: string;
  jobTitle: string;
  jobTitleAr: string;
  domain: string;
  domainAr: string;
  managerLabel: string;
  managerLabelAr: string;
  managerRoleCode: string;
  missionStatement: string;
  missionStatementAr: string;
  responsibilities: string[];
  outOfScope: string[];
  hireDate: string;
  employmentStatus: string;
  color: string;
  icon: string;
  shiftsScheduled: number;
  lastShiftAt: string | null;
  reportsLast7d: number;
  pendingReports: number;
  kpisOnTarget: number;
  kpisOffTarget: number;
  kpisUnevaluated: number;
  kpisTotal: number;
  hasRealHandler: boolean;
  shiftsActive: number;
}

interface EmployeeDetail extends Employee {
  deliverables: Array<{ code: string; title: string; titleAr: string; cadence: string; destination: string }>;
  kpis: Array<{ code: string; label: string; labelAr: string; target: string; direction: string }>;
  schedule: Array<{ code: string; cron: string; produces: string; perTenant: boolean }>;
  recentReports: Array<{ filedAt: string; title: string; summary: string | null; status: string; deliverableCode: string }>;
}

interface ManagerRollup {
  managerRoleCode: string;
  managerLabel: string;
  managerLabelAr: string;
  directReports: string[];
  reportsLast7d: number;
  pendingReports: number;
}

@Component({
  selector: 'app-ai-employees',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" [attr.dir]="dir()" *ngIf="!loading() else loadingTpl">
      <header>
        <div>
          <h1>{{ ar() ? 'الموظفون الذكيون' : 'AI Employees' }}</h1>
          <p class="sub">
            {{ ar()
              ? 'الـ 13 موظفاً ذكياً في مؤسستك. لكلٍ منهم وظيفة محددة، ومدير، وجدول زمني، ومؤشرات أداء قابلة للقياس — تماماً كأي موظف بشري. اضغط على أي بطاقة لعرض الملف الكامل.'
              : "Your organization's 13 AI staff members. Each has a defined job, a manager, a schedule, and measurable KPIs — just like a human hire. Click a card for the full profile." }}
          </p>
        </div>
        <div class="stats">
          <div class="stat"><div class="big">{{ filtered().length }}</div><div class="lbl">{{ ar() ? 'موظفون' : 'Employees' }}</div></div>
          <div class="stat"><div class="big">{{ totalShifts() }}</div><div class="lbl">{{ ar() ? 'ورديات' : 'Shifts' }}</div></div>
          <div class="stat"><div class="big">{{ totalReports7d() }}</div><div class="lbl">{{ ar() ? 'تقارير 7 أيام' : 'Reports (7d)' }}</div></div>
          <div class="stat warn" *ngIf="totalPending() > 0"><div class="big">{{ totalPending() }}</div><div class="lbl">{{ ar() ? 'قيد المراجعة' : 'Pending' }}</div></div>
        </div>
      </header>

      <section class="manager-filter" *ngIf="managers().length > 0">
        <span class="filter-label">{{ ar() ? 'تصفية حسب المدير:' : 'Filter by manager:' }}</span>
        <button class="pill" [class.active]="!selectedManager()" (click)="selectManager(null)">
          {{ ar() ? 'كل المدراء' : 'All managers' }} ({{ employees().length }})
        </button>
        <button *ngFor="let m of managers()"
                class="pill"
                [class.active]="selectedManager() === m.managerRoleCode"
                [class.has-pending]="m.pendingReports > 0"
                (click)="selectManager(m.managerRoleCode)">
          {{ ar() ? m.managerLabelAr : m.managerLabel }}
          <span class="pill-count">{{ m.directReports.length }}</span>
          <span *ngIf="m.pendingReports > 0" class="pill-badge">{{ m.pendingReports }}</span>
        </button>
      </section>

      <section class="org-chart">
        <div class="grid">
          <a *ngFor="let e of filtered(); trackBy: tb" class="card"
                   [style.borderTopColor]="e.color"
                   [routerLink]="['/workspace/hr/ai-employees', e.agentId]">
            <div class="head">
              <div class="badge" [style.backgroundColor]="e.color">{{ e.agentId }}</div>
              <div class="head-text">
                <div class="title">{{ ar() ? e.jobTitleAr : e.jobTitle }}</div>
                <div class="domain">{{ ar() ? e.domainAr : e.domain }}</div>
              </div>
              <span class="status" [class]="'st-' + e.employmentStatus">{{ statusLabel(e.employmentStatus) }}</span>
            </div>
            <div class="handler-badge" [class.real]="e.hasRealHandler" [class.standby]="!e.hasRealHandler">
              <span *ngIf="e.hasRealHandler">● {{ ar() ? 'نشط — يقوم بأعمال حقيقية' : 'Active · doing real work' }}</span>
              <span *ngIf="!e.hasRealHandler">○ {{ ar() ? 'احتياط — تقارير وصفية فقط' : 'Standby · metadata reports only' }}</span>
            </div>
            <div class="mission">{{ ar() ? e.missionStatementAr : e.missionStatement }}</div>
            <div class="manager">
              <span class="muted">{{ ar() ? 'يتبع لـ' : 'Reports to' }}</span>
              <strong>{{ ar() ? e.managerLabelAr : e.managerLabel }}</strong>
              <span class="role-pill">{{ e.managerRoleCode }}</span>
            </div>
            <div class="kvs">
              <div class="kv"><div class="kvv">{{ e.shiftsScheduled }}</div><div class="kvl">{{ ar() ? 'ورديات' : 'Shifts' }}</div></div>
              <div class="kv"><div class="kvv">{{ e.kpisTotal }}</div><div class="kvl">{{ ar() ? 'مؤشرات' : 'KPIs' }}</div></div>
              <div class="kv"><div class="kvv">{{ e.reportsLast7d }}</div><div class="kvl">{{ ar() ? 'تقارير 7ي' : 'Reports (7d)' }}</div></div>
              <div class="kv" [class.warn]="e.pendingReports > 0"><div class="kvv">{{ e.pendingReports }}</div><div class="kvl">{{ ar() ? 'قيد المراجعة' : 'Pending' }}</div></div>
            </div>
            <div class="hire">{{ ar() ? 'تاريخ التعيين' : 'Hired' }} {{ e.hireDate }}</div>
            <div class="cta">{{ ar() ? 'فتح الملف الكامل ←' : 'Open full profile →' }}</div>

            <div *ngIf="false" class="detail" (click)="$event.stopPropagation()">
              <div *ngIf="detailLoading()" class="loading-detail">{{ ar() ? 'جاري التحميل…' : 'Loading profile…' }}</div>
              <ng-container *ngIf="detail() as d">
                <h3>{{ ar() ? 'الرسالة' : 'Mission' }}</h3>
                <p class="muted">{{ ar() ? d.missionStatementAr : d.missionStatement }}</p>

                <h3>{{ ar() ? 'المسؤوليات' : 'Responsibilities' }}</h3>
                <ul><li *ngFor="let r of d.responsibilities">{{ r }}</li></ul>

                <h3 *ngIf="d.outOfScope?.length">{{ ar() ? 'خارج النطاق' : 'Out of scope' }}</h3>
                <ul *ngIf="d.outOfScope?.length"><li *ngFor="let r of d.outOfScope">{{ r }}</li></ul>

                <h3>{{ ar() ? 'المخرجات' : 'Deliverables' }}</h3>
                <table>
                  <tr><th>{{ ar() ? 'العنوان' : 'Title' }}</th><th>{{ ar() ? 'الوتيرة' : 'Cadence' }}</th><th>{{ ar() ? 'الوجهة' : 'Destination' }}</th></tr>
                  <tr *ngFor="let dl of d.deliverables"><td>{{ ar() ? dl.titleAr : dl.title }}</td><td>{{ dl.cadence }}</td><td><code>{{ dl.destination }}</code></td></tr>
                </table>

                <h3>{{ ar() ? 'الجدول الزمني' : 'Schedule' }}</h3>
                <table>
                  <tr><th>{{ ar() ? 'الوردية' : 'Shift' }}</th><th>Cron</th><th>{{ ar() ? 'يُنتج' : 'Produces' }}</th><th>{{ ar() ? 'النطاق' : 'Scope' }}</th></tr>
                  <tr *ngFor="let s of d.schedule"><td><code>{{ s.code }}</code></td><td><code>{{ s.cron }}</code></td><td>{{ s.produces }}</td><td>{{ s.perTenant ? (ar() ? 'للمستأجر' : 'tenant') : (ar() ? 'منصة' : 'platform') }}</td></tr>
                </table>

                <h3>{{ ar() ? 'مؤشرات الأداء' : 'KPIs' }}</h3>
                <table>
                  <tr><th>{{ ar() ? 'المقياس' : 'Metric' }}</th><th>{{ ar() ? 'الهدف' : 'Target' }}</th><th>{{ ar() ? 'الاتجاه' : 'Direction' }}</th></tr>
                  <tr *ngFor="let k of d.kpis"><td>{{ ar() ? k.labelAr : k.label }}</td><td><strong>{{ k.target }}</strong></td><td>{{ k.direction === 'higher_is_better' ? '↑' : '↓' }} {{ k.direction === 'higher_is_better' ? (ar() ? 'أعلى' : 'higher') : (ar() ? 'أقل' : 'lower') }}</td></tr>
                </table>

                <h3>{{ ar() ? 'التقارير الأخيرة' : 'Recent reports' }}</h3>
                <div *ngIf="!d.recentReports?.length" class="muted">{{ ar() ? 'لم يتم تقديم أي تقارير بعد — أول وردية ستظهر هنا.' : 'No reports filed yet — first shift will land here.' }}</div>
                <table *ngIf="d.recentReports?.length">
                  <tr><th>{{ ar() ? 'مُقدَّم' : 'Filed' }}</th><th>{{ ar() ? 'العنوان' : 'Title' }}</th><th>{{ ar() ? 'الحالة' : 'Status' }}</th></tr>
                  <tr *ngFor="let r of d.recentReports">
                    <td><code>{{ r.filedAt | date:'yyyy-MM-dd HH:mm' }}</code></td>
                    <td>{{ r.title }}</td>
                    <td><span class="report-status" [class]="'rs-' + r.status">{{ r.status }}</span></td>
                  </tr>
                </table>
              </ng-container>
            </div>
          </a>
        </div>
      </section>
    </div>

    <ng-template #loadingTpl>
      <div class="page"><p class="muted">{{ ar() ? 'جاري تحميل الموظفين الذكيين…' : 'Loading AI employees…' }}</p></div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 24px 32px; max-width: 1500px; margin: 0 auto; color: #1f2937; }
    .page[dir="rtl"] { text-align: right; }
    header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:20px; flex-wrap:wrap; }
    header h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px; color:#0f172a; }
    .sub { color:#475569; font-size:14px; max-width:780px; margin:0; line-height:1.6; }
    .stats { display:flex; gap:16px; }
    .stat { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:12px 18px; min-width:90px; text-align:center; }
    .stat .big { font-size:22px; font-weight:800; color:#0f172a; line-height:1; }
    .stat .lbl { font-size:11px; color:#64748b; margin-top:4px; }
    .stat.warn .big { color:#b45309; }

    .manager-filter { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:12px 0; margin-bottom:16px; border-bottom:1px solid #e2e8f0; }
    .filter-label { font-size:12px; color:#64748b; font-weight:600; margin-inline-end:4px; }
    .pill { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:#fff; border:1px solid #e2e8f0; border-radius:99px; font-size:12px; cursor:pointer; transition: all .12s; color:#475569; }
    .pill:hover { border-color:#0f172a; color:#0f172a; }
    .pill.active { background:#0f172a; color:#fff; border-color:#0f172a; }
    .pill-count { font-size:10px; opacity:.7; padding:1px 5px; background:rgba(255,255,255,.15); border-radius:99px; }
    .pill:not(.active) .pill-count { background:#f1f5f9; }
    .pill-badge { font-size:10px; padding:1px 6px; background:#b45309; color:#fff; border-radius:99px; font-weight:700; }

    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap:16px; }
    .card { display:block; text-decoration:none; color:#1f2937;
            background:#fff; border:1px solid #e2e8f0; border-top:4px solid #0ea5e9;
            border-radius:10px; padding:16px; cursor:pointer; transition: all .15s ease; }
    .card:hover { box-shadow: 0 8px 16px -8px rgba(0,0,0,.12); transform: translateY(-1px); border-color:#0f172a; }
    .cta { font-size:11px; color:#1d4ed8; font-weight:600; margin-top:8px; }

    .head { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
    .badge { display:inline-block; padding:6px 10px; color:#fff; font-weight:700; font-size:12px;
             border-radius:6px; letter-spacing:.5px; }
    .head-text { flex: 1; }
    .head-text .title { font-size:16px; font-weight:700; color:#0f172a; line-height:1.2; }
    .head-text .domain { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }
    .status { font-size:10px; padding:3px 8px; border-radius:99px; text-transform:uppercase; letter-spacing:.5px; font-weight:700; }
    .st-permanent { background:#dcfce7; color:#166534; }
    .st-probation { background:#fef3c7; color:#92400e; }
    .st-on_leave { background:#e0f2fe; color:#075985; }
    .st-terminated { background:#fee2e2; color:#991b1b; }
    .handler-badge { font-size:10px; font-weight:600; letter-spacing:.3px; padding:3px 8px; border-radius:99px; display:inline-block; margin: 4px 0 8px; }
    .handler-badge.real    { background:#dcfce7; color:#166534; }
    .handler-badge.standby { background:#f1f5f9; color:#475569; }

    .mission { font-size:13px; color:#374151; line-height:1.5; margin-bottom:12px; }
    .manager { font-size:12px; color:#475569; margin-bottom:12px; }
    .manager strong { color:#0f172a; }
    .role-pill { display:inline-block; background:#f1f5f9; color:#475569; font-family:ui-monospace,monospace;
                 font-size:10px; padding:1px 6px; border-radius:4px; margin-inline-start:6px; }
    .muted { color:#64748b; }

    .kvs { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; padding:10px 0; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; margin-bottom:8px; }
    .kv { text-align:center; }
    .kv .kvv { font-size:18px; font-weight:700; color:#0f172a; }
    .kv .kvl { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }
    .kv.warn .kvv { color:#b45309; }
    .hire { font-size:11px; color:#94a3b8; }

    .detail { margin-top:16px; padding-top:16px; border-top:2px dashed #e2e8f0; }
    .detail h3 { font-size:13px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:.5px; margin: 16px 0 8px; }
    .detail h3:first-child { margin-top:0; }
    .detail p { font-size:13px; color:#374151; line-height:1.6; margin:0 0 8px; }
    .detail ul { margin: 0 0 12px; padding-inline-start: 20px; font-size:13px; color:#374151; }
    .detail ul li { line-height:1.7; }
    .detail table { width:100%; font-size:12px; border-collapse:collapse; margin-bottom:12px; }
    .detail th, .detail td { padding:6px 10px; border-bottom:1px solid #f1f5f9; text-align:start; }
    .detail th { color:#64748b; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:.5px; }
    .detail code { background:#f1f5f9; padding:1px 5px; border-radius:3px; font-size:11px; }
    .loading-detail { color:#64748b; font-style:italic; padding:8px 0; }

    .report-status { font-size:10px; padding:2px 7px; border-radius:99px; text-transform:uppercase; letter-spacing:.5px; font-weight:700; }
    .rs-filed { background:#fef3c7; color:#92400e; }
    .rs-acknowledged { background:#dbeafe; color:#1e40af; }
    .rs-actioned { background:#dcfce7; color:#166534; }
  `],
})
export class AiEmployeesComponent implements OnInit {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);

  loading = signal(true);
  employees = signal<Employee[]>([]);
  managers = signal<ManagerRollup[]>([]);
  selectedManager = signal<string | null>(null);
  expanded = signal<string | null>(null);
  detail = signal<EmployeeDetail | null>(null);
  detailLoading = signal(false);

  filtered = computed<Employee[]>(() => {
    const sel = this.selectedManager();
    return sel ? this.employees().filter(e => e.managerRoleCode === sel) : this.employees();
  });

  ar = () => this.i18n.isAr();
  dir = () => this.i18n.dir();

  totalShifts = () => this.filtered().reduce((sum, e) => sum + e.shiftsScheduled, 0);
  totalReports7d = () => this.filtered().reduce((sum, e) => sum + e.reportsLast7d, 0);
  totalPending = () => this.filtered().reduce((sum, e) => sum + e.pendingReports, 0);

  statusLabel(s: string): string {
    if (!this.ar()) return s;
    return ({ permanent: 'دائم', probation: 'تحت التجربة', on_leave: 'في إجازة', terminated: 'منتهي' } as Record<string,string>)[s] || s;
  }

  ngOnInit(): void {
    void this.load();
  }

  tb = (_: number, e: Employee) => e.agentId;

  selectManager(roleCode: string | null): void {
    this.selectedManager.set(roleCode);
    this.expanded.set(null);
    this.detail.set(null);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [emp, mgr] = await Promise.all([
        firstValueFrom(this.http.get<{ employees: Employee[] }>('/api/ai-hr/employees')),
        firstValueFrom(this.http.get<{ managers: ManagerRollup[] }>('/api/ai-hr/managers')),
      ]);
      this.employees.set(emp.employees ?? []);
      this.managers.set(mgr.managers ?? []);
    } catch {
      this.employees.set([]);
      this.managers.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async toggle(agentId: string): Promise<void> {
    if (this.expanded() === agentId) {
      this.expanded.set(null);
      this.detail.set(null);
      return;
    }
    this.expanded.set(agentId);
    this.detail.set(null);
    this.detailLoading.set(true);
    try {
      const d = await firstValueFrom(this.http.get<EmployeeDetail>(`/api/ai-hr/employees/${agentId}`));
      this.detail.set(d);
    } catch {
      this.detail.set(null);
    } finally {
      this.detailLoading.set(false);
    }
  }
}
