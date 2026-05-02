import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { NotificationApiService, NotificationTemplateDto } from '../services/notification-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notification-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .templates-container { max-width: 960px; }
    .template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .template-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 18px; cursor: pointer; transition: box-shadow .15s; }
    .template-card:hover { box-shadow: 0 2px 8px rgba(var(--color-black-rgb), 0.06); }
    .template-card.editing { border-color: var(--primary-500); box-shadow: 0 0 0 2px var(--primary-100); }
    .template-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .template-name { font-size: 0.9375rem; font-weight: 600; margin: 0; }
    .template-code { font-size: var(--font-size-2xs); color: var(--text-color-secondary); font-family: monospace; }
    .template-module { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); background: var(--surface-100); font-size: var(--font-size-2xs); color: var(--text-color-secondary); }
    .template-event { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 6px; }
    .template-channels { display: flex; gap: 6px; margin-top: 8px; }
    .channel-badge { padding: 2px 8px; border-radius: var(--radius); font-size: var(--font-size-2xs); background: var(--blue-50, #eff6ff); color: var(--blue-700); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.active { background: var(--green-500); }
    .status-dot.inactive { background: var(--surface-300); }
    .edit-form { margin-top: 14px; border-top: 1px solid var(--surface-border); padding-top: 14px; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-xs-plus); resize: vertical; box-sizing: border-box; }
    .form-group textarea { min-height: 100px; font-family: monospace; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-sm { padding: 6px 14px; border-radius: var(--radius); border: 1px solid var(--surface-border); background: var(--surface-card); font-size: var(--font-size-xs-plus); cursor: pointer; }
    .btn-primary { background: var(--primary-500); color: #fff; border-color: var(--primary-500); }
    .search-bar { margin-bottom: 16px; }
    .search-input { width: 100%; max-width: 400px; padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); }
  `],
  template: `
    <div class="templates-container" [dir]="i18n.direction()">
      <div class="search-bar">
        <input class="search-input"
          [placeholder]="i18n.translate('notification.searchTemplates')"
          [ngModel]="searchTerm()"
          (ngModelChange)="searchTerm.set($event)">
      </div>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else {
        <div class="template-grid">
          @for (t of filteredTemplates(); track t.id) {
            <div class="template-card" [class.editing]="editingId() === t.id" (click)="startEdit(t)">
              <div class="template-header">
                <div>
                  <p class="template-name">{{ t.name }}</p>
                  <span class="template-code">{{ t.code }}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="template-module">{{ t.module }}</span>
                  <div class="status-dot" [class.active]="t.isActive" [class.inactive]="!t.isActive"></div>
                </div>
              </div>
              <div class="template-event">{{ t.eventType }}</div>
              <div class="template-channels">
                @for (ch of t.channels; track ch) {
                  <span class="channel-badge">{{ ch }}</span>
                }
              </div>

              @if (editingId() === t.id) {
                <div class="edit-form" (click)="$event.stopPropagation()">
                  <div class="form-group">
                    <label>{{ i18n.translate('notification.subject') }}</label>
                    <input [ngModel]="editSubject()" (ngModelChange)="editSubject.set($event)">
                  </div>
                  <div class="form-group">
                    <label>{{ i18n.translate('notification.bodyHtml') }}</label>
                    <textarea [ngModel]="editBody()" (ngModelChange)="editBody.set($event)"></textarea>
                  </div>
                  <div class="form-actions">
                    <button class="btn-sm" (click)="cancelEdit($event)">{{ i18n.translate('common.cancel') }}</button>
                    <button class="btn-sm btn-primary" (click)="saveTemplate($event)" [disabled]="savingTemplate()">
                      {{ i18n.translate('common.save') }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationTemplatesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(NotificationApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  templates = signal<NotificationTemplateDto[]>([]);
  searchTerm = signal('');
  editingId = signal<string | null>(null);
  editSubject = signal('');
  editBody = signal('');
  savingTemplate = signal(false);

  filteredTemplates = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.templates();
    return this.templates().filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.code.toLowerCase().includes(term) ||
      t.module.toLowerCase().includes(term) ||
      t.eventType.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.api.getTemplates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ts => { this.templates.set(ts); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startEdit(t: NotificationTemplateDto): void {
    if (this.editingId() === t.id) return;
    this.editingId.set(t.id);
    this.editSubject.set(t.subject);
    this.editBody.set(t.bodyHtml);
  }

  cancelEdit(event: Event): void {
    event.stopPropagation();
    this.editingId.set(null);
  }

  saveTemplate(event: Event): void {
    event.stopPropagation();
    const id = this.editingId();
    if (!id) return;
    this.savingTemplate.set(true);
    this.api.updateTemplate(id, { subject: this.editSubject(), bodyHtml: this.editBody() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.templates.update(list => list.map(t => t.id === id ? { ...t, ...updated } : t));
          this.editingId.set(null);
          this.savingTemplate.set(false);
        },
        error: () => this.savingTemplate.set(false),
      });
  }
}
