import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';

/**
 * Dashboard wayfinding: "Where to start" strip for first-time or under-onboarded users.
 * Shown at top of dashboard; dismissible via "Don't show again" (persisted in backend) or "Remind later" (session only).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-welcome-strip',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  template: `
    <div class="welcome-strip" [attr.dir]="i18n.direction()">
      <div class="welcome-header">
        <div class="welcome-title-row">
          <i class="pi pi-home"></i>
          <div>
            <h2 class="welcome-headline">{{ headline }}</h2>
            <p class="welcome-sub">{{ subline }}</p>
          </div>
        </div>
        <div class="welcome-actions">
          <button type="button" class="btn-remind" (click)="remindLater()">
            {{ i18n.translate('welcomeStrip.remindLater') }}
          </button>
          <button type="button" class="btn-dismiss" (click)="dontShowAgain()">
            {{ i18n.translate('welcomeStrip.dontShowAgain') }}
          </button>
        </div>
      </div>
      <ul class="welcome-checklist">
        <li><a routerLink="/profile" class="welcome-link"><i class="pi pi-user"></i> {{ linkProfile }}</a></li>
        <li><a routerLink="/frameworks" class="welcome-link"><i class="pi pi-chart-bar"></i> {{ linkCompliance }}</a></li>
        <li><a routerLink="/assets" class="welcome-link"><i class="pi pi-cloud-upload"></i> {{ linkEvidence }}</a></li>
        <li><a routerLink="/nca-assessment" class="welcome-link"><i class="pi pi-calendar"></i> {{ linkPlan }}</a></li>
      </ul>
    </div>
  `,
  styles: [`
    .welcome-strip {
      background: linear-gradient(135deg, #eff6ff, var(--status-success-bg, #defbe6));
      border: 1.5px solid #bae6fd;
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 20px;
    }
    .welcome-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .welcome-title-row { display: flex; align-items: center; gap: 12px; }
    .welcome-title-row > .pi { font-size: var(--font-size-2xl); color: var(--primary); }
    .welcome-headline { font-size: var(--font-size-lg); font-weight: 800; color: #0c4a6e; margin: 0; }
    .welcome-sub { font-size: var(--font-size-sm); color: var(--text-muted); margin: 4px 0 0; }
    .welcome-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .btn-remind, .btn-dismiss {
      padding: 8px 14px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600;
      border: 1px solid #bae6fd; background: #fff; color: #0369a1;
      cursor: pointer; transition: all 200ms;
    }
    .btn-remind:hover, .btn-dismiss:hover { background: #e0f2fe; }
    .btn-dismiss { border-color: var(--text-muted); color: #475569; }
    .btn-dismiss:hover { background: var(--surface-ice); }
    .welcome-checklist {
      display: flex; flex-wrap: wrap; gap: 10px; list-style: none; margin: 0; padding: 0;
    }
    .welcome-link {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 16px; background: #ffffff; border-radius: var(--radius-sm);
      border: 1px solid #e0f2fe; font-size: var(--font-size-sm); font-weight: 500;
      color: #334155; text-decoration: none;
      transition: all 200ms;
    }
    .welcome-link:hover { border-color: var(--primary); background: var(--status-info-bg, #edf5ff); transform: translateY(-1px); }
    .welcome-link .pi { font-size: var(--font-size-base); color: var(--primary); }
  `],
})
export class DashboardWelcomeStripComponent {
  @Input() tenantName = '';
  @Output() dismissed = new EventEmitter<'remind' | 'dont_show'>();

  constructor(public i18n: I18nService) {}

  get headline(): string {
    if (this.tenantName) {
      return this.i18n.translate('welcomeStrip.headlineWithTenant', { tenant: this.tenantName });
    }
    return this.i18n.translate('welcomeStrip.headline');
  }

  get subline(): string {
    return this.i18n.translate('welcomeStrip.subline');
  }

  get linkProfile(): string {
    return this.i18n.translate('welcomeStrip.linkProfile');
  }

  get linkCompliance(): string {
    return this.i18n.translate('welcomeStrip.linkCompliance');
  }

  get linkEvidence(): string {
    return this.i18n.translate('welcomeStrip.linkEvidence');
  }

  get linkPlan(): string {
    return this.i18n.translate('welcomeStrip.linkPlan');
  }

  remindLater(): void {
    this.dismissed.emit('remind');
  }

  dontShowAgain(): void {
    this.dismissed.emit('dont_show');
  }
}
