import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface ConfigEntry { key: string; value: unknown; section: string; }

@Component({
  selector: 'app-foundation-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .section-title { font-size: var(--font-size-md); font-weight: 600; margin: 24px 0 12px; color: var(--text-color); }
    .section-title:first-of-type { margin-top: 0; }
    .config-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 16px; }
    .config-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface-border); }
    .config-row:last-child { border-bottom: none; }
    .config-key { font-size: var(--font-size-sm); font-weight: 500; font-family: monospace; color: var(--text-color); }
    .config-value { font-size: var(--font-size-sm); color: var(--text-color-secondary); max-width: 50%; text-align: end; word-break: break-all; }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .info-bar { background: var(--blue-50); color: var(--blue-700); padding: 10px 16px; border-radius: var(--radius-sm); font-size: var(--font-size-xs); margin-bottom: 16px; }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/settings'" [titleKey]="'foundation.nav.settings'">
    <div class="page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.tr('nav.foundationSettings', 'Foundation Settings') }}</h2>
      <div class="info-bar">Settings are read-only. Contact a platform administrator to modify tenant configuration.</div>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      @if (loading()) { <div class="empty-state">Loading configuration…</div> }
      @else if (sections().length === 0) { <div class="empty-state">No configuration data available.</div> }
      @else {
        @for (s of sections(); track s) {
          <h3 class="section-title">{{ s }}</h3>
          <div class="config-card">
            @for (entry of entriesBySection(s); track entry.key) {
              <div class="config-row">
                <span class="config-key">{{ entry.key }}</span>
                <span class="config-value">{{ formatValue(entry.value) }}</span>
              </div>
            }
          </div>
        }
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationSettingsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  loading = signal(true); error = signal<string | null>(null);
  entries = signal<ConfigEntry[]>([]); sections = signal<string[]>([]);

  ngOnInit(): void {
    this.api.getTenantConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        const config = res?.data ?? res ?? {};
        const entries: ConfigEntry[] = [];
        for (const [k, v] of Object.entries(config)) {
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
              entries.push({ key: sk, value: sv, section: k });
            }
          } else {
            entries.push({ key: k, value: v, section: 'General' });
          }
        }
        this.entries.set(entries);
        this.sections.set([...new Set(entries.map(e => e.section))]);
        this.loading.set(false);
      },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }
  entriesBySection(s: string): ConfigEntry[] { return this.entries().filter(e => e.section === s); }
  formatValue(v: unknown): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.join(', ') || '(empty)';
    return String(v);
  }
}
