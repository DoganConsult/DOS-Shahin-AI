var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, computed, EventEmitter, HostListener, Input, Output, signal, ElementRef, inject, } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosWorkspaceSwitcherComponent = class DosWorkspaceSwitcherComponent {
    host = inject((ElementRef));
    workspaces = [];
    activeId = null;
    typeMeta = {};
    locale = 'en';
    ariaLabel = 'Switch workspace';
    emptyLabel = 'No workspaces';
    placeholder = 'Select workspace';
    localize = null;
    select = new EventEmitter();
    open = signal(false);
    focusIndex = signal(-1);
    currentEntry = computed(() => this.workspaces.find(w => w.id === this.activeId) ?? this.workspaces[0] ?? null);
    currentMeta = computed(() => {
        const e = this.currentEntry();
        if (!e?.category)
            return null;
        return this.typeMeta[e.category] ?? null;
    });
    metaFor(ws) {
        if (!ws.category)
            return null;
        return this.typeMeta[ws.category] ?? null;
    }
    metaLabel(meta) {
        if (this.localize)
            return this.localize(meta.labelEn, meta.labelAr);
        return (this.locale.startsWith('ar') && meta.labelAr) ? meta.labelAr : meta.labelEn;
    }
    toggle() {
        const next = !this.open();
        this.open.set(next);
        if (next) {
            const idx = this.workspaces.findIndex(w => w.id === this.activeId);
            this.focusIndex.set(idx >= 0 ? idx : 0);
        }
    }
    onSelect(ws) {
        if (ws.disabled)
            return;
        this.open.set(false);
        if (ws.id === this.activeId)
            return;
        this.select.emit(ws);
    }
    onTriggerKey(ev) {
        if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            if (!this.open())
                this.toggle();
        }
        else if (ev.key === 'Escape') {
            this.open.set(false);
        }
    }
    onDocKey(ev) {
        if (!this.open())
            return;
        if (ev.key === 'Escape') {
            this.open.set(false);
            return;
        }
        const len = this.workspaces.length;
        if (!len)
            return;
        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            this.focusIndex.set(((this.focusIndex() + 1) % len + len) % len);
        }
        else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            this.focusIndex.set(((this.focusIndex() - 1) % len + len) % len);
        }
        else if (ev.key === 'Home') {
            ev.preventDefault();
            this.focusIndex.set(0);
        }
        else if (ev.key === 'End') {
            ev.preventDefault();
            this.focusIndex.set(len - 1);
        }
        else if (ev.key === 'Enter') {
            ev.preventDefault();
            const ws = this.workspaces[this.focusIndex()];
            if (ws)
                this.onSelect(ws);
        }
    }
    onDocClick(ev) {
        if (!this.open())
            return;
        if (!this.host.nativeElement.contains(ev.target)) {
            this.open.set(false);
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosWorkspaceSwitcherComponent.prototype, "workspaces", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWorkspaceSwitcherComponent.prototype, "activeId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosWorkspaceSwitcherComponent.prototype, "typeMeta", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWorkspaceSwitcherComponent.prototype, "locale", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWorkspaceSwitcherComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWorkspaceSwitcherComponent.prototype, "emptyLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosWorkspaceSwitcherComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], DosWorkspaceSwitcherComponent.prototype, "localize", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosWorkspaceSwitcherComponent.prototype, "select", void 0);
__decorate([
    HostListener('document:keydown', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [KeyboardEvent]),
    __metadata("design:returntype", void 0)
], DosWorkspaceSwitcherComponent.prototype, "onDocKey", null);
__decorate([
    HostListener('document:click', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [MouseEvent]),
    __metadata("design:returntype", void 0)
], DosWorkspaceSwitcherComponent.prototype, "onDocClick", null);
DosWorkspaceSwitcherComponent = __decorate([
    Component({
        selector: 'dos-workspace-switcher',
        standalone: true,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [CommonModule],
        template: `
    @if (workspaces.length === 0) {
      <div class="dos-ws-switcher dos-ws-switcher--empty"
           [attr.aria-label]="emptyLabel">
        <i class="dos-ws-switcher__icon" aria-hidden="true">⊘</i>
        <span class="dos-ws-switcher__name">{{ emptyLabel }}</span>
      </div>
    } @else if (workspaces.length === 1) {
      <div class="dos-ws-switcher dos-ws-switcher--static"
           [attr.aria-label]="ariaLabel">
        @if (currentMeta()?.icon || currentEntry()?.icon) {
          <i class="dos-ws-switcher__icon {{ currentEntry()?.icon || currentMeta()?.icon }}"
             [style.color]="currentEntry()?.color || currentMeta()?.color"
             aria-hidden="true"></i>
        }
        <div class="dos-ws-switcher__copy">
          <span class="dos-ws-switcher__name">{{ workspaces[0].name }}</span>
          @if (workspaces[0].subtitle) {
            <span class="dos-ws-switcher__subtitle">{{ workspaces[0].subtitle }}</span>
          }
        </div>
        @if (currentMeta()) {
          <span class="dos-ws-switcher__badge"
                [style.background]="(currentEntry()?.color || currentMeta()?.color) + '18'"
                [style.color]="currentEntry()?.color || currentMeta()?.color">
            {{ metaLabel(currentMeta()!) }}
          </span>
        }
      </div>
    } @else {
      <div class="dos-ws-switcher dos-ws-switcher--dropdown"
           [class.is-open]="open()"
           [attr.aria-label]="ariaLabel">
        <button
          type="button"
          class="dos-ws-switcher__trigger"
          [attr.aria-expanded]="open()"
          aria-haspopup="listbox"
          (click)="toggle()"
          (keydown)="onTriggerKey($event)">
          @if (currentEntry()) {
            <i class="dos-ws-switcher__icon {{ currentEntry()?.icon || currentMeta()?.icon || '' }}"
               [style.color]="currentEntry()?.color || currentMeta()?.color"
               aria-hidden="true"></i>
            <span class="dos-ws-switcher__name">{{ currentEntry()?.name }}</span>
          } @else {
            <span class="dos-ws-switcher__name">{{ placeholder }}</span>
          }
          <span class="dos-ws-switcher__caret" aria-hidden="true">▾</span>
        </button>

        @if (open()) {
          <ul class="dos-ws-switcher__menu" role="listbox" [attr.aria-label]="ariaLabel">
            @for (ws of workspaces; let i = $index; track ws.id) {
              <li role="option"
                  class="dos-ws-switcher__option"
                  [class.is-active]="ws.id === activeId"
                  [class.is-focused]="i === focusIndex()"
                  [class.is-disabled]="!!ws.disabled"
                  [attr.aria-selected]="ws.id === activeId"
                  (click)="onSelect(ws)"
                  (mouseenter)="focusIndex.set(i)">
                @if (ws.icon || metaFor(ws)?.icon) {
                  <i class="dos-ws-switcher__icon {{ ws.icon || metaFor(ws)?.icon }}"
                     [style.color]="ws.color || metaFor(ws)?.color"
                     aria-hidden="true"></i>
                }
                <div class="dos-ws-switcher__copy">
                  <span class="dos-ws-switcher__name">{{ ws.name }}</span>
                  @if (ws.subtitle) {
                    <span class="dos-ws-switcher__subtitle">{{ ws.subtitle }}</span>
                  }
                </div>
                @if (metaFor(ws)) {
                  <span class="dos-ws-switcher__badge"
                        [style.background]="(ws.color || metaFor(ws)?.color) + '18'"
                        [style.color]="ws.color || metaFor(ws)?.color">
                    {{ metaLabel(metaFor(ws)!) }}
                  </span>
                }
              </li>
            }
          </ul>
        }
      </div>
    }
  `,
        styles: [`
    :host { display: inline-block; min-width: 180px; }
    .dos-ws-switcher {
      position: relative;
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px;
      border: 1px solid var(--dos-color-border, #e5e7eb);
      border-radius: var(--dos-radius-sm, 6px);
      background: var(--dos-color-surface, #fff);
      color: var(--dos-color-text, #111827);
      font: inherit;
    }
    .dos-ws-switcher--empty   { color: var(--dos-color-text-muted, #6b7280); border-style: dashed; }
    .dos-ws-switcher--static  { cursor: default; }
    .dos-ws-switcher__trigger {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 0; border: none; background: transparent;
      color: inherit; font: inherit; cursor: pointer;
    }
    .dos-ws-switcher__trigger:focus-visible {
      outline: 2px solid var(--dos-color-focus, #2563eb);
      outline-offset: 2px;
    }
    .dos-ws-switcher__copy { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; flex: 1; }
    .dos-ws-switcher__name {
      font-weight: 500;
      max-width: 200px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .dos-ws-switcher__subtitle {
      font-size: 0.75rem;
      color: var(--dos-color-text-muted, #6b7280);
    }
    .dos-ws-switcher__badge {
      display: inline-flex; align-items: center;
      padding: 0 6px; height: 18px; border-radius: 9px;
      font-size: 0.7rem; white-space: nowrap;
    }
    .dos-ws-switcher__caret { margin-inline-start: auto; opacity: 0.6; }
    .dos-ws-switcher__menu {
      position: absolute;
      top: calc(100% + 4px); inset-inline-start: 0;
      min-width: 100%;
      max-height: 300px;
      overflow-y: auto;
      list-style: none; margin: 0; padding: 4px;
      background: var(--dos-color-surface, #fff);
      border: 1px solid var(--dos-color-border, #e5e7eb);
      border-radius: var(--dos-radius-sm, 6px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      z-index: 1000;
    }
    .dos-ws-switcher__option {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px;
      border-radius: var(--dos-radius-xs, 4px);
      cursor: pointer;
    }
    .dos-ws-switcher__option.is-focused,
    .dos-ws-switcher__option:hover { background: var(--dos-color-surface-muted, #f3f4f6); }
    .dos-ws-switcher__option.is-active { font-weight: 600; }
    .dos-ws-switcher__option.is-disabled { opacity: 0.4; cursor: not-allowed; }
  `],
    })
], DosWorkspaceSwitcherComponent);
export { DosWorkspaceSwitcherComponent };
//# sourceMappingURL=workspace-switcher.component.js.map