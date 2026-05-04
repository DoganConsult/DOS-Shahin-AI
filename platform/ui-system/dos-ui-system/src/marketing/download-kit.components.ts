/**
 * Phase M1.5 — Download-Kit components (3 standalone Angular components).
 *
 *   <dos-download-kit-card>     → IBM Carbon Tile/Tag/Button/StructuredList.
 *   <dos-gated-download-modal>  → IBM Carbon Modal/TextInput/Dropdown/Checkbox/
 *                                 InlineNotification/InlineLoading.
 *   <dos-download-success>      → IBM Carbon InlineNotification/Button/Tile.
 *
 * Components NEVER call fetch directly. The card/modal emit
 * MarketingDownloadEvents via @Output and the host page (or the
 * unauthenticated `/marketing/downloads` POST endpoint) is the executor.
 *
 * Mobile reflow:
 *   - Card    → compact tile under 480px container.
 *   - Modal   → bottom-sheet (data-mobile-mode='bottom-sheet') under 480px.
 *   - Form    → 1 input per row.
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  type MarketingAsset,
  type MarketingDownloadEvent,
  type MarketingDownloadFormPayload,
} from './download-kit.contract';
// Phase M3 — IBM Carbon Angular wrappers (one-source rule).
import { DosCarbonModalComponent } from '../carbon/dos-carbon-modal.component';
import { DosCarbonTextInputComponent } from '../carbon/dos-carbon-text-input.component';
import {
  DosCarbonDropdownComponent,
  type DosCarbonDropdownItem,
} from '../carbon/dos-carbon-dropdown.component';
import { DosCarbonCheckboxComponent } from '../carbon/dos-carbon-checkbox.component';
import { DosCarbonButtonComponent } from '../carbon/dos-carbon-button.component';
import { DosCarbonNotificationComponent } from '../carbon/dos-carbon-notification.component';
import { DosCarbonInlineLoadingComponent } from '../carbon/dos-carbon-inline-loading.component';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
import { DosCarbonTagComponent } from '../carbon/dos-carbon-tag.component';

function nowIso(): string { return new Date().toISOString(); }

// ═════════════════════════════════════════════════════════════════════════
// 1. <dos-download-kit-card>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-download-kit-card',
  standalone: true,
  imports: [
    CommonModule,
    DosCarbonTileComponent,
    DosCarbonTagComponent,
    DosCarbonButtonComponent,
    DosCarbonInlineLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-carbon-tile
      class="dos-download-kit-card"
      [attr.data-asset-key]="asset?.assetKey"
      [attr.data-locale]="asset?.locale"
      [attr.data-gated]="asset?.isGated ? 'true' : 'false'"
    >
      @if (!asset) {
        <dos-carbon-inline-loading
          state="active"
          loadingText="Preparing executive kit…"
        ></dos-carbon-inline-loading>
      } @else {
        <header class="dos-dk-card-head">
          <dos-carbon-tag [type]="asset.isGated ? 'warm-gray' : 'cool-gray'" size="md">
            {{ asset.isGated ? gatedLabel : openLabel }}
          </dos-carbon-tag>
          <dos-carbon-tag type="gray" size="md">{{ asset.assetType.toUpperCase() }}</dos-carbon-tag>
        </header>
        <h3 class="dos-dk-card-title">{{ asset.title }}</h3>
        <p class="dos-dk-card-desc">{{ asset.description }}</p>
        <dl class="dos-dk-card-meta">
          <div>
            <dt>{{ versionLabel }}</dt>
            <dd>{{ asset.version }}</dd>
          </div>
          <div>
            <dt>{{ localeLabel }}</dt>
            <dd>{{ asset.locale.toUpperCase() }}</dd>
          </div>
        </dl>
        <footer class="dos-dk-card-actions">
          <dos-carbon-button kind="primary" size="md" (clicked)="onPrimary()">{{ ctaLabel }}</dos-carbon-button>
        </footer>
      }
    </dos-carbon-tile>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; }
    .dos-download-kit-card { padding: var(--dos-space-4, 1rem); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem); }
    .dos-dk-card-head { display: flex; gap: 0.5rem; }
    .dos-dk-card-title { margin: 0; font-size: 1.25rem; }
    .dos-dk-card-desc { margin: 0; color: var(--dos-color-text-secondary, #525252); }
    .dos-dk-card-meta { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
    .dos-dk-card-meta div { display: grid; gap: 0.15rem; }
    .dos-dk-card-meta dt { font-size: 0.75rem; color: var(--dos-color-text-secondary, #525252); }
    .dos-dk-card-meta dd { margin: 0; font-size: 0.9375rem; font-weight: 600; color: var(--dos-color-text-primary, #161616); }
    .dos-dk-card-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    @container (max-width: 480px) {
      .dos-download-kit-card { padding: var(--dos-space-3, 0.75rem); }
      .dos-dk-card-meta { grid-template-columns: 1fr; gap: 0.25rem; }
    }
  `],
})
export class DosDownloadKitCardComponent {
  @Input() asset: MarketingAsset | null = null;
  @Input() ctaLabel = 'Download kit';
  @Input() gatedLabel = 'Gated';
  @Input() openLabel = 'Open download';
  @Output() readonly event = new EventEmitter<MarketingDownloadEvent>();

  readonly versionLabel = 'Version';
  readonly localeLabel = 'Locale';

  onPrimary() {
    if (!this.asset) return;
    // Card always emits `opened` — host shell decides whether to open the
    // gated modal or trigger the open download.
    this.event.emit({
      key: 'marketing.download.opened',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 2. <dos-gated-download-modal>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-gated-download-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DosCarbonModalComponent,
    DosCarbonTextInputComponent,
    DosCarbonDropdownComponent,
    DosCarbonCheckboxComponent,
    DosCarbonButtonComponent,
    DosCarbonNotificationComponent,
    DosCarbonInlineLoadingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-carbon-modal
      [open]="open"
      [title]="title"
      [subtitle]="asset?.title || null"
      size="md"
      [hasScrollingContent]="true"
      (closed)="onClose()"
    >
      <form
        class="dos-gated-modal"
        [attr.data-asset-key]="asset?.assetKey"
        [attr.data-mobile-mode]="'bottom-sheet'"
        (ngSubmit)="onSubmit()"
        novalidate
      >
        <dos-carbon-text-input
          [label]="labelName"
          [(value)]="form.name"
        ></dos-carbon-text-input>
        <dos-carbon-text-input
          [label]="labelEmail"
          [(value)]="form.email"
        ></dos-carbon-text-input>
        <dos-carbon-text-input
          [label]="labelCompany"
          [(value)]="form.company"
        ></dos-carbon-text-input>
        <dos-carbon-text-input
          [label]="labelJobTitle"
          [(value)]="form.jobTitle"
        ></dos-carbon-text-input>
        <dos-carbon-dropdown
          [label]="labelCountry"
          [items]="countryItems"
          (selected)="form.country = $event?.content || ''"
        ></dos-carbon-dropdown>
        <dos-carbon-dropdown
          [label]="labelInterest"
          [items]="interestItems"
          (selected)="form.interestArea = $event?.content || ''"
        ></dos-carbon-dropdown>
        <dos-carbon-checkbox
          [label]="labelConsent"
          [(checked)]="consent"
        ></dos-carbon-checkbox>

        @if (errorMessage()) {
          <dos-carbon-notification
            variant="inline"
            kind="error"
            [title]="errorMessage() || ''"
            [hideClose]="true"
          ></dos-carbon-notification>
        }
        @if (submitting()) {
          <dos-carbon-inline-loading
            state="active"
            [loadingText]="submittingLabel"
          ></dos-carbon-inline-loading>
        }
      </form>

      <ng-container modalFooter>
        <dos-carbon-button kind="tertiary" (clicked)="onClose()">
          {{ cancelLabel }}
        </dos-carbon-button>
        <dos-carbon-button kind="primary" [disabled]="submitting()" (clicked)="onSubmit()">
          {{ submitLabel }}
        </dos-carbon-button>
      </ng-container>
    </dos-carbon-modal>
  `,
  styles: [`
    :host { display: contents; container-type: inline-size; }
    .dos-gated-modal { padding: var(--dos-space-4, 1rem); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem); background: var(--dos-color-surface, #fff); }
    form { display: grid; gap: var(--dos-space-3, 0.75rem); }
    label { display: grid; gap: 0.25rem; }
    footer { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: var(--dos-space-3, 0.75rem); }
    @container (max-width: 480px) {
      form { grid-template-columns: 1fr; }
      footer { position: sticky; inset-block-end: 0; background: inherit; padding-block: 0.5rem; }
    }
  `],
})
export class DosGatedDownloadModalComponent {
  @Input() asset: MarketingAsset | null = null;
  @Input() open = false;
  @Input() title = 'Get your download';
  @Input() labelName = 'Full name';
  @Input() labelEmail = 'Work email';
  @Input() labelCompany = 'Company';
  @Input() labelJobTitle = 'Job title';
  @Input() labelCountry = 'Country';
  @Input() labelInterest = 'Interest area';
  @Input() labelConsent = 'I agree to be contacted about this download.';
  @Input() submitLabel = 'Get download';
  @Input() cancelLabel = 'Cancel';
  @Input() submittingLabel = 'Submitting…';
  @Input() countries: ReadonlyArray<string> = ['Saudi Arabia','UAE','Qatar','Kuwait','Bahrain','Oman','Other'];
  @Input() interestAreas: ReadonlyArray<string> = ['GRC','Risk','Audit','Security','Privacy','Other'];

  get countryItems(): DosCarbonDropdownItem[] {
    return this.countries.map((c) => ({ content: c, selected: c === this.form.country }));
  }
  get interestItems(): DosCarbonDropdownItem[] {
    return this.interestAreas.map((c) => ({ content: c, selected: c === this.form.interestArea }));
  }

  @Output() readonly event = new EventEmitter<MarketingDownloadEvent>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly form: MarketingDownloadFormPayload = {
    name: '', email: '', company: '', jobTitle: '', country: '', interestArea: '',
  };
  consent = false;

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onClose() {
    this.open = false;
    this.closed.emit();
  }

  onSubmit() {
    if (!this.asset) return;
    this.errorMessage.set(null);
    if (!this.form.name || !this.form.email || !this.form.company || !this.consent) {
      this.errorMessage.set('Please complete the required fields.');
      return;
    }
    this.submitting.set(true);
    // Component does NOT execute — emits the event for the host shell to
    // POST /marketing/downloads. Submitting flag is reset by host via
    // `markCompleted()` / `markFailed()`.
    this.event.emit({
      key: 'marketing.download.submitted',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
      payload: { ...this.form },
    });
  }

  /** Host shell calls this after a successful POST /marketing/downloads. */
  markCompleted() {
    this.submitting.set(false);
    this.errorMessage.set(null);
    if (this.asset) {
      this.event.emit({
        key: 'marketing.download.completed',
        assetKey: this.asset.assetKey,
        brandCode: this.asset.brandCode,
        locale: this.asset.locale,
        occurredAt: nowIso(),
      });
    }
  }
  markFailed(message: string) {
    this.submitting.set(false);
    this.errorMessage.set(message);
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 3. <dos-download-success>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-download-success',
  standalone: true,
  imports: [
    CommonModule,
    DosCarbonTileComponent,
    DosCarbonNotificationComponent,
    DosCarbonButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-carbon-tile
      class="dos-download-success"
      [attr.data-asset-key]="asset?.assetKey"
    >
      <dos-carbon-notification
        variant="inline"
        kind="success"
        [title]="successHeading"
        [subtitle]="asset ? successBody + ' ' + asset.title + '.' : successBody"
        [hideClose]="true"
      ></dos-carbon-notification>
      @if (asset) {
        <p>{{ followupBody }}</p>
      }
      <footer>
        @if (asset?.fileUrl) {
          <dos-carbon-button kind="primary" size="md" (clicked)="openDownloadNow()">{{ downloadNowLabel }}</dos-carbon-button>
        }
        <dos-carbon-button kind="tertiary" size="md" (clicked)="emitEmail()">
          {{ emailLabel }}
        </dos-carbon-button>
        <dos-carbon-button kind="ghost" size="md" (clicked)="openRoute(bookDemoHref)">
          {{ bookDemoLabel }}
        </dos-carbon-button>
        <dos-carbon-button kind="ghost" size="md" (clicked)="openRoute(exploreHref)">
          {{ exploreLabel }}
        </dos-carbon-button>
      </footer>
    </dos-carbon-tile>
  `,
  styles: [`
    :host { display: block; }
    .dos-download-success { padding: var(--dos-space-4, 1rem); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem); }
    .dos-download-success p { margin: 0; color: var(--dos-color-text-secondary, #525252); }
    footer { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  `],
})
export class DosDownloadSuccessComponent {
  @Input() asset: MarketingAsset | null = null;
  @Input() successHeading = 'Your kit is ready.';
  @Input() successBody = 'You can now access';
  @Input() downloadNowLabel = 'Download now';
  @Input() emailLabel = 'Email me a link';
  @Input() bookDemoLabel = 'Book a demo';
  @Input() bookDemoHref = '/demo';
  @Input() exploreLabel = 'Explore the platform';
  @Input() exploreHref = '/platform';
  @Input() followupBody = 'The executive kit is unlocked and ready for the next review step.';

  @Output() readonly event = new EventEmitter<MarketingDownloadEvent>();

  openDownloadNow() {
    if (!this.asset?.fileUrl) return;
    if (typeof window !== 'undefined') {
      window.open(this.asset.fileUrl, '_blank', 'noopener');
    }
    this.emitOpenedNow();
  }

  openRoute(href: string) {
    if (!href || typeof window === 'undefined') return;
    window.location.assign(href);
  }

  emitOpenedNow() {
    if (!this.asset) return;
    this.event.emit({
      key: 'marketing.download.completed',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
    });
  }
  emitEmail() {
    if (!this.asset) return;
    this.event.emit({
      key: 'marketing.download.completed',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
      payload: { interestArea: 'email-link' },
    });
  }
}
