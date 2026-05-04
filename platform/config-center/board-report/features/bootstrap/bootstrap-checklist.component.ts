import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { StorageService } from '@app/infrastructure';
import { SessionService } from '../../../../dauth/session/session.service';
import { AccessStore } from '@dos/access-store';

interface ChecklistItem {
  key: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
  route: string;
  required: boolean;
  completed: boolean;
}

interface BootstrapStatus {
  tenantId: string;
  tenantStatus: string;
  firstLoginCompleted: boolean;
  completedRequired: number;
  totalRequired: number;
  items: ChecklistItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bootstrap-checklist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bootstrap-container">
      <div class="bootstrap-header">
        <h1>{{ lang() === 'ar' ? 'مرحباً بك في Shahin-AI' : 'Welcome to Shahin-AI' }}</h1>
        <p class="subtitle">
          {{ lang() === 'ar'
            ? 'أكمل هذه الخطوات لتفعيل مساحة العمل بالكامل'
            : 'Complete these steps to fully activate your workspace' }}
        </p>
        <div class="progress-bar-wrap">
          <div class="progress-bar" [style.width.%]="progressPct()"></div>
        </div>
        <span class="progress-label">{{ status()?.completedRequired ?? 0 }} / {{ status()?.totalRequired ?? 0 }}</span>
      </div>

      <div class="checklist" *ngIf="!loading()">
        <div
          class="checklist-item"
          *ngFor="let item of status()?.items"
          [class.completed]="item.completed"
          [class.required]="item.required">
          <div class="item-status-icon">
            <span *ngIf="item.completed">✅</span>
            <span *ngIf="!item.completed && item.required">⭕</span>
            <span *ngIf="!item.completed && !item.required">○</span>
          </div>
          <div class="item-content">
            <div class="item-title">
              {{ lang() === 'ar' ? item.titleAr : item.titleEn }}
              <span class="required-badge" *ngIf="item.required && !item.completed">Required</span>
            </div>
            <div class="item-desc">{{ lang() === 'ar' ? item.descriptionAr : item.descriptionEn }}</div>
          </div>
          <button class="go-btn" (click)="navigate(item.route)" *ngIf="!item.completed">
            {{ lang() === 'ar' ? 'انتقال' : 'Go' }}
          </button>
        </div>
      </div>

      <div class="loading-state" aria-live="polite" *ngIf="loading()">
        <span>{{ lang() === 'ar' ? 'جارٍ التحميل...' : 'Loading...' }}</span>
      </div>

      <div class="bootstrap-actions">
        <button class="btn-secondary" (click)="skipToHome()">
          {{ lang() === 'ar' ? 'تخطّ إلى لوحة التحكم' : 'Skip to Dashboard' }}
        </button>
        <button class="btn-primary" (click)="skipToHome()" *ngIf="status()?.firstLoginCompleted">
          {{ lang() === 'ar' ? 'ابدأ الاستخدام' : 'Start Using Shahin' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .bootstrap-container { max-width: 720px; margin: 48px auto; padding: 32px; font-family: inherit; }
    .bootstrap-header { text-align: center; margin-bottom: 32px; }
    .bootstrap-header h1 { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); margin-bottom: 8px; }
    .subtitle { color: var(--text-muted); margin-bottom: 20px; }
    .progress-bar-wrap { height: 8px; background: var(--border-subtle); border-radius: var(--radius); overflow: hidden; margin-bottom: 8px; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary)); transition: width 0.5s ease; }
    .progress-label { color: var(--text-muted); font-size: var(--font-size-base); }
    .checklist { display: flex; flex-direction: column; gap: 12px; }
    .checklist-item { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: var(--radius-lg); border: 1.5px solid var(--border-subtle); background: #fff; transition: all 0.2s; }
    .checklist-item.completed { background: var(--status-success-bg, #defbe6); border-color: #86efac; }
    .checklist-item.required:not(.completed) { border-color: #fbbf24; }
    .item-status-icon { font-size: var(--font-size-xl); flex-shrink: 0; }
    .item-content { flex: 1; }
    .item-title { font-weight: 600; color: var(--text-heading); display: flex; align-items: center; gap: 8px; }
    .required-badge { font-size: var(--font-size-xs); background: var(--status-warning-bg, #fcf4d6); color: #92400e; padding: 2px 8px; border-radius: var(--radius-xl); font-weight: 500; }
    .item-desc { color: var(--text-muted); font-size: var(--font-size-sm); margin-top: 2px; }
    .go-btn { padding: 8px 18px; border-radius: var(--radius); border: 1.5px solid var(--primary); color: var(--primary); background: transparent; cursor: pointer; font-weight: 500; flex-shrink: 0; }
    .go-btn:hover { background: var(--status-info-bg, #edf5ff); }
    .bootstrap-actions { display: flex; justify-content: center; gap: 12px; margin-top: 32px; }
    .btn-secondary { padding: 10px 24px; border-radius: var(--radius); border: 1.5px solid #cbd5e1; background: transparent; color: #475569; cursor: pointer; font-weight: 500; }
    .btn-primary { padding: 10px 24px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; }
    .loading-state { text-align: center; padding: 48px; color: var(--text-muted); }
  `],
})
export class BootstrapChecklistComponent implements OnInit {
  private _storage = inject(StorageService);
  loading = signal(true);
  status = signal<BootstrapStatus | null>(null);
  lang = signal<'en' | 'ar'>(
    (typeof localStorage !== 'undefined' && this._storage.get('grc_lang') as 'en' | 'ar') || 'en'
  );

  progressPct() {
    const s = this.status();
    if (!s || s.totalRequired === 0) return 0;
    return Math.round((s.completedRequired / s.totalRequired) * 100);
  }

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadStatus();
  }

  loadStatus() {
    this.http.get<BootstrapStatus>(`${environment.apiUrl}/bootstrap/status`)
      .subscribe({
        next: (s) => { this.status.set(s); this.loading.set(false); },
        error: () => { this.loading.set(false); },
      });
  }

  navigate(route: string) {
    this.router.navigateByUrl(route);
  }

  skipToHome() {
    const tenantId = this._storage.get('grc_tenantId') || '';
    const cockpitKey = tenantId ? `grc_cockpit_shown_${tenantId}` : 'grc_cockpit_shown';
    if (!this._storage.get(cockpitKey)) {
      this._storage.set(cockpitKey, 'true');
    }
    this.router.navigateByUrl('/workspace-home');
  }

}
