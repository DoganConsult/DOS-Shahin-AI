import { Component, HostListener, inject, ChangeDetectionStrategy} from '@angular/core';
import { FocusTrapDirective } from '@app/shared/directives/focus-trap.directive';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-shortcuts-overlay',
  standalone: true,
  imports: [FocusTrapDirective, CommonModule, ButtonModule],
  template: `
    <div tabindex="0" role="button" (keyup.enter)="close()" class="shortcuts-overlay" *ngIf="visible" (click)="close()" role="dialog" aria-modal="true" appFocusTrap aria-labelledby="shortcuts-title">
      <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="shortcuts-card" (click)="$event.stopPropagation()">
        <h2 id="shortcuts-title" class="shortcuts-title">{{ i18n.translate('shortcuts.title') }}</h2>
        <ul class="shortcuts-list">
          <li><kbd>?</kbd> <span>{{ i18n.translate('shortcuts.openShortcuts') }}</span></li>
          <li><kbd>Esc</kbd> <span>{{ i18n.translate('shortcuts.closeOverlay') }}</span></li>
          <li><kbd>Ctrl</kbd> + <kbd>S</kbd> <span>{{ i18n.translate('shortcuts.save') }}</span></li>
          <li><kbd>Ctrl</kbd> + <kbd>K</kbd> <span>{{ i18n.translate('shortcuts.searchNav') }}</span></li>
        </ul>
        <button type="button" class="p-button p-button-text" (click)="close()">
          {{ i18n.translate('shortcuts.closeOverlay') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .shortcuts-overlay {
      position: fixed;
      inset: 0;
      background: rgba(var(--color-black-rgb), 0.45);
      z-index: var(--z-splash);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-lg);
      animation: shortcutsFadeIn 0.15s ease-out;
    }
    @keyframes shortcutsFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .shortcuts-card {
      background: var(--surface);
      color: var(--text);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      max-width: 380px;
      width: 100%;
      padding: var(--space-xl);
    }
    .shortcuts-title {
      font-size: var(--font-size-lg);
      font-weight: 600;
      margin: 0 0 var(--space-lg);
      color: var(--text);
    }
    .shortcuts-list {
      list-style: none;
      padding: 0;
      margin: 0 0 var(--space-lg);
    }
    .shortcuts-list li {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-xs) 0;
      font-size: 0.9375rem;
      color: var(--text-body);
    }
    .shortcuts-list kbd {
      display: inline-block;
      min-width: 2rem;
      padding: 2px 6px;
      font-family: inherit;
      font-size: var(--font-size-xs-plus);
      text-align: center;
      background: var(--surface-ice);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
    }
  `]
})
export class ShortcutsOverlayComponent {
  i18n = inject(I18nService);
  visible = false;

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.visible) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
      return;
    }
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
      event.preventDefault();
      this.open();
    }
  }

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
  }
}
