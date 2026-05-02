import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject,
  HostListener, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Router } from '@angular/router';

export interface CommandResult {
  id: string;
  type: 'module' | 'record' | 'action' | 'ai-command';
  title: string;
  titleAr?: string;
  icon: string;
  route?: string;
  moduleCode?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-global-command-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  template: `
    <div class="global-command-overlay" *ngIf="open()" (click)="close()">
      <div class="global-command-bar" (click)="$event.stopPropagation()">
        <div class="gcb-input-row">
          <i class="pi pi-search gcb-icon"></i>
          <input class="gcb-input" [placeholder]="isAr ? 'اكتب أمراً أو ابحث...' : 'Type a command or search...'"
                 [(ngModel)]="query" (ngModelChange)="onQueryChange($event)"
                 (keydown.escape)="close()" (keydown.enter)="executeFirst()" #cmdInput />
          <kbd class="gcb-kbd">ESC</kbd>
        </div>
        <div class="gcb-results" *ngIf="results().length > 0">
          <div *ngFor="let r of results(); let i = index; trackBy: trackById"
               class="gcb-result" [class.gcb-result--active]="activeIndex() === i"
               (click)="execute(r)" (mouseenter)="activeIndex.set(i)">
            <i [class]="'pi ' + r.icon + ' gcb-result-icon'"></i>
            <div class="gcb-result-body">
              <span class="gcb-result-title">{{ isAr && r.titleAr ? r.titleAr : r.title }}</span>
              <span class="gcb-result-type">{{ r.type }}</span>
            </div>
          </div>
        </div>
        <div class="gcb-footer">
          <span class="gcb-hint">{{ isAr ? 'اضغط ↵ للتنفيذ · ↑↓ للتنقل' : 'Press ↵ to execute · ↑↓ to navigate' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .global-command-overlay { position: fixed; inset: 0; z-index: var(--z-splash); background: rgba(var(--color-black-rgb), 0.5); display: flex; justify-content: center; padding-top: 15vh; backdrop-filter: blur(4px); }
    .global-command-bar { width: 580px; max-height: 400px; background: var(--surface-card, #fff); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg, 0 25px 50px rgba(var(--color-black-rgb), 0.25)); display: flex; flex-direction: column; overflow: hidden; }
    .gcb-input-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--surface-border, #e5e7eb); }
    .gcb-icon { font-size: var(--font-size-xl); color: var(--text-muted); margin-inline-end: 12px; }
    .gcb-input { flex: 1; border: none; outline: none; font-size: var(--font-size-md); background: transparent; color: var(--text-body); }
    .gcb-kbd { font-size: 0.625rem; padding: 2px 6px; border: 1px solid var(--surface-border, #e5e7eb); border-radius: var(--radius-xs); color: var(--text-muted); }
    .gcb-results { flex: 1; overflow-y: auto; }
    .gcb-result { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; transition: background 0.1s; }
    .gcb-result:hover, .gcb-result--active { background: var(--surface-hover, #f5f5f5); }
    .gcb-result-icon { font-size: var(--font-size-md); color: var(--primary-color, #0f62fe); width: 24px; text-align: center; }
    .gcb-result-body { display: flex; flex-direction: column; }
    .gcb-result-title { font-size: var(--font-size-base); font-weight: 600; }
    .gcb-result-type { font-size: var(--font-size-2xs); color: var(--text-muted); text-transform: uppercase; }
    .gcb-footer { padding: 8px 16px; border-top: 1px solid var(--surface-border, #e5e7eb); }
    .gcb-hint { font-size: var(--font-size-2xs); color: var(--text-muted); }
  `],
})
export class GlobalCommandBarComponent {
  private i18n = inject(I18nService);
  private router = inject(Router);

  @Input() commandSources: CommandResult[] = [];
  @Output() commandExecuted = new EventEmitter<CommandResult>();

  readonly open = signal(false);
  readonly results = signal<CommandResult[]>([]);
  readonly activeIndex = signal(0);
  query = '';

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.open.set(!this.open());
      this.query = '';
      this.results.set([]);
    }
    if (this.open()) {
      if (e.key === 'ArrowDown') { this.activeIndex.update(i => Math.min(i + 1, this.results().length - 1)); e.preventDefault(); }
      if (e.key === 'ArrowUp') { this.activeIndex.update(i => Math.max(i - 1, 0)); e.preventDefault(); }
    }
  }

  onQueryChange(q: string): void {
    if (!q.trim()) { this.results.set([]); return; }
    const lower = q.toLowerCase();
    this.results.set(
      this.commandSources.filter(c =>
        c.title.toLowerCase().includes(lower) || (c.titleAr?.includes(q)) || c.type.includes(lower)
      ).slice(0, 10)
    );
    this.activeIndex.set(0);
  }

  executeFirst(): void {
    const r = this.results();
    if (r.length > 0) this.execute(r[this.activeIndex()]);
  }

  execute(cmd: CommandResult): void {
    this.commandExecuted.emit(cmd);
    if (cmd.route) this.router.navigateByUrl(cmd.route);
    this.close();
  }

  close(): void {
    this.open.set(false);
    this.query = '';
    this.results.set([]);
  }

  trackById(_: number, item: CommandResult): string { return item.id; }
}
