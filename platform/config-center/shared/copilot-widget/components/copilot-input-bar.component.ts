import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    selector: 'app-copilot-input-bar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="copilot-input">
      <input type="text" [(ngModel)]="text"
             [placeholder]="t('copilot.placeholder')" [attr.aria-label]="t('copilot.placeholder')"
             (keydown.enter)="onSend()" [disabled]="disabled" />
      <button [attr.aria-label]="t('common.send')" class="send-btn" (click)="onSend()" [disabled]="!text.trim() || disabled"
              [style.background]="accentColor">
        <i class="pi pi-send"></i>
      </button>
    </div>
  `,
    styles: [`
    .copilot-input {
      display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .copilot-input input {
      flex: 1; border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius);
      padding: 8px 12px; font-size: var(--font-size-sm); outline: none; background: var(--surface, #fff);
      color: var(--text, var(--text-heading));
    }
    .copilot-input input:focus { border-color: var(--primary); }
    .send-btn {
      width: 36px; height: 36px; border-radius: var(--radius); border: none; cursor: pointer;
      color: #fff; display: flex; align-items: center; justify-content: center;
      transition: filter 150ms;
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .send-btn:not(:disabled):hover { filter: brightness(1.1); }
  `]
})
export class CopilotInputBarComponent {
  private i18n = inject(I18nService);

  @Input() disabled = false;
  @Input() accentColor = '#0ea5e9';

  @Output() messageSent = new EventEmitter<string>();

  text = '';

  t(key: string): string { return this.i18n.translate(key); }

  onSend(): void {
    const trimmed = this.text.trim();
    if (!trimmed || this.disabled) return;
    this.messageSent.emit(trimmed);
    this.text = '';
  }
}
