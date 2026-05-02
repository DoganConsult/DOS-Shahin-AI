/**
 * carbon-primitive-renderers.ts
 *
 * One-file barrel of standalone Angular wrapper components — one per Carbon
 * primitive carbon_key registered in dos.dynamic_ui_component_registry
 * (vendor='ibm-carbon', approval_status='approved').
 *
 * These replace the previous shared `DynamicPageHostComponent` routing in
 * CARBON_PRIMITIVE_COMPONENT_MAP. Every Carbon component_key used by the
 * Dynamic UI registry resolves here to a real IBM Carbon Angular component
 * (carbon-components-angular@5.69.x) — no fallback, no PrimeNG, no Material,
 * no custom shell DNA.
 *
 * Each wrapper:
 *   - Is a standalone Angular component.
 *   - Imports the canonical Carbon Angular module for its primitive.
 *   - Exposes minimal inputs sourced from the route/widget config (label,
 *     description, items, etc.). Inputs are intentionally permissive (any /
 *     loose) because the data shape is contract-driven by Dynamic UI.
 *   - Renders ONLY Carbon selectors (cds-* / [cdsButton] / etc.).
 *
 * Registry/UX rules:
 *   - 100% IBM Carbon (carbon-components-angular@5.69.0).
 *   - No PrimeNG, no Material icons, no emoji icons, no custom layout.
 *   - Missing carbon_key → loud throw (see component-map.ts).
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  AccordionModule,
  BreadcrumbModule,
  ButtonModule,
  CheckboxModule,
  ComboBoxModule,
  ContextMenuModule,
  DatePickerModule,
  DialogModule,
  DropdownModule,
  // OverflowMenu lives in DialogModule (carbon-components-angular/dialog)

  FileUploaderModule,
  GridModule,
  IconModule,
  InlineLoadingModule,
  InputModule,
  LayerModule,
  LinkModule,
  ListModule,
  LoadingModule,
  ModalModule,
  NotificationModule,
  NumberModule,
  PaginationModule,
  PaginationModel,
  PopoverModule,
  ProgressBarModule,
  RadioModule,
  SearchModule,
  SelectModule,
  SkeletonModule,
  StructuredListModule,
  TableModule,
  TabsModule,
  TagModule,
  TilesModule,
  ToggleModule,
  ToggletipModule,
  TooltipModule,
  UIShellModule,
} from 'carbon-components-angular';

type AnyRecord = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────
// Frame primitives — UI Shell allow-list (1–14)
// Already rendered inside ShellHostComponent at runtime; these route-level
// wrappers exist so component_key resolution from the registry never falls
// through to the generic dynamic page host.
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-uishell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `
    <cds-header [name]="name">
      <cds-header-global><ng-content /></cds-header-global>
    </cds-header>
  `,
})
export class CarbonUIShellRenderer {
  @Input() name = 'Workspace';
}

@Component({
  selector: 'app-carbon-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-header [name]="name"></cds-header>`,
})
export class CarbonHeaderRenderer { @Input() name = ''; }

@Component({
  selector: 'app-carbon-header-name',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-header [name]="name"></cds-header>`,
})
export class CarbonHeaderNameRenderer { @Input() name = ''; }

@Component({
  selector: 'app-carbon-header-navigation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-header-navigation [ariaLabel]="ariaLabel"><ng-content /></cds-header-navigation>`,
})
export class CarbonHeaderNavigationRenderer { @Input() ariaLabel = 'Navigation'; }

@Component({
  selector: 'app-carbon-header-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-header-menu [title]="title"><ng-content /></cds-header-menu>`,
})
export class CarbonHeaderMenuRenderer { @Input() title = ''; }

@Component({
  selector: 'app-carbon-header-menu-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-header-item>{{ label }}</cds-header-item>`,
})
export class CarbonHeaderMenuItemRenderer { @Input() label = ''; }

@Component({
  selector: 'app-carbon-header-global-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-header-global><ng-content /></cds-header-global>`,
})
export class CarbonHeaderGlobalBarRenderer {}

@Component({
  selector: 'app-carbon-header-global-action',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-header-action [description]="description"><ng-content /></cds-header-action>`,
})
export class CarbonHeaderGlobalActionRenderer { @Input() description = ''; }

@Component({
  selector: 'app-carbon-sidenav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-sidenav [expanded]="expanded"><ng-content /></cds-sidenav>`,
})
export class CarbonSideNavRenderer { @Input() expanded = true; }

@Component({
  selector: 'app-carbon-sidenav-items',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-sidenav><ng-content /></cds-sidenav>`,
})
export class CarbonSideNavItemsRenderer {}

@Component({
  selector: 'app-carbon-sidenav-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-sidenav-menu [title]="title"><ng-content /></cds-sidenav-menu>`,
})
export class CarbonSideNavMenuRenderer { @Input() title = ''; }

@Component({
  selector: 'app-carbon-sidenav-menu-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-sidenav-item>{{ label }}</cds-sidenav-item>`,
})
export class CarbonSideNavMenuItemRenderer { @Input() label = ''; }

@Component({
  selector: 'app-carbon-sidenav-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<cds-sidenav-item [route]="route ? [route] : null">{{ label }}</cds-sidenav-item>`,
})
export class CarbonSideNavLinkRenderer {
  @Input() label = '';
  @Input() route: string | null = null;
}

@Component({
  selector: 'app-carbon-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<main class="cds--content"><ng-content /></main>`,
})
export class CarbonContentRenderer {}

// ──────────────────────────────────────────────────────────────────────────
// Layout primitives — Grid / Column / Layer / Breadcrumb / Tabs / Tab
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GridModule],
  template: `<div cdsGrid><ng-content /></div>`,
})
export class CarbonGridRenderer {}

@Component({
  selector: 'app-carbon-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GridModule],
  template: `<div cdsCol><ng-content /></div>`,
})
export class CarbonColumnRenderer {}

@Component({
  selector: 'app-carbon-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LayerModule],
  template: `<div cdsLayer><ng-content /></div>`,
})
export class CarbonLayerRenderer {}

@Component({
  selector: 'app-carbon-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BreadcrumbModule],
  template: `
    <cds-breadcrumb>
      <cds-breadcrumb-item *ngFor="let item of items" [href]="item?.href">
        {{ item?.label }}
      </cds-breadcrumb-item>
    </cds-breadcrumb>
  `,
})
export class CarbonBreadcrumbRenderer {
  @Input() items: ReadonlyArray<{ label?: string; href?: string }> = [];
}

@Component({
  selector: 'app-carbon-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TabsModule],
  template: `
    <cds-tabs>
      <cds-tab *ngFor="let t of items" [heading]="t?.heading">
        <ng-container *ngIf="t?.text">{{ t.text }}</ng-container>
      </cds-tab>
    </cds-tabs>
  `,
})
export class CarbonTabsRenderer {
  @Input() items: ReadonlyArray<{ heading?: string; text?: string }> = [];
}

@Component({
  selector: 'app-carbon-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TabsModule],
  template: `<cds-tabs><cds-tab [heading]="heading"><ng-content /></cds-tab></cds-tabs>`,
})
export class CarbonTabRenderer { @Input() heading = ''; }

// ──────────────────────────────────────────────────────────────────────────
// Tile primitives — Tile / ClickableTile / ExpandableTile
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule],
  template: `<cds-tile><ng-content /></cds-tile>`,
})
export class CarbonTileRenderer {}

@Component({
  selector: 'app-carbon-clickable-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule],
  template: `<cds-clickable-tile [href]="href"><ng-content /></cds-clickable-tile>`,
})
export class CarbonClickableTileRenderer { @Input() href = ''; }

@Component({
  selector: 'app-carbon-expandable-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule],
  template: `<cds-expandable-tile><ng-content /></cds-expandable-tile>`,
})
export class CarbonExpandableTileRenderer {}

// ──────────────────────────────────────────────────────────────────────────
// Tag / Notification / Loading / Skeleton
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TagModule],
  template: `<cds-tag [type]="type">{{ label }}</cds-tag>`,
})
export class CarbonTagRenderer {
  @Input() label = '';
  @Input() type: 'red'|'magenta'|'purple'|'blue'|'cyan'|'teal'|'green'|'gray'|'cool-gray'|'warm-gray'|'high-contrast'|'outline' = 'gray';
}

@Component({
  selector: 'app-carbon-inline-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NotificationModule],
  template: `
    <cds-notification
      [notificationObj]="{ type: kind, title: title, message: message }">
    </cds-notification>
  `,
})
export class CarbonInlineNotificationRenderer {
  @Input() kind: 'info'|'success'|'warning'|'error' = 'info';
  @Input() title = '';
  @Input() message = '';
}

@Component({
  selector: 'app-carbon-toast-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NotificationModule],
  template: `
    <cds-toast
      [notificationObj]="{ type: kind, title: title, subtitle: subtitle, caption: caption }">
    </cds-toast>
  `,
})
export class CarbonToastNotificationRenderer {
  @Input() kind: 'info'|'success'|'warning'|'error' = 'info';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() caption = '';
}

@Component({
  selector: 'app-carbon-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProgressBarModule],
  template: `<cds-progress-bar [value]="value" [max]="max" [label]="label"></cds-progress-bar>`,
})
export class CarbonProgressBarRenderer {
  @Input() value = 0;
  @Input() max = 100;
  @Input() label = '';
}

@Component({
  selector: 'app-carbon-inline-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InlineLoadingModule],
  template: `<cds-inline-loading [loadingText]="text" [state]="state"></cds-inline-loading>`,
})
export class CarbonInlineLoadingRenderer {
  @Input() text = 'Loading…';
  @Input() state: 'active'|'inactive'|'finished'|'error' = 'active';
}

@Component({
  selector: 'app-carbon-skeleton-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SkeletonModule],
  template: `<cds-skeleton-text [lines]="lines"></cds-skeleton-text>`,
})
export class CarbonSkeletonTextRenderer {
  @Input() lines = 3;
}

@Component({
  selector: 'app-carbon-skeleton-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SkeletonModule],
  template: `<cds-skeleton-placeholder></cds-skeleton-placeholder>`,
})
export class CarbonSkeletonPlaceholderRenderer {}

// ──────────────────────────────────────────────────────────────────────────
// Tables / Lists
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule],
  template: `
    <cds-table-container *ngIf="title || description">
      <cds-table-header>
        <h4 cdsTableHeaderTitle>{{ title }}</h4>
        <p cdsTableHeaderDescription>{{ description }}</p>
      </cds-table-header>
      <table cdsTable>
        <thead cdsTableHead>
          <tr><th cdsTableHeadCell *ngFor="let h of headers">{{ h }}</th></tr>
        </thead>
        <tbody cdsTableBody>
          <tr cdsTableRow *ngFor="let row of rows">
            <td cdsTableData *ngFor="let cell of row">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </cds-table-container>
    <table cdsTable *ngIf="!title && !description">
      <thead cdsTableHead>
        <tr><th cdsTableHeadCell *ngFor="let h of headers">{{ h }}</th></tr>
      </thead>
      <tbody cdsTableBody>
        <tr cdsTableRow *ngFor="let row of rows">
          <td cdsTableData *ngFor="let cell of row">{{ cell }}</td>
        </tr>
      </tbody>
    </table>
  `,
})
export class CarbonDataTableRenderer {
  @Input() title = '';
  @Input() description = '';
  @Input() headers: ReadonlyArray<string> = [];
  @Input() rows: ReadonlyArray<ReadonlyArray<string | number>> = [];
}

@Component({
  selector: 'app-carbon-table-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule],
  template: `<cds-table-toolbar><ng-content /></cds-table-toolbar>`,
})
export class CarbonTableToolbarRenderer {}

@Component({
  selector: 'app-carbon-table-toolbar-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule],
  template: `<cds-table-toolbar-search [expandable]="expandable"></cds-table-toolbar-search>`,
})
export class CarbonTableToolbarSearchRenderer { @Input() expandable = true; }

@Component({
  selector: 'app-carbon-table-toolbar-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule],
  template: `<cds-table-toolbar-actions><ng-content /></cds-table-toolbar-actions>`,
})
export class CarbonTableToolbarActionsRenderer {}

@Component({
  selector: 'app-carbon-table-batch-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule],
  template: `<cds-table-toolbar-actions><ng-content /></cds-table-toolbar-actions>`,
})
export class CarbonTableBatchActionsRenderer {}

@Component({
  selector: 'app-carbon-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PaginationModule],
  template: `<cds-pagination [model]="model"></cds-pagination>`,
})
export class CarbonPaginationRenderer {
  @Input() model: PaginationModel = new PaginationModel();
}

@Component({
  selector: 'app-carbon-structured-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StructuredListModule],
  template: `
    <cds-structured-list>
      <cds-list-header>
        <cds-list-column *ngFor="let h of headers">{{ h }}</cds-list-column>
      </cds-list-header>
      <cds-list-row *ngFor="let row of rows">
        <cds-list-column *ngFor="let cell of row">{{ cell }}</cds-list-column>
      </cds-list-row>
    </cds-structured-list>
  `,
})
export class CarbonStructuredListRenderer {
  @Input() headers: ReadonlyArray<string> = [];
  @Input() rows: ReadonlyArray<ReadonlyArray<string | number>> = [];
}

// ──────────────────────────────────────────────────────────────────────────
// Form controls — Search / Dropdown / ComboBox / MultiSelect / DatePicker
// TextInput / TextArea / NumberInput / Select / Checkbox / Radio / Toggle
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchModule],
  template: `<cds-search [placeholder]="placeholder" [size]="size"></cds-search>`,
})
export class CarbonSearchRenderer {
  @Input() placeholder = 'Search';
  @Input() size: 'sm'|'md'|'lg' = 'md';
}

@Component({
  selector: 'app-carbon-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DropdownModule],
  template: `<cds-dropdown [label]="label"></cds-dropdown>`,
})
export class CarbonDropdownRenderer {
  @Input() label = '';
  @Input() items: ReadonlyArray<AnyRecord> = [];
}

@Component({
  selector: 'app-carbon-combobox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ComboBoxModule],
  template: `<cds-combo-box [label]="label" [items]="items"></cds-combo-box>`,
})
export class CarbonComboBoxRenderer {
  @Input() label = '';
  @Input() items: ReadonlyArray<AnyRecord> = [];
}

@Component({
  selector: 'app-carbon-multiselect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DropdownModule],
  template: `<cds-dropdown [label]="label" type="multi"></cds-dropdown>`,
})
export class CarbonMultiSelectRenderer {
  @Input() label = '';
  @Input() items: ReadonlyArray<AnyRecord> = [];
}

@Component({
  selector: 'app-carbon-datepicker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePickerModule],
  template: `<cds-date-picker [label]="label" [placeholder]="placeholder"></cds-date-picker>`,
})
export class CarbonDatePickerRenderer {
  @Input() label = '';
  @Input() placeholder = 'mm/dd/yyyy';
}

@Component({
  selector: 'app-carbon-text-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, InputModule],
  template: `
    <cds-label>{{ label }}<input cdsText [placeholder]="placeholder" /></cds-label>
  `,
})
export class CarbonTextInputRenderer {
  @Input() label = '';
  @Input() placeholder = '';
}

@Component({
  selector: 'app-carbon-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, InputModule],
  template: `
    <cds-textarea-label>{{ label }}<textarea cdsTextArea [placeholder]="placeholder" [rows]="rows"></textarea></cds-textarea-label>
  `,
})
export class CarbonTextAreaRenderer {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() rows = 4;
}

@Component({
  selector: 'app-carbon-number-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NumberModule],
  template: `<cds-number [label]="label" [(value)]="value" [min]="min" [max]="max"></cds-number>`,
})
export class CarbonNumberInputRenderer {
  @Input() label = '';
  @Input() value = 0;
  @Input() min: number | null = null;
  @Input() max: number | null = null;
}

@Component({
  selector: 'app-carbon-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SelectModule],
  template: `
    <cds-select [label]="label">
      <option *ngFor="let o of options" [value]="o?.value">{{ o?.label ?? o?.value }}</option>
    </cds-select>
  `,
})
export class CarbonSelectRenderer {
  @Input() label = '';
  @Input() options: ReadonlyArray<{ value?: string|number; label?: string }> = [];
}

@Component({
  selector: 'app-carbon-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CheckboxModule],
  template: `<cds-checkbox [(checked)]="checked">{{ label }}</cds-checkbox>`,
})
export class CarbonCheckboxRenderer {
  @Input() label = '';
  @Input() checked = false;
}

@Component({
  selector: 'app-carbon-radio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RadioModule],
  template: `
    <cds-radio-group [(ngModel)]="value">
      <cds-radio *ngFor="let o of options" [value]="o?.value">{{ o?.label ?? o?.value }}</cds-radio>
    </cds-radio-group>
  `,
})
export class CarbonRadioRenderer {
  @Input() value: string | number | null = null;
  @Input() options: ReadonlyArray<{ value?: string|number; label?: string }> = [];
}

@Component({
  selector: 'app-carbon-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ToggleModule],
  template: `<cds-toggle [(checked)]="checked" [label]="label"></cds-toggle>`,
})
export class CarbonToggleRenderer {
  @Input() label = '';
  @Input() checked = false;
}

// ──────────────────────────────────────────────────────────────────────────
// Buttons / Menus
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule],
  template: `<button cdsButton [size]="size">{{ label }}</button>`,
})
export class CarbonButtonRenderer {
  @Input() label = 'Action';
  @Input() size: 'sm'|'md'|'lg'|'xl' = 'md';
}

@Component({
  selector: 'app-carbon-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule],
  template: `<cds-icon-button [description]="description" [size]="size"><ng-content /></cds-icon-button>`,
})
export class CarbonIconButtonRenderer {
  @Input() description = '';
  @Input() size: 'sm'|'md'|'lg' = 'md';
}

@Component({
  selector: 'app-carbon-overflow-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule],
  template: `<cds-overflow-menu><ng-content /></cds-overflow-menu>`,
})
export class CarbonOverflowMenuRenderer {}

@Component({
  selector: 'app-carbon-overflow-menu-option',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule],
  template: `<cds-overflow-menu-option>{{ label }}</cds-overflow-menu-option>`,
})
export class CarbonOverflowMenuOptionRenderer { @Input() label = ''; }

@Component({
  selector: 'app-carbon-context-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ContextMenuModule],
  template: `<cds-context-menu><ng-content /></cds-context-menu>`,
})
export class CarbonContextMenuRenderer {}

// ──────────────────────────────────────────────────────────────────────────
// Modal / Tooltip / Toggletip / Popover
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ModalModule],
  template: `
    <cds-modal [open]="open" [size]="size">
      <cds-modal-header [showCloseButton]="true">
        <h3 cdsModalHeaderHeading>{{ title }}</h3>
      </cds-modal-header>
      <section cdsModalContent><p cdsModalContentText>{{ message }}</p></section>
    </cds-modal>
  `,
})
export class CarbonModalRenderer {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() size: 'xs'|'sm'|'md'|'lg'|'xl' = 'md';
}

@Component({
  selector: 'app-carbon-tooltip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TooltipModule],
  template: `<cds-tooltip [description]="description"><ng-content /></cds-tooltip>`,
})
export class CarbonTooltipRenderer { @Input() description = ''; }

@Component({
  selector: 'app-carbon-toggletip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ToggletipModule],
  template: `<cds-toggletip><ng-content /></cds-toggletip>`,
})
export class CarbonToggletipRenderer {}

@Component({
  selector: 'app-carbon-popover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PopoverModule],
  template: `<div cdsPopover [isOpen]="open"><ng-content /></div>`,
})
export class CarbonPopoverRenderer { @Input() open = false; }

// ──────────────────────────────────────────────────────────────────────────
// File uploader / Accordion
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-file-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FileUploaderModule],
  template: `<cds-file-uploader [title]="title" [description]="description" [buttonText]="buttonText" [accept]="accept"></cds-file-uploader>`,
})
export class CarbonFileUploaderRenderer {
  @Input() title = 'Upload files';
  @Input() description = '';
  @Input() buttonText = 'Add files';
  @Input() accept: ReadonlyArray<string> = [];
}

@Component({
  selector: 'app-carbon-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AccordionModule],
  template: `
    <cds-accordion>
      <cds-accordion-item *ngFor="let it of items" [title]="it?.title">
        {{ it?.body }}
      </cds-accordion-item>
    </cds-accordion>
  `,
})
export class CarbonAccordionRenderer {
  @Input() items: ReadonlyArray<{ title?: string; body?: string }> = [];
}
