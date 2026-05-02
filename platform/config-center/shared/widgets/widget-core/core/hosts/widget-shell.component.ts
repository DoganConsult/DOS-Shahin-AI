import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetLoadState } from '../models/widget-data.model';

@Component({
  selector: 'app-widget-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget-shell" [class.widget-shell--error]="state === 'error'">
      <div class="widget-shell__header" *ngIf="title">
        <span class="widget-shell__icon" *ngIf="icon">{{ icon }}</span>
        <h3 class="widget-shell__title">{{ title }}</h3>
        <span class="widget-shell__subtitle" *ngIf="subtitle">{{ subtitle }}</span>
        <button
          *ngIf="canRefresh"
          class="widget-shell__refresh"
          (click)="refresh.emit()"
          aria-label="Refresh widget">
          ↻
        </button>
      </div>

      <div class="widget-shell__body">
        @switch (state) {
          @case ('loading') {
            <div class="widget-shell__loading">
              <div class="animate-pulse bg-surface-200 dark:bg-surface-700 rounded h-24 w-full"></div>
            </div>
          }
          @case ('error') {
            <div class="widget-shell__error">
              <p>Unable to load data</p>
              <button *ngIf="canRefresh" (click)="refresh.emit()">Retry</button>
            </div>
          }
          @case ('empty') {
            <div class="widget-shell__empty">
              <p>No data available</p>
            </div>
          }
          @default {
            <ng-content></ng-content>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .widget-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .widget-shell__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      font-size: var(--font-size-base);
    }
    .widget-shell__title {
      font-weight: 600;
      flex: 1;
      margin: 0;
      font-size: inherit;
    }
    .widget-shell__subtitle {
      opacity: 0.6;
      font-size: var(--font-size-sm);
    }
    .widget-shell__refresh {
      background: none;
      border: none;
      cursor: pointer;
      font-size: var(--font-size-md);
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .widget-shell__refresh:hover { opacity: 1; }
    .widget-shell__body {
      flex: 1;
      padding: 0.5rem 1rem 1rem;
      overflow: auto;
    }
    .widget-shell__loading,
    .widget-shell__error,
    .widget-shell__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 80px;
    }
    .widget-shell__error { color: var(--red-500, #ef4444); }
    .widget-shell__empty { opacity: 0.5; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetShellComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() state: WidgetLoadState = 'ok';
  @Input() canRefresh = true;

  @Output() readonly refresh = new EventEmitter<void>();
}
