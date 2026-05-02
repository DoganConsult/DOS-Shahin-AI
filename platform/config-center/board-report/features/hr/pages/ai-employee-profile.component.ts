/**
 * Agent Profile — BambooHR-style standalone page for one AI employee.
 *
 * Route: /workspace/hr/ai-employees/:agentId
 *
 * Reads:
 *   GET /api/ai-hr/employees/:id              — profile + recent reports
 *   GET /api/ai-hr/employees/:id/timeline     — joined activity feed
 *   GET /api/ai-hr/employees/:id/kpi-trend    — last 30d KPI history
 *
 * Bilingual EN/AR with RTL via I18nService.
 */
import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../../../../../core/services/ui-infra/i18n.service';

interface EmployeeDetail {
  agentId: string;
  jobTitle: string; jobTitleAr: string;
  domain: string; domainAr: string;
  managerLabel: string; managerLabelAr: string; managerRoleCode: string;
  missionStatement: string; missionStatementAr: string;
  responsibilities: string[]; outOfScope: string[];
  hireDate: string; employmentStatus: string;
  color: string; icon: string;
  shiftsScheduled: number; lastShiftAt: string | null;
  reportsLast7d: number; pendingReports: number;
  kpisOnTarget: number; kpisOffTarget: number; kpisUnevaluated: number; kpisTotal: number;
  hasRealHandler: boolean; shiftsActive: number;
  deliverables: Array<{ code: string; title: string; titleAr: string; cadence: string; destination: string }>;
  kpis: Array<{ code: string; label: string; labelAr: string; target: string; direction: string }>;
  schedule: Array<{ code: string; cron: string; produces: string; perTenant: boolean }>;
  recentReports: Array<{ filedAt: string; title: string; summary: string | null; status: string; deliverableCode: string }>;
}
interface TimelineItem { ts: string; kind: string; title: string; detail: any }
interface KpiTrendPoint { date: string; valueNumeric: number | null; valueText: string | null; targetMet: boolean | null }

@Component({
  selector: 'app-ai-employee-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" [attr.dir]="dir()" *ngIf="!loading() else loadingTpl">
      <a class="back-link" routerLink="/workspace/hr/ai-employees">
        ← {{ ar() ? 'العودة إلى الموظفين الذكيين' : 'Back to AI Employees' }}
      </a>

      <ng-container *ngIf="emp() as e">
        <header class="profile-head" [style.borderTopColor]="e.color">
          <div class="badge" [style.backgroundColor]="e.color">{{ e.agentId }}</div>
          <div class="head-text">
            <h1>{{ ar() ? e.jobTitleAr : e.jobTitle }}</h1>
            <div class="domain">{{ ar() ? e.domainAr : e.domain }}</div>
            <div class="status-row">
              <span class="status" [class]="'st-' + e.employmentStatus">{{ statusLabel(e.employmentStatus) }}</span>
              <span class="handler-pill" [class.real]="e.hasRealHandler" [class.standby]="!e.hasRealHandler">
                {{ e.hasRealHandler
                    ? (ar() ? 'نشط — يقوم بأعمال حقيقية' : 'Active · doing real work')
                    : (ar() ? 'احتياط — تقارير وصفية فقط' : 'Standby · metadata reports only') }}
              </span>
              <span class="hire">{{ ar() ? 'تاريخ التعيين' : 'Hired' }} {{ e.hireDate }}</span>
            </div>
          </div>
          <div class="reporting">
            <div class="muted small">{{ ar() ? 'يتبع لـ' : 'Reports to' }}</div>
            <div class="manager-name">{{ ar() ? e.managerLabelAr : e.managerLabel }}</div>
            <code class="role-pill">{{ e.managerRoleCode }}</code>
          </div>
        </header>

        <section class="kpis-strip">
          <div class="kpi-stat"><div class="kpi-num">{{ e.shiftsScheduled }}</div><div class="kpi-lbl">{{ ar() ? 'ورديات مجدولة' : 'Shifts scheduled' }}</div></div>
          <div class="kpi-stat"><div class="kpi-num">{{ e.kpisTotal }}</div><div class="kpi-lbl">{{ ar() ? 'مؤشرات أداء' : 'KPIs' }}</div></div>
          <div class="kpi-stat ok" *ngIf="e.kpisOnTarget > 0"><div class="kpi-num">{{ e.kpisOnTarget }}</div><div class="kpi-lbl">{{ ar() ? 'ضمن الهدف' : 'On target' }}</div></div>
          <div class="kpi-stat fail" *ngIf="e.kpisOffTarget > 0"><div class="kpi-num">{{ e.kpisOffTarget }}</div><div class="kpi-lbl">{{ ar() ? 'خارج الهدف' : 'Off target' }}</div></div>
          <div class="kpi-stat"><div class="kpi-num">{{ e.reportsLast7d }}</div><div class="kpi-lbl">{{ ar() ? 'تقارير 7ي' : 'Reports (7d)' }}</div></div>
          <div class="kpi-stat" [class.fail]="e.pendingReports > 0"><div class="kpi-num">{{ e.pendingReports }}</div><div class="kpi-lbl">{{ ar() ? 'قيد المراجعة' : 'Pending' }}</div></div>
        </section>

        <div class="layout-2col">
          <main>
            <section class="card">
              <h3>{{ ar() ? 'الرسالة' : 'Mission' }}</h3>
              <p>{{ ar() ? e.missionStatementAr : e.missionStatement }}</p>
            </section>

            <section class="card">
              <h3>{{ ar() ? 'المسؤوليات' : 'Responsibilities' }}</h3>
              <ul><li *ngFor="let r of e.responsibilities">{{ r }}</li></ul>
              <h3 *ngIf="e.outOfScope?.length" class="sub">{{ ar() ? 'خارج النطاق' : 'Out of scope' }}</h3>
              <ul *ngIf="e.outOfScope?.length" class="muted"><li *ngFor="let r of e.outOfScope">{{ r }}</li></ul>
            </section>

            <section class="card">
              <h3>{{ ar() ? 'مؤشرات الأداء' : 'KPIs' }}</h3>
              <table>
                <tr><th>{{ ar() ? 'المقياس' : 'Metric' }}</th><th>{{ ar() ? 'الهدف' : 'Target' }}</th><th>{{ ar() ? 'الاتجاه' : '30d trend' }}</th></tr>
                <tr *ngFor="let k of e.kpis">
                  <td>{{ ar() ? k.labelAr : k.label }}</td>
                  <td><strong>{{ k.target }}</strong></td>
                  <td>
                    <svg *ngIf="trendFor(k.code).length > 1" class="spark" viewBox="0 0 100 24" preserveAspectRatio="none">
                      <polyline [attr.points]="sparklinePoints(k.code)" fill="none" [attr.stroke]="trendStroke(k.code)" stroke-width="2"/>
                    </svg>
                    <span *ngIf="trendFor(k.code).length <= 1" class="muted small">{{ ar() ? 'لا توجد بيانات بعد' : 'No data yet' }}</span>
                  </td>
                </tr>
              </table>
            </section>

            <section class="card">
              <h3>{{ ar() ? 'المخرجات' : 'Deliverables' }}</h3>
              <table>
                <tr><th>{{ ar() ? 'العنوان' : 'Title' }}</th><th>{{ ar() ? 'الوتيرة' : 'Cadence' }}</th><th>{{ ar() ? 'الوجهة' : 'Destination' }}</th></tr>
                <tr *ngFor="let d of e.deliverables"><td>{{ ar() ? d.titleAr : d.title }}</td><td>{{ d.cadence }}</td><td><code>{{ d.destination }}</code></td></tr>
              </table>
            </section>

            <section class="card">
              <h3>{{ ar() ? 'الجدول الزمني' : 'Schedule' }}</h3>
              <table>
                <tr><th>{{ ar() ? 'الوردية' : 'Shift' }}</th><th>Cron</th><th>{{ ar() ? 'يُنتج' : 'Produces' }}</th><th>{{ ar() ? 'النطاق' : 'Scope' }}</th></tr>
                <tr *ngFor="let s of e.schedule">
                  <td><code>{{ s.code }}</code></td>
                  <td><code>{{ s.cron }}</code></td>
                  <td>{{ s.produces }}</td>
                  <td>{{ s.perTenant ? (ar() ? 'للمستأجر' : 'tenant') : (ar() ? 'منصة' : 'platform') }}</td>
                </tr>
              </table>
            </section>
          </main>

          <aside>
            <section class="card">
              <h3>{{ ar() ? 'النشاط الأخير' : 'Recent activity' }}</h3>
              <div *ngIf="!timeline().length" class="muted">{{ ar() ? 'لم يبدأ النشاط بعد.' : 'Activity will appear here.' }}</div>
              <ul class="timeline">
                <li *ngFor="let t of timeline()" class="tl-item" [class]="'tl-' + t.kind">
                  <div class="tl-dot"></div>
                  <div class="tl-content">
                    <div class="tl-title">{{ tlTitle(t) }}</div>
                    <div class="tl-when">{{ t.ts | date:'yyyy-MM-dd HH:mm' }}</div>
                  </div>
                </li>
              </ul>
            </section>

            <section class="card">
              <h3>{{ ar() ? 'تقارير حديثة' : 'Recent reports' }}</h3>
              <div *ngIf="!e.recentReports?.length" class="muted">{{ ar() ? 'لم تقدم تقارير بعد.' : 'No reports yet.' }}</div>
              <ul class="report-list">
                <li *ngFor="let r of e.recentReports">
                  <strong>{{ r.title }}</strong>
                  <div class="muted small">{{ r.filedAt | date:'yyyy-MM-dd HH:mm' }} · <code>{{ r.deliverableCode }}</code> · <span class="report-status" [class]="'rs-' + r.status">{{ r.status }}</span></div>
                  <p class="muted">{{ r.summary }}</p>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </ng-container>
    </div>
    <ng-template #loadingTpl><div class="page"><p class="muted">{{ ar() ? 'جاري تحميل ملف الموظف…' : 'Loading employee profile…' }}</p></div></ng-template>
  `,
  styles: [`
    .page { padding: 24px 32px; max-width: 1500px; margin: 0 auto; color: #1f2937; }
    .page[dir="rtl"] { text-align: right; }
    .back-link { color: #475569; text-decoration:none; font-size:13px; display:inline-block; margin-bottom:16px; }
    .back-link:hover { color: #0f172a; }
    .muted { color:#64748b; }
    .small { font-size:11px; }
    code { background:#f1f5f9; padding:1px 5px; border-radius:3px; font-size:11px; }

    .profile-head { display:flex; gap:20px; align-items:flex-start; padding:20px 24px; background:#fff;
                    border:1px solid #e2e8f0; border-top:5px solid #0ea5e9; border-radius:12px; margin-bottom:20px; flex-wrap:wrap; }
    .profile-head .badge { padding:14px 16px; color:#fff; font-weight:800; font-size:18px; border-radius:10px; min-width:60px; text-align:center; }
    .profile-head .head-text { flex:1; min-width:300px; }
    .profile-head h1 { font-size:24px; font-weight:800; margin:0 0 4px; color:#0f172a; }
    .profile-head .domain { color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
    .status-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:10px; }
    .status { font-size:10px; padding:3px 9px; border-radius:99px; text-transform:uppercase; letter-spacing:.5px; font-weight:700; }
    .st-permanent { background:#dcfce7; color:#166534; }
    .st-probation { background:#fef3c7; color:#92400e; }
    .st-on_leave { background:#e0f2fe; color:#075985; }
    .st-terminated { background:#fee2e2; color:#991b1b; }
    .handler-pill { font-size:11px; padding:3px 9px; border-radius:99px; font-weight:600; }
    .handler-pill.real { background:#dcfce7; color:#166534; }
    .handler-pill.standby { background:#f1f5f9; color:#475569; }
    .hire { color:#94a3b8; font-size:11px; }
    .reporting { background:#f8fafc; padding:12px 16px; border-radius:8px; min-width:200px; }
    .manager-name { font-weight:700; color:#0f172a; margin:2px 0; }
    .role-pill { background:#fff; }

    .kpis-strip { display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:10px; margin-bottom:20px; }
    .kpi-stat { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:14px; text-align:center; }
    .kpi-stat .kpi-num { font-size:24px; font-weight:800; color:#0f172a; line-height:1; }
    .kpi-stat .kpi-lbl { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; }
    .kpi-stat.ok .kpi-num { color:#166534; }
    .kpi-stat.fail .kpi-num { color:#b45309; }

    .layout-2col { display:grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap:20px; }
    @media (max-width: 900px) { .layout-2col { grid-template-columns: 1fr; } }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:16px 20px; margin-bottom:16px; }
    .card h3 { font-size:13px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:.5px; margin: 0 0 10px; }
    .card h3.sub { margin-top:14px; }
    .card p { font-size:13px; color:#374151; line-height:1.6; margin:0 0 6px; }
    .card ul { margin: 0 0 8px; padding-inline-start: 20px; font-size:13px; color:#374151; }
    .card ul li { line-height:1.7; }
    .card table { width:100%; font-size:12px; border-collapse:collapse; }
    .card th, .card td { padding:7px 10px; border-bottom:1px solid #f1f5f9; text-align:start; }
    .card th { color:#64748b; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:.5px; }

    .spark { width: 100px; height: 24px; }

    .timeline { list-style:none; padding:0; margin:0; }
    .tl-item { display:flex; gap:12px; padding:8px 0; border-bottom:1px solid #f1f5f9; }
    .tl-item:last-child { border-bottom:0; }
    .tl-dot { width:8px; height:8px; border-radius:99px; margin-top:6px; flex-shrink:0; background:#94a3b8; }
    .tl-shift_completed .tl-dot { background:#0ea5e9; }
    .tl-report_filed .tl-dot { background:#10b981; }
    .tl-manager_action .tl-dot { background:#8b5cf6; }
    .tl-kpi_snapshot .tl-dot { background:#f59e0b; }
    .tl-content { flex:1; min-width:0; }
    .tl-title { font-size:13px; color:#0f172a; }
    .tl-when { font-size:11px; color:#64748b; margin-top:2px; }

    .report-list { list-style:none; padding:0; margin:0; }
    .report-list li { padding: 10px 0; border-bottom:1px solid #f1f5f9; }
    .report-list li:last-child { border-bottom:0; }
    .report-list strong { font-size:13px; color:#0f172a; }
    .report-list p { font-size:12px; color:#475569; line-height:1.5; margin: 6px 0 0; }
    .report-status { font-size:10px; padding:1px 6px; border-radius:99px; text-transform:uppercase; letter-spacing:.4px; font-weight:700; }
    .rs-filed { background:#fef3c7; color:#92400e; }
    .rs-acknowledged { background:#dbeafe; color:#1e40af; }
    .rs-actioned { background:#dcfce7; color:#166534; }
  `],
})
export class AiEmployeeProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);

  loading = signal(true);
  emp = signal<EmployeeDetail | null>(null);
  timeline = signal<TimelineItem[]>([]);
  trend = signal<Record<string, KpiTrendPoint[]>>({});

  ar = () => this.i18n.isAr();
  dir = () => this.i18n.dir();

  ngOnInit(): void {
    void this.load();
  }

  trendFor(kpiCode: string): KpiTrendPoint[] {
    return this.trend()[kpiCode] || [];
  }

  trendStroke(kpiCode: string): string {
    const points = this.trendFor(kpiCode);
    if (!points.length) return '#94a3b8';
    const lastMet = points[points.length - 1].targetMet;
    return lastMet === true ? '#16a34a' : lastMet === false ? '#b45309' : '#0ea5e9';
  }

  sparklinePoints(kpiCode: string): string {
    const series = this.trendFor(kpiCode).filter(p => p.valueNumeric != null);
    if (series.length < 2) return '';
    const values = series.map(p => p.valueNumeric as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 22 - ((v - min) / span) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  tlTitle(t: TimelineItem): string {
    if (t.kind === 'report_filed') return t.title;
    if (t.kind === 'shift_completed') return (this.ar() ? 'وردية مكتملة: ' : 'Shift completed: ') + (t.detail?.payload?.shiftCode ?? t.title);
    if (t.kind === 'manager_action') return (this.ar() ? 'إجراء مدير: ' : 'Manager action: ') + t.title;
    if (t.kind === 'kpi_snapshot') return t.title;
    return t.title;
  }

  statusLabel(s: string): string {
    if (!this.ar()) return s;
    return ({ permanent: 'دائم', probation: 'تحت التجربة', on_leave: 'في إجازة', terminated: 'منتهي' } as Record<string,string>)[s] || s;
  }

  async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('agentId');
    if (!id) return;
    this.loading.set(true);
    try {
      const [profile, tl, kp] = await Promise.all([
        firstValueFrom(this.http.get<EmployeeDetail>(`/api/ai-hr/employees/${id}`)),
        firstValueFrom(this.http.get<{ items: TimelineItem[] }>(`/api/ai-hr/employees/${id}/timeline?limit=40`)),
        firstValueFrom(this.http.get<{ trend: Record<string, KpiTrendPoint[]> }>(`/api/ai-hr/employees/${id}/kpi-trend?days=30`)),
      ]);
      this.emp.set(profile);
      this.timeline.set(tl.items ?? []);
      this.trend.set(kp.trend ?? {});
    } catch {
      this.emp.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
