/**
 * Command Palette Component
 * 
 * Overlay component triggered by Cmd+K / Ctrl+K that provides
 * fuzzy search across all available commands with keyboard navigation.
 * 
 * Requirements: 6.1, 6.2, 6.4, 6.5, 6.9
 */
import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TIMING } from '@app/runtime/_legacy/ui-constants';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

interface CommandSuggestion {
  command: {
    id: string;
    label: string;
    labelAr: string;
    category: string;
    action: string;
    url?: string;
    icon: string;
    shortcut?: string;
  };
  score: number;
  reason: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div tabindex="0" role="button" (keyup.enter)="close()" class="command-palette-overlay" *ngIf="isOpen" (click)="close()" role="dialog" aria-label="Command Palette">
      <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="command-palette" (click)="$event.stopPropagation()">
        <div class="search-container">
          <i class="pi pi-search search-icon"></i>
          <input
            #searchInput
            type="text"
            class="search-input"
            [placeholder]="i18n.translate('commandPalette.typeCommand')" [attr.aria-label]="i18n.translate('commandPalette.typeCommand')"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            (keydown)="onKeyDown($event)"
            autocomplete="off"
            role="combobox"
            aria-expanded="true"
            [attr.aria-activedescendant]="'cmd-' + selectedIndex"
          />
          <kbd class="shortcut-badge">ESC</kbd>
        </div>

        <div class="results-container" role="listbox">
          <div *ngIf="suggestions.length === 0 && query.length > 0" class="no-results">
            {{ i18n.translate('commandPalette.noResults') }}
          </div>

          <div *ngIf="suggestions.length === 0 && query.length === 0 && recentCommands.length > 0" class="section">
            <div class="section-label">{{ i18n.translate('commandPalette.recent') }}</div>
            <div tabindex="0" role="button" (keyup.enter)="executeCommand(cmd)"
              *ngFor="let cmd of recentCommands; let i = index"
              class="command-item"
              [class.selected]="i === selectedIndex"
              [id]="'cmd-' + i"
              (click)="executeCommand(cmd)"
              role="option"
              [attr.aria-selected]="i === selectedIndex"
            >
              <i class="pi" [ngClass]="cmd.command.icon + ' command-icon'"></i>
              <span class="command-label">{{ i18n.localize(cmd.command.label, cmd.command.labelAr) }}</span>
              <kbd *ngIf="cmd.command.shortcut" class="shortcut-badge">{{ cmd.command.shortcut }}</kbd>
            </div>
          </div>

          <div tabindex="0" role="button" (keyup.enter)="executeCommand(suggestion)"
            *ngFor="let suggestion of suggestions; let i = index"
            class="command-item"
            [class.selected]="i === selectedIndex"
            [id]="'cmd-' + i"
            (click)="executeCommand(suggestion)"
            role="option"
            [attr.aria-selected]="i === selectedIndex"
          >
            <i class="pi" [ngClass]="suggestion.command.icon + ' command-icon'"></i>
            <span class="command-label">{{ i18n.localize(suggestion.command.label, suggestion.command.labelAr) }}</span>
            <span class="command-category">{{ suggestion.command.category }}</span>
            <kbd *ngIf="suggestion.command.shortcut" class="shortcut-badge">{{ suggestion.command.shortcut }}</kbd>
          </div>
        </div>

        <div class="footer">
          <span><kbd>↑↓</kbd> {{ i18n.translate('commandPalette.navigate') }}</span>
          <span><kbd>↵</kbd> {{ i18n.translate('commandPalette.execute') }}</span>
          <span><kbd>ESC</kbd> {{ i18n.translate('commandPalette.close') }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .command-palette-overlay {
      position: fixed; inset: 0; z-index: var(--z-splash);
      background: rgba(var(--color-black-rgb), 0.5); display: flex;
      justify-content: center; padding-top: 15vh;
    }
    .command-palette {
      width: 600px; max-height: 450px; background: var(--surface-card, #fff);
      border-radius: var(--radius-lg); box-shadow: 0 20px 60px rgba(var(--color-black-rgb), 0.3);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .search-container {
      display: flex; align-items: center; padding: 12px 16px;
      border-bottom: 1px solid var(--surface-border, #e0e0e0);
    }
    .search-icon { color: var(--text-color-secondary, #888); margin-inline-end: 10px; font-size: var(--font-size-body-md); }
    .search-input {
      flex: 1; border: none; outline: none; font-size: var(--font-size-md);
      background: transparent; color: var(--text-color, #333);
    }
    .results-container { flex: 1; overflow-y: auto; padding: 8px 0; }
    .section-label {
      padding: 6px 16px; font-size: var(--font-size-sm); text-transform: uppercase;
      color: var(--text-color-secondary, #888); font-weight: 600;
    }
    .command-item {
      display: flex; align-items: center; padding: 10px 16px; cursor: pointer;
      transition: background 0.15s;
    }
    .command-item:hover, .command-item.selected {
      background: var(--highlight-bg, #f0f4ff);
    }
    .command-icon { width: 24px; color: var(--primary-color, #4f46e5); margin-inline-end: 12px; }
    .command-label { flex: 1; font-size: var(--font-size-body-sm); }
    .command-category {
      font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs);
      background: var(--surface-ground, #f5f5f5); color: var(--text-color-secondary, #888);
      margin-inline-end: 8px;
    }
    .shortcut-badge {
      font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-xs);
      background: var(--surface-ground, #f5f5f5); border: 1px solid var(--surface-border, #ddd);
      font-family: monospace;
    }
    .no-results { padding: 20px; text-align: center; color: var(--text-color-secondary, #888); }
    .footer {
      display: flex; gap: 16px; padding: 8px 16px;
      border-top: 1px solid var(--surface-border, #e0e0e0);
      font-size: var(--font-size-sm); color: var(--text-color-secondary, #888);
    }
    .footer kbd { margin-inline-end: 4px; }
  `]
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isOpen = false;
  query = '';
  suggestions: CommandSuggestion[] = [];
  recentCommands: CommandSuggestion[] = [];
  selectedIndex = 0;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private apiBase = '/api';
  i18n = inject(I18nService);

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(150),
      takeUntil(this.destroy$)
    ).subscribe(q => this.search(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.toggle();
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.query = '';
      this.suggestions = [];
      this.selectedIndex = 0;
      this.loadRecent();
      setTimeout(() => this.searchInput?.nativeElement?.focus(), TIMING.FOCUS_DELAY);
    }
  }

  close(): void {
    this.isOpen = false;
    this.query = '';
    this.suggestions = [];
  }

  onQueryChange(q: string): void {
    this.selectedIndex = 0;
    this.searchSubject.next(q);
  }

  onKeyDown(event: KeyboardEvent): void {
    const items = this.suggestions.length > 0 ? this.suggestions : this.recentCommands;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (items[this.selectedIndex]) {
          this.executeCommand(items[this.selectedIndex]);
        }
        break;
      case 'Escape':
        this.close();
        break;
    }
  }

  executeCommand(suggestion: CommandSuggestion): void {
    const cmd = suggestion.command;
    // Record usage
    this.http.post(`${this.apiBase}/commands/${cmd.id}/usage`, {}).subscribe();

    if (cmd.action === 'navigate' && cmd.url) {
      this.router.navigateByUrl(cmd.url);
    } else if (cmd.action === 'create' && cmd.url) {
      this.router.navigateByUrl(cmd.url);
    } else if (cmd.action === 'search' && cmd.url) {
      this.router.navigateByUrl(cmd.url);
    }

    this.close();
  }

  private search(q: string): void {
    if (!q || q.trim().length === 0) {
      this.suggestions = [];
      return;
    }
    const lang = this.i18n.currentLang();
    this.http.get<{ data: CommandSuggestion[] }>(
      `${this.apiBase}/commands/search?q=${encodeURIComponent(q)}&lang=${lang}`
    ).subscribe({
      next: res => { this.suggestions = res.data || []; },
      error: () => { this.suggestions = []; }
    });
  }

  private loadRecent(): void {
    this.http.get<{ data: CommandSuggestion['command'][] }>(`${this.apiBase}/commands/recent?limit=5`).subscribe({
      next: res => {
        this.recentCommands = (res.data || []).map((cmd: CommandSuggestion['command']) => ({
          command: cmd, score: 0, reason: 'recent',
        }));
      },
      error: () => { this.recentCommands = []; }
    });
  }

}
