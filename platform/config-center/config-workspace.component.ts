import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ConfigCenterService } from './config-center.service';
import { ThemeService, type ThemeName, type UiDensity } from '@app/infrastructure/theme/theme.service';

interface WorkspaceField {
  key: string;
  label: string;
  labelAr: string;
  type: 'select' | 'text' | 'number' | 'toggle' | 'color';
  options?: { label: string; value: string }[];
  value: unknown;
  dirty: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-workspace',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    ButtonModule, InputTextModule, DropdownModule, InputSwitchModule,
    InputNumberModule, ColorPickerModule, DividerModule, ToastModule, TagModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="pi pi-palette"
      [title]="'Workspace Configuration'"
      [subtitle]="'Control the platform UI experience — theme, layout, shell defaults, and branding'"
      [breadcrumbs]="['Admin', 'Config Center', 'Workspace']"
      [loading]="loading()">

      <div headerActions class="flex gap-2 align-items-center">
        <p-button icon="pi pi-save" label="Save All Changes" (onClick)="saveAll()"
                  [disabled]="!hasDirty() || saving()" styleClass="p-button-sm" />
        <p-button icon="pi pi-refresh" label="Reload" (onClick)="loadConfig()"
                  [disabled]="loading()" styleClass="p-button-outlined p-button-sm" />
        <p-button icon="pi pi-eye" label="Preview" (onClick)="previewChanges()"
                  [disabled]="!hasDirty()" styleClass="p-button-outlined p-button-info p-button-sm" />
      </div>

      <div class="grid">
        <!-- Appearance Section -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-4 border-round shadow-1 mb-3">
            <div class="flex align-items-center gap-2 mb-3">
              <i class="pi pi-palette text-primary text-xl"></i>
              <span class="text-lg font-semibold">Appearance</span>
            </div>
            @for (field of appearanceFields(); track field.key) {
              <div class="field mb-3">
                <label class="block text-sm font-medium mb-1">
                  {{ i18n.dir() === 'rtl' ? field.labelAr : field.label }}
                  @if (field.dirty) { <p-tag value="Modified" severity="warning" styleClass="text-xs" style="margin-inline-start:0.5rem" /> }
                </label>
                @switch (field.type) {
                  @case ('select') {
                    <p-dropdown [options]="field.options!" [(ngModel)]="field.value" (onChange)="markDirty(field)"
                                styleClass="w-full p-inputtext-sm" />
                  }
                  @case ('text') {
                    <input pInputText [(ngModel)]="field.value" (input)="markDirty(field)" class="w-full p-inputtext-sm" />
                  }
                  @case ('color') {
                    <div class="flex align-items-center gap-2">
                      <p-colorPicker [(ngModel)]="field.value" (onChange)="markDirty(field)" />
                      <input pInputText [(ngModel)]="field.value" (input)="markDirty(field)" class="p-inputtext-sm" style="width:120px" />
                    </div>
                  }
                  @case ('toggle') {
                    <p-inputSwitch [(ngModel)]="field.value" (onChange)="markDirty(field)" />
                  }
                }
              </div>
            }
          </div>
        </div>

        <!-- Layout Section -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-4 border-round shadow-1 mb-3">
            <div class="flex align-items-center gap-2 mb-3">
              <i class="pi pi-objects-column text-primary text-xl"></i>
              <span class="text-lg font-semibold">Layout &amp; Shell</span>
            </div>
            @for (field of layoutFields(); track field.key) {
              <div class="field mb-3">
                <label class="block text-sm font-medium mb-1">
                  {{ i18n.dir() === 'rtl' ? field.labelAr : field.label }}
                  @if (field.dirty) { <p-tag value="Modified" severity="warning" styleClass="text-xs" style="margin-inline-start:0.5rem" /> }
                </label>
                @switch (field.type) {
                  @case ('select') {
                    <p-dropdown [options]="field.options!" [(ngModel)]="field.value" (onChange)="markDirty(field)"
                                styleClass="w-full p-inputtext-sm" />
                  }
                  @case ('text') {
                    <input pInputText [(ngModel)]="field.value" (input)="markDirty(field)" class="w-full p-inputtext-sm" />
                  }
                  @case ('number') {
                    <p-inputNumber [(ngModel)]="field.value" (onInput)="markDirty(field)" styleClass="p-inputtext-sm" />
                  }
                  @case ('toggle') {
                    <p-inputSwitch [(ngModel)]="field.value" (onChange)="markDirty(field)" />
                  }
                }
              </div>
            }
          </div>
        </div>

        <!-- Branding Section -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-4 border-round shadow-1 mb-3">
            <div class="flex align-items-center gap-2 mb-3">
              <i class="pi pi-image text-primary text-xl"></i>
              <span class="text-lg font-semibold">Branding</span>
            </div>
            @for (field of brandingFields(); track field.key) {
              <div class="field mb-3">
                <label class="block text-sm font-medium mb-1">
                  {{ i18n.dir() === 'rtl' ? field.labelAr : field.label }}
                  @if (field.dirty) { <p-tag value="Modified" severity="warning" styleClass="text-xs" style="margin-inline-start:0.5rem" /> }
                </label>
                <input pInputText [(ngModel)]="field.value" (input)="markDirty(field)" class="w-full p-inputtext-sm" />
              </div>
            }
          </div>
        </div>

        <!-- Regional Section -->
        <div class="col-12 md:col-6">
          <div class="surface-card p-4 border-round shadow-1 mb-3">
            <div class="flex align-items-center gap-2 mb-3">
              <i class="pi pi-globe text-primary text-xl"></i>
              <span class="text-lg font-semibold">Regional &amp; Behavior</span>
            </div>
            @for (field of regionalFields(); track field.key) {
              <div class="field mb-3">
                <label class="block text-sm font-medium mb-1">
                  {{ i18n.dir() === 'rtl' ? field.labelAr : field.label }}
                  @if (field.dirty) { <p-tag value="Modified" severity="warning" styleClass="text-xs" style="margin-inline-start:0.5rem" /> }
                </label>
                @switch (field.type) {
                  @case ('select') {
                    <p-dropdown [options]="field.options!" [(ngModel)]="field.value" (onChange)="markDirty(field)"
                                styleClass="w-full p-inputtext-sm" />
                  }
                  @case ('text') {
                    <input pInputText [(ngModel)]="field.value" (input)="markDirty(field)" class="w-full p-inputtext-sm" />
                  }
                  @case ('number') {
                    <p-inputNumber [(ngModel)]="field.value" (onInput)="markDirty(field)" styleClass="p-inputtext-sm" />
                  }
                  @case ('toggle') {
                    <p-inputSwitch [(ngModel)]="field.value" (onChange)="markDirty(field)" />
                  }
                }
              </div>
            }
          </div>
        </div>
      </div>
    </app-page-shell>
  `,
})
export class ConfigWorkspaceComponent implements OnInit {
  i18n = inject(I18nService);
  private configService = inject(ConfigCenterService);
  private themeService = inject(ThemeService);
  private msg = inject(MessageService);

  loading = signal(false);
  saving = signal(false);

  appearanceFields = signal<WorkspaceField[]>([
    { key: 'WORKSPACE_THEME', label: 'Theme', labelAr: 'السمة', type: 'select', options: [
      { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'System', value: 'system' },
    ], value: 'system', dirty: false },
    { key: 'WORKSPACE_ACCENT_COLOR', label: 'Accent Color', labelAr: 'لون التمييز', type: 'color', value: '', dirty: false },
    { key: 'WORKSPACE_FONT_FAMILY', label: 'Font Family', labelAr: 'نوع الخط', type: 'text', value: '', dirty: false },
    { key: 'WORKSPACE_DENSITY', label: 'UI Density', labelAr: 'كثافة الواجهة', type: 'select', options: [
      { label: 'Compact', value: 'compact' }, { label: 'Comfortable', value: 'comfortable' }, { label: 'Spacious', value: 'spacious' },
    ], value: 'comfortable', dirty: false },
    { key: 'WORKSPACE_ANIMATIONS_ENABLED', label: 'Animations', labelAr: 'الرسوم المتحركة', type: 'toggle', value: true, dirty: false },
  ]);

  layoutFields = signal<WorkspaceField[]>([
    { key: 'WORKSPACE_SIDEBAR_COLLAPSED', label: 'Sidebar Collapsed by Default', labelAr: 'الشريط الجانبي مطوي', type: 'toggle', value: false, dirty: false },
    { key: 'WORKSPACE_SIDEBAR_WIDTH', label: 'Sidebar Width (px)', labelAr: 'عرض الشريط الجانبي', type: 'text', value: '280px', dirty: false },
    { key: 'WORKSPACE_DEFAULT_VIEW', label: 'Default View Mode', labelAr: 'وضع العرض الافتراضي', type: 'select', options: [
      { label: 'Table', value: 'table' }, { label: 'Cards', value: 'cards' }, { label: 'Kanban', value: 'kanban' },
    ], value: 'table', dirty: false },
    { key: 'WORKSPACE_KPI_MAX_VISIBLE', label: 'Max KPI Cards', labelAr: 'أقصى عدد بطاقات KPI', type: 'number', value: 6, dirty: false },
    { key: 'WORKSPACE_DETAIL_DRAWER_POS', label: 'Detail Drawer Position', labelAr: 'موضع لوحة التفاصيل', type: 'select', options: [
      { label: 'Right', value: 'right' }, { label: 'Bottom', value: 'bottom' },
    ], value: 'right', dirty: false },
    { key: 'WORKSPACE_DETAIL_DRAWER_WIDTH', label: 'Detail Drawer Width', labelAr: 'عرض لوحة التفاصيل', type: 'text', value: '480px', dirty: false },
    { key: 'WORKSPACE_FOOTER_ENABLED', label: 'Sticky Footer', labelAr: 'شريط سفلي ثابت', type: 'toggle', value: true, dirty: false },
    { key: 'WORKSPACE_CONTEXT_RAIL_VISIBLE', label: 'Context Rail', labelAr: 'شريط السياق', type: 'toggle', value: true, dirty: false },
    { key: 'WORKSPACE_AI_PANEL_VISIBLE', label: 'AI Panel', labelAr: 'لوحة الذكاء الاصطناعي', type: 'toggle', value: true, dirty: false },
    { key: 'WORKSPACE_WORKFLOW_RIBBON', label: 'Workflow Ribbon', labelAr: 'شريط سير العمل', type: 'toggle', value: true, dirty: false },
  ]);

  brandingFields = signal<WorkspaceField[]>([
    { key: 'WORKSPACE_LOGO_OVERRIDE', label: 'Logo URL', labelAr: 'رابط الشعار', type: 'text', value: '', dirty: false },
    { key: 'WORKSPACE_FAVICON_URL', label: 'Favicon URL', labelAr: 'رابط الأيقونة', type: 'text', value: '', dirty: false },
    { key: 'WORKSPACE_APP_TITLE', label: 'Browser Tab Title', labelAr: 'عنوان التبويب', type: 'text', value: '', dirty: false },
    { key: 'WORKSPACE_TOAST_POSITION', label: 'Toast Position', labelAr: 'موضع الإشعارات', type: 'select', options: [
      { label: 'Top Right', value: 'top-right' }, { label: 'Top Left', value: 'top-left' },
      { label: 'Bottom Right', value: 'bottom-right' }, { label: 'Bottom Left', value: 'bottom-left' },
      { label: 'Top Center', value: 'top-center' }, { label: 'Bottom Center', value: 'bottom-center' },
    ], value: 'top-right', dirty: false },
  ]);

  regionalFields = signal<WorkspaceField[]>([
    { key: 'WORKSPACE_DEFAULT_LANG', label: 'Default Language', labelAr: 'اللغة الافتراضية', type: 'select', options: [
      { label: 'English', value: 'en' }, { label: 'العربية', value: 'ar' },
    ], value: 'en', dirty: false },
    { key: 'WORKSPACE_LANDING_PAGE', label: 'Landing Page', labelAr: 'الصفحة الرئيسية', type: 'text', value: '/workspace-home', dirty: false },
    { key: 'WORKSPACE_DATE_FORMAT', label: 'Date Format', labelAr: 'تنسيق التاريخ', type: 'select', options: [
      { label: 'ISO (2026-04-11)', value: 'iso' }, { label: 'US (04/11/2026)', value: 'us' },
      { label: 'EU (11.04.2026)', value: 'eu' }, { label: 'Arabic (١١/٠٤/٢٠٢٦)', value: 'ar' },
    ], value: 'iso', dirty: false },
    { key: 'WORKSPACE_TIMEZONE', label: 'Display Timezone', labelAr: 'المنطقة الزمنية', type: 'text', value: '', dirty: false },
    { key: 'WORKSPACE_TABLE_PAGE_SIZE', label: 'Table Page Size', labelAr: 'حجم صفحة الجدول', type: 'number', value: 25, dirty: false },
  ]);

  hasDirty = signal(false);

  ngOnInit() { this.loadConfig(); }

  loadConfig() {
    this.loading.set(true);
    this.configService.getWorkspaceConfig().subscribe({
      next: (res) => {
        const config = res.config;
        this.patchFields(this.appearanceFields, config);
        this.patchFields(this.layoutFields, config);
        this.patchFields(this.brandingFields, config);
        this.patchFields(this.regionalFields, config);
        this.hasDirty.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load workspace configuration' });
        this.loading.set(false);
      },
    });
  }

  private patchFields(fieldsSignal: ReturnType<typeof signal<WorkspaceField[]>>, config: Record<string, unknown>) {
    fieldsSignal.update(fields => fields.map(f => {
      const shortKey = f.key.replace('WORKSPACE_', '').toLowerCase();
      const val = config[shortKey];
      if (val !== undefined && val !== null) {
        return { ...f, value: val, dirty: false };
      }
      return { ...f, dirty: false };
    }));
  }

  markDirty(field: WorkspaceField) {
    field.dirty = true;
    this.hasDirty.set(true);
  }

  previewChanges() {
    const dirty = this.collectDirty();
    if (dirty['WORKSPACE_THEME']) this.themeService.setTheme(dirty['WORKSPACE_THEME'] as ThemeName);
    if (dirty['WORKSPACE_DENSITY']) this.themeService.setDensity(dirty['WORKSPACE_DENSITY'] as UiDensity);
    if (dirty['WORKSPACE_ACCENT_COLOR']) this.themeService.setAccentColor(dirty['WORKSPACE_ACCENT_COLOR'] as string);
    this.msg.add({ severity: 'info', summary: 'Preview', detail: 'Theme changes applied locally. Save to persist.' });
  }

  saveAll() {
    const updates = this.collectDirty();
    if (Object.keys(updates).length === 0) return;
    this.saving.set(true);
    this.configService.updateWorkspaceBatch(updates).subscribe({
      next: (res) => {
        const failed = res.results.filter(r => !r.ok);
        if (failed.length > 0) {
          this.msg.add({ severity: 'warn', summary: 'Partial Save', detail: `${res.updated} saved, ${failed.length} failed` });
        } else {
          this.msg.add({ severity: 'success', summary: 'Saved', detail: `${res.updated} workspace settings updated` });
        }
        this.loadConfig();
        this.saving.set(false);
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to save workspace configuration' });
        this.saving.set(false);
      },
    });
  }

  private collectDirty(): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    const allFields = [
      ...this.appearanceFields(),
      ...this.layoutFields(),
      ...this.brandingFields(),
      ...this.regionalFields(),
    ];
    for (const f of allFields) {
      if (f.dirty) updates[f.key] = f.value;
    }
    return updates;
  }
}
