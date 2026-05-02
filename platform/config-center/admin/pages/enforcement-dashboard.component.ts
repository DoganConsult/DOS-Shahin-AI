import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface EnforcementRun {
  run_id: string;
  started_at: string;
  verdict: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  total_duration_ms: number;
  check_count: number;
  fail_count: number;
  triggered_by: string;
  checks: { check: string; law: string; status: string; findings: string[]; ms: number }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-enforcement-dashboard',
  standalone: true,
  imports: [CommonModule, TagModule, TableModule, ButtonModule, SkeletonModule],
  template: `
    <div class="enf-page" [attr.dir]="isAr ? 'rtl' : 'ltr'">
      <div class="enf-header">
        <h2>{{ isAr ? 'لوحة تطبيق القوانين' : 'Enforcement Dashboard' }}</h2>
        <button pButton [label]="isAr ? 'تشغيل الفحص' : 'Run Sweep'" icon="pi pi-play"
                [loading]="triggering()" (click)="triggerSweep()" severity="info" />
      </div>

      @if (loading()) {
        <p-skeleton width="100%" height="400px" />
      } @else if (!runs().length) {
        <div class="enf-empty">
          <i class="pi pi-shield"></i>
          <p>{{ isAr ? 'لا توجد عمليات فحص سابقة' : 'No enforcement runs yet' }}</p>
        </div>
      } @else {
        <!-- Latest run summary -->
        <div class="enf-latest" [class.enf-pass]="runs()[0].verdict === 'PASS'"
             [class.enf-warn]="runs()[0].verdict === 'CONDITIONAL_PASS'"
             [class.enf-fail]="runs()[0].verdict === 'FAIL'">
          <div class="enf-verdict">
            <p-tag [value]="runs()[0].verdict" [severity]="verdictSeverity(runs()[0].verdict)" />
            <span class="enf-meta">{{ runs()[0].check_count }} checks · {{ runs()[0].fail_count }} failures · {{ runs()[0].total_duration_ms }}ms</span>
          </div>
          <span class="enf-time">{{ runs()[0].started_at | date:'medium' }}</span>
        </div>

        <!-- Check details for latest run -->
        @if (runs()[0].checks?.length) {
          <p-table [value]="runs()[0].checks" styleClass="p-datatable-sm" class="enf-checks">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ isAr ? 'الفحص' : 'Check' }}</th>
                <th>{{ isAr ? 'القانون' : 'Law' }}</th>
                <th>{{ isAr ? 'الحالة' : 'Status' }}</th>
                <th>{{ isAr ? 'النتائج' : 'Findings' }}</th>
                <th>ms</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-c>
              <tr>
                <td>{{ c.check }}</td>
                <td><code>{{ c.law }}</code></td>
                <td><p-tag [value]="c.status" [severity]="verdictSeverity(c.status)" /></td>
                <td>{{ c.findings?.length || 0 }}</td>
                <td>{{ c.ms }}</td>
              </tr>
            </ng-template>
          </p-table>
        }

        <!-- History -->
        <h3>{{ isAr ? 'السجل' : 'History' }}</h3>
        <p-table [value]="runs()" [rows]="10" [paginator]="runs().length > 10" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ isAr ? 'التاريخ' : 'Date' }}</th>
              <th>{{ isAr ? 'الحكم' : 'Verdict' }}</th>
              <th>{{ isAr ? 'الفحوصات' : 'Checks' }}</th>
              <th>{{ isAr ? 'الإخفاقات' : 'Failures' }}</th>
              <th>{{ isAr ? 'المشغل' : 'Triggered By' }}</th>
              <th>ms</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td>{{ r.started_at | date:'short' }}</td>
              <td><p-tag [value]="r.verdict" [severity]="verdictSeverity(r.verdict)" /></td>
              <td>{{ r.check_count }}</td>
              <td>{{ r.fail_count }}</td>
              <td>{{ r.triggered_by }}</td>
              <td>{{ r.total_duration_ms }}</td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
  styles: [`
    .enf-page { padding: 1.5rem; }
    .enf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .enf-header h2 { color: var(--text-body); margin: 0; }
    .enf-latest { padding: 1rem; border-radius: var(--radius); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .enf-pass { background: color-mix(in srgb, var(--success) 10%, transparent); border: 1px solid var(--success); }
    .enf-warn { background: color-mix(in srgb, var(--warning) 10%, transparent); border: 1px solid var(--warning); }
    .enf-fail { background: color-mix(in srgb, var(--error) 10%, transparent); border: 1px solid var(--error); }
    .enf-verdict { display: flex; align-items: center; gap: 1rem; }
    .enf-meta { color: var(--text-muted); font-size: var(--font-size-tag); }
    .enf-time { color: var(--text-muted); font-size: var(--font-size-tag); }
    .enf-empty { text-align: center; padding: 3rem; color: var(--text-muted); }
    .enf-empty i { font-size: var(--font-size-6xl); margin-bottom: 1rem; display: block; }
    .enf-checks { margin-bottom: 1.5rem; }
    h3 { color: var(--text-body); margin: 1.5rem 0 0.75rem; }
    code { background: var(--bg-0); padding: 0.15rem 0.4rem; border-radius: var(--radius-xs); font-size: var(--font-size-caption); }
  `],
})
export class EnforcementDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);

  loading = signal(true);
  triggering = signal(false);
  runs = signal<EnforcementRun[]>([]);

  get isAr() { return this.i18n.currentLang() === 'ar'; }

  ngOnInit() { this.loadHistory(); }

  async loadHistory() {
    this.loading.set(true);
    try {
      const res: any = await this.http.get('/api/admin/enforcement/history?limit=20').toPromise();
      this.runs.set(res?.runs ?? []);
    } catch { /* empty */ }
    this.loading.set(false);
  }

  async triggerSweep() {
    this.triggering.set(true);
    try {
      await this.http.post('/api/admin/enforcement/trigger', {}).toPromise();
      // Poll for completion after short delay
      setTimeout(() => this.loadHistory(), 5000);
    } catch { /* empty */ }
    this.triggering.set(false);
  }

  verdictSeverity(v: string): string {
    if (v === 'PASS' || v === 'completed') return 'success';
    if (v === 'CONDITIONAL_PASS') return 'warning';
    return 'danger';
  }
}
