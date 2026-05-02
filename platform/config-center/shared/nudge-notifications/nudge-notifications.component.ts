/**
 * Nudge Notifications Component
 *
 * Displays proactive GRC nudges as dismissible notification cards.
 * Integrated into the main app shell so nudges appear globally.
 * Each nudge links to its target module for quick navigation.
 *
 * Requirements: 3.4
 */

import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { JourneyService, Nudge } from '@app/core/modules/journey.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription, timer } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

/** How often to poll for new nudges (5 minutes). */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

/** Max nudges to show at once to avoid overwhelming the UI. */
const MAX_VISIBLE_NUDGES = 3;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-nudge-notifications',
    imports: [CommonModule, ButtonModule],
    template: `
    <div class="nudge-container" *ngIf="visibleNudges().length > 0">
      @for (nudge of visibleNudges(); track nudge.nudgeId) {
        <div
          class="nudge-card"
          [class.critical]="nudge.priority === 'critical'"
          [class.high]="nudge.priority === 'high'"
          role="alert"
        >
          <div class="nudge-header">
            <i class="pi" [ngClass]="getPriorityIcon(nudge.priority)"></i>
            <span class="nudge-title">{{ resolveTitle(nudge) }}</span>
            <button
              class="nudge-dismiss"
              (click)="dismiss(nudge)"
              [attr.aria-label]="'Dismiss notification'"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
          <p class="nudge-body">{{ resolveBody(nudge) }}</p>
          <button
            class="nudge-action"
            (click)="navigateTo(nudge)"
          >
            <i class="pi pi-arrow-right"></i>
            {{ i18n.translate('nudge.goToModule') }}
          </button>
        </div>
      }
    </div>
  `,
    styles: [`
    .nudge-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 380px;
      width: 100%;
      pointer-events: none;
    }

    :host-context([dir="rtl"]) .nudge-container {
      right: auto;
      left: 1.5rem;
    }

    .nudge-card {
      pointer-events: auto;
      background: var(--surface-card, #fff);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
      border-inline-start: 4px solid var(--primary-color, var(--primary));
      padding: 0.875rem 1rem;
      animation: slideIn 0.3s ease-out;
    }

    :host-context([dir="rtl"]) .nudge-card {
      animation: slideInRtl 0.3s ease-out;
    }

    .nudge-card.critical {
      border-inline-start-color: var(--red-500, var(--error));
    }

    .nudge-card.high {
      border-inline-start-color: var(--orange-500, var(--risk-high));
    }

    .nudge-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.375rem;
    }

    .nudge-header i:first-child {
      font-size: var(--font-size-md);
      flex-shrink: 0;
    }

    .nudge-card.critical .nudge-header i:first-child { color: var(--red-500, var(--error)); }
    .nudge-card.high .nudge-header i:first-child { color: var(--orange-500, var(--risk-high)); }

    .nudge-title {
      flex: 1;
      font-weight: 600;
      font-size: var(--font-size-base);
      color: var(--text-color, var(--text-heading));
      line-height: 1.3;
    }

    .nudge-dismiss {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      color: var(--text-color-secondary, var(--text-muted));
      border-radius: var(--radius-xs);
      flex-shrink: 0;
    }
    .nudge-dismiss:hover {
      background: var(--surface-hover, var(--surface-ice));
    }

    .nudge-body {
      font-size: var(--font-size-xs-plus);
      color: var(--text-color-secondary, var(--text-muted));
      margin: 0 0 0.5rem 0;
      line-height: 1.4;
    }

    .nudge-action {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--primary-color, var(--primary));
      font-size: var(--font-size-xs-plus);
      font-weight: 500;
      padding: 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .nudge-action:hover {
      text-decoration: underline;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(1rem); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes slideInRtl {
      from { opacity: 0; transform: translateX(-1rem); }
      to { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class NudgeNotificationsComponent implements OnInit, OnDestroy {
  private journeyService = inject(JourneyService);
  private router = inject(Router);
  i18n = inject(I18nService);

  private pollSub?: Subscription;

  /** All active nudges from the API. */
  private allNudges = signal<Nudge[]>([]);

  /** Capped list of nudges to display. */
  visibleNudges = signal<Nudge[]>([]);

  ngOnInit(): void {
    this.fetchNudges();

    // Poll periodically for new nudges
    this.pollSub = timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.journeyService.getActiveNudges()),
        catchError(() => EMPTY),
      )
      .subscribe(res => this.updateNudges(res.nudges));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  /** Initial fetch of nudges. */
  private fetchNudges(): void {
    this.journeyService.getActiveNudges().pipe(
      catchError(() => EMPTY),
    ).subscribe(res => this.updateNudges(res.nudges));
  }

  private updateNudges(nudges: Nudge[]): void {
    this.allNudges.set(nudges);
    this.visibleNudges.set(nudges.slice(0, MAX_VISIBLE_NUDGES));
  }

  /** Dismiss a nudge via API and remove from view. */
  dismiss(nudge: Nudge): void {
    this.journeyService.dismissNudge(nudge.nudgeId).pipe(
      catchError(() => EMPTY),
    ).subscribe(() => {
      const remaining = this.allNudges().filter(n => n.nudgeId !== nudge.nudgeId);
      this.allNudges.set(remaining);
      this.visibleNudges.set(remaining.slice(0, MAX_VISIBLE_NUDGES));
    });
  }

  /** Navigate to the nudge's target module. */
  navigateTo(nudge: Nudge): void {
    const route = nudge.targetModule.startsWith('/')
      ? nudge.targetModule
      : `/${nudge.targetModule}`;
    this.router.navigate([route]);
    this.dismiss(nudge);
  }

  /** Resolve bilingual title based on current language. */
  resolveTitle(nudge: Nudge): string {
    return this.journeyService.resolveBilingual(nudge, 'title');
  }

  /** Resolve bilingual body based on current language. */
  resolveBody(nudge: Nudge): string {
    return this.journeyService.resolveBilingual(nudge, 'body');
  }

  /** Map priority to a PrimeNG icon. */
  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'critical': return 'pi pi-exclamation-circle';
      case 'high': return 'pi pi-exclamation-triangle';
      case 'medium': return 'pi pi-info-circle';
      default: return 'pi pi-bell';
    }
  }
}
