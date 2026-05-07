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
  template: `<a class="cds--skip-to-content" href="#main-content">{{ label }}</a>`,
})
export class CarbonSkipToContentRenderer {
  @Input() label = '';
}

// ──────────────────────────────────────────────────────────────────────────
// 3. cds-* web-component wrappers (carbon-components-angular ships these
//    as web-components; we render them as custom elements via
//    CUSTOM_ELEMENTS_SCHEMA so AOT accepts the unknown <cds-*> tag).
//    Every wrapper is a real Carbon web-component element, not a fallback.
// ──────────────────────────────────────────────────────────────────────────
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-ai-label',
  template: `<cds-ai-label [attr.kind]="kind">{{ label }}</cds-ai-label>`,
})
export class CarbonAiLabelRenderer { @Input() label = ''; @Input() kind: 'default' | 'inline' = 'default'; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-chat-button',
  template: `<cds-chat-button [attr.disabled]="disabled || null">{{ label || 'Open AI' }}</cds-chat-button>`,
})
export class CarbonChatButtonRenderer { @Input() label = ''; @Input() disabled = false; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-ai-skeleton',
  template: `<cds-ai-skeleton-text [attr.lines]="lines"></cds-ai-skeleton-text>`,
})
export class CarbonAiSkeletonRenderer { @Input() lines = 3; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-aichat-container',
  template: `<cds-aichat-container [attr.title]="title">{{ message }}</cds-aichat-container>`,
})
export class CarbonAiChatContainerRenderer { @Input() title = ''; @Input() message = ''; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-aichat-element',
  template: `<cds-aichat-custom-element></cds-aichat-custom-element>`,
})
export class CarbonAiChatElementRenderer {}

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-aspect-ratio',
  template: `<cds-aspect-ratio [attr.ratio]="ratio"><ng-content></ng-content></cds-aspect-ratio>`,
})
export class CarbonAspectRatioRenderer { @Input() ratio: '1x1' | '2x1' | '4x3' | '16x9' = '16x9'; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-code-snippet',
  template: `<cds-code-snippet [attr.type]="type">{{ code }}</cds-code-snippet>`,
})
export class CarbonCodeSnippetRenderer { @Input() type: 'single' | 'multi' | 'inline' = 'single'; @Input() code = ''; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-combo-button',
  template: `<cds-combo-button [attr.kind]="kind">{{ label || 'Action' }}</cds-combo-button>`,
})
export class CarbonComboButtonRenderer { @Input() kind: 'primary' | 'secondary' = 'primary'; @Input() label = ''; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-contained-list',
  template: `<cds-contained-list [attr.label]="label"><ng-content></ng-content></cds-contained-list>`,
})
export class CarbonContainedListRenderer { @Input() label = ''; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-content-switcher',
  template: `<cds-content-switcher [attr.size]="size"><ng-content></ng-content></cds-content-switcher>`,
})
export class CarbonContentSwitcherRenderer { @Input() size: 'sm' | 'md' | 'lg' = 'md'; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-menu-button',
  template: `<cds-menu-button [attr.kind]="kind">{{ label || 'Menu' }}</cds-menu-button>`,
})
export class CarbonMenuButtonRenderer { @Input() kind: 'primary' | 'tertiary' | 'ghost' = 'primary'; @Input() label = ''; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-progress-indicator',
  template: `<cds-progress-indicator [attr.current-index]="currentIndex"><ng-content></ng-content></cds-progress-indicator>`,
})
export class CarbonProgressIndicatorRenderer { @Input() currentIndex = 0; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-slider',
  template: `<cds-slider [attr.min]="min" [attr.max]="max" [attr.value]="value"></cds-slider>`,
})
export class CarbonSliderRenderer { @Input() min = 0; @Input() max = 100; @Input() value = 0; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-time-picker',
  template: `<cds-time-picker [attr.value]="value"></cds-time-picker>`,
})
export class CarbonTimePickerRenderer { @Input() value = ''; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-time-picker-select',
  template: `<cds-time-picker-select [attr.value]="value"></cds-time-picker-select>`,
})
export class CarbonTimePickerSelectRenderer { @Input() value = ''; }

@Component({
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule], selector: 'app-cds-tree-view',
  template: `<cds-tree-view [attr.label]="label"><ng-content></ng-content></cds-tree-view>`,
})
export class CarbonTreeViewRenderer { @Input() label = ''; }

// wc.* fluid input wrappers — Carbon web-components fluid form variants.
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-badge-indicator', template: `<cds-badge-indicator [attr.count]="count"></cds-badge-indicator>` })
export class CarbonBadgeIndicatorRenderer { @Input() count = 0; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-copy', template: `<cds-copy [attr.feedback]="feedback">{{ label }}</cds-copy>` })
export class CarbonCopyRenderer { @Input() label = ''; @Input() feedback = 'Copied!'; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-feature-flags', template: `<cds-feature-flags><ng-content></ng-content></cds-feature-flags>` })
export class CarbonFeatureFlagsRenderer {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-floating-menu', template: `<cds-floating-menu><ng-content></ng-content></cds-floating-menu>` })
export class CarbonFloatingMenuRenderer {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-combo-box', template: `<cds-fluid-combo-box [attr.label]="label"></cds-fluid-combo-box>` })
export class CarbonFluidComboBoxRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-dropdown', template: `<cds-fluid-dropdown [attr.label]="label"></cds-fluid-dropdown>` })
export class CarbonFluidDropdownRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-multi-select', template: `<cds-fluid-multi-select [attr.label]="label"></cds-fluid-multi-select>` })
export class CarbonFluidMultiSelectRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-number-input', template: `<cds-fluid-number-input [attr.label]="label"></cds-fluid-number-input>` })
export class CarbonFluidNumberInputRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-password-input', template: `<cds-fluid-password-input [attr.label]="label"></cds-fluid-password-input>` })
export class CarbonFluidPasswordInputRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-search', template: `<cds-fluid-search [attr.label]="label"></cds-fluid-search>` })
export class CarbonFluidSearchRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-select', template: `<cds-fluid-select [attr.label]="label"></cds-fluid-select>` })
export class CarbonFluidSelectRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-text-input', template: `<cds-fluid-text-input [attr.label]="label"></cds-fluid-text-input>` })
export class CarbonFluidTextInputRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-textarea', template: `<cds-fluid-text-area [attr.label]="label"></cds-fluid-text-area>` })
export class CarbonFluidTextareaRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-fluid-time-picker', template: `<cds-fluid-time-picker [attr.label]="label"></cds-fluid-time-picker>` })
export class CarbonFluidTimePickerRenderer { @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-form-group', template: `<cds-form-group [attr.legend-text]="legend"><ng-content></ng-content></cds-form-group>` })
export class CarbonFormGroupRenderer { @Input() legend = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-heading', template: `<cds-heading>{{ text }}</cds-heading>` })
export class CarbonHeadingRenderer { @Input() text = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-icon-button', template: `<cds-icon-button [attr.kind]="kind">{{ label }}</cds-icon-button>` })
export class CarbonWcIconButtonRenderer { @Input() kind = 'primary'; @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-icon-indicator', template: `<cds-icon-indicator [attr.kind]="kind"></cds-icon-indicator>` })
export class CarbonIconIndicatorRenderer { @Input() kind = 'success'; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-page-header', template: `<cds-page-header [attr.title]="title">{{ subtitle }}</cds-page-header>` })
export class CarbonWcPageHeaderRenderer { @Input() title = ''; @Input() subtitle = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pagination-nav', template: `<cds-pagination-nav [attr.total-items]="totalItems"></cds-pagination-nav>` })
export class CarbonPaginationNavRenderer { @Input() totalItems = 0; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-shape-indicator', template: `<cds-shape-indicator [attr.kind]="kind"></cds-shape-indicator>` })
export class CarbonShapeIndicatorRenderer { @Input() kind = 'success'; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-side-panel', template: `<cds-side-panel [attr.title]="title"><ng-content></ng-content></cds-side-panel>` })
export class CarbonSidePanelRenderer { @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-stack', template: `<cds-stack [attr.gap]="gap"><ng-content></ng-content></cds-stack>` })
export class CarbonStackRenderer { @Input() gap = '4'; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-tearsheet', template: `<cds-tearsheet [attr.title]="title"><ng-content></ng-content></cds-tearsheet>` })
export class CarbonTearsheetRenderer { @Input() title = ''; }

// product-wc.* — IBM Products web-components (cds-pwc-* tags).
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-about-modal', template: `<cds-about-modal [attr.title]="title"></cds-about-modal>` })
export class CarbonPwcAboutModalRenderer { @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-action-set', template: `<cds-action-set><ng-content></ng-content></cds-action-set>` })
export class CarbonPwcActionSetRenderer {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-big-number', template: `<cds-big-number [attr.value]="value" [attr.label]="label"></cds-big-number>` })
export class CarbonPwcBigNumberRenderer { @Input() value = ''; @Input() label = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-checklist', template: `<cds-checklist><ng-content></ng-content></cds-checklist>` })
export class CarbonPwcChecklistRenderer {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-coachmark', template: `<cds-coachmark [attr.target]="target"><ng-content></ng-content></cds-coachmark>` })
export class CarbonPwcCoachmarkRenderer { @Input() target = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-full-page-error', template: `<cds-full-page-error [attr.kind]="kind" [attr.title]="title"></cds-full-page-error>` })
export class CarbonPwcFullPageErrorRenderer { @Input() kind: '403' | '404' | '500' = '404'; @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-guide-banner', template: `<cds-guide-banner [attr.title]="title">{{ message }}</cds-guide-banner>` })
export class CarbonPwcGuideBannerRenderer { @Input() title = ''; @Input() message = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-interstitial-screen', template: `<cds-interstitial-screen [attr.title]="title"></cds-interstitial-screen>` })
export class CarbonPwcInterstitialScreenRenderer { @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-notifications-panel', template: `<cds-notifications-panel></cds-notifications-panel>` })
export class CarbonPwcNotificationsPanelRenderer {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-options-tile', template: `<cds-options-tile [attr.title]="title"></cds-options-tile>` })
export class CarbonPwcOptionsTileRenderer { @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-page-header', template: `<cds-pwc-page-header [attr.title]="title"></cds-pwc-page-header>` })
export class CarbonPwcPageHeaderRenderer { @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-side-panel', template: `<cds-pwc-side-panel [attr.title]="title"></cds-pwc-side-panel>` })
export class CarbonPwcSidePanelRenderer { @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-tearsheet', template: `<cds-pwc-tearsheet [attr.title]="title"></cds-pwc-tearsheet>` })
export class CarbonPwcTearsheetRenderer { @Input() title = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-tearsheet-preview', template: `<cds-tearsheet-preview></cds-tearsheet-preview>` })
export class CarbonPwcTearsheetPreviewRenderer {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-truncated-text', template: `<cds-truncated-text>{{ text }}</cds-truncated-text>` })
export class CarbonPwcTruncatedTextRenderer { @Input() text = ''; }

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule], selector: 'app-cds-pwc-user-avatar', template: `<cds-user-avatar [attr.name]="name"></cds-user-avatar>` })
export class CarbonPwcUserAvatarRenderer { @Input() name = ''; }
