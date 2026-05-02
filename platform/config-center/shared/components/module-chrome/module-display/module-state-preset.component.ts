import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { LottieStateComponent } from '../../guided-interaction/feedback/lottie-state.component';

export type StatePreset = 'loading' | 'empty' | 'ready' | 'filtered-empty' | 'partial-error' | 'denied' | 'no-permission' | 'error' | 'archived' | 'maintenance';

@Component({
    selector: 'app-module-state-preset',
    imports: [CommonModule, ButtonModule, LottieStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="msp" [class]="'msp--' + preset">
      <div class="msp-visual">
        <app-lottie-state *ngIf="preset !== 'loading'" [state]="preset" />
        <div *ngIf="preset === 'loading'" class="msp-skeleton">
          <div class="msp-skel-bar msp-skel-bar--lg"></div>
          <div class="msp-skel-row">
            <div class="msp-skel-card" *ngFor="let i of [1,2,3,4]"></div>
          </div>
          <div class="msp-skel-bar msp-skel-bar--full"></div>
          <div class="msp-skel-bar msp-skel-bar--full"></div>
          <div class="msp-skel-bar msp-skel-bar--md"></div>
        </div>
      </div>

      <div class="msp-content" *ngIf="preset !== 'loading'">
        <h3 class="msp-title">{{ title || defaultTitle }}</h3>
        <p class="msp-desc">{{ description || defaultDesc }}</p>
        <div class="msp-actions" *ngIf="showAction">
          <button pButton [label]="actionLabel || defaultAction" [icon]="actionIcon" severity="secondary"
                  (click)="action.emit()"></button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .msp { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding: var(--cds-layout-04) var(--cds-spacing-06); text-align: center; }
    .msp-visual { margin-bottom: var(--cds-spacing-06); }
    .msp-title { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading); }
    .msp-desc { margin: var(--cds-spacing-03) 0 0; font-size: var(--font-size-base); color: var(--text-muted); max-width: 400px; line-height: 1.5; }
    .msp-actions { margin-top: calc(var(--cds-spacing-05) + var(--cds-spacing-02)); }
    .msp-skeleton { width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: var(--cds-spacing-05); }
    .msp-skel-bar { height: var(--cds-spacing-06); background: var(--shell-card-border); border-radius: var(--radius-sm); animation: pulse 1.5s ease-in-out infinite; }
    .msp-skel-bar--lg { width: 50%; height: var(--cds-spacing-07); }
    .msp-skel-bar--md { width: 70%; }
    .msp-skel-bar--full { width: 100%; }
    .msp-skel-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--cds-spacing-04); }
    .msp-skel-card { height: 80px; background: var(--shell-card-border); border-radius: var(--radius); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .msp--error .msp-title { color: var(--error); }
    .msp--partial-error .msp-title { color: var(--warning); }
    .msp--no-permission .msp-title { color: var(--warning); }
    .msp--denied .msp-title { color: var(--warning); }
    .msp--archived .msp-title { color: var(--text-muted); }
    .msp--filtered-empty .msp-title { color: var(--text-muted); }
    .msp--ready { display: none; }
  `]
})
export class ModuleStatePresetComponent {
  @Input() preset: StatePreset = 'loading';
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Input() actionIcon = 'pi pi-refresh';
  @Input() showAction = true;
  @Output() action = new EventEmitter<void>();

  get defaultTitle(): string {
    const m: Record<StatePreset, string> = {
      loading: '', ready: '', empty: 'No data yet',
      'filtered-empty': 'No matching results',
      'partial-error': 'Some data could not be loaded',
      denied: 'Access Denied', 'no-permission': 'Access Denied',
      error: 'Something went wrong', archived: 'Module Archived', maintenance: 'Under Maintenance',
    };
    return m[this.preset] || '';
  }

  get defaultDesc(): string {
    const m: Record<StatePreset, string> = {
      loading: '', ready: '', empty: 'Records will appear here once created. Get started by adding your first entry.',
      'filtered-empty': 'Try adjusting your filters or search criteria to find what you are looking for.',
      'partial-error': 'Some sections failed to load. The available data is shown below.',
      denied: 'You do not have permission to view this module. Contact your administrator.',
      'no-permission': 'You do not have permission to view this module. Contact your administrator.',
      error: 'An unexpected error occurred. Please try again or contact support.',
      archived: 'This module has been archived and is in read-only mode.',
      maintenance: 'This module is temporarily unavailable for scheduled maintenance.',
    };
    return m[this.preset] || '';
  }

  get defaultAction(): string {
    const m: Record<StatePreset, string> = {
      loading: '', ready: '', empty: 'Get Started',
      'filtered-empty': 'Clear Filters',
      'partial-error': 'Retry',
      denied: 'Request Access', 'no-permission': 'Request Access',
      error: 'Retry', archived: 'View Archive', maintenance: 'Check Status',
    };
    return m[this.preset] || '';
  }
}
