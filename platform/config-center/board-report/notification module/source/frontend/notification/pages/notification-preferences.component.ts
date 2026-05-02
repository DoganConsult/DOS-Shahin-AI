import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { NotificationApiService, NotificationPreferencesDto } from '../services/notification-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .prefs-container { max-width: 640px; }
    .pref-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 20px; margin-bottom: 16px; }
    .pref-card h3 { margin: 0 0 14px; font-size: var(--font-size-md); font-weight: 600; }
    .pref-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--surface-50, #f9fafb); }
    .pref-row:last-child { border-bottom: none; }
    .pref-label { font-size: var(--font-size-base); color: var(--text-color); }
    .pref-desc { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 2px; }
    .toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; border-radius: var(--radius-lg); background: var(--surface-300, #d1d5db); transition: background .2s; }
    .toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #fff; top: 3px; left: 3px; transition: transform .2s; }
    .toggle input:checked + .toggle-slider { background: var(--primary-500, #3b82f6); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }
    .digest-select { padding: 6px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); background: var(--surface-card); font-size: var(--font-size-xs-plus); }
    .module-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .module-chip { padding: 4px 12px; border-radius: var(--radius-xl); border: 1px solid var(--surface-border); font-size: var(--font-size-sm); cursor: pointer; transition: all .15s; }
    .module-chip.muted { background: var(--red-50, #fef2f2); border-color: var(--red-200); color: var(--red-700); }
    .module-chip.active { background: var(--green-50, #f0fdf4); border-color: var(--green-200); color: var(--green-700); }
    .save-bar { display: flex; justify-content: flex-end; margin-top: 20px; }
    .btn-save { padding: 8px 24px; border-radius: var(--radius); background: var(--primary-500); color: #fff; border: none; font-size: var(--font-size-base); font-weight: 500; cursor: pointer; }
    .btn-save:hover { background: var(--primary-600); }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .success-msg { color: var(--green-600); font-size: var(--font-size-xs-plus); margin-inline-end: 12px; }
  `],
  template: `
    <div class="prefs-container" [dir]="i18n.direction()">
      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else {
        <div class="pref-card">
          <h3>{{ i18n.translate('notification.channelSettings') }}</h3>
          <div class="pref-row">
            <div>
              <div class="pref-label">{{ i18n.translate('notification.emailNotifications') }}</div>
              <div class="pref-desc">{{ i18n.translate('notification.emailDesc') }}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" [ngModel]="prefs().emailEnabled" (ngModelChange)="updateField('emailEnabled', $event)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="pref-row">
            <div>
              <div class="pref-label">{{ i18n.translate('notification.pushNotifications') }}</div>
              <div class="pref-desc">{{ i18n.translate('notification.pushDesc') }}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" [ngModel]="prefs().pushEnabled" (ngModelChange)="updateField('pushEnabled', $event)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="pref-card">
          <h3>{{ i18n.translate('notification.digestSettings') }}</h3>
          <div class="pref-row">
            <div class="pref-label">{{ i18n.translate('notification.digestFrequency') }}</div>
            <select class="digest-select" [ngModel]="prefs().digestFrequency" (ngModelChange)="updateField('digestFrequency', $event)">
              <option value="immediate">{{ i18n.translate('notification.immediate') }}</option>
              <option value="daily">{{ i18n.translate('notification.daily') }}</option>
              <option value="weekly">{{ i18n.translate('notification.weekly') }}</option>
              <option value="none">{{ i18n.translate('notification.none') }}</option>
            </select>
          </div>
        </div>

        <div class="pref-card">
          <h3>{{ i18n.translate('notification.moduleFilters') }}</h3>
          <p class="pref-desc">{{ i18n.translate('notification.moduleFiltersDesc') }}</p>
          <div class="module-chips">
            @for (mod of allModules; track mod) {
              <span class="module-chip" [class.muted]="isMuted(mod)" [class.active]="!isMuted(mod)" (click)="toggleModule(mod)">
                {{ mod }}
              </span>
            }
          </div>
        </div>

        <div class="save-bar">
          @if (saved()) { <span class="success-msg">✓ {{ i18n.translate('common.saved') }}</span> }
          <button class="btn-save" [disabled]="saving()" (click)="save()">
            {{ saving() ? i18n.translate('common.saving') : i18n.translate('common.save') }}
          </button>
        </div>
      }
    </div>
  `,
})
export class NotificationPreferencesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(NotificationApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  prefs = signal<NotificationPreferencesDto>({
    emailEnabled: true,
    pushEnabled: false,
    digestFrequency: 'immediate',
    mutedModules: [],
    mutedTypes: [],
  });

  allModules = ['compliance', 'risk', 'audit', 'governance', 'evidence', 'vendor', 'ai', 'workflow', 'foundation'];

  ngOnInit(): void {
    this.api.getPreferences().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => { this.prefs.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  updateField(field: keyof NotificationPreferencesDto, value: boolean | string): void {
    this.prefs.update(p => ({ ...p, [field]: value }));
    this.saved.set(false);
  }

  isMuted(mod: string): boolean {
    return this.prefs().mutedModules.includes(mod);
  }

  toggleModule(mod: string): void {
    this.prefs.update(p => ({
      ...p,
      mutedModules: p.mutedModules.includes(mod)
        ? p.mutedModules.filter(m => m !== mod)
        : [...p.mutedModules, mod],
    }));
    this.saved.set(false);
  }

  save(): void {
    this.saving.set(true);
    this.api.updatePreferences(this.prefs()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => { this.prefs.set(p); this.saving.set(false); this.saved.set(true); },
      error: () => this.saving.set(false),
    });
  }
}
