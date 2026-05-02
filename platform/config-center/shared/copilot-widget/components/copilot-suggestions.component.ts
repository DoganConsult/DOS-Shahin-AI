import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export interface CopilotSuggestion {
  id: string;
  text: string;
  textAr: string;
}

@Component({
    selector: 'app-copilot-suggestions',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <div *ngIf="suggestions.length > 0" class="suggestions-area">
      <div tabindex="0" role="button" (keyup.enter)="selected.emit(s)" *ngFor="let s of suggestions" class="suggestion-card"
           [style.border-inline-start-color]="accentColor"
           (click)="selected.emit(s)">
        <span>{{ i18n.localize(s.text, s.textAr) }}</span>
        <button [attr.aria-label]="t('common.close')" class="dismiss-btn" (click)="onDismiss($event, s.id)"><i class="pi pi-times"></i></button>
      </div>
    </div>
  `,
    styles: [`
    .suggestions-area { padding: 8px 12px 0; display: flex; flex-direction: column; gap: 4px; }
    .suggestion-card {
      font-size: var(--font-size-sm); padding: 8px 10px; border-radius: var(--radius); cursor: pointer;
      background: var(--surface-sunken, var(--surface-ice)); border: 1px solid var(--border-subtle, var(--border-subtle));
      border-inline-start: 3px solid var(--primary);
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      transition: background 150ms;
    }
    .suggestion-card:hover { background: var(--surface-hover, var(--surface-ice)); }
    .dismiss-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; font-size: var(--font-size-xs); }
  `]
})
export class CopilotSuggestionsComponent {
  i18n = inject(I18nService);

  @Input() suggestions: CopilotSuggestion[] = [];
  @Input() accentColor = '#0ea5e9';

  @Output() selected = new EventEmitter<CopilotSuggestion>();
  @Output() dismiss = new EventEmitter<string>();

  t(key: string): string { return this.i18n.translate(key); }

  onDismiss(event: Event, id: string): void {
    event.stopPropagation();
    this.dismiss.emit(id);
  }
}
