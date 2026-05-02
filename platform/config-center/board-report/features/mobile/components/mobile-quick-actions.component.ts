import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/**
 * Dumb component: renders the floating action button (FAB) with
 * expandable quick action sub-buttons on the mobile dashboard.
 */
@Component({
    selector: 'app-mobile-quick-actions',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <div class="mob-fab-container" [class.expanded]="fabExpanded" *ngIf="isNativeApp">
      <!-- Sub actions (shown when expanded) -->
      <div class="mob-fab-actions" [class.visible]="fabExpanded">
        <button class="mob-fab-sub mob-fab-evidence" (click)="captureEvidence.emit()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <span>{{ isRtl() ? 'أدلة' : 'Evidence' }}</span>
        </button>
        <button class="mob-fab-sub mob-fab-approve" (click)="navigate.emit('/approval-center')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span>{{ isRtl() ? 'موافقة' : 'Approve' }}</span>
        </button>
        <button class="mob-fab-sub mob-fab-risk" (click)="navigate.emit('/risks')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>
          </svg>
          <span>{{ isRtl() ? 'مخاطر' : 'Risk' }}</span>
        </button>
        <button class="mob-fab-sub mob-fab-ai" (click)="navigate.emit('/ai-hub')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          </svg>
          <span>{{ isRtl() ? 'ذكاء اصطناعي' : 'AI' }}</span>
        </button>
      </div>

      <!-- Main FAB button -->
      <button class="mob-fab-main" (click)="toggleFab.emit()" [class.open]="fabExpanded" aria-label="Quick actions">
        <svg class="mob-fab-plus" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <svg class="mob-fab-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- FAB backdrop (native only) -->
    <div tabindex="0" role="button" (keyup.enter)="toggleFab.emit()" class="mob-fab-backdrop" [class.visible]="fabExpanded" (click)="toggleFab.emit()" *ngIf="isNativeApp"></div>
  `,
    styles: [`
    .mob-fab-container {
      position: fixed; bottom: calc(80px + env(safe-area-inset-bottom)); right: 20px;
      z-index: var(--z-dropdown); display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
    }

    .mob-fab-main {
      width: 56px; height: 56px; border-radius: 18px;
      background: linear-gradient(135deg, var(--primary), var(--primary));
      border: none; cursor: pointer; color: var(--text-on-primary);
      box-shadow: var(--shadow-lg);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
      position: relative; overflow: hidden;
    }
    .mob-fab-main:active { transform: scale(0.95); }
    .mob-fab-main.open { transform: rotate(45deg); }

    .mob-fab-plus, .mob-fab-close { position: absolute; transition: opacity 0.2s, transform 0.2s; }
    .mob-fab-close { opacity: 0; transform: rotate(-45deg); }
    .mob-fab-main.open .mob-fab-plus { opacity: 0; transform: rotate(45deg); }
    .mob-fab-main.open .mob-fab-close { opacity: 1; transform: rotate(0); }

    .mob-fab-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; opacity: 0; pointer-events: none; transform: translateY(10px); transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    .mob-fab-actions.visible { opacity: 1; pointer-events: all; transform: translateY(0); }

    .mob-fab-sub {
      display: flex; align-items: center; gap: 10px;
      background: var(--glass-navbar); border: 1px solid rgba(var(--color-white-rgb), 0.1);
      border-radius: var(--radius-lg); padding: 10px 14px; color: var(--text-on-primary); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500;
      box-shadow: var(--shadow-md); backdrop-filter: blur(20px);
      transition: transform 0.15s, background 0.15s;
    }
    .mob-fab-sub:active { transform: scale(0.95); }

    .mob-fab-evidence svg { color: var(--hub-compliance); }
    .mob-fab-approve svg { color: var(--success); }
    .mob-fab-risk svg { color: var(--severity-critical); }
    .mob-fab-ai svg { color: var(--hub-evidence); }

    .mob-fab-backdrop {
      position: fixed; inset: 0; z-index: var(--z-dropdown); background: rgba(var(--color-black-rgb), 0);
      pointer-events: none; transition: background 0.3s;
    }
    .mob-fab-backdrop.visible { background: rgba(0,0,0,var(--opacity-overlay-heavy)); pointer-events: all; backdrop-filter: blur(4px); }
  `]
})
export class MobileQuickActionsComponent {
  private readonly i18n = inject(I18nService);

  @Input() fabExpanded = false;
  @Input() isNativeApp = false;

  @Output() toggleFab = new EventEmitter<void>();
  @Output() captureEvidence = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<string>();

  readonly isRtl = computed(() => this.i18n.direction() === 'rtl');
}
