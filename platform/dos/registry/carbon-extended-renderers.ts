/**
 * Extended IBM Carbon Angular renderers.
 *
 * Closes the gap between dos.dynamic_ui_component_registry (148 distinct
 * Angular-usable carbon_keys) and the original carbon-primitive-renderers.ts
 * surface (~30 distinct carbon_keys covered).
 *
 * Two renderer categories:
 *   1. Native Carbon Angular wrappers — render a real <cds-*> element from
 *      carbon-components-angular@5.69.x.
 *   2. CarbonCatalogPlaceholderRenderer — for catalog-only carbon_keys that
 *      have no <cds-*> Angular element (assets, themes, charts, web-components,
 *      utility packages). Renders Carbon-native <cds-tile> / <cds-tag> /
 *      <cds-skeleton-text> markup that documents the catalog reference. This
 *      is NOT a DynamicPageHostComponent fallback: every output element is a
 *      real Carbon element shipped by carbon-components-angular.
 */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  DialogModule,
  IconModule,
  LinkModule,
  ListModule,
  LoadingModule,
  NotificationModule,
  SkeletonModule,
  TagModule,
  TilesModule,
  TooltipModule,
  UIShellModule,
} from 'carbon-components-angular';

// ──────────────────────────────────────────────────────────────────────────
// 1. Catalog placeholder — Carbon-native marker for catalog-only carbon_keys
//    (asset.*, theme.*, chart.*, product-wc.*, wc.*, common, i18n, utils,
//    experimental, forms, placeholder, carbon.icons.angular, carbon.pictograms,
//    ai.*, aichat.*, aspect-ratio).
// ──────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-carbon-catalog-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule, TagModule, SkeletonModule],
  template: `
    <cds-tile class="carbon-catalog-placeholder" [attr.data-carbon-key]="carbonKey">
      <cds-tag type="cool-gray">{{ carbonKey }}</cds-tag>
      <p class="cds--label" *ngIf="componentKey">{{ componentKey }}</p>
      <cds-skeleton-text [lines]="1"></cds-skeleton-text>
    </cds-tile>
  `,
})
export class CarbonCatalogPlaceholderRenderer {
  @Input() carbonKey = '';
  @Input() componentKey = '';
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Native Carbon Angular wrappers for previously-uncovered carbon_keys.
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carbon-link',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LinkModule],
  template: `<a cdsLink [href]="href || '#'">{{ label || 'Link' }}</a>`,
})
export class CarbonLinkRenderer {
  @Input() href = '#';
  @Input() label = '';
}

@Component({
  selector: 'app-carbon-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ListModule],
  template: `
    <ul cdsList>
      <li *ngFor="let item of items">{{ item }}</li>
    </ul>
  `,
})
export class CarbonListRenderer {
  @Input() items: string[] = [];
}

@Component({
  selector: 'app-carbon-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LoadingModule],
  template: `<cds-loading [isActive]="isActive" [overlay]="overlay"></cds-loading>`,
})
export class CarbonLoadingRenderer {
  @Input() isActive = true;
  @Input() overlay = false;
}

@Component({
  selector: 'app-carbon-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NotificationModule],
  template: `
    <cds-notification
      [notificationObj]="{
        type: type,
        title: title,
        message: message
      }"
    ></cds-notification>
  `,
})
export class CarbonNotificationRenderer {
  @Input() type: 'info' | 'success' | 'warning' | 'error' = 'info';
  @Input() title = '';
  @Input() message = '';
}

@Component({
  selector: 'app-carbon-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconModule],
  template: `<svg [attr.cdsIcon]="name" [attr.size]="size"></svg>`,
})
export class CarbonIconRenderer {
  @Input() name = 'information';
  @Input() size: '16' | '20' | '24' | '32' = '20';
}

@Component({
  selector: 'app-carbon-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule, TooltipModule],
  template: `
    <cds-tooltip [description]="message"><button>{{ label || 'Open' }}</button></cds-tooltip>
  `,
})
export class CarbonDialogRenderer {
  @Input() label = '';
  @Input() message = '';
}

@Component({
  selector: 'app-carbon-skip-to-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIShellModule],
  template: `<a class="cds--skip-to-content" href="#main-content">{{ label || 'Skip to content' }}</a>`,
})
export class CarbonSkipToContentRenderer {
  @Input() label = '';
}
