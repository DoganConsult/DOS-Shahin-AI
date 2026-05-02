import {
  ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommandPaletteRegistry, CommandPaletteEntry } from '../../services/platform/command-palette.registry';

@Component({
  selector: 'app-dynamic-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="cp-backdrop" (click)="close()">
        <div class="cp-panel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <input #q class="cp-input"
                 [ngModel]="query()" (ngModelChange)="query.set($event)"
                 [attr.aria-label]="'Command palette search'"
                 placeholder="Search commands, pages, modules…"
                 autofocus />
          <ul class="cp-list" role="listbox">
            @for (e of results(); track e.id) {
              <li class="cp-item" role="option"
                  [attr.data-kind]="e.kind"
                  (click)="run(e)">
                <span class="cp-kind">{{ e.kind }}</span>
                <span class="cp-label">{{ e.label }}</span>
                @if (e.hint) { <span class="cp-hint">{{ e.hint }}</span> }
                @if (e.route) { <span class="cp-route">{{ e.route }}</span> }
              </li>
            } @empty {
              <li class="cp-empty">No matches.</li>
            }
          </ul>
          <div class="cp-foot">
            <span><kbd>Esc</kbd> close</span>
            <span><kbd>↵</kbd> open</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cp-backdrop {
      position: fixed; inset: 0; z-index: var(--z-modal, 1000);
      background: var(--shell-overlay); display: flex; align-items: flex-start;
      justify-content: center; padding-top: var(--cds-layout-04);
    }
    .cp-panel {
      width: min(640px, 92vw); background: var(--shell-card-bg);
      color: var(--shell-text-primary); border-radius: var(--radius-lg);
      box-shadow: var(--shell-elevation-02); overflow: hidden;
      display: flex; flex-direction: column;
    }
    .cp-input {
      border: 0; outline: 0; padding: var(--cds-spacing-04) var(--cds-spacing-05); font-size: var(--cds-body-02-size);
      width: 100%; background: transparent; color: inherit;
      border-bottom: 1px solid var(--shell-card-border);
    }
    .cp-list { list-style: none; margin: 0; padding: var(--cds-spacing-02) 0; max-height: 50vh; overflow-y: auto; }
    .cp-item {
      display: grid; grid-template-columns: 90px 1fr auto; gap: var(--cds-spacing-04);
      align-items: center; padding: var(--cds-spacing-03) var(--cds-spacing-05); cursor: pointer; font-size: var(--cds-body-01-size);
    }
    .cp-item:hover { background: var(--cds-layer-01); }
    .cp-kind {
      font-size: var(--font-size-2xs); text-transform: uppercase; letter-spacing: var(--letter-spacing-wide);
      color: var(--shell-text-secondary);
      padding: var(--cds-spacing-01) var(--cds-spacing-02); border: 1px solid var(--shell-card-border); border-radius: var(--radius-sm);
      text-align: center;
    }
    .cp-label { font-weight: 500; }
    .cp-hint { color: var(--shell-text-secondary); font-size: var(--font-size-sm); }
    .cp-route { color: var(--shell-text-secondary); font-size: var(--font-size-xs); font-family: monospace; }
    .cp-empty { padding: var(--cds-spacing-04) var(--cds-spacing-05); color: var(--shell-text-secondary); font-size: var(--font-size-sm); }
    .cp-foot {
      display: flex; gap: var(--cds-spacing-05); padding: var(--cds-spacing-03) var(--cds-spacing-05);
      border-top: 1px solid var(--shell-card-border);
      font-size: var(--font-size-xs); color: var(--shell-text-secondary);
    }
    .cp-foot kbd {
      font-family: monospace; padding: var(--cds-spacing-01) var(--cds-spacing-02); border: 1px solid var(--shell-card-border);
      border-bottom-width: 2px; border-radius: var(--radius-sm); background: var(--cds-layer-01);
    }
  `],
})
export class DynamicCommandPaletteComponent implements OnInit {
  private registry = inject(CommandPaletteRegistry);
  private router = inject(Router);

  readonly open = signal(false);
  readonly query = signal('');
  readonly results = computed<CommandPaletteEntry[]>(() => this.registry.search(this.query()));

  ngOnInit(): void {}

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    const isMeta = ev.ctrlKey || ev.metaKey;
    if (isMeta && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      this.open.update(v => !v);
      this.query.set('');
      return;
    }
    if (this.open() && ev.key === 'Escape') {
      ev.preventDefault();
      this.close();
    }
    if (this.open() && ev.key === 'Enter') {
      const first = this.results()[0];
      if (first) { ev.preventDefault(); this.run(first); }
    }
  }

  close(): void { this.open.set(false); }

  run(entry: CommandPaletteEntry): void {
    this.close();
    if (entry.route) { void this.router.navigateByUrl(entry.route); }
  }
}
