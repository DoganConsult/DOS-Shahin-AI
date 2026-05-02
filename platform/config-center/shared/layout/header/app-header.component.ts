import { Component, input, inject, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../../core/infrastructure/theme/theme.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-app-header',
    imports: [RouterLink],
    template: `
    <header class="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-0)_92%,black)] backdrop-blur">
      <div class="mx-auto max-w-[1400px] px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
        <div class="flex items-center gap-3">
          @if (backLink(); as bl) {
            <a [routerLink]="bl.routerLink" class="text-[var(--primary)] text-sm hover:underline">{{ bl.label }}</a>
            @if (title() || subtitle()) {
              <div class="w-px h-5 bg-[var(--border)]" aria-hidden="true"></div>
            }
          }
          @if (title()) {
            <div class="text-lg font-semibold tracking-tight">{{ title() }}</div>
          }
          @if (subtitle()) {
            <span class="text-xs text-[var(--text-1)]">{{ subtitle() }}</span>
          }
          <ng-content select="[headerLeft]" />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <ng-content />
          @if (showThemeSwitcher()) {
            <button
              type="button"
              (click)="theme.cycleTheme()"
              class="px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-sm"
              [title]="'Theme: ' + theme.currentLabel() + ' (click to cycle)'"
            >
              {{ theme.currentLabel() }}
            </button>
          }
        </div>
      </div>
    </header>
  `
})
export class AppHeaderComponent {
  readonly theme = inject(ThemeService);
  readonly title = input<string | undefined>(undefined);
  readonly subtitle = input<string | undefined>(undefined);
  readonly backLink = input<{ routerLink: string; label: string } | undefined>(undefined);
  readonly showThemeSwitcher = input<boolean>(true);
}
